import {
  setAirIntakeTemp,
  setCatConverterTemp,
  setDataStreamingStatus,
  setEgrCommanded,
  setEgrPositionError,
  setEngineCoolantTemp,
  setEngineRPM,
  setFuelPressure,
  setIntakeManifoldPressure,
  setMassAirFlow,
  setOxygenSensor,
  setSpeed,
  setThrottlePosition,
} from '@src/store/obdLiveDataSlice/__OBDU';
import { log as logMain } from '@src/utils/logs';
import { getAllPIDs, getPIDInfo, parseOBDResponse } from 'obd-raw-data-parser';

// Enhanced logging with better deduplication
const log = (...props) => {
  const message = props[1];

  if (typeof message === 'string') {
    props[1] = `[VehicleLiveDataRetriever] ${message}`;
  }

  logMain(...props);
};

class VehicleLiveDataRetriever {
  static SERVICE_MODE = {
    REQUEST: '01',
    NAME: 'VEHICLE_LIVE_DATA',
  };

  // Prioritize speed and EGR by placing them first in the order
  static CRITICAL_PIDS = ['0D', '2D']; // Speed and EGR commanded
  static COMMAND_DELAY = 50;

  // Map PID setters to CAR_INFO_CONFIG keys and use parsed values directly
  static PID_SETTERS = {
    '0D': (value, unit) => setSpeed(`${value}${unit ? ` ${unit}` : ''}`), // Speed with unit
    '0C': (value, unit) => setEngineRPM(`${value}${unit ? ` ${unit}` : ''}`), // RPM with unit
    11: (value, unit) =>
      setThrottlePosition(`${value}${unit ? ` ${unit}` : ''}`),
    '05': (value, unit) =>
      setEngineCoolantTemp(`${value}${unit ? ` ${unit}` : ''}`),
    10: (value, unit) => setMassAirFlow(`${value}${unit ? ` ${unit}` : ''}`),
    '0B': (value, unit) =>
      setIntakeManifoldPressure(`${value}${unit ? ` ${unit}` : ''}`),
    '0F': (value, unit) =>
      setAirIntakeTemp(`${value}${unit ? ` ${unit}` : ''}`),
    '0A': (value, unit) => setFuelPressure(`${value}${unit ? ` ${unit}` : ''}`),
    '2D': (value, unit) => setEgrCommanded(`${value}${unit ? ` ${unit}` : ''}`),
    '2C': (value, unit) =>
      setEgrPositionError(`${value}${unit ? ` ${unit}` : ''}`),
    '3C': (value, unit) => setOxygenSensor(`${value}${unit ? ` ${unit}` : ''}`),
    '3E': (value, unit) =>
      setCatConverterTemp(`${value}${unit ? ` ${unit}` : ''}`),
  };

  static _instance = null;

  constructor(ecuDataRetriever = null) {
    if (VehicleLiveDataRetriever._instance) {
      ecuDataRetriever &&
        (VehicleLiveDataRetriever._instance.ecuDataRetriever =
          ecuDataRetriever);

      return VehicleLiveDataRetriever._instance;
    }

    if (!ecuDataRetriever) throw new Error('ecuDataRetriever required');

    this.ecuDataRetriever = ecuDataRetriever;
    this.currentIndex = 0;
    this.isProcessing = false;
    this.commandQueue = [];
    this.initializePIDs();
    VehicleLiveDataRetriever._instance = this;

    return this;
  }

  initializePIDs() {
    const allPIDs = getAllPIDs()
      .filter(pid => VehicleLiveDataRetriever.PID_SETTERS[pid.pid])
      .map(pid => pid.pid);

    // Reorder PIDs to prioritize critical ones
    this.supportedPIDs = [
      ...VehicleLiveDataRetriever.CRITICAL_PIDS.filter(pid =>
        allPIDs.includes(pid),
      ),
      ...allPIDs.filter(
        pid => !VehicleLiveDataRetriever.CRITICAL_PIDS.includes(pid),
      ),
    ];

    if (this.supportedPIDs.length === 0) {
      log('warn', 'No supported PIDs found');
    } else {
      log(
        'debug',
        `Initialized with ${this.supportedPIDs.length} supported PIDs. Priority PIDs: ${VehicleLiveDataRetriever.CRITICAL_PIDS.join(', ')}`,
      );
    }
  }

  static getInstance(ecuDataRetriever = null) {
    if (!VehicleLiveDataRetriever._instance) {
      new VehicleLiveDataRetriever(ecuDataRetriever);
    } else if (ecuDataRetriever) {
      VehicleLiveDataRetriever._instance.ecuDataRetriever = ecuDataRetriever;
    }

    return VehicleLiveDataRetriever._instance;
  }

  static resetInstance() {
    VehicleLiveDataRetriever._instance = null;
  }

  queueCommand(command) {
    this.commandQueue.push(command);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || this.commandQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.commandQueue.length > 0) {
        const command = this.commandQueue.shift();

        await this.processCommand(command);
        await new Promise(resolve =>
          setTimeout(resolve, VehicleLiveDataRetriever.COMMAND_DELAY),
        );
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async processCommand(command) {
    try {
      const response = await this.sendCommand(command);

      if (response) {
        log('debug', `Raw response for ${command}: ${response}`);
        const result = this.parseResponse(response);

        // Enhanced logging for speed and EGR
        if (command.includes('0D') || command.includes('2D')) {
          log(
            'info',
            `Processing ${command}: raw response: ${response}, parsed value: ${result}`,
          );
        }
      }
    } catch (error) {
      log('error', `Error processing command ${command}:`, error.message);
    }
  }

  async retrieveDataForPID() {
    if (!this.ecuDataRetriever || this.supportedPIDs.length === 0) return null;

    // Every third request, prioritize critical PIDs
    if (this.currentIndex % 3 === 0) {
      // Alternate between speed and EGR for critical measurements
      const criticalPidIndex =
        Math.floor(this.currentIndex / 3) %
        VehicleLiveDataRetriever.CRITICAL_PIDS.length;

      this.currentPID =
        VehicleLiveDataRetriever.CRITICAL_PIDS[criticalPidIndex];
    } else {
      this.currentPID = this.supportedPIDs[this.currentIndex];
    }

    const pidInfo = getPIDInfo(this.currentPID);

    if (pidInfo) {
      const command = `${VehicleLiveDataRetriever.SERVICE_MODE.REQUEST}${this.currentPID}`;

      log('debug', `Sending command: ${command} for PID: ${this.currentPID}`);
      this.queueCommand(command);
    }

    this.currentIndex = (this.currentIndex + 1) % this.supportedPIDs.length;
  }

  parseResponse(response) {
    if (!response) return null;

    try {
      // Clean the response first
      const cleanResponse = response.replace(/[\r\n\s>]/g, '').toUpperCase();

      log('debug', `Cleaned response: ${cleanResponse}`);

      const parsedResponse = parseOBDResponse(cleanResponse);

      if (!parsedResponse || !parsedResponse.pid) {
        log('debug', 'Failed to parse OBD response');

        return null;
      }

      if (parsedResponse.value !== undefined && parsedResponse.value !== null) {
        const setter = VehicleLiveDataRetriever.PID_SETTERS[parsedResponse.pid];

        if (setter) {
          // Pass both value and unit to setter
          setter(parsedResponse.value, parsedResponse.unit);

          // Enhanced logging for speed and EGR
          if (parsedResponse.pid === '0D' || parsedResponse.pid === '2D') {
            log(
              'info',
              `${parsedResponse.pid === '0D' ? 'Speed' : 'EGR'} value updated: ${parsedResponse.value}${parsedResponse.unit ? ` ${parsedResponse.unit}` : ''}`,
            );
          } else {
            log(
              'debug',
              `Updated ${parsedResponse.name || parsedResponse.pid}: ${parsedResponse.value}${parsedResponse.unit ? ` ${parsedResponse.unit}` : ''}`,
            );
          }

          return parsedResponse.value;
        }
      }
    } catch (error) {
      log('error', `Parse error for response: ${error.message}`);
    }

    return null;
  }

  sendCommand(command) {
    if (!this.ecuDataRetriever?.protocolServiceBased) {
      throw new Error('ECU Data Retriever or Protocol Service not initialized');
    }

    setDataStreamingStatus(true);

    return this.ecuDataRetriever.protocolServiceBased.sendCommand(command);
  }

  getName() {
    return VehicleLiveDataRetriever.SERVICE_MODE.NAME;
  }
}

export default VehicleLiveDataRetriever;
