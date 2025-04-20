# JavaScript Files Documentation

## docs/common-BleEmitterUtils.js

```javascript
// filepath: docs/common-BleEmitterUtils.js
import { DeviceEventEmitter } from '@own-react-native';
import { stringToBytes } from 'convert-string';

/**
 * Utility class for handling BLE characteristic value emissions
 */
class BleEmitterUtils {
  /**
   * Emits a BLE characteristic value update event
   * @param {string | Uint8Array} data - The data to emit. If string, will be converted to bytes
   * @param {boolean} appendPrompt - Whether to append '>' prompt to string data (default: true)
   */
  static emitCharacteristicValue(data, appendPrompt = true) {
    let byteData;

    if (typeof data === 'string') {
      // If string data, optionally append prompt and convert to bytes
      const dataWithPrompt = appendPrompt ? `${data}>` : data;

      byteData = stringToBytes(dataWithPrompt);
    } else if (data instanceof Uint8Array) {
      // If already byte data, use as is
      byteData = Array.from(data);
    } else {
      throw new Error('Data must be either string or Uint8Array');
    }

    DeviceEventEmitter.emit('BleManagerDidUpdateValueForCharacteristic', {
      value: byteData,
    });
  }

  /**
   * Emits a demo device response
   * @param {string} deviceId - The demo device ID
   */
  static emitDemoDeviceResponse(deviceId) {
    this.emitCharacteristicValue(deviceId);
  }

  /**
   * Emits a raw byte array as characteristic value
   * @param {Uint8Array} byteArray - The byte array to emit
   */
  static emitRawBytes(byteArray) {
    if (!(byteArray instanceof Uint8Array)) {
      throw new Error('Data must be a Uint8Array');
    }

    this.emitCharacteristicValue(byteArray, false);
  }

  /**
   * Emits a command failure event
   * @param {Error} error - The error that caused the command to fail
   * @param {Object} context - Additional context about the command that failed
   */
  static emitCommandFailure(error, context = {}) {
    DeviceEventEmitter.emit('LiveDataStatus', 'COMMAND_FAILED');
    _c_log_h('Command failed:', { error: error.message, ...context });
  }
}

export default BleEmitterUtils;
```

## docs/common-ECUDataRetriever.js

```javascript
// filepath: docs/common-ECUDataRetriever.js
import { DeviceEventEmitter } from '@own-react-native';
import { createRawECUConnector } from '@src/helper/OBDManagerHelper/OBDUtils';
import { log as logMain } from '@src/utils/logs';

import ProtocolServiceBased from './ECUConnector/ProtocolServiceBased';
import CurrentDTCRetriever from './Retrievers/CurrentDTCRetriever';
import DTCClearRetriever from './Retrievers/DTCClearRetriever';
import PendingDTCRetriever from './Retrievers/PendingDTCRetriever';
import PermanentDTCRetriever from './Retrievers/PermanentDTCRetriever';
import VehicleLiveDataRetriever from './Retrievers/VehicleLiveDataRetriever';
import VINRetriever from './Retrievers/VINRetriever';

const log = (...props) => {
  if (typeof props[1] === 'string') {
    props[1] = `[ECUDataRetriever] ${props[1]}`;
  }

  logMain(...props);
};

class ECUDataRetriever {
  static instance = null;
  static isInitializing = false;
  static DTC_MODES = {
    '03': CurrentDTCRetriever,
    '07': PendingDTCRetriever,
    '0A': PermanentDTCRetriever,
  };

  static COMMANDS = {
    // DTC Modes - Exact command matches
    '03': { type: 'DTC_MODE', handler: CurrentDTCRetriever },
    '07': { type: 'DTC_MODE', handler: PendingDTCRetriever },
    '0A': { type: 'DTC_MODE', handler: PermanentDTCRetriever },
    // Special Commands - Exact command matches
    '04': { type: 'SPECIAL', handler: DTCClearRetriever },
    // Vehicle Live Data - Mode 01 commands
    // TODO: IN future we will enable this to bulk commands live data
    '010D': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '010C': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '0111': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '0105': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '0110': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '010B': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '010F': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '010A': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '0113': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '0114': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '0106': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    '0107': { type: 'LIVE_DATA', handler: VehicleLiveDataRetriever },
    // Add VIN command
    '0902': { type: 'SPECIAL', handler: VINRetriever },
  };

  constructor(obdMonitor) {
    log('info', 'constructor called');

    if (ECUDataRetriever.instance) {
      log('info', 'instance already exists, updating monitor');
      ECUDataRetriever.instance.updateMonitor(obdMonitor);

      return ECUDataRetriever.instance;
    }

    // Initialize properties only on first creation
    this.status = 'UNDEFINED';
    this.lastCommand = null;
    this.protocol = null;
    this.dtcRetrievers = {};
    this.canEmit = typeof DeviceEventEmitter?.emit === 'function';
    this.protocolServiceBased = null;
    this.connector = null;

    ECUDataRetriever.instance = this;
    log('info', 'instance created');

    // Initialize with monitor after instance is set
    this.updateMonitor(obdMonitor);

    return this;
  }

  updateMonitor(obdMonitor) {
    log('info', 'Updating OBD monitor');

    if (!obdMonitor) {
      log('warn', 'No OBD monitor provided');
    }

    if (ECUDataRetriever.isInitializing) {
      log('warn', 'is currently initializing');

      return;
    }

    try {
      ECUDataRetriever.isInitializing = true;
      this.obdMonitor = obdMonitor;

      // Get existing instances if available
      if (!this.protocolServiceBased) {
        const existingProtocolService = ProtocolServiceBased.instance;

        if (existingProtocolService) {
          log('info', 'Using existing ProtocolServiceBased instance');
        } else {
          log('info', 'Creating new ProtocolServiceBased instance');
        }

        this.protocolServiceBased =
          existingProtocolService ||
          ProtocolServiceBased.getInstance(obdMonitor);
      } else {
        // Only update if monitor changed
        if (this.protocolServiceBased.obdMonitor !== obdMonitor) {
          log('info', 'Updating monitor in ProtocolServiceBased instance');
          this.protocolServiceBased.updateMonitor(obdMonitor);
        }
      }

      if (!this.connector) {
        log('info', 'Creating new ECU connector');
        this.connector = createRawECUConnector(obdMonitor);
      }
    } catch (error) {
      log('error', 'Error updating monitor', { error: error.message });
      throw error;
    } finally {
      ECUDataRetriever.isInitializing = false;
      log('debug', 'Finished updating monitor');
    }
  }

  static getInstance(obdMonitor) {
    log('info', 'Getting instance');

    if (!ECUDataRetriever.instance) {
      log('info', 'No existing instance found, creating new one');
      new ECUDataRetriever(obdMonitor);
    } else if (obdMonitor && !ECUDataRetriever.isInitializing) {
      log(
        'info',
        'Existing instance found, updating monitor with new obdMonitor',
      );
      ECUDataRetriever.instance.updateMonitor(obdMonitor);
    }

    return ECUDataRetriever.instance;
  }

  static resetInstance() {
    log('info', 'Resetting instance');

    if (ECUDataRetriever.instance) {
      // Reset all dependencies first
      if (ECUDataRetriever.instance.protocolServiceBased) {
        log('info', 'Resetting ProtocolServiceBased instance');
        ProtocolServiceBased.resetInstance();
      }

      ECUDataRetriever.instance.protocol = null;
      ECUDataRetriever.instance.status = 'UNDEFINED';
      ECUDataRetriever.instance.lastCommand = null;
      ECUDataRetriever.instance.dtcRetrievers = {};
      ECUDataRetriever.instance.protocolServiceBased = null;
      ECUDataRetriever.instance.connector = null;
      log('debug', 'instance properties reset');
    }

    ECUDataRetriever.instance = null;
    ECUDataRetriever.isInitializing = false;
    log('info', 'instance has been reset');
  }

  getDTCRetriever(mode) {
    log('info', `Fetching DTC retriever for mode: ${mode}`);

    if (!ECUDataRetriever.DTC_MODES[mode]) {
      log('error', `Unsupported DTC mode: ${mode}`);
      throw new Error(`Unsupported DTC mode: ${mode}`);
    }

    if (!this.dtcRetrievers[mode]) {
      const RetrieverClass = ECUDataRetriever.DTC_MODES[mode];

      log('info', `Creating new DTC retriever for mode: ${mode}`);
      this.dtcRetrievers[mode] = new RetrieverClass(this);
    }

    return this.dtcRetrievers[mode];
  }

  safeEmit(event, data) {
    log('debug', `Emitting event: ${event}`, { data });

    if (this.canEmit) {
      DeviceEventEmitter.emit(event, data);
    } else {
      log(
        'warn',
        `Cannot emit event: ${event}, DeviceEventEmitter.emit is not a function`,
      );
    }
  }

  async retrieveAllData(at_command_array) {
    if (!Array.isArray(at_command_array) || at_command_array.length === 0) {
      log('error', 'Invalid or empty command array');

      return;
    }

    log('info', '=== Starting command sequence ===', {
      commandCount: at_command_array.length,
      commands: at_command_array,
    });

    // Get protocol before starting command sequence
    this.protocol = await this.connector.getProtocol();
    log('debug', 'Retrieved protocol', { protocol: this.protocol });

    // Add this line to update protocol service with the retrieved protocol
    await this.protocolServiceBased.setProtocol(this.protocol);

    // Update the existing protocol service with current obdMonitor
    this.protocolServiceBased.updateMonitor(this.obdMonitor);

    for (const currentCommand of at_command_array) {
      try {
        log('debug', `Processing command: ${currentCommand}`, {
          protocol: this.protocol,
        });

        // Check for special commands first
        if (await this.specialCommand(currentCommand)) {
          log('info', `Special command handled: ${currentCommand}`);
          continue;
        }

        // Regular command processing
        log('info', `Sending command: ${currentCommand}`);
        const response =
          await this.protocolServiceBased.sendCommand(currentCommand);

        // Update state
        this.obdMonitor.last_fired_at_command = currentCommand;
        this.lastCommand = currentCommand;
        log('debug', `Updated lastCommand to: ${currentCommand}`);

        // Notify command execution
        this.safeEmit('LiveDataStatus', 'command_fired');
        log('debug', `Emitted 'LiveDataStatus' with 'command_fired'`);

        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        log('error', `Command execution failed:`, {
          command: currentCommand,
          error: error.message,
          stack: error.stack,
        });

        // Stop command queue on error
        this.obdMonitor.stop_que_command = true;
        log('warn', 'Stopped command queue due to error');

        // Notify error
        this.safeEmit('CommandError', {
          command: currentCommand,
          error: error.message,
        });
        log('info', `Emitted 'CommandError' for command: ${currentCommand}`);

        break;
      }
    }
  }

  static checkCommandIsSpecial(command) {
    // Only exact command matches are considered special
    return ECUDataRetriever.COMMANDS[command] || null;
  }

  async specialCommand(command) {
    const config = ECUDataRetriever.checkCommandIsSpecial(command);

    if (!config) return false;

    log('info', `Handling command: ${command}, type: ${config.type}`);

    // Get appropriate handler
    let handler = null;

    switch (config.type) {
      case 'DTC_MODE':
        handler = this.getDTCRetriever(command);
        break;
      case 'LIVE_DATA':
      case 'SPECIAL':
        handler = config.handler.getInstance(this);
        break;
      default:
        log('warn', `Unknown command type: ${config.type}`);

        return false;
    }

    if (!handler) {
      log('error', 'Failed to get handler for command:', command);

      return false;
    }

    // Update state
    this.obdMonitor.last_fired_at_command = command;
    this.lastCommand = command;

    // Process command based on type
    try {
      switch (config.type) {
        case 'DTC_MODE':
          await handler.retrieveDTCs();
          break;
        case 'LIVE_DATA':
          await handler.retrieveDataForPID(command.substring(2));
          break;
        case 'SPECIAL':
          await handler.retrieveDTCs();
          break;
      }

      return true;
    } catch (error) {
      log('error', `Command processing failed:`, {
        command,
        type: config.type,
        error: error.message,
      });
      throw error;
    }
  }
}

export default ECUDataRetriever;
```

## docs/common-OBDUtils.js

```javascript
// filepath: docs/common-OBDUtils.js
import BLEDataReceiver from '@src/helper/OBDManagerHelper/BLEDataReceiver';
import { byteArrayToString as decodeValue } from '@src/helper/OBDManagerHelper/ECUConnector/decoder/lib/utils';
import { log as logMain } from '@src/utils/logs';

import protocolConfig from '../../config/protocolConfig';

export const log = (...args) => {
  logMain(...args);
};

const logOBDUtils = (...args) => {
  if (typeof args[1] === 'string') {
    args[1] = `[OBDUtils] ${args[1]}`;
  }

  logMain(...args);
};

// Create dedicated connector types
export const createRawECUConnector = obdMonitor =>
  createECUConnector(obdMonitor, true);
export const createDecodedECUConnector = obdMonitor =>
  createECUConnector(obdMonitor, false);

export const createECUConnector = (obdMonitor, setRawResponse = false) => {
  // Make isRawResponseEnabled available to all methods via closure
  const connector = {
    isRawResponseEnabled: setRawResponse,

    async sendCommand(command, fireRaw = false, forceFireCommand = false) {
      try {
        await obdMonitor.writeCommand(command, fireRaw, forceFireCommand);
        const response = await this.getLastResponse(command);

        BLEDataReceiver.resetRawCompleteResponse();
        logOBDUtils(
          'debug',
          `response \n${JSON.stringify({
            c: command,
            r: response,
          })}`,
        );

        return response;
      } catch (error) {
        logOBDUtils('error', `Error sending command ${command}:`, error);

        return 'COMMAND_FAILED';
      }
    },

    async getProtocol() {
      try {
        const protocol =
          await obdMonitor.get_protocolForPendingOBDDeviceForOnBoarding();

        logOBDUtils('info', 'Retrieved protocol:', protocol);
        // at last we have to return protocol as number zero is also a valid protocol
        // we should convert it to switch case
        switch (typeof protocol) {
          case 'number':
            return protocol;
          case 'string':
            return protocol.replace('ATSP', '');
          default:
            logOBDUtils('warn', 'Invalid protocol received:', protocol);

            return null;
        }
      } catch (error) {
        logOBDUtils('error', 'Error getting protocol:', error);

        return null;
      }
    },

    async setProtocol(protocol) {
      if (!protocolConfig.hasOwnProperty(protocol)) {
        throw new Error(`Invalid protocol key: ${protocol}`);
      }

      const atCommand = `ATSP${protocol}`;

      await obdMonitor.set_protocolForPendingOBDDeviceForOnBoarding(atCommand);
    },

    async getLastResponse(command = null) {
      const rawResponse = await this.getRawResponse();

      // TODO: we can use this whenever we need to test commands with custom reponse
      // Check for test command responses
      // This is commented out to avoid using test responses in production
      // dont remove the command incomming argument because it will be used in this test commands
      // const testResponse = getTestCommandResponse(command);
      // if (testResponse) {
      //   rawResponse = testResponse;
      // }

      if (this.isRawResponseEnabled) {
        return rawResponse;
      }

      if (!rawResponse) {
        return '';
      }

      try {
        let decodedResponse = decodeValue(rawResponse);

        if (typeof decodedResponse === 'string') {
          decodedResponse = decodedResponse.trim();
        }

        return decodedResponse;
      } catch (error) {
        logOBDUtils('error', 'Failed to decode response:', error);

        return rawResponse;
      }
    },

    activateRawResponse() {
      this.isRawResponseEnabled = true;
    },

    deactivateRawResponse() {
      this.isRawResponseEnabled = false;
    },

    // Get raw response
    async getRawResponse() {
      return BLEDataReceiver?.rawCompleteResponse;
    },
  };

  return connector;
};

/**
 * Generates a test response for specific OBD commands
 * Used to simulate responses for testing purposes
 *
 * @param {string} command - The OBD command (e.g., '0902' for VIN)
 * @returns {Array|null} - Returns byte array for test response or null if not a test command
 *
 * Current test cases:
 * - '0902' (VIN Request): Returns 'NO DATA' response
 *
 * How to add new test cases:
 * 1. Add a new case in the switch statement
 * 2. Convert your test string to ASCII bytes using getTestResponseBytes
 * 3. Return the bytes wrapped in an array
 *
 * Example:
 * case 'XXXX':
 *   return [getTestResponseBytes('YOUR TEST RESPONSE')];
 */
export const getTestCommandResponse = command => {
  if (!command) {
    return null;
  }

  switch (command) {
    case '0902':
      // VIN Request - Simulate 'NO DATA' response
      return [getTestResponseBytes('NO DATA')];
    default:
      return null;
  }
};

/**
 * Converts a test string to its ASCII byte representation
 * @param {string} str - String to convert
 * @returns {number[]} Array of ASCII byte values
 */
const getTestResponseBytes = str => {
  return Array.from(str).map(char => char.charCodeAt(0));
};

// Utility functions
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Protocol-related configurations
export const PROT = {
  AUTO: 0,
  J1850PWM: 1,
  J1850VPW: 2,
  ISO9141: 3,
  ISO14230_4KW: 4,
  ISO14230_4ST: 5,
  ISO15765_11_500: 6,
  ISO15765_29_500: 7,
  ISO15765_11_250: 8,
  ISO15765_29_250: 9,
  SAE_J1939: 10,
  USER1_CAN: 11,
  USER2_CAN: 12,
  ISO15765_11_500_4: 13,
  ISO15765_29_500_4: 14,
  ISO15765_11_250_4: 15,
  ISO15765_29_250_4: 16,
  ISO15765_11_500_8: 17,
  ISO15765_29_500_8: 18,
  ISO15765_11_250_8: 19,
  ISO15765_29_250_8: 20,
};

// TODO: Remove this once we have a proper protocol priority list
export const PROTOCOL_PRIORITIES = [
  // High Priority - Standard CAN protocols (11-bit primary)
  {
    protocol: PROT.ISO15765_11_500,
    desc: 'ISO 15765-4 CAN (11/500)',
    priority: 1,
    responseType: 'CAN',
    canType: '11bit',
    header: '7DF',
    receiveFilter: '7E8',
    flowControl: '7E0',
  },
  // High Priority - Standard CAN protocols (11-bit alternative)
  {
    protocol: PROT.ISO15765_11_500,
    desc: 'ISO 15765-4 CAN (11/500) Alt',
    priority: 1.5,
    responseType: 'CAN',
    canType: '11bit',
    header: '7E0',
    receiveFilter: '7E8',
    flowControl: '7E0',
  },
  {
    protocol: PROT.ISO15765_29_250,
    desc: 'ISO 15765-4 CAN (29/250)',
    priority: 4,
    responseType: 'CAN',
    canType: '29bit',
    header: '18DB33F1',
    receiveFilter: '18DAF110',
    flowControl: '18DA10F1',
  },
  {
    protocol: PROT.ISO15765_29_500,
    desc: 'ISO 15765-4 CAN (29/500)',
    priority: 2,
    responseType: 'CAN',
    canType: '29bit',
    header: '18DB33F1',
    receiveFilter: '18DAF110',
    flowControl: '18DA10F1',
  },
  // High Priority - Standard CAN protocols (11-bit alternative)
  {
    protocol: PROT.ISO15765_11_250,
    desc: 'ISO 15765-4 CAN (11/250) Alt',
    priority: 3,
    responseType: 'CAN',
    canType: '11bit',
    header: '7E0',
    receiveFilter: '7E8',
    flowControl: '7E0',
  },

  // Medium Priority - Extended CAN protocols (4 byte)
  {
    protocol: PROT.ISO15765_11_500_4,
    desc: 'ISO 15765-4 CAN (11/500/4)',
    priority: 7,
    responseType: 'CAN',
  },
  {
    protocol: PROT.ISO15765_29_500_4,
    desc: 'ISO 15765-4 CAN (29/500/4)',
    priority: 8,
    responseType: 'CAN',
  },
  {
    protocol: PROT.ISO15765_11_250_4,
    desc: 'ISO 15765-4 CAN (11/250/4)',
    priority: 9,
    responseType: 'CAN',
  },
  {
    protocol: PROT.ISO15765_29_250_4,
    desc: 'ISO 15765-4 CAN (29/250/4)',
    priority: 10,
    responseType: 'CAN',
  },

  // Medium-Low Priority - Extended CAN protocols (8 byte)
  {
    protocol: PROT.ISO15765_11_500_8,
    desc: 'ISO 15765-4 CAN (11/500/8)',
    priority: 11,
    responseType: 'CAN',
  },
  {
    protocol: PROT.ISO15765_29_500_8,
    desc: 'ISO 15765-4 CAN (29/500/8)',
    priority: 12,
    responseType: 'CAN',
  },
  {
    protocol: PROT.ISO15765_11_250_8,
    desc: 'ISO 15765-4 CAN (11/250/8)',
    priority: 13,
    responseType: 'CAN',
  },
  {
    protocol: PROT.ISO15765_29_250_8,
    desc: 'ISO 15765-4 CAN (29/250/8)',
    priority: 14,
    responseType: 'CAN',
  },

  // Special CAN protocols
  {
    protocol: PROT.SAE_J1939,
    desc: 'SAE J1939 CAN',
    priority: 15,
    responseType: 'CAN',
  },
  {
    protocol: PROT.USER1_CAN,
    desc: 'User1 CAN',
    priority: 16,
    responseType: 'CAN',
  },
  {
    protocol: PROT.USER2_CAN,
    desc: 'User2 CAN',
    priority: 17,
    responseType: 'CAN',
  },

  // Low Priority - Non-CAN protocols
  {
    protocol: PROT.ISO14230_4ST,
    desc: 'ISO 14230-4 KWP (Fast)',
    priority: 6,
    responseType: 'KWP',
    canType: null,
  },
  {
    protocol: PROT.ISO14230_4KW,
    desc: 'ISO 14230-4 KWP (5 Baud)',
    priority: 20,
    responseType: 'KWP',
    canType: null,
  },
  {
    protocol: PROT.ISO9141,
    desc: 'ISO 9141-2',
    priority: 5,
    responseType: 'ISO9141',
    canType: null,
  },
  {
    protocol: PROT.J1850PWM,
    desc: 'J1850 PWM',
    priority: 18,
    responseType: 'J1850',
    canType: null,
  },
  {
    protocol: PROT.J1850VPW,
    desc: 'J1850 VPW',
    priority: 19,
    responseType: 'J1850',
    canType: null,
  },
  {
    protocol: PROT.AUTO,
    desc: 'Auto',
    priority: 22,
    responseType: 'AUTO',
  },
];

// Response and error configurations
export const OBD_RESPONSES = {
  UNABLE_TO_CONNECT: 'UNABLE TO CONNECT',
  VOLTAGE_SUFFIX: 'V',
  NO_DATA: 'NO DATA',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR',
};

export const OBD_ERROR_MESSAGES = {
  'CAN ERROR': 'CAN communication error',
  'BUS INIT': 'Failed to initialize OBD-II bus',
  'BUS BUSY': 'OBD-II bus is busy',
  'UNABLE TO CONNECT': 'Unable to connect to the vehicle',
  'NO DATA': 'No data received from the vehicle',
  STOPPED: 'Operation stopped',
  ERROR: 'General error',
};

export const FATAL_ERRORS = [
  'CAN communication error',
  'Failed to initialize OBD-II bus',
  'Unable to connect to the vehicle',
];

// ELM command configurations
export const ELM_COMMANDS = {
  // System commands
  RESET: 'ATZ',
  READ_VOLTAGE: 'AT RV',

  // Protocol commands
  PROTOCOL_CLOSE: 'ATPC',
  GET_PROTOCOL: 'ATDPN',
  AUTO_PROTOCOL: 'ATSP0',
  TRY_PROTOCOL_PREFIX: 'ATTP',
  SET_PROTOCOL_PREFIX: 'ATSP',

  // Communication settings
  LINEFEEDS_OFF: 'ATL0',
  SPACES_OFF: 'ATS0',
  HEADERS_OFF: 'ATH0',
  ECHO_OFF: 'ATE0',
  ADAPTIVE_TIMING_2: 'ATAT2',
};

export const ELM_INIT_COMMANDS = [
  ELM_COMMANDS.LINEFEEDS_OFF,
  ELM_COMMANDS.SPACES_OFF,
  ELM_COMMANDS.HEADERS_OFF,
  ELM_COMMANDS.ECHO_OFF,
  ELM_COMMANDS.ADAPTIVE_TIMING_2,
];

// Timing configurations
export const STANDARD_DELAYS = {
  RESET_DELAY: 1000,
  PROTOCOL_CLOSE_DELAY: 1000,
  INIT_DELAY: 1000, // Delay after reset during initialization
};

export const TIMING_CONFIG = {
  COMMAND_TIMEOUT: 5000, // 5 seconds
  PROTOCOL_DETECTION_TIMEOUT: 10000, // 10 seconds
  VOLTAGE_READ_TIMEOUT: 2000, // 2 seconds
  ...STANDARD_DELAYS,
};

// Protocol configurations
export const PROTOCOL_TRY_ORDER = [
  // Most common CAN protocols first
  '6', // ISO 15765-4 CAN (11/500)
  '8', // ISO 15765-4 CAN (11/250)
  '9', // ISO 15765-4 CAN (29/250)
  '7', // ISO 15765-4 CAN (29/500)

  // Extended CAN protocols (4 byte)
  'D', // ISO 15765-4 CAN (11/500/4)
  'E', // ISO 15765-4 CAN (29/500/4)
  'F', // ISO 15765-4 CAN (11/250/4)
  '10', // ISO 15765-4 CAN (29/250/4)

  // Extended CAN protocols (8 byte)
  '11', // ISO 15765-4 CAN (11/500/8)
  '12', // ISO 15765-4 CAN (29/500/8)
  '13', // ISO 15765-4 CAN (11/250/8)
  '14', // ISO 15765-4 CAN (29/250/8)

  // Special CAN protocols
  'A', // SAE J1939 CAN
  'B', // USER1 CAN
  'C', // USER2 CAN

  // Non-CAN protocols last
  '1', // SAE J1850 PWM
  '2', // SAE J1850 VPW
  '3', // ISO 9141-2
  '4', // ISO 14230-4 KWP (5 baud)
  '5', // ISO 14230-4 KWP (fast)
];

export const KNOWN_PROTOCOLS = [
  '1', // SAE J1850 PWM (41.6 kbaud)
  '2', // SAE J1850 VPW (10.4 kbaud)
  '3', // ISO 9141-2 (5 baud init)
  '4', // ISO 14230-4 KWP (5 baud init)
  '5', // ISO 14230-4 KWP (fast init)
  '6', // ISO 15765-4 CAN (11/500)
  '7', // ISO 15765-4 CAN (29/500)
  '8', // ISO 15765-4 CAN (11/250)
  '9', // ISO 15765-4 CAN (29/250)
  'A', // SAE J1939 CAN
  'B', // USER1 CAN
  'C', // USER2 CAN
  'D', // ISO 15765-4 CAN (11/500/4)
  'E', // ISO 15765-4 CAN (29/500/4)
  'F', // ISO 15765-4 CAN (11/250/4)
  '10', // ISO 15765-4 CAN (29/250/4)
  '11', // ISO 15765-4 CAN (11/500/8)
  '12', // ISO 15765-4 CAN (29/500/8)
  '13', // ISO 15765-4 CAN (11/250/8)
  '14', // ISO 15765-4 CAN (29/250/8)
];

export const PROTOCOL_CONFIG = {
  TRY_ORDER: PROTOCOL_TRY_ORDER,
  KNOWN_LIST: KNOWN_PROTOCOLS,
  PRIORITIES: PROTOCOL_PRIORITIES,
  DEFAULT: '6', // ISO 15765-4 CAN (11/500)
};

// Other configurations
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // ms
};

export const CONNECTION_STATUS = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  CAR_CONNECTED: 'CAR_CONNECTED',
};

export const STANDARD_PIDS = {
  BASIC_INFO: '0100',
};

// Test commands configuration
export const TEST_COMMANDS = [
  {
    cmd: '0111',
    desc: 'Throttle Position',
    response: '41 11',
    priority: 1,
  },
  // TODO: Remove this once we have a proper protocol priority list
  // {
  //   cmd: '010C',
  //   desc: 'Engine RPM',
  //   response: '41 0C',
  //   priority: 2,
  // },
  // {
  //   cmd: '010D',
  //   desc: 'Vehicle Speed',
  //   response: '41 0D',
  //   priority: 2,
  // },
  // {
  //   cmd: '0105',
  //   desc: 'Engine Coolant Temperature',
  //   response: '41 05',
  //   priority: 3,
  // },
  // {
  //   cmd: '0902',
  //   desc: 'VIN Request',
  //   response: '49 02',
  //   priority: 4,
  // },
];

export const COMMAND_DELAY = 200; // ms

// Delay and timing configurations
export const DELAYS = {
  STANDARD: 100, // Standard delay between commands
  RESET: 100, // Delay after reset
  PROTOCOL: 100, // Delay after protocol changes
  COMMAND: 100, // Delay between commands
  INIT: 100, // Delay during initialization
  ADAPTIVE: 100, // Delay for adaptive timing

  // Adaptive timing configuration
  ADAPTIVE_MIN: 20, // Minimum delay for adaptive timing
  ADAPTIVE_MAX: 500, // Maximum delay for adaptive timing
  ADAPTIVE_START: 20, // Starting delay for adaptive timing
  ADAPTIVE_INC: 20, // Increment step for adaptive timing
  ADAPTIVE_DEC: 10, // Decrement step for adaptive timing

  // Timeout values (in hex)
  TIMEOUT_NORMAL: '64', // Normal timeout (100ms)
  TIMEOUT_EXTENDED: 'C8', // Extended timeout (200ms)
  TIMEOUT_MAX: 'FF', // Maximum timeout

  // Retry delays
  RETRY_BASE: 100, // Base delay for retries
  RETRY_MULTIPLIER: 1, // Multiplier for subsequent retries

  // Protocol specific delays
  CAN_INIT: 100, // Delay after CAN initialization
  ECU_QUERY: 100, // Delay between ECU queries
  HEADER_CHANGE: 100, // Delay after changing headers
};

// Protocol descriptions
export const PROT_DESCRIPTIONS = {
  0: 'Automatic',
  1: 'SAE J1850 PWM (41.6 KBaud)',
  2: 'SAE J1850 VPW (10.4 KBaud)',
  3: 'ISO 9141-2 (5 Baud Init)',
  4: 'ISO 14230-4 KWP (5 Baud Init)',
  5: 'ISO 14230-4 KWP (Fast Init)',
  6: 'ISO 15765-4 CAN (11 Bit ID, 500 KBit)',
  7: 'ISO 15765-4 CAN (29 Bit ID, 500 KBit)',
  8: 'ISO 15765-4 CAN (11 Bit ID, 250 KBit)',
  9: 'ISO 15765-4 CAN (29 Bit ID, 250 KBit)',
  10: 'SAE J1939 CAN (29 bit ID, 250* kbaud)',
  11: 'User1 CAN (11* bit ID, 125* kbaud)',
  12: 'User2 CAN (11* bit ID, 50* kbaud)',
  13: 'ISO 15765-4 CAN (11 bit ID, 500 kbps, 4 byte)',
  14: 'ISO 15765-4 CAN (29 bit ID, 500 kbps, 4 byte)',
  15: 'ISO 15765-4 CAN (11 bit ID, 250 kbps, 4 byte)',
  16: 'ISO 15765-4 CAN (29 bit ID, 250 kbps, 4 byte)',
  17: 'ISO 15765-4 CAN (11 bit ID, 500 kbps, 8 byte)',
  18: 'ISO 15765-4 CAN (29 bit ID, 500 kbps, 8 byte)',
  19: 'ISO 15765-4 CAN (11 bit ID, 250 kbps, 8 byte)',
  20: 'ISO 15765-4 CAN (29 bit ID, 250 kbps, 8 byte)',
};

// ELM command parameters
export const CMD = {
  RESET: { cmd: 'Z', params: 0, allowDisable: true },
  WARMSTART: { cmd: 'WS', params: 0, allowDisable: true },
  PROTOCLOSE: { cmd: 'PC', params: 0, allowDisable: true },
  DEFAULTS: { cmd: 'D', params: 0, allowDisable: true },
  INFO: { cmd: 'I', params: 0, allowDisable: true },
  LOWPOWER: { cmd: 'LP', params: 0, allowDisable: true },
  ECHO: { cmd: 'E', params: 1, allowDisable: true },
  SETLINEFEED: { cmd: 'L', params: 1, allowDisable: true },
  SETSPACES: { cmd: 'S', params: 1, allowDisable: true },
  SETHEADER: { cmd: 'H', params: 1, allowDisable: true },
  GETPROT: { cmd: 'DP', params: 0, allowDisable: true },
  SETPROT: { cmd: 'SP', params: 1, allowDisable: true },
  CANMONITOR: { cmd: 'MA', params: 0, allowDisable: true },
  SETPROTAUTO: { cmd: 'SPA', params: 1, allowDisable: true },
  ADAPTTIMING: { cmd: 'AT', params: 1, allowDisable: true },
  SETTIMEOUT: { cmd: 'ST', params: 2, allowDisable: true },
  SETTXHDR: { cmd: 'SH', params: 3, allowDisable: true },
  SETCANRXFLT: { cmd: 'CRA', params: 3, allowDisable: true },
  CLRCANRXFLT: { cmd: 'CRA', params: 0, allowDisable: true },
};

// OBD Service codes
export const OBD_SVC = {
  NONE: 0x00,
  DATA: 0x01,
  FREEZEFRAME: 0x02,
  READ_CODES: 0x03,
  CLEAR_CODES: 0x04,
  O2_RESULT: 0x05,
  MON_RESULT: 0x06,
  PENDINGCODES: 0x07,
  CTRL_MODE: 0x08,
  VEH_INFO: 0x09,
  PERMACODES: 0x0a,
};

// PID delay configurations
export const PID_MAP_FOR_DELAY_IN_SENT_COMMAND = {
  // Engine RPM
  '010C': DELAYS.STANDARD,
  // Vehicle Speed
  '010D': DELAYS.STANDARD,
  // Engine Coolant Temperature
  '0105': DELAYS.ECU_QUERY,
  // Intake Manifold Pressure
  '010B': DELAYS.STANDARD,
  // Throttle Position
  '0111': DELAYS.STANDARD,
  // Mass Air Flow
  '0110': DELAYS.STANDARD,
  // Air Intake Temperature
  '010F': DELAYS.STANDARD,
  // Fuel Pressure
  '010A': DELAYS.STANDARD,
  // EGR Commanded
  '012D': DELAYS.ECU_QUERY,
  // EGR Position Error
  '012C': DELAYS.ECU_QUERY,
  // Oxygen Sensor
  '013C': DELAYS.ECU_QUERY,
  // Catalyst Temperature
  '013E': DELAYS.ECU_QUERY,
  // Clear Fault Codes
  '04': DELAYS.ECU_QUERY,
  // Read Trouble Codes
  '03': DELAYS.ECU_QUERY,
};

export const RSP_ID = {
  PROMPT: '>',
  OK: 'OK',
  MODEL: 'ELM327',
  NODATA: 'NO DATA',
  ERROR: 'ERROR',
  NOCONN: 'UNABLE TO CONNECT',
  NOCONN2: 'UNABLE TO CONNECT',
  CANERROR: 'CAN ERROR',
  BUSERROR: 'BUS ERROR',
  BUSINIERR: 'BUS INIT: ERROR',
  BUSINIERR2: 'BUS INIT: ... ERROR',
  BUSINIERR3: 'BUS ERROR: ...',
  BUSBUSY: 'BUS BUSY',
  FBERROR: 'FB ERROR',
  DATAERROR: 'DATA ERROR',
  BUFFERFULL: 'BUFFER FULL',
  RXERROR: 'RX ERROR',
  STOPPED: 'STOPPED',
  SEARCHING: 'SEARCHING...',
  UNKNOWN: 'UNKNOWN',
};

// Response patterns configuration
export const RESPONSE_PATTERNS = {
  INITIALIZATION: {
    ELM327: 'ELM327',
    OK: 'OK',
    ATZ: 'ATZ',
    PROMPT: '>',
  },
  ERROR: {
    NO_DATA: 'NODATA',
    ERROR: 'ERROR',
    UNABLE_TO_CONNECT: 'UNABLETOCONNECT',
    STOPPED: 'STOPPED',
    SEARCHING: 'SEARCHING',
  },
  CAN: {
    HEADERS: [/^18DA/, /^7E[89A-F]/],
    SERVICE_RESPONSES: [/41/, /49/, /^[0-9A-F]{2}/],
  },
  COMMANDS: {
    SET_HEADER: 'ATSH7E0',
  },
};

// Protocol detection configurations
export const PROTOCOL_DETECTION = {
  COMMANDS: {
    CARRIAGE_RETURN: '\r',
    ECHO_OFF: 'ATE0',
    RESET: 'ATZ',
    INIT_COMMANDS: ['ATL0', 'ATS0', 'ATH0', 'ATAT1'],
    AUTO_DETECT: 'ATDPN',
  },
  RESPONSES: {
    OK: 'OK',
    ELM327: 'ELM327',
    SEARCHING: 'SEARCHING',
  },
  PATTERNS: {
    PROTOCOL_NUMBER: /A(\d+)/,
    CAN_DESCRIPTION: /CAN \(([^)]+)\)/,
  },
  RETRIES: {
    ECHO_OFF: 3,
    INIT_COMMANDS: 2,
  },
  DELAYS: {
    AFTER_INIT: DELAYS.PROTOCOL * 2,
    AFTER_ECHO: DELAYS.PROTOCOL,
    AFTER_RESET: DELAYS.RESET * 2,
    AFTER_COMMAND: DELAYS.PROTOCOL,
  },
};
```

## docs/ecu-ECUConnector.js

```javascript
// filepath: docs/ecu-ECUConnector.js
import {
  createRawECUConnector,
  log as logMain,
} from '@src/helper/OBDManagerHelper/OBDUtils';
import { setECUStatus } from '@src/store/obdLiveDataSlice/__OBDU';

import ElmProtocol from './ECUConnector/decoder/lib/ElmProtocol';
import ProtocolServiceBased from './ECUConnector/ProtocolServiceBased';

const log = (...props) => {
  // TODO: remove this after testing
  // return;

  if (typeof props[1] === 'string') {
    props[1] = `[ECUConnector] ${props[1]}`;
  }

  logMain(...props);
};

class ECUConnector {
  constructor(obdMonitor) {
    this.obdMonitor = obdMonitor;
    this.protocolServiceBased = ProtocolServiceBased.getInstance(obdMonitor);
    this.connector = createRawECUConnector(obdMonitor);
    this.lastCommand = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.currentProtocol = null;
    this.isConnected = false;
  }

  // Connection methods for each type
  async tryProtocolServiceConnection() {
    try {
      const connected = await this.protocolServiceBased.connectToECU();

      if (connected) {
        setECUStatus(true);
        this.currentProtocol =
          this.protocolServiceBased.elmProtocol?.currentProtocol;
        this.isConnected = true;
        const protocolDesc = this.getProtocolDescription(this.currentProtocol);

        this.logSuccess('ProtocolService', protocolDesc);

        return true;
      }

      setECUStatus(false);
      this.isConnected = false;
      this.logFailure('ProtocolService');
    } catch (error) {
      this.isConnected = false;
      this.logError('ProtocolService', error);
    }

    return false;
  }

  // Helper methods
  getProtocolDescription(protocol) {
    return protocol !== null
      ? ElmProtocol.PROT_DESCRIPTIONS[protocol]
      : 'Unknown';
  }

  async sendCommand(command) {
    this.lastCommand = command;
    const response = await this.connector.sendCommand(command);

    if (response && response.trim().toLowerCase() === 'stopped') {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        await this.connector.sendCommand('ATPC'); // Send Protocol Close
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        return this.sendCommand(command); // Retry the command
      } else {
        this.retryCount = 0;
        throw new Error(`Max retries exceeded for command: ${command}`);
      }
    }

    this.retryCount = 0;

    return response;
  }

  async getProtocol() {
    return this.currentProtocol;
  }

  resetDevice() {
    this.currentProtocol = null;
    this.isConnected = false;
    this.connector.sendCommand('ATD');
    this.connector.sendCommand('ATZ');
  }

  // Logging methods
  logSuccess(method, protocol = null) {
    log('info', '=== Connection Successful ===');
    log('info', `Method: ${method}`);

    if (protocol) {
      log('info', `Protocol: ${protocol}`);
    }
  }

  logFailure(method) {
    log('error', `=== ${method} Connection Failed ===`);
  }

  logError(method, error) {
    log('error', `=== ${method} Error ===`);
    log('error', `Error: ${error.message}`);
  }

  logSummary() {
    log('error', '=== Connection Process Summary ===');
    log('error', 'All connection methods failed');
  }

  // Main connection method
  async connectToECU() {
    log('info', '=== Starting ECU Connection Process ===');

    // Try each connection method in sequence
    if (await this.tryProtocolServiceConnection()) return true;

    this.resetDevice();

    this.logSummary();

    return false;
  }

  // Singleton management
  static getInstance(obdMonitor) {
    if (!ECUConnector.instance) {
      ECUConnector.instance = new ECUConnector(obdMonitor);
    } else if (obdMonitor) {
      // Update obdMonitor reference if provided
      ECUConnector.instance.obdMonitor = obdMonitor;
      ECUConnector.instance.protocolServiceBased =
        ProtocolServiceBased.getInstance(obdMonitor);
      ECUConnector.instance.connector = createRawECUConnector(obdMonitor);
    }

    return ECUConnector.instance;
  }

  static resetInstance() {
    if (ECUConnector.instance) {
      ECUConnector.instance.currentProtocol = null;
      ECUConnector.instance.isConnected = false;
      ECUConnector.instance.retryCount = 0;
      ECUConnector.instance.lastCommand = null;
    }

    ECUConnector.instance = null;
  }
}

export default ECUConnector;
```

## docs/ecu-ElmProtocol.js

```javascript
// filepath: docs/ecu-ElmProtocol.js
import {
  DELAYS,
  PROT,
  PROT_DESCRIPTIONS,
  PROTOCOL_PRIORITIES,
} from '@src/helper/OBDManagerHelper/OBDUtils';

import ElmProtocolHelper from './ElmProtocolHelper';
import ElmProtocolInit from './ElmProtocolInit';
import ElmProtocolTelegramProtocol from './ElmProtocolTelegramProtocol';
import Protocol from './Protocol';

/**
 * Manages ELM protocol communication and state.
 * Extends Protocol class for base functionality.
 */
class ElmProtocol extends Protocol {
  static PROT = PROT;
  static PROT_DESCRIPTIONS = PROT_DESCRIPTIONS;
  static instance = null;

  /**
   * Creates a new ElmProtocol instance with trait-based method mixing
   * @param {Object} handlers - Protocol handlers
   */
  constructor(handlers) {
    if (ElmProtocol.instance) {
      ElmProtocol.instance.updateHandlers(handlers);

      return ElmProtocol.instance;
    }

    super(handlers);

    // Initialize all properties
    ElmProtocolInit.initializeProtocol(this, handlers);

    // Mix in all protocol methods as traits
    this.bindAllMethods();

    ElmProtocol.instance = this;

    return this;
  }

  /**
   * Get singleton instance
   * @param {Object} handlers - Protocol handlers
   * @returns {ElmProtocol} The singleton instance
   */
  static getInstance(handlers) {
    if (!ElmProtocol.instance) {
      new ElmProtocol(handlers);
    } else if (handlers) {
      ElmProtocol.instance.updateHandlers(handlers);
    }

    return ElmProtocol.instance;
  }

  /**
   * Reset singleton instance
   */
  static resetInstance() {
    if (ElmProtocol.instance) {
      ElmProtocol.instance.reset();
      ElmProtocol.instance = null;
    }
  }

  /**
   * Updates handlers and reinitializes protocol
   * @param {Object} handlers - New handlers
   */
  updateHandlers(handlers) {
    if (!handlers) return;

    // Update base protocol handlers
    super.updateHandlers(handlers);

    // Reinitialize protocol with new handlers
    ElmProtocolInit.initializeProtocol(this, handlers);

    // Rebind all methods to ensure proper context
    this.bindAllMethods();
  }

  /**
   * Binds all methods from helper classes as traits
   * @private
   */
  bindAllMethods() {
    // Mix in all protocol methods
    const boundMethods = new Set();

    // First bind protocol detection methods
    Object.getOwnPropertyNames(ElmProtocolTelegramProtocol).forEach(method => {
      if (
        Object.hasOwn(ElmProtocolTelegramProtocol, method) &&
        typeof ElmProtocolTelegramProtocol[method] === 'function' &&
        !boundMethods.has(method)
      ) {
        this[method] = ElmProtocolTelegramProtocol[method].bind(this);
        boundMethods.add(method);
      }
    });

    // Then bind helper methods, but skip if already bound
    Object.getOwnPropertyNames(ElmProtocolHelper).forEach(method => {
      if (
        Object.hasOwn(ElmProtocolHelper, method) &&
        typeof ElmProtocolHelper[method] === 'function' &&
        !boundMethods.has(method)
      ) {
        this[method] = ElmProtocolHelper[method].bind(this);
        boundMethods.add(method);
      }
    });
  }

  /**
   * Resets the protocol state
   */
  reset() {
    super.reset();
    // Clear all bound methods
    Object.getOwnPropertyNames(this).forEach(prop => {
      if (
        typeof this[prop] === 'function' &&
        (ElmProtocolTelegramProtocol[prop] || ElmProtocolHelper[prop])
      ) {
        delete this[prop];
      }
    });
    // Reinitialize with current handlers
    ElmProtocolInit.initializeProtocol(this, this.handlers);
  }

  async initialize() {
    try {
      this.handlers.log?.(
        'info',
        '[ELM] Starting protocol initialization sequence',
      );
      this.setStatus(Protocol.STATUS.INITIALIZING);

      await this.reset();
      await this.delay(DELAYS.RESET);

      const commands = [
        { cmd: 'ATL0', desc: 'Disable linefeeds' },
        { cmd: 'ATS0', desc: 'Disable spaces' },
        { cmd: 'ATH0', desc: 'Disable headers' },
        { cmd: 'ATE0', desc: 'Disable echo' },
        { cmd: 'ATSP0', desc: 'Set auto protocol' },
      ];

      for (const { cmd } of commands) {
        const response = await this.sendCommand(cmd);

        if (!this.isValidResponse(response)) {
          this.handlers.log?.(
            'error',
            `[ELM] Failed to initialize with command: ${cmd}`,
          );
          throw new Error(`Failed to initialize with command: ${cmd}`);
        }

        await this.delay(DELAYS.COMMAND);
      }

      const timingSuccess = await this.initializeAdaptiveTiming();

      if (!timingSuccess) {
        this.handlers.log?.(
          'warn',
          '[ELM] Adaptive timing initialization failed, using default timing',
        );
      }

      this.setStatus(Protocol.STATUS.INITIALIZED);
      this.handlers.log?.(
        'success',
        '[ELM] Protocol initialization completed successfully',
      );
    } catch (error) {
      this.setStatus(Protocol.STATUS.ERROR);
      this.handlers.log?.('error', '[ELM] Protocol initialization failed', {
        error: error.message,
        status: this.getStatus(),
      });
      throw error;
    }
  }

  async initializeDevice() {
    try {
      this.handlers.log?.(
        'info',
        '[ELM] Starting device initialization sequence',
      );
      this.setStatus(Protocol.STATUS.INITIALIZING);
      await this.delay(DELAYS.PROTOCOL);
      const initCommands = [];

      initCommands.push({ cmd: 'ATE0', desc: 'Echo off' });
      initCommands.push({ cmd: 'ATL0', desc: 'Linefeeds off' });
      initCommands.push({ cmd: 'ATS0', desc: 'Spaces off' });
      initCommands.push({ cmd: 'ATH0', desc: 'Headers off' });
      for (const { cmd } of initCommands) {
        const response = await this.sendCommand(cmd);

        if (!this.isValidResponse(response)) {
          this.handlers.log?.(
            'error',
            `[ELM] Failed to initialize with command: ${cmd}`,
          );
          throw new Error(`Failed to initialize with command: ${cmd}`);
        }

        await this.delay(DELAYS.PROTOCOL);
      }

      this.setStatus(Protocol.STATUS.INITIALIZED);
      this.handlers.log?.(
        'success',
        '[ELM] Device initialization completed successfully',
      );
    } catch (error) {
      this.setStatus(Protocol.STATUS.ERROR);
      this.handlers.log?.('error', '[ELM] Device initialization failed', {
        error: error.message,
        status: this.getStatus(),
      });
      throw error;
    }
  }

  async tryAllProtocols() {
    try {
      this.handlers.log?.(
        'info',
        '[ELM] Starting comprehensive protocol detection sequence',
      );

      await this.sendCommand('ATZ');
      await this.delay(DELAYS.RESET);

      const initCommands = [
        { cmd: 'ATE0', desc: 'Echo off' },
        { cmd: 'ATL0', desc: 'Linefeeds off' },
        { cmd: 'ATH1', desc: 'Headers on' },
        { cmd: 'ATST64', desc: 'Timeout 100ms' },
        { cmd: 'ATAT0', desc: 'Disable adaptive timing' },
      ];

      for (const { cmd } of initCommands) {
        await this.sendCommand(cmd);
      }

      await this.sendCommand('ATSP0');
      await this.handle0100Command();

      const { protocol: detectedProtocol } = await this.checkProtocolNumber();

      if (detectedProtocol) {
        let protocolConfigs = PROTOCOL_PRIORITIES.filter(
          p => p.protocol === detectedProtocol,
        ).sort((a, b) => a.priority - b.priority);

        if (protocolConfigs.length === 0) {
          const isCanProtocol = detectedProtocol >= 6 && detectedProtocol <= 9;
          const is11BitCan =
            isCanProtocol && (detectedProtocol === 6 || detectedProtocol === 8);
          const is29BitCan =
            isCanProtocol && (detectedProtocol === 7 || detectedProtocol === 9);

          const baseConfig = {
            protocol: detectedProtocol,
            desc:
              PROT_DESCRIPTIONS[detectedProtocol] || 'Auto-detected protocol',
            canType: is11BitCan ? '11bit' : is29BitCan ? '29bit' : null,
          };

          if (is11BitCan) {
            protocolConfigs = [
              {
                ...baseConfig,
                priority: 1,
                header: '7DF',
                receiveFilter: '7E8',
                flowControl: '7E0',
              },
              {
                ...baseConfig,
                priority: 1.5,
                desc: `${baseConfig.desc} Alt`,
                header: '7E0',
                receiveFilter: '7E8',
                flowControl: '7E0',
              },
            ];
          } else if (is29BitCan) {
            protocolConfigs = [
              {
                ...baseConfig,
                header: '18DB33F1',
                receiveFilter: '18DAF110',
                flowControl: '18DA10F1',
              },
            ];
          } else {
            protocolConfigs = [baseConfig];
          }
        }

        for (const config of protocolConfigs) {
          this.handlers.log?.(
            'info',
            `[ELM] Testing auto-detected protocol configuration`,
          );

          if (
            await this.tryProtocolWithEcuDetection(
              detectedProtocol,
              config.desc,
              config.canType
                ? {
                    header: config.header,
                    receiveFilter: config.receiveFilter,
                    flowControl: config.flowControl,
                  }
                : null,
            )
          ) {
            this.handlers.log?.(
              'success',
              '[ELM] Auto-detected protocol validated successfully',
            );

            return true;
          }
        }
      }

      const protocolsToTry = PROTOCOL_PRIORITIES.filter(
        p => p.protocol >= 1 && p.protocol <= 9,
      ).sort((a, b) => a.priority - b.priority);

      for (const config of protocolsToTry) {
        if (config.protocol === detectedProtocol) continue;

        this.handlers.log?.('info', `[ELM] Testing protocol: ${config.desc}`);

        await this.sendCommand('ATZ');
        await this.delay(DELAYS.RESET);
        await this.sendCommand('ATE0');
        await this.sendCommand('ATH1');

        if (
          await this.tryProtocolWithEcuDetection(
            config.protocol,
            config.desc,
            config.canType
              ? {
                  header: config.header,
                  receiveFilter: config.receiveFilter,
                  flowControl: config.flowControl,
                }
              : null,
          )
        ) {
          this.handlers.log?.(
            'success',
            '[ELM] Protocol validated successfully',
          );

          return true;
        }
      }

      this.handlers.log?.(
        'error',
        '[ELM] Protocol detection failed - all protocols tested without success',
      );

      return false;
    } catch (error) {
      this.handlers.log?.('error', '[ELM] Protocol detection sequence failed', {
        error: error.message,
        status: this.getStatus(),
      });

      return false;
    }
  }
}

export default ElmProtocol;
```

## docs/ecu-ElmProtocolHelper.js

```javascript
// filepath: docs/ecu-ElmProtocolHelper.js
import { DEMO_DEVICE } from '@src/components';
import {
  CMD,
  DELAYS,
  PROT,
  RESPONSE_PATTERNS,
  TEST_COMMANDS,
} from '@src/helper/OBDManagerHelper/OBDUtils';

import ElmProtocolInit from './ElmProtocolInit';
import Protocol from './Protocol';

/**
 * Helper functions for ELM protocol handling
 */
const ElmProtocolHelper = {
  async queryNextEcu() {
    const addresses = Array.from(this.ecuAddresses);

    if (addresses.length <= 1) {
      this.handlers.log?.(
        'info',
        '[ELM-Helper] No additional ECUs available for query',
        {
          currentEcu: this.selectedEcuAddress,
          totalEcus: addresses.length,
        },
      );

      return false;
    }

    const currentIndex = addresses.indexOf(this.selectedEcuAddress);
    const nextIndex = (currentIndex + 1) % addresses.length;
    const nextAddress = addresses[nextIndex];

    this.handlers.log?.('info', '[ELM-Helper] Switching to next ECU', {
      currentEcu: this.selectedEcuAddress,
      nextEcu: nextAddress,
      availableEcus: addresses,
      totalEcus: addresses.length,
    });

    return await this.selectEcu(nextAddress);
  },

  extractEcuAddress(response, protocol, bitFormat = null) {
    // Try new logic with bitFormat first
    if (bitFormat) {
      // Clean up response
      const cleanResponse = response.replace(/[\r\n\s]/g, '').toUpperCase();

      // Find address end (start of service response)
      const adrEnd =
        cleanResponse.indexOf('41') >= 0
          ? cleanResponse.indexOf('41')
          : cleanResponse.indexOf('7F01');

      if (adrEnd < 0) return null;

      // Find address start
      const adrStart = cleanResponse.lastIndexOf('.') + 1;

      if (adrEnd <= adrStart) return null;

      let adrLen = adrEnd - adrStart;
      let addressStart = adrStart;

      // Apply bit format specific logic
      if (bitFormat === '29bit' && cleanResponse.startsWith('18DA')) {
        adrLen = 8;
        addressStart = adrStart;
      } else if (bitFormat === '11bit' && cleanResponse.match(/7E[0-9A-F]/)) {
        adrLen = 3;
      } else {
        // If format doesn't match expected patterns, fall back to old logic
        return this.extractEcuAddress(response, protocol);
      }

      const address = cleanResponse.substring(
        addressStart,
        addressStart + adrLen,
      );

      // If we got a valid address, return it
      if (address && address.length > 0) {
        return address;
      }
    }

    // Fall back to original golden logic if bitFormat is null or new logic failed
    // Clean up response
    const cleanResponse = response.replace(/[\r\n\s]/g, '').toUpperCase();

    // Find address end (start of service response)
    const adrEnd =
      cleanResponse.indexOf('41') >= 0
        ? cleanResponse.indexOf('41')
        : cleanResponse.indexOf('7F01');

    if (adrEnd < 0) return null;

    // Find address start
    const adrStart = cleanResponse.lastIndexOf('.') + 1;

    if (adrEnd <= adrStart) return null;

    // Get address length
    let adrLen = adrEnd - adrStart;
    let addressStart = adrStart;

    // Handle different address formats
    if (adrLen % 2 !== 0) {
      // Odd address length -> CAN with frame type
      adrLen = 3;
    } else if (adrLen === 6) {
      // ISO9141/KWP2000 address format <FF><RR><SS>
      adrLen = 2;
      addressStart = adrEnd - adrLen;
    } else if (adrLen === 10) {
      // 29-bit CAN address
      adrLen = 8;
      addressStart = adrStart;
    }

    const address = cleanResponse.substring(
      addressStart,
      addressStart + adrLen,
    );

    // Additional validation for ISO/KWP protocols
    if (protocol === PROT.ISO9141 || protocol === PROT.ISO14230_4ST) {
      // Check if we have a valid ISO format header
      const isoMatch = cleanResponse.match(/^(48|68)([0-9A-F]{2})(6B|6D)/i);

      if (isoMatch) {
        return isoMatch[2]; // Return the receiver address part
      }
    }

    return address;
  },

  /**
   * Detect CAN bit format from ECU address
   * @param {string} address - ECU address from response
   * @returns {'11bit' | '29bit' | null} The detected bit format or null if not a valid CAN address
   */
  detectCanBitFormat(address) {
    if (!address) return null;

    // Clean the address exactly like extractEcuAddress does
    const cleanAddr = address.replace(/[\r\n\s]/g, '').toUpperCase();

    // Only detect format for complete CAN messages
    // 29-bit: Must start with 18DA and be exactly 6 chars (without frame type)
    if (cleanAddr.startsWith('18DA') && cleanAddr.length >= 6) {
      return '29bit';
    }

    // 11-bit: Must be exactly 7Ex format
    if (cleanAddr.match(/^7E[0-9A-F]$/)) {
      return '11bit';
    }

    // If not a clearly identifiable CAN format, return null
    return null;
  },

  /**
   * Format header based on protocol and address
   * @param {string} address - ECU address
   * @returns {string} Formatted header
   */
  formatHeader(address) {
    if (!address) return '';

    // Clean address for consistency
    const cleanAddr = address.replace(/[\r\n\s]/g, '').toUpperCase();

    switch (this.currentProtocol) {
      // ISO 9141-2 Protocol
      case PROT.ISO9141:
        return `68${cleanAddr}6B`;

      // ISO 14230-4 KWP Protocol
      case PROT.ISO14230_4ST:
      case PROT.ISO14230_4FT:
        return `68${cleanAddr}6B`;

      // CAN 29-bit Protocols (ISO 15765-4)
      case PROT.ISO15765_29_250:
      case PROT.ISO15765_29_500:
        // If address already includes 18DA prefix, use as is
        return cleanAddr.startsWith('18DA') ? cleanAddr : `18DA${cleanAddr}`;

      // CAN 11-bit Protocols (ISO 15765-4)
      case PROT.ISO15765_11_250:
      case PROT.ISO15765_11_500:
        // If address already includes 7E prefix, use as is
        return cleanAddr.startsWith('7E') ? cleanAddr : `7E${cleanAddr}`;

      // SAE J1850 Protocols
      case PROT.J1850PWM:
      case PROT.J1850VPW:
        return cleanAddr; // No header modification needed

      // Default case - handle unknown protocols safely
      default:
        // If address has clear format indicators, preserve them
        if (cleanAddr.startsWith('18DA')) {
          return cleanAddr; // Preserve 29-bit format
        } else if (cleanAddr.startsWith('7E')) {
          return cleanAddr; // Preserve 11-bit format
        } else if (cleanAddr.length <= 2) {
          return `7E${cleanAddr}`; // Default to 11-bit for short addresses
        }

        return cleanAddr; // Keep original if format unclear
    }
  },

  async handleEcuDetection(response) {
    if (!response) {
      return false;
    }

    const cleanResponse = response.replace(/[\r\n\s]/g, '').toUpperCase();
    const foundAddresses = new Set();

    const patterns = {
      standard: /7E[0-9A-F]/g,
      extended: /18DA[0-9A-F]{2}/g,
      custom: /[0-9A-F]{3}/g,
    };

    Object.entries(patterns).forEach(([format, pattern]) => {
      const matches = cleanResponse.match(pattern) || [];

      matches.forEach(match => {
        const address =
          format === 'standard'
            ? match.slice(-1)
            : format === 'extended'
              ? match.slice(-2)
              : match;

        if (address) {
          foundAddresses.add(address);

          // Only log format if we're absolutely certain
          if (format === 'standard' || format === 'extended') {
            const bitFormat = this.detectCanBitFormat(match);

            if (bitFormat) {
              // First try with bitFormat
              const extractedWithFormat = this.extractEcuAddress(
                response,
                this.currentProtocol,
                bitFormat,
              );

              if (extractedWithFormat) {
                foundAddresses.add(extractedWithFormat);
              }

              this.handlers.log?.('debug', '[ELM-Helper] Detected CAN format', {
                address: match,
                format: bitFormat,
              });
            }
          }
        }
      });
    });

    // If no addresses found with bitFormat, or as additional validation,
    // try without bitFormat (original golden logic)
    const extractedAddress = this.extractEcuAddress(
      response,
      this.currentProtocol,
    );

    if (extractedAddress) {
      foundAddresses.add(extractedAddress);
    }

    foundAddresses.forEach(address => {
      this.ecuAddresses.add(address);

      if (!this.selectedEcuAddress) {
        this.selectedEcuAddress = address;
        this.currentHeader = this.formatHeader(address);

        this.handlers.log?.('info', '[ELM-Helper] Default ECU selected', {
          address,
          header: this.currentHeader,
          protocol: this.currentProtocol,
        });
      }
    });

    const success = this.ecuAddresses.size > 0;

    if (success) {
      this.handlers.log?.(
        'success',
        '[ELM-Helper] ECU detection completed successfully',
      );
      this.handlers.onEcuDetected?.(Array.from(this.ecuAddresses));
    }

    return success;
  },

  async connectToECU() {
    try {
      this.retryCount = 0;
      this.currentProtocol = await this.handlers.getProtocol();
      this.handlers.log?.(
        'info',
        '[ELM-Helper] Starting ECU connection sequence',
      );

      const firstCommandResult = await this.firstCommand();

      if (firstCommandResult === 'demo') {
        this.handlers.log?.(
          'info',
          '[ELM-Helper] Demo device detected - skipping normal initialization',
        );

        return true;
      }

      await this.delay(DELAYS.RESET);
      await this.sendCommand('ATZ');
      await this.delay(DELAYS.RESET);

      if (await this.tryAllProtocols()) {
        if (!this.currentProtocol || this.currentProtocol === 0) {
          this.handlers.log?.(
            'error',
            '[ELM-Helper] Protocol detection failed - no valid protocol set',
          );
          this.setStatus(Protocol.STATUS.ERROR);

          return false;
        }

        await this.initializeDevice();
        await this.setProtocol(this.currentProtocol);

        this.setStatus(Protocol.STATUS.CONNECTED);
        this.handlers.log?.(
          'success',
          '[ELM-Helper] ECU connection established successfully',
        );

        await this.handlers.setProtocol(this.currentProtocol);

        return true;
      }

      this.setStatus(Protocol.STATUS.ERROR);
      throw new Error('Protocol detection failed');
    } catch (error) {
      this.setStatus(Protocol.STATUS.ERROR);
      this.handlers.log?.('error', '[ELM-Helper] ECU connection failed', {
        error: error.message,
        protocol: this.currentProtocol,
      });

      return false;
    }
  },

  async testProtocol(protocol, desc) {
    this.handlers.log?.('info', '[ELM-Helper] Starting protocol test', {
      protocol,
      description: desc,
      currentStatus: this.getStatus(),
    });

    const protocolCmd = this.createCommand(CMD.SETPROT, protocol);
    const protocolResponse = await this.sendCommand(protocolCmd);

    if (!this.isValidResponse(protocolResponse)) {
      this.handlers.log?.('warn', '[ELM-Helper] Protocol setup failed', {
        protocol,
        description: desc,
        response: protocolResponse,
        command: protocolCmd,
      });

      return false;
    }

    await this.delay(DELAYS.PROTOCOL);

    const testCommands = TEST_COMMANDS;

    for (const {
      cmd,
      desc: cmdDesc,
      response: expectedResponse,
    } of testCommands) {
      this.handlers.log?.('debug', '[ELM-Helper] Testing protocol command', {
        protocol,
        command: cmd,
        description: cmdDesc,
        expectedResponse,
      });

      const response = await this.sendCommand(cmd);

      if (!response) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] No response for test command',
          {
            protocol,
            command: cmd,
            description: cmdDesc,
          },
        );
        continue;
      }

      const errorPatterns = Object.values(RESPONSE_PATTERNS.ERROR);

      if (errorPatterns.some(pattern => response.includes(pattern))) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Protocol test received error response',
          {
            protocol,
            description: desc,
            response,
            matchedPattern: errorPatterns.find(p => response.includes(p)),
          },
        );

        return false;
      }

      if (this.isValidResponseFormat(response, expectedResponse)) {
        this.handlers.log?.(
          'success',
          '[ELM-Helper] Protocol test successful',
          {
            protocol,
            description: desc,
            command: cmd,
            commandDesc: cmdDesc,
            response,
          },
        );

        return true;
      }

      await this.delay(DELAYS.PROTOCOL);
    }

    this.handlers.log?.(
      'warn',
      '[ELM-Helper] Protocol test failed - all commands unsuccessful',
      {
        protocol,
        description: desc,
        testedCommands: testCommands.map(tc => tc.cmd),
      },
    );

    return false;
  },

  async tryProtocolWithEcuDetection(protocol, desc, canConfig = null) {
    try {
      if (typeof protocol !== 'number' || protocol < 0 || protocol > 9) {
        this.handlers.log?.('error', '[ELM-Helper] Invalid protocol number', {
          protocol,
          description: desc,
        });

        return false;
      }

      this.handlers.log?.(
        'debug',
        `[ELM-Helper] Testing protocol configuration`,
        {
          protocol,
          description: desc,
          canConfig: canConfig ? 'Using custom CAN config' : 'Standard config',
        },
      );

      // Set protocol
      await this.sendCommand(`ATSP${protocol}`);
      await this.delay(DELAYS.PROTOCOL);

      // Try 0100 command first
      await this.handle0100Command(3);

      // Protocol specific settings
      if (canConfig) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Applying CAN protocol configuration',
          canConfig,
        );
        const canCommands = [
          { cmd: 'ATCAF1', desc: 'CAN Formatting ON' },
          { cmd: `ATSH${canConfig.header}`, desc: 'Set Header' },
          { cmd: `ATCF${canConfig.receiveFilter}`, desc: 'Set Filter' },
        ];

        for (const { cmd, desc } of canCommands) {
          this.handlers.log?.('debug', `[ELM-Helper] ${desc}`, {
            command: cmd,
          });
          await this.sendCommand(cmd);
        }
      }

      // Test sequence for additional commands
      const testCommands = [
        { cmd: '0902', desc: 'VIN Message', needsFlowControl: true },
        { cmd: '0901', desc: 'VIN Data', needsFlowControl: true },
      ];

      for (const { cmd, desc, needsFlowControl } of testCommands) {
        this.handlers.log?.('debug', `[ELM-Helper] Testing ${desc}`, {
          command: cmd,
          protocol,
          description: desc,
        });

        // First try without flow control
        await this.sendCommand('ATFCSM0');
        let response = await this.sendCommand(cmd);

        // If response indicates need for flow control, try with flow control
        if (
          needsFlowControl &&
          canConfig &&
          (!this.isValidResponse(response) ||
            response.includes('WAITING') ||
            this.isErrorResponse(response))
        ) {
          this.handlers.log?.(
            'debug',
            `[ELM-Helper] Attempting with flow control for ${desc}`,
          );

          // Try different flow control configurations for this specific command
          const flowControlSuccess = await this.tryFlowControlConfigs(
            canConfig.flowControl,
            cmd,
          );

          if (flowControlSuccess) {
            response = await this.sendCommand(cmd);
          }
        }

        if (!response) {
          this.handlers.log?.('debug', `[ELM-Helper] No response for ${desc}`, {
            command: cmd,
            protocol,
          });
          continue;
        }

        // Check for error responses
        const errorPatterns = Object.values(RESPONSE_PATTERNS.ERROR);

        if (errorPatterns.some(pattern => response.includes(pattern))) {
          this.handlers.log?.('debug', `[ELM-Helper] Error response received`, {
            command: cmd,
            response,
            protocol,
          });
          continue;
        }

        // Check for valid response
        if (this.isValidResponse(response)) {
          this.handlers.log?.('debug', `[ELM-Helper] Valid response received`, {
            command: cmd,
            response,
            protocol,
          });

          const ecuDetected = await this.handleEcuDetection(response);

          if (ecuDetected) {
            this.currentProtocol = protocol;
            await this.setProtocol(protocol);

            this.handlers.log?.(
              'success',
              `[ELM-Helper] Protocol validated successfully`,
              {
                protocol,
                description: desc,
                ecus: Array.from(this.ecuAddresses),
                response,
              },
            );

            return true;
          }
        }

        await this.delay(DELAYS.PROTOCOL);
      }

      this.handlers.log?.(
        'debug',
        `[ELM-Helper] Protocol ${desc} failed validation`,
        {
          protocol,
          description: desc,
        },
      );

      return false;
    } catch (error) {
      this.handlers.log?.('error', `[ELM-Helper] Protocol test failed`, {
        protocol,
        description: desc,
        error: error.message,
      });

      return false;
    }
  },

  async tryFlowControlConfigs(flowControlAddress, testCommand) {
    const flowControlConfigs = [
      // Standard configuration
      {
        fcsh: flowControlAddress,
        fcsd: '300000',
        fcsm: '1',
        desc: 'Standard flow control',
      },
      // Alternative with shorter wait time
      {
        fcsh: flowControlAddress,
        fcsd: '300000',
        fcsm: '0',
        desc: 'No wait flow control',
      },
      // Alternative with longer wait time
      {
        fcsh: flowControlAddress,
        fcsd: '300008',
        fcsm: '1',
        desc: 'Extended wait flow control',
      },
      // Alternative with different block size
      {
        fcsh: flowControlAddress,
        fcsd: '300400',
        fcsm: '1',
        desc: 'Different block size flow control',
      },
    ];

    for (const config of flowControlConfigs) {
      this.handlers.log?.(
        'debug',
        `[ELM-Helper] Trying ${config.desc}`,
        config,
      );

      await this.sendCommand(`ATFCSH${config.fcsh}`);
      await this.sendCommand(`ATFCSD${config.fcsd}`);
      await this.sendCommand(`ATFCSM${config.fcsm}`);

      const testResponse = await this.sendCommand(testCommand);

      if (
        this.isValidResponse(testResponse) &&
        !this.isErrorResponse(testResponse)
      ) {
        this.handlers.log?.(
          'success',
          `[ELM-Helper] Flow control established with ${config.desc}`,
        );

        return true;
      }

      await this.delay(DELAYS.PROTOCOL);
    }

    this.handlers.log?.(
      'warn',
      '[ELM-Helper] Could not establish optimal flow control',
    );

    return false;
  },

  async firstCommand() {
    const firstResponse = await this.sendCommand('\r');

    if (
      typeof firstResponse === 'string' &&
      firstResponse.includes(DEMO_DEVICE)
    ) {
      this.handlers.log?.('info', '[ELM-Helper] Demo device detected');
      this.currentProtocol = 0;
      await this.handlers.setProtocol(this.currentProtocol);

      return 'demo';
    }

    return 'normal';
  },

  // Delegate core functionality to ElmProtocolInit
  getProtocolTimingConfig(...args) {
    return ElmProtocolInit.getProtocolTimingConfig.call(this, ...args);
  },

  getProtocolEcuConfig(...args) {
    return ElmProtocolInit.getProtocolEcuConfig.call(this, ...args);
  },

  getValidPatternsForProtocol(...args) {
    return ElmProtocolInit.getValidPatternsForProtocol.call(this, ...args);
  },

  initializeAdaptiveTiming(...args) {
    return ElmProtocolInit.initializeAdaptiveTiming.call(this, ...args);
  },
  // Core helper methods
  isCanProtocol(protocol) {
    if (!protocol) return false;

    // CAN protocols are typically 6 and above in the ELM327
    return protocol >= 6 && protocol <= 12;
  },

  // Delegate core protocol operations to ElmProtocolInit
  createCommand(...args) {
    return ElmProtocolInit.createCommand.call(this, ...args);
  },

  getResponseId(...args) {
    return ElmProtocolInit.getResponseId.call(this, ...args);
  },

  delay(...args) {
    return ElmProtocolInit.delay.call(this, ...args);
  },

  reset(...args) {
    return ElmProtocolInit.reset.call(this, ...args);
  },

  setProtocol(...args) {
    return ElmProtocolInit.setProtocol.call(this, ...args);
  },

  sendCommand(...args) {
    return ElmProtocolInit.sendCommand.call(this, ...args);
  },

  isValidResponse(...args) {
    return ElmProtocolInit.isValidResponse.call(this, ...args);
  },

  setStatus(status) {
    return ElmProtocolInit.setStatus.call(this, status);
  },

  getStatus() {
    return ElmProtocolInit.getStatus.call(this);
  },

  isErrorResponse(...args) {
    return ElmProtocolInit.isErrorResponse.call(this, ...args);
  },

  isValidResponseFormat(...args) {
    return ElmProtocolInit.isValidResponseFormat.call(this, ...args);
  },

  isValidVinResponse(...args) {
    return ElmProtocolInit.isValidVinResponse.call(this, ...args);
  },

  selectEcu(...args) {
    return ElmProtocolInit.selectEcu.call(this, ...args);
  },

  handle0100Command(...args) {
    return ElmProtocolInit.handle0100Command.call(this, ...args);
  },

  checkProtocolNumber(...args) {
    return ElmProtocolInit.checkProtocolNumber.call(this, ...args);
  },
};

export default ElmProtocolHelper;

export const flushEverything = () =>
  ElmProtocolInit.flushEverything(ElmProtocolHelper);
```

## docs/ecu-ElmProtocolInit.js

```javascript
// filepath: docs/ecu-ElmProtocolInit.js
import {
  CMD,
  DELAYS,
  OBD_SVC,
  PROT,
  PROT_DESCRIPTIONS,
} from '@src/helper/OBDManagerHelper/OBDUtils';

import Protocol from './Protocol';

/**
 * Initialization helper for ElmProtocol
 * Provides initialization methods while keeping the core functionality in ElmProtocol
 */
const ElmProtocolInit = {
  /**
   * Check if protocol is CAN
   * @param {number} protocol - Protocol number
   * @returns {boolean} True if protocol is CAN
   */
  isCanProtocol(protocol) {
    if (!protocol) return false;

    // CAN protocols are 6 (11/500), 7 (29/500), 8 (11/250), 9 (29/250)
    return protocol >= 6 && protocol <= 9;
  },

  /**
   * Calculate flow control header for CAN based on ECU address
   * @param {string} addr - ECU address
   * @returns {string} Flow control header
   */
  getFlowControlHeader(addr) {
    if (!addr) return '7E0'; // Default

    // For 11-bit CAN (7Ex)
    if (addr.startsWith('7E')) {
      const ecuNum = parseInt(addr.slice(2), 16);

      return `7E${(ecuNum - 8).toString(16).toUpperCase()}`;
    }

    // For 29-bit CAN
    if (addr.startsWith('18DA')) {
      return '18DA10F1';
    }

    return '7E0'; // Fallback
  },

  /**
   * Initialize all required properties for an ElmProtocol instance
   * @param {Object} instance - The ElmProtocol instance to initialize
   * @param {Object} handlers - Protocol handlers
   */
  initializeProtocol(instance, handlers) {
    // First initialize adaptive timing
    this.initializeAdaptiveTiming(instance);

    // Then initialize all base properties
    this.initializeBaseProperties(instance);

    // Then set up OBD properties
    this.initializeOBDProperties(instance);

    // Set up handlers
    instance.handlers = handlers;

    return instance;
  },

  /**
   * Initialize base protocol properties
   * @private
   */
  initializeBaseProperties(instance) {
    // Reset all properties to initial state
    instance.lastCommand = null;
    instance.lastTxMsg = '';
    instance.lastRxMsg = '';
    instance.retryCount = 0;
    instance.maxRetries = 3;
    instance.currentProtocol = null;
    instance.ecuAddresses = new Set();
    instance.selectedEcuAddress = null;
    instance.currentHeader = null;
    instance.customInitCommands = [];
    instance.cmdQueue = [];
    instance.responsePending = false;
    instance.charsExpected = 0;
    instance.lastMsgId = 0;
    instance.status = Protocol.STATUS.UNDEFINED;
  },

  /**
   * Initialize adaptive timing configuration
   * @private
   */
  initializeAdaptiveTiming(instance) {
    instance.adaptiveTiming = {
      mode: 'OFF',
      currentDelay: DELAYS.ADAPTIVE_START,
      minDelay: DELAYS.ADAPTIVE_MIN,
      maxDelay: DELAYS.ADAPTIVE_MAX,
      increment: DELAYS.ADAPTIVE_INC,
      decrement: DELAYS.ADAPTIVE_DEC,
      adapt: success => {
        if (success) {
          instance.adaptiveTiming.currentDelay = Math.max(
            instance.adaptiveTiming.minDelay,
            instance.adaptiveTiming.currentDelay -
              instance.adaptiveTiming.decrement,
          );
        } else {
          instance.adaptiveTiming.currentDelay = Math.min(
            instance.adaptiveTiming.maxDelay,
            instance.adaptiveTiming.currentDelay +
              instance.adaptiveTiming.increment,
          );
        }

        return instance.adaptiveTiming.currentDelay;
      },
      reset: () => {
        instance.adaptiveTiming.currentDelay = DELAYS.ADAPTIVE_START;
        instance.adaptiveTiming.mode = 'NORMAL';
      },
    };
  },

  /**
   * Initialize OBD specific properties
   * @private
   */
  initializeOBDProperties(instance) {
    instance.service = OBD_SVC.NONE;
    instance.pidSupported = new Set();
    instance.pidsWrapped = false;
    instance.numCodes = 0;
    instance.msgService = OBD_SVC.NONE;
  },

  /**
   * Get protocol-specific timing configuration
   */
  getProtocolTimingConfig(protocol) {
    // Default timing config
    const defaultConfig = {
      adaptiveMode: 1,
      mode: 'NORMAL',
      timeout: DELAYS.TIMEOUT_NORMAL,
      startDelay: DELAYS.ADAPTIVE_START,
      minDelay: DELAYS.ADAPTIVE_MIN,
      maxDelay: DELAYS.ADAPTIVE_MAX,
      increment: DELAYS.ADAPTIVE_INC,
      decrement: DELAYS.ADAPTIVE_DEC,
    };

    // Protocol specific configurations
    const protocolConfigs = {
      // CAN protocols - faster timing
      [PROT.ISO15765_11_500]: {
        adaptiveMode: 2,
        mode: 'AGGRESSIVE',
        timeout: Math.floor(DELAYS.TIMEOUT_NORMAL * 0.6),
        startDelay: Math.floor(DELAYS.ADAPTIVE_START * 0.6),
        minDelay: Math.floor(DELAYS.ADAPTIVE_MIN * 0.6),
        maxDelay: Math.floor(DELAYS.ADAPTIVE_MAX * 0.6),
        increment: Math.floor(DELAYS.ADAPTIVE_INC * 0.8),
        decrement: Math.floor(DELAYS.ADAPTIVE_DEC * 1.2),
      },
      [PROT.ISO15765_29_500]: {
        adaptiveMode: 2,
        mode: 'AGGRESSIVE',
        timeout: Math.floor(DELAYS.TIMEOUT_NORMAL * 0.6),
        startDelay: Math.floor(DELAYS.ADAPTIVE_START * 0.6),
        minDelay: Math.floor(DELAYS.ADAPTIVE_MIN * 0.6),
        maxDelay: Math.floor(DELAYS.ADAPTIVE_MAX * 0.6),
        increment: Math.floor(DELAYS.ADAPTIVE_INC * 0.8),
        decrement: Math.floor(DELAYS.ADAPTIVE_DEC * 1.2),
      },
      // ISO9141 - slower timing
      [PROT.ISO9141]: {
        adaptiveMode: 1,
        mode: 'NORMAL',
        timeout: Math.floor(DELAYS.TIMEOUT_NORMAL * 1.2),
        startDelay: Math.floor(DELAYS.ADAPTIVE_START * 1.2),
        minDelay: Math.floor(DELAYS.ADAPTIVE_MIN * 1.2),
        maxDelay: Math.floor(DELAYS.ADAPTIVE_MAX * 1.2),
        increment: Math.floor(DELAYS.ADAPTIVE_INC * 1.2),
        decrement: Math.floor(DELAYS.ADAPTIVE_DEC * 0.8),
      },
      // KWP protocols - medium timing
      [PROT.ISO14230_4KW]: {
        adaptiveMode: 1,
        mode: 'NORMAL',
        timeout: DELAYS.TIMEOUT_NORMAL,
        startDelay: DELAYS.ADAPTIVE_START,
        minDelay: DELAYS.ADAPTIVE_MIN,
        maxDelay: DELAYS.ADAPTIVE_MAX,
        increment: DELAYS.ADAPTIVE_INC,
        decrement: DELAYS.ADAPTIVE_DEC,
      },
      // KWP2000 Fast - medium timing
      [PROT.ISO14230_4ST]: {
        adaptiveMode: 2,
        mode: 'NORMAL',
        timeout: Math.floor(DELAYS.TIMEOUT_NORMAL * 1.1),
        startDelay: Math.floor(DELAYS.ADAPTIVE_START * 1.1),
        minDelay: Math.floor(DELAYS.ADAPTIVE_MIN * 1.1),
        maxDelay: Math.floor(DELAYS.ADAPTIVE_MAX * 1.1),
        increment: Math.floor(DELAYS.ADAPTIVE_INC * 1.0),
        decrement: Math.floor(DELAYS.ADAPTIVE_DEC * 0.9),
      },
    };

    return protocolConfigs[protocol] || defaultConfig;
  },

  /**
   * Get protocol-specific ECU configuration
   * @param {number} protocol - Protocol number
   * @param {string} address - ECU address
   * @returns {Object} Protocol configuration
   */
  getProtocolEcuConfig(protocol, address) {
    // Basic initialization commands - should be done ONCE at start
    const basicInit = [
      'ATZ', // Reset all
      'ATE0', // Echo off
      'ATL0', // Linefeeds off
      'ATH1', // Headers ON - crucial for ECU detection
      'ATS0', // Spaces off
      'ATST64', // Timeout 100ms
      'ATAT0', // Disable adaptive timing initially
    ];

    // Default configuration
    const defaultConfig = {
      header: `7E${address}`,
      initCommands: [...basicInit],
    };

    // Auto protocol detection first (ATSP0)
    if (!protocol) {
      return {
        header: '7DF',
        initCommands: [
          ...basicInit,
          'ATSP0', // Auto protocol detection
          'ATCAF1', // Formatting ON
          // Don't include VIN command in init - it should be sent separately
        ],
      };
    }

    // Protocol specific configurations
    const protocolConfigs = {
      // CAN 11-bit protocols
      [PROT.ISO15765_11_500]: {
        header: `7DF`,
        initCommands: [
          ...basicInit,
          'ATSP6', // Set Protocol to CAN 11/500
          'ATCAF1', // Formatting ON
          // Only set flow control if we have detected an ECU
          ...(address
            ? [
                `ATFCSH${this.getFlowControlHeader(address)}`,
                'ATFCSD300000',
                'ATFCSM1',
              ]
            : []),
        ],
      },
      // CAN 29-bit protocols
      [PROT.ISO15765_29_500]: {
        header: `18DB33F1`,
        initCommands: [
          ...basicInit,
          'ATSP7',
          'ATCAF1',
          ...(address
            ? [
                `ATFCSH${this.getFlowControlHeader(address)}`,
                'ATFCSD300000',
                'ATFCSM1',
              ]
            : []),
        ],
      },
      // ISO9141-2
      [PROT.ISO9141]: {
        header: `68${address}6B`,
        initCommands: [...basicInit, 'ATSP3', 'ATCAF0'],
      },
      // KWP2000 Fast
      [PROT.ISO14230_4ST]: {
        header: `68${address}6B`,
        initCommands: [...basicInit, 'ATSP5', 'ATCAF0'],
      },
    };

    return protocolConfigs[protocol] || defaultConfig;
  },

  /**
   * Get valid response patterns for a specific protocol
   */
  getValidPatternsForProtocol(protocol) {
    switch (protocol) {
      case 1: // J1850 PWM
      case 2: // J1850 VPW
        return [
          /41 00/i, // Standard response
          /48 6B \w+ 41 00/i, // With header
          /\w{2} \w{2} 41 00/i, // Generic format
        ];

      case 3: // ISO9141-2
      case 4: // ISO14230-4 KWP (5 baud)
      case 5: // ISO14230-4 KWP (Fast)
        return [
          /41 00/i, // Standard response
          /48 6B \w+ 41 00/i, // ISO format with header
          /68 \w{2} 6B \w+ 41 00/i, // Full ISO header format
          /\w{2} \w{2} \w{2} 41 00/i, // Any 3-byte header format
          /\w+ 41 00/i, // Any format with 41 00
          /^48/i, // ISO9141 header start
          /^68/i, // KWP2000 header start
          /^10/i, // Multi-frame response start
          /^2[0-9]/i, // Multi-frame continuation
        ];

      case 6: // CAN 11/500
        return [
          /41 00/i, // Standard response
          /7E8.+41 00/i, // With ECU response header
          /7E[89ABCDEF].+41 00/i, // Any valid ECU response (7E8-7EF)
          /7E[89ABCDEF].+49 02/i, // VIN query response
          /7E8 10.+49 02/i, // VIN first frame
          /7E8 2\d.+/i, // VIN consecutive frames
          /7E[89ABCDEF].+49 04/i, // Calibration ID response
          /7E[89ABCDEF].+49 0A/i, // ECU name response
          /^10/i, // Multi-frame response start
          /^2[0-9]/i, // Multi-frame continuation
        ];

      case 7: // CAN 29/500
      case 9: // CAN 29/250
        return [
          /41 00/i, // Standard response
          /18DAF110.+41 00/i, // With specific CAN 29-bit header
          /\[18DAF110\].+41 00/i, // With formatted header
          /18DA[0-9A-F]{4}.+41 00/i, // Any valid 29-bit response
          /18DA[0-9A-F]{4}.+49 02/i, // VIN query response
          /18DAF110 10.+49 02/i, // VIN first frame
          /18DAF110 2\d.+/i, // VIN consecutive frames
          /18DA[0-9A-F]{4}.+49 04/i, // Calibration ID response
          /18DA[0-9A-F]{4}.+49 0A/i, // ECU name response
          /^10/i, // Multi-frame response start
          /^2[0-9]/i, // Multi-frame continuation
        ];

      case 10: // SAE J1939
        return [
          /41 00/i, // Standard response
          /\[0000.+\] \w+ 41 00/i, // Formatted J1939
          /FE\w+ 41 00/i, // J1939 specific
        ];

      default:
        return [/41 00/i]; // Basic pattern for unknown protocols
    }
  },

  async initializeAdaptiveTiming() {
    try {
      if (!this.adaptiveTiming) {
        this.handlers.log?.(
          'error',
          '[ELM-Helper] Adaptive timing not initialized',
        );

        return false;
      }

      this.handlers.log?.(
        'info',
        '[ELM-Helper] Initializing adaptive timing configuration',
      );

      // Get protocol specific timing settings
      const timingConfig = this.getProtocolTimingConfig(this.currentProtocol);

      this.handlers.log?.(
        'debug',
        '[ELM-Helper] Retrieved protocol timing configuration',
        timingConfig,
      );

      // Try protocol-specific adaptive timing
      const normalCmd = this.createCommand(
        CMD.ADAPTTIMING,
        timingConfig.adaptiveMode,
      );

      this.handlers.log?.(
        'debug',
        '[ELM-Helper] Setting adaptive timing mode',
        {
          command: normalCmd,
          mode: timingConfig.adaptiveMode,
        },
      );

      let response = await this.sendCommand(normalCmd);

      if (this.isValidResponse(response)) {
        // Set protocol-specific timeout
        const timeoutCmd = this.createCommand(
          CMD.SETTIMEOUT,
          timingConfig.timeout,
        );

        this.handlers.log?.('debug', '[ELM-Helper] Setting protocol timeout', {
          command: timeoutCmd,
          timeout: timingConfig.timeout,
        });

        response = await this.sendCommand(timeoutCmd);

        if (this.isValidResponse(response)) {
          Object.assign(this.adaptiveTiming, {
            mode: timingConfig.mode,
            currentDelay: timingConfig.startDelay,
            minDelay: timingConfig.minDelay,
            maxDelay: timingConfig.maxDelay,
            increment: timingConfig.increment,
            decrement: timingConfig.decrement,
          });

          this.handlers.log?.(
            'success',
            '[ELM-Helper] Adaptive timing initialized successfully',
            {
              mode: timingConfig.mode,
              currentDelay: timingConfig.startDelay,
              config: timingConfig,
            },
          );

          return true;
        }
      }

      // Fallback to fixed timing
      this.handlers.log?.(
        'warn',
        '[ELM-Helper] Adaptive timing failed, falling back to fixed timing',
      );
      const fixedCmd = this.createCommand(CMD.ADAPTTIMING, 0);

      response = await this.sendCommand(fixedCmd);

      if (this.isValidResponse(response)) {
        const timeoutCmd = this.createCommand(
          CMD.SETTIMEOUT,
          DELAYS.TIMEOUT_NORMAL,
        );

        response = await this.sendCommand(timeoutCmd);

        if (this.isValidResponse(response)) {
          Object.assign(this.adaptiveTiming, {
            mode: 'FIXED',
            currentDelay: DELAYS.ADAPTIVE_START,
          });
          this.handlers.log?.(
            'info',
            '[ELM-Helper] Fixed timing mode initialized',
            {
              mode: 'FIXED',
              delay: DELAYS.ADAPTIVE_START,
            },
          );

          return true;
        }
      }

      this.handlers.log?.(
        'error',
        '[ELM-Helper] Failed to initialize any timing mode',
      );

      return false;
    } catch (error) {
      this.handlers.log?.(
        'error',
        '[ELM-Helper] Error in adaptive timing initialization',
        {
          error: error.message,
          currentMode: this.adaptiveTiming?.mode,
        },
      );

      return false;
    }
  },

  /**
   * Check if response contains error patterns
   */
  isErrorResponse(response) {
    const errorPatterns = [
      'NO DATA',
      'ERROR',
      'UNABLE TO CONNECT',
      'STOPPED',
      'SEARCHING',
      'BUS ERROR',
      'DATA ERROR',
      'CAN ERROR',
      'BUFFER FULL',
    ];

    return errorPatterns.some(pattern => response.includes(pattern));
  },

  /**
   * Validate response format against expected response
   */
  isValidResponseFormat(response, expectedResponse) {
    if (!response) return false;

    if (!expectedResponse) return this.isValidResponse(response);

    // More lenient cleaning
    const cleanResponse = response
      .replace(/[\s\r\n\t\0]/g, '')
      .toUpperCase()
      .trim();
    const cleanExpected = expectedResponse
      .replace(/[\s\r\n\t\0]/g, '')
      .toUpperCase()
      .trim();

    // If either is empty after cleaning, be merciful
    if (!cleanExpected) return true;

    if (!cleanResponse) return false;

    // Check for exact match first
    if (cleanResponse === cleanExpected) {
      return true;
    }

    // Check if response includes expected (more lenient)
    if (cleanResponse.includes(cleanExpected)) {
      return true;
    }

    // Check if expected includes response (reverse check)
    if (cleanExpected.includes(cleanResponse)) {
      return true;
    }

    // For CAN responses, be very lenient
    if (cleanResponse.match(/^(7E[0-9A-F]|18[0-9A-F]{2})/)) {
      // Extract and compare just the data portion for CAN messages
      const responseData = cleanResponse.replace(
        /^(7E[0-9A-F]|18[0-9A-F]{2})/,
        '',
      );
      const expectedData = cleanExpected.replace(
        /^(7E[0-9A-F]|18[0-9A-F]{2})/,
        '',
      );

      // Check if data portions match or include each other
      if (
        responseData.includes(expectedData) ||
        expectedData.includes(responseData)
      ) {
        return true;
      }

      // Check for response codes (e.g., 41, 49)
      const responseCode = cleanExpected.substring(0, 2);

      if (responseData.includes(responseCode)) {
        return true;
      }
    }

    // Check for multiline responses more leniently
    if (cleanResponse.includes(':')) {
      const responseLines = cleanResponse.split(':');

      return responseLines.some(
        line => line.includes(cleanExpected) || cleanExpected.includes(line),
      );
    }

    // If response contains any part of expected (at least 2 chars)
    if (cleanExpected.length >= 2) {
      const parts = cleanExpected.match(/.{2}/g) || [];

      if (parts.some(part => cleanResponse.includes(part))) {
        return true;
      }
    }

    // If we got this far and response looks like valid hex data, be merciful
    if (/^[0-9A-F]+$/.test(cleanResponse) && cleanResponse.length >= 2) {
      return true;
    }

    return false;
  },

  /**
   * Validate response from device
   */
  isValidResponse(response) {
    if (!response) {
      this.handlers.log?.(
        'debug',
        '[ELM-Helper] Invalid response - empty or null',
      );

      return false;
    }

    try {
      const cleanResponse = response
        .replace(/[\s\r\n\t\0]/g, '')
        .toUpperCase()
        .trim();

      if (cleanResponse.length === 0) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Invalid response - empty after cleaning',
        );

        return false;
      }

      const initPatterns = [
        'ELM',
        'OK',
        '>',
        'ATZ',
        'ATE',
        'ATL',
        'ATS',
        'ATH',
        'ATI',
      ];

      if (initPatterns.some(pattern => cleanResponse.includes(pattern))) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Valid initialization response detected',
          {
            response: cleanResponse,
            matchedPattern: initPatterns.find(p => cleanResponse.includes(p)),
          },
        );

        return true;
      }

      const successPatterns = ['V', 'LP', 'H', 'S', 'L', 'E', 'AT'];

      if (successPatterns.some(pattern => cleanResponse.startsWith(pattern))) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Valid command response pattern detected',
          {
            response: cleanResponse,
            matchedPattern: successPatterns.find(p =>
              cleanResponse.startsWith(p),
            ),
          },
        );

        return true;
      }

      const errorPatterns = [
        'NODATA',
        'ERROR',
        'UNABLETOCONNECT',
        'STOPPED',
        'BUSERROR',
        'DATAERROR',
        'CANERROR',
        'BUFFERFULL',
      ];

      if (errorPatterns.some(pattern => cleanResponse === pattern)) {
        this.handlers.log?.('debug', '[ELM-Helper] Error response detected', {
          response: cleanResponse,
          matchedPattern: errorPatterns.find(p => cleanResponse === p),
        });

        return false;
      }

      if (cleanResponse.includes('SEARCHING')) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Searching response detected',
          {
            response: cleanResponse,
          },
        );

        return true;
      }

      if (this.isCanProtocol(this.currentProtocol)) {
        const canPatterns = [
          /[0-9A-F]{2,}/,
          /7E[0-9A-F]/,
          /18[0-9A-F]{2}/,
          /[0-9A-F]{3,}/,
        ];

        if (canPatterns.some(pattern => pattern.test(cleanResponse))) {
          this.handlers.log?.(
            'debug',
            '[ELM-Helper] Valid CAN protocol response detected',
            {
              response: cleanResponse,
              protocol: this.currentProtocol,
              matchedPattern: canPatterns
                .find(p => p.test(cleanResponse))
                ?.toString(),
            },
          );

          return true;
        }
      }

      if (/^[0-9A-F]+$/.test(cleanResponse)) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Valid hex data response detected',
          {
            response: cleanResponse,
            length: cleanResponse.length,
          },
        );

        return true;
      }

      const isValid =
        cleanResponse.length > 0 && !cleanResponse.includes('ERROR');

      this.handlers.log?.('debug', '[ELM-Helper] Response validation result', {
        response: cleanResponse,
        isValid,
        length: cleanResponse.length,
        hasError: cleanResponse.includes('ERROR'),
      });

      return isValid;
    } catch (error) {
      this.handlers.log?.('error', '[ELM-Helper] Response validation error', {
        error: error.message,
        response,
        protocol: this.currentProtocol,
      });

      return true;
    }
  },

  /**
   * Set protocol status
   */
  setStatus(newStatus) {
    const oldStatus = this.status || Protocol.STATUS.UNDEFINED;

    if (oldStatus !== newStatus) {
      this.status = newStatus;
      this.handlers.log?.('info', '[ELM-Helper] Protocol status changed', {
        oldStatus,
        newStatus,
      });
      this.handlers.onPropertyChange?.('status', {
        old: oldStatus,
        new: newStatus,
      });
    }
  },

  /**
   * Get current protocol status
   */
  getStatus() {
    return this.status;
  },

  /**
   * Create AT command with parameters
   */
  createCommand(cmdType, param = null) {
    if (!cmdType) {
      this.handlers.log?.(
        'error',
        '[ELM-Helper] Command creation failed - no command type provided',
      );

      return null;
    }

    const cmdTemplate = cmdType.cmd;

    if (!cmdTemplate) {
      this.handlers.log?.(
        'error',
        '[ELM-Helper] Command creation failed - invalid command template',
      );

      return null;
    }

    let command = `AT${cmdTemplate}`;

    if (param !== null && cmdType.params > 0) {
      const paramStr =
        typeof param === 'number' ? param.toString(16).toUpperCase() : param;

      command += paramStr;
    }

    return command;
  },

  /**
   * Get response ID from response string
   */
  getResponseId(response) {
    if (!response) return RSP_ID.UNKNOWN;

    // Clean and uppercase the response for consistent matching
    const cleanResponse = response
      .replace(/[\r\n\s\0]/g, '')
      .toUpperCase()
      .trim();

    if (cleanResponse.length === 0) return RSP_ID.UNKNOWN;

    // Return both clean response and ID for atomic operations
    const result = {
      cleanResponse,
      id: RSP_ID.UNKNOWN,
    };

    // Check for error responses first
    if (cleanResponse.includes('NODATA')) result.id = RSP_ID.NODATA;
    else if (cleanResponse.includes('ERROR')) result.id = RSP_ID.ERROR;
    else if (cleanResponse.includes('CANERROR')) result.id = RSP_ID.CANERROR;
    else if (cleanResponse.includes('BUSERROR')) result.id = RSP_ID.BUSERROR;
    else if (cleanResponse.includes('BUFFERFULL'))
      result.id = RSP_ID.BUFFERFULL;
    else if (cleanResponse.includes('SEARCHING')) result.id = RSP_ID.SEARCHING;
    else if (cleanResponse.includes('STOPPED')) result.id = RSP_ID.STOPPED;
    else if (cleanResponse.includes('UNABLE')) result.id = RSP_ID.UNABLE;
    else if (cleanResponse.includes('MODEL')) result.id = RSP_ID.MODEL;
    // Check for success responses
    else if (cleanResponse.includes('>')) result.id = RSP_ID.PROMPT;
    else if (cleanResponse.includes('OK')) result.id = RSP_ID.OK;
    // If we have valid hex data, it's likely a valid response
    else if (/^[0-9A-F]+$/.test(cleanResponse) && cleanResponse.length >= 2) {
      result.id = RSP_ID.OK;
    }

    return result;
  },

  /**
   * Delay helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Set protocol helper
   */
  async setProtocol(protocol) {
    const cmd = `ATSP${protocol || 0}`; // Use 0 for auto if no protocol specified

    await this.sendCommand(cmd);
    this.currentProtocol = protocol;
  },

  /**
   * Reset device helper
   */
  async reset() {
    try {
      const response = await this.sendCommand('ATZ');

      if (!this.isValidResponse(response)) {
        throw new Error('Failed to reset device');
      }

      await this.delay(DELAYS.RESET); // Give device time to reset
    } catch (error) {
      if (error.message === 'COMMAND_FAILED') {
        this.handlers.log?.(
          'error',
          '[ELM-Helper] Critical failure during reset',
          {
            error: error.message,
            status: this.getStatus(),
          },
        );
        // Clear all state
        this.currentProtocol = null;
        this.cmdQueue = [];
        this.ecuAddresses = new Set();
        this.selectedEcuAddress = null;
        this.currentHeader = null;
        // Re-throw to propagate the critical failure
        throw error;
      }

      throw new Error('Failed to reset device');
    }
  },

  /**
   * Send command helper
   */
  async sendCommand(command, delay = true) {
    if (!command) {
      this.handlers.log?.(
        'error',
        '[ELM-Helper] Command execution failed - no command provided',
      );

      return null;
    }

    this.lastCommand = command;
    this.lastTxMsg = command;

    try {
      const response = await this.handlers.send(command);

      // Critical failure check - immediately exit if COMMAND_FAILED
      if (response === 'COMMAND_FAILED') {
        this.handlers.log?.(
          'error',
          '[ELM-Helper] Critical failure - COMMAND_FAILED received',
          {
            command,
            status: this.getStatus(),
          },
        );
        this.setStatus(Protocol.STATUS.ERROR);
        // Notify handlers of critical failure
        this.handlers.onError?.({
          error: 'COMMAND_FAILED',
          message: 'Critical communication failure detected',
          command,
          isCritical: true,
        });
        // Don't catch this error - let it propagate up
        this.cmdQueue = []; // Clear command queue
        this.currentProtocol = null; // Reset protocol
        throw new Error('COMMAND_FAILED');
      }

      this.lastRxMsg = response;

      // Only delay if adaptiveTiming is initialized and delay is requested
      if (delay && this.adaptiveTiming?.currentDelay) {
        await this.delay(this.adaptiveTiming.currentDelay);
      }

      return response;
    } catch (error) {
      // Only catch non-COMMAND_FAILED errors
      if (error.message !== 'COMMAND_FAILED') {
        this.handlers.log?.('error', '[ELM-Helper] Command execution failed', {
          command,
          error: error.message,
        });

        return null;
      }

      // Re-throw COMMAND_FAILED errors
      throw error;
    }
  },

  /**
   * Validate VIN response format - Be very merciful with validation
   * Handles all frame types: single frame, multi-frame (first, consecutive, flow control)
   */
  isValidVinResponse(response) {
    if (!response) return false;

    // Clean the response
    const cleanResponse = response.replace(/[\r\n\s\0]/g, '').toUpperCase();

    if (cleanResponse.length === 0) return false;

    // Frame type detection - Be very lenient
    if (cleanResponse.length >= 1) {
      // Single frame (0 or 01)
      if (/^0?1/.test(cleanResponse)) return true;

      // First frame of multi-frame (1 or 10)
      if (/^1[0-9]?/.test(cleanResponse)) return true;

      // Consecutive frames (2x where x is 0-F)
      if (/^2[0-9A-F]?/.test(cleanResponse)) return true;

      // Flow control frame (3 or 30)
      if (/^3[0-9]?/.test(cleanResponse)) return true;
    }

    // Basic checks for any VIN-related content
    const basicPatterns = [
      'VIN', // Direct VIN indicator
      '09', // Mode 09 (request)
      '49', // Mode 09 (response)
      '02', // PID 02 (VIN)
      '7E', // CAN header
      '18DA', // Extended CAN
      'F6', // KW1281
    ];

    // If we find any basic pattern, accept it
    if (basicPatterns.some(pattern => cleanResponse.includes(pattern))) {
      return true;
    }

    // If it looks like hex data and has some length, accept it
    if (cleanResponse.length >= 2 && /^[0-9A-F]+$/.test(cleanResponse)) {
      return true;
    }

    return false;
  },

  async selectEcu(address) {
    try {
      if (
        !address ||
        typeof address !== 'string' ||
        !/^[0-9A-Fa-f]+$/.test(address)
      ) {
        this.handlers.log?.(
          'error',
          '[ELM-Helper] Invalid ECU address format',
          {
            address,
          },
        );

        return false;
      }

      if (!this.ecuAddresses.has(address)) {
        this.handlers.log?.(
          'error',
          '[ELM-Helper] ECU selection failed - invalid address',
          {
            requestedAddress: address,
            availableAddresses: Array.from(this.ecuAddresses),
          },
        );

        return false;
      }

      const ecuConfig = this.getProtocolEcuConfig(
        this.currentProtocol,
        address,
      );

      this.handlers.log?.(
        'debug',
        '[ELM-Helper] Setting up ECU configuration',
        {
          address,
          protocol: this.currentProtocol,
          header: ecuConfig.header,
          commands: ecuConfig.initCommands,
        },
      );

      const headerCmd = this.createCommand(CMD.SETHEADER, ecuConfig.header);
      const response = await this.sendCommand(headerCmd);

      if (!this.isValidResponse(response)) {
        this.handlers.log?.('error', '[ELM-Helper] Failed to set ECU header', {
          address,
          header: ecuConfig.header,
          response,
          command: headerCmd,
        });

        return false;
      }

      for (const cmd of ecuConfig.initCommands) {
        const cmdResponse = await this.sendCommand(cmd);

        if (!this.isValidResponse(cmdResponse)) {
          this.handlers.log?.(
            'warn',
            '[ELM-Helper] ECU initialization command failed',
            {
              address,
              command: cmd,
              response: cmdResponse,
            },
          );
        }

        await this.delay(DELAYS.PROTOCOL);
      }

      const testCmd = SINGLE_TEST_COMMAND;
      const testResponse = await this.sendCommand(testCmd);

      if (!this.isValidResponse(testResponse)) {
        this.handlers.log?.(
          'error',
          '[ELM-Helper] ECU communication verification failed',
          {
            address,
            testCommand: testCmd,
            response: testResponse,
          },
        );

        return false;
      }

      this.selectedEcuAddress = address;
      this.currentHeader = ecuConfig.header;

      this.handlers.log?.(
        'success',
        '[ELM-Helper] ECU selected and configured successfully',
        {
          address,
          header: ecuConfig.header,
          protocol: this.currentProtocol,
          status: this.getStatus(),
        },
      );

      return true;
    } catch (error) {
      this.handlers.log?.(
        'error',
        '[ELM-Helper] ECU selection failed with error',
        {
          address,
          error: error.message,
          protocol: this.currentProtocol,
          status: this.getStatus(),
        },
      );

      return false;
    }
  },

  async handle0100Command(maxAttempts = 5) {
    this.handlers.log?.(
      'info',
      '[ELM] Sending 0100 command to query supported PIDs',
    );

    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      const response = await this.sendCommand('0100', false);

      if (!response) continue;

      const ecuDetected = await this.handleEcuDetection(response);

      if (ecuDetected) {
        this.handlers.log?.('info', '[ELM] ECUs detected in 0100 response');

        return {
          responses: response.split('\n').map(line => line.trim()),
          success: true,
        };
      }
    }

    this.handlers.log?.(
      'warn',
      '[ELM] Failed to detect ECUs after all attempts',
      {
        attempts: maxAttempts,
      },
    );

    return { responses: [], success: false };
  },

  async checkProtocolNumber() {
    let dpResponse = null;
    let searchAttempts = 0;
    const maxSearchAttempts = 10;

    while (searchAttempts < maxSearchAttempts) {
      // Clear any pending responses and wait
      await this.delay(DELAYS.PROTOCOL);

      dpResponse = await this.sendCommand('ATDPN');

      // No response case
      if (!dpResponse) {
        searchAttempts++;
        this.handlers.log?.(
          'debug',
          `[ELM] No response from ATDPN (attempt ${searchAttempts}/${maxSearchAttempts})`,
        );
        continue;
      }

      // Clean up response
      const cleanResponse = dpResponse.replace(/[\r\n>]/g, '').trim();

      // Skip if empty after cleaning
      if (!cleanResponse) {
        searchAttempts++;
        continue;
      }

      // If response is exactly in format A[1-9] or [1-9], it's a protocol number
      if (/^A?[1-9]$/.test(cleanResponse)) {
        const isAutoDetected = cleanResponse.startsWith('A');
        const protocolNum = parseInt(
          isAutoDetected ? cleanResponse.substring(1) : cleanResponse,
        );

        if (protocolNum >= 1 && protocolNum <= 9) {
          this.handlers.log?.(
            'info',
            `[ELM] Protocol ${isAutoDetected ? 'auto-detected' : 'detected'}`,
            {
              protocol: protocolNum,
              description: PROT_DESCRIPTIONS[protocolNum],
            },
          );

          return {
            protocol: protocolNum,
            isAutoDetected,
            response: dpResponse,
          };
        }
      }

      // If still searching, wait and retry
      if (dpResponse.includes('SEARCHING')) {
        searchAttempts++;
        this.handlers.log?.(
          'debug',
          `[ELM] Protocol search in progress (attempt ${searchAttempts}/${maxSearchAttempts})`,
        );
        await this.delay(DELAYS.PROTOCOL);
        continue;
      }

      searchAttempts++;
      this.handlers.log?.(
        'debug',
        `[ELM] No protocol detected, retrying (attempt ${searchAttempts}/${maxSearchAttempts})`,
      );
      await this.delay(DELAYS.PROTOCOL);
    }

    this.handlers.log?.('warn', '[ELM] Protocol detection timed out');

    return {
      protocol: null,
      isAutoDetected: false,
      response: dpResponse,
    };
  },

  /**
   * Flush and cleanup everything
   * @param {Object} instance - The ElmProtocol instance to flush
   */
  flushEverything(instance) {
    if (!instance) return;

    // Reset all properties
    instance.lastCommand = null;
    instance.lastTxMsg = '';
    instance.lastRxMsg = '';
    instance.retryCount = 0;
    instance.currentProtocol = null;
    instance.ecuAddresses = new Set();
    instance.selectedEcuAddress = null;
    instance.currentHeader = null;
    instance.customInitCommands = [];
    instance.cmdQueue = [];
    instance.responsePending = false;
    instance.charsExpected = 0;
    instance.lastMsgId = 0;

    // Reset adaptive timing
    if (instance.adaptiveTiming) {
      instance.adaptiveTiming.mode = 'OFF';
      instance.adaptiveTiming.currentDelay = DELAYS.ADAPTIVE_START;
    }

    // Reset OBD properties
    instance.service = OBD_SVC.NONE;
    instance.pidSupported = new Set();
    instance.pidsWrapped = false;
    instance.numCodes = 0;
    instance.msgService = OBD_SVC.NONE;

    // Reset status
    instance.status = Protocol.STATUS.UNDEFINED;

    // Log the flush
    instance.handlers?.log?.('info', '[ELM-Helper] Protocol instance flushed');
  },
};

export default ElmProtocolInit;
```

## docs/ecu-ElmProtocolTelegramProtocol.js

```javascript
// filepath: docs/ecu-ElmProtocolTelegramProtocol.js
import { RSP_ID } from '@src/helper/OBDManagerHelper/OBDUtils';

import Protocol from './Protocol';

/**
 * Protocol detection methods that will be part of ElmProtocol
 * Provides functionality for:
 * - Protocol response parsing
 * - Auto protocol detection
 * - Protocol testing and validation
 */
const ElmProtocolTelegramProtocol = {
  /**
   * Verify required dependencies are available
   * @private
   */
  _verifyDependencies() {
    const required = [
      'getResponseId',
      'setStatus',
      'isValidResponse',
      'handleEcuDetection',
      'initialize',
      'sendCommand',
    ];

    const missing = required.filter(method => !this[method]);

    if (missing.length > 0) {
      this.handlers?.log?.('error', '[Telegram] Missing required methods', {
        missing,
      });
      throw new Error(`Missing required methods: ${missing.join(', ')}`);
    }
  },

  /**
   * Handle response processing and error recovery
   */
  async handleResponse(response, responseInfo = null, isEcuDetection = false) {
    this._verifyDependencies();

    if (!response) return false;

    const info = responseInfo || this.getResponseId(response);
    const { cleanResponse, id: responseId } = info;

    switch (responseId) {
      case RSP_ID.UNABLE:
      case RSP_ID.CANERROR:
      case RSP_ID.BUSERROR:
        this.setStatus(Protocol.STATUS.DISCONNECTED);

        if (this.lastCommand) {
          this.cmdQueue.push(this.lastCommand);
        }

        this.cmdQueue.push('ATSP0');

        return true;

      case RSP_ID.DATAERROR:
        this.setStatus(Protocol.STATUS.DATAERROR);

        return true;

      case RSP_ID.BUFFERFULL:
      case RSP_ID.RXERROR:
        this.setStatus(Protocol.STATUS.RXERROR);

        return true;

      case RSP_ID.ERROR:
        this.setStatus(Protocol.STATUS.ERROR);

        return true;

      case RSP_ID.NODATA:
        this.setStatus(Protocol.STATUS.NODATA);

        if (this.adaptiveTiming?.adapt) {
          this.adaptiveTiming.adapt(false);
        }

        return true;
    }

    if (this.status === Protocol.STATUS.ECU_DETECT && !isEcuDetection) {
      const ecuDetected = await this.handleEcuDetection(cleanResponse);

      if (ecuDetected) {
        this.setStatus(Protocol.STATUS.ECU_DETECTED);
        this.handlers.onEcuDetected?.(Array.from(this.ecuAddresses));

        return true;
      }

      return false;
    }

    if (this.adaptiveTiming?.adapt) {
      this.adaptiveTiming.adapt(false);
    }

    return false;
  },

  /**
   * Handle incoming telegram data
   */
  async handleTelegram(buffer) {
    this._verifyDependencies();

    if (!buffer || buffer.length === 0) return false;

    if (this.lastTxMsg === buffer) {
      return false;
    }

    const responseInfo = this.getResponseId(buffer);
    const { cleanResponse, id: responseId } = responseInfo;

    switch (responseId) {
      case RSP_ID.SEARCHING: {
        this.setStatus(
          this.status !== Protocol.STATUS.ECU_DETECT
            ? Protocol.STATUS.CONNECTING
            : this.status,
        );
        this.lastRxMsg = buffer;

        return await this.handleResponse(buffer, responseInfo);
      }

      case RSP_ID.NODATA:
      case RSP_ID.OK:
      case RSP_ID.ERROR:
      case RSP_ID.UNABLE:
      case RSP_ID.CANERROR:
      case RSP_ID.BUSERROR:
      case RSP_ID.DATAERROR:
      case RSP_ID.BUFFERFULL:
      case RSP_ID.RXERROR: {
        this.lastRxMsg = buffer;

        return await this.handleResponse(buffer, responseInfo);
      }

      case RSP_ID.STOPPED: {
        this.lastRxMsg = buffer;

        if (this.lastCommand) {
          const cmdToRetry = this.lastCommand;

          Promise.resolve().then(() => this.cmdQueue.push(cmdToRetry));
        }

        return false;
      }

      case RSP_ID.MODEL:
        const initSuccess = await this.initialize();

        if (!initSuccess) {
          this.handlers.log?.(
            'error',
            '[Telegram] Failed to initialize after MODEL response',
          );

          return false;
        }

        return false;

      case RSP_ID.PROMPT:
        if (
          await this.handleResponse(
            this.lastRxMsg,
            this.getResponseId(this.lastRxMsg),
          )
        ) {
          return false;
        }

        if (this.isValidResponse(this.lastRxMsg)) {
          if (this.status !== Protocol.STATUS.CONNECTED) {
            this.setStatus(Protocol.STATUS.CONNECTED);
          }

          if (this.adaptiveTiming?.adapt) {
            this.adaptiveTiming.adapt(true);
          }

          return this.lastRxMsg;
        }

        if (this.cmdQueue.length > 0) {
          const cmd = this.cmdQueue.shift();

          if (!cmd) {
            this.handlers.log?.('warn', '[Telegram] Empty command in queue');

            return false;
          }

          await this.sendCommand(cmd);
        }

        return false;

      default:
        if (buffer.charAt(0) === '+') {
          return false;
        }

        this.lastRxMsg = buffer;

        const firstChar = buffer.charAt(0);

        if (firstChar === '0' && buffer.length === 3) {
          const parsedLength = parseInt(buffer, 16);

          if (isNaN(parsedLength)) {
            return false;
          }

          this.charsExpected = parsedLength * 2;
          this.lastRxMsg = '';

          return false;
        }

        const idx = buffer.indexOf(':');

        if (idx >= 0) {
          if (idx === 0) {
            this.lastRxMsg = buffer;
            this.charsExpected = 0;
          } else if (buffer[0] === '0') {
            this.lastRxMsg = buffer.substring(idx + 1);
          } else {
            this.lastRxMsg += buffer.substring(idx + 1);
          }

          this.responsePending = this.charsExpected === 0;
        } else {
          this.lastRxMsg = buffer;
          this.charsExpected = 0;
          this.responsePending = false;
        }

        if (this.lastRxMsg.length < this.charsExpected) {
          return false;
        }

        if (
          this.charsExpected > 0 &&
          this.lastRxMsg.length > this.charsExpected
        ) {
          this.lastRxMsg = this.lastRxMsg.substring(0, this.charsExpected);
        }

        if (!this.responsePending) {
          if (await this.handleResponse(this.lastRxMsg)) {
            return false;
          }

          if (this.isValidResponse(this.lastRxMsg)) {
            if (this.status !== Protocol.STATUS.CONNECTED) {
              this.setStatus(Protocol.STATUS.CONNECTED);
            }

            if (this.adaptiveTiming?.adapt) {
              this.adaptiveTiming.adapt(true);
            }

            return this.lastRxMsg;
          }
        }

        return false;
    }
  },
};

export default ElmProtocolTelegramProtocol;
```

## docs/ecu-Protocol.js

```javascript
// filepath: docs/ecu-Protocol.js
/**
 * Base Protocol class with common handler functionality
 */
class Protocol {
  static PROTOCOLS = {
    AUTO: 0,
    J1850_PWM: 1,
    J1850_VPW: 2,
    ISO_9141_2: 3,
    ISO_14230_4_KWP_5BAUD: 4,
    ISO_14230_4_KWP_FAST: 5,
    ISO_15765_4_CAN_11BIT_500K: 6,
    ISO_15765_4_CAN_29BIT_500K: 7,
    ISO_15765_4_CAN_11BIT_250K: 8,
    ISO_15765_4_CAN_29BIT_250K: 9,
    SAE_J1939_CAN: 10,
    USER1_CAN_11BIT_125K: 11,
    USER2_CAN_11BIT_50K: 12,
  };

  static PROTOCOL_DESCRIPTIONS = {
    0: 'Automatic',
    1: 'SAE J1850 PWM (41.6 KBaud)',
    2: 'SAE J1850 VPW (10.4 KBaud)',
    3: 'ISO 9141-2 (5 Baud Init)',
    4: 'ISO 14230-4 KWP (5 Baud Init)',
    5: 'ISO 14230-4 KWP (Fast Init)',
    6: 'ISO 15765-4 CAN (11 Bit ID, 500 KBit)',
    7: 'ISO 15765-4 CAN (29 Bit ID, 500 KBit)',
    8: 'ISO 15765-4 CAN (11 Bit ID, 250 KBit)',
    9: 'ISO 15765-4 CAN (29 Bit ID, 250 KBit)',
    10: 'SAE J1939 CAN (29 bit ID, 250* kbaud)',
    11: 'User1 CAN (11* bit ID, 125* kbaud)',
    12: 'User2 CAN (11* bit ID, 50* kbaud)',
  };

  // Protocol states
  static STATES = {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR',
    INITIALIZING: 'INITIALIZING',
    READY: 'READY',
  };

  // Protocol error types
  static ERRORS = {
    TIMEOUT: 'TIMEOUT',
    NO_RESPONSE: 'NO_RESPONSE',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    PROTOCOL_ERROR: 'PROTOCOL_ERROR',
    DEVICE_ERROR: 'DEVICE_ERROR',
  };

  // Add OBD Service constants
  static OBD_SERVICES = {
    NONE: 0x00,
    DATA: 0x01,
    FREEZEFRAME: 0x02,
    READ_CODES: 0x03,
    CLEAR_CODES: 0x04,
    O2_RESULT: 0x05,
    MON_RESULT: 0x06,
    PENDINGCODES: 0x07,
    CTRL_MODE: 0x08,
    VEH_INFO: 0x09,
    PERMACODES: 0x0a,
  };

  // Add Response IDs
  static RESPONSE_IDS = {
    PROMPT: '>',
    OK: 'OK',
    MODEL: 'ELM',
    NODATA: 'NODATA',
    SEARCH: 'SEARCHING',
    ERROR: 'ERROR',
    NOCONN: 'UNABLE',
    NOCONN2: 'NABLETO',
    CANERROR: 'CANERROR',
    BUSBUSY: 'BUSBUSY',
    BUSERROR: 'BUSERROR',
    BUSINIERR: 'BUSINIT:ERR',
    BUSINIERR2: 'BUSINIT:BUS',
    BUSINIERR3: 'BUSINIT:...ERR',
    FBERROR: 'FBERROR',
    DATAERROR: 'DATAERROR',
    BUFFERFULL: 'BUFFERFULL',
    STOPPED: 'STOPPED',
    RXERROR: '<',
    QMARK: '?',
    UNKNOWN: '',
  };

  // Add Protocol Status
  static STATUS = {
    UNDEFINED: 'Undefined',
    INITIALIZING: 'Initializing',
    INITIALIZED: 'Initialized',
    ECU_DETECT: 'ECU detect',
    ECU_DETECTED: 'ECU detected',
    CONNECTING: 'Connecting',
    CONNECTED: 'Connected',
    NODATA: 'No data',
    STOPPED: 'Stopped',
    DISCONNECTED: 'Disconnected',
    BUSERROR: 'BUS error',
    DATAERROR: 'DATA error',
    RXERROR: 'RX error',
    ERROR: 'Error',
  };

  static instance = null;

  initializeState() {
    // Basic state
    this.state = Protocol.STATES.DISCONNECTED;
    this.currentProtocol = null;
    this.lastError = null;
    this.connected = false;
    this.timeout = 5000;

    // Protocol specific state
    this.lastCommand = null;
    this.lastTxMsg = '';
    this.lastRxMsg = '';
    this.retryCount = 0;
    this.maxRetries = 3;
    this.ecuAddresses = new Set();
    this.selectedEcuAddress = 0;
    this.customInitCommands = [];
    this.status = Protocol.STATUS.UNDEFINED;
    this.cmdQueue = [];
    this.responsePending = false;
    this.charsExpected = 0;
    this.lastMsgId = 0;

    // OBD specific state
    this.service = Protocol.OBD_SERVICES.NONE;
    this.pidSupported = new Set();
    this.pidsWrapped = false;
    this.numCodes = 0;
    this.msgService = Protocol.OBD_SERVICES.NONE;
  }

  constructor(handlers) {
    if (new.target === Protocol) {
      if (Protocol.instance) {
        Protocol.instance.updateHandlers(handlers);

        return Protocol.instance;
      }

      Protocol.instance = this;
    }

    this.validateHandlers(handlers);
    this.handlers = this.initializeHandlers(handlers);
    this.initializeState();
  }

  static getInstance(handlers) {
    if (!Protocol.instance) {
      new Protocol(handlers);
    } else if (handlers) {
      Protocol.instance.updateHandlers(handlers);
    }

    return Protocol.instance;
  }

  static resetInstance() {
    if (Protocol.instance) {
      Protocol.instance = null;
    }
  }

  reset() {
    this.initializeState();
  }

  validateHandlers(handlers) {
    // Only require the absolutely essential handlers
    const requiredHandlers = ['send', 'setProtocol', 'getProtocol'];

    const missingHandlers = requiredHandlers.filter(
      handler => !handlers?.[handler],
    );

    if (missingHandlers.length > 0) {
      throw new Error(
        `Protocol requires the following handlers: ${missingHandlers.join(', ')}`,
      );
    }
  }

  initializeHandlers(handlers) {
    return {
      // Required handlers
      send: handlers.send,
      setProtocol: handlers.setProtocol,
      getProtocol: handlers.getProtocol,

      log: handlers.log || (() => {}),
      // not in elm protocol
      onError: handlers.onError || (() => {}),
      onStateChange: handlers.onStateChange || (() => {}),
      onData: handlers.onData || (() => {}),
      onTimingUpdate: handlers.onTimingUpdate || (() => {}),
      onEcuDetected: handlers.onEcuDetected || (() => {}),
      // end of not in elm protocol
      // not useful but its in elm protocol
      onPropertyChange: handlers.onPropertyChange || (() => {}),
      onDtcFound: handlers.onDtcFound || (() => {}),
      // we have to remove this because our
      // send command can give in return the response
      onResponse: handlers.onResponse || (() => {}),
    };
  }

  /**
   * Updates the protocol handlers with new handlers
   * @param {Object} handlers - New handlers to update with
   */
  updateHandlers(handlers) {
    if (!handlers) return;

    this.validateHandlers(handlers);
    this.handlers = this.initializeHandlers(handlers);
  }

  wrapHandler(handler, name) {
    return async (...args) => {
      try {
        const result = await handler(...args);

        this.logDebug(`${name} handler success`, { args, result });

        return result;
      } catch (error) {
        this.logError(`${name} handler error`, { args, error });
        this.handleError(error);
        throw error;
      }
    };
  }

  // Core protocol methods
  async connect() {
    try {
      this.setState(Protocol.STATES.CONNECTING);
      await this.initialize();
      this.connected = true;
      this.setState(Protocol.STATES.CONNECTED);

      return true;
    } catch (error) {
      this.handleError(error);

      return false;
    }
  }

  async disconnect() {
    try {
      this.connected = false;
      this.setState(Protocol.STATES.DISCONNECTED);

      return true;
    } catch (error) {
      this.handleError(error);

      return false;
    }
  }

  async initialize() {
    this.setState(Protocol.STATES.INITIALIZING);
    // Base initialization - to be implemented by derived classes
  }

  // Command handling
  async sendCommand(command) {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    try {
      this.lastCommand = command;
      this.lastTxMsg = command;
      this.logDebug('Sending command', { command });
      const response = await this.handlers.send(command);

      return response;
    } catch (error) {
      this.logError('Command failed', { command, error });
      this.handleError(error);
      throw error;
    }
  }

  // Process command queue with direct response handling
  async processCommandQueue() {
    while (this.cmdQueue.length > 0) {
      const command = this.cmdQueue.shift();

      try {
        const response = await this.sendCommand(command);

        if (response) {
          this.logDebug('Queue command response', { command, response });
        }
      } catch (error) {
        this.logError('Queue command failed', { command, error });
        // Continue with next command even if one fails
      }
    }
  }

  async setProtocol(protocol) {
    const result = await this.handlers.setProtocol(protocol);

    if (result) {
      this.currentProtocol = protocol;
      this.logInfo('Protocol set', { protocol });
    }

    return result;
  }

  async getProtocol() {
    return await this.handlers.getProtocol();
  }

  getProtocolDescription(protocolId) {
    return Protocol.PROTOCOL_DESCRIPTIONS[protocolId] || 'Unknown Protocol';
  }

  // Error handling
  handleError(error) {
    this.lastError = error;
    this.setState(Protocol.STATES.ERROR);
    this.handlers.onError?.(error);
    this.logError('Protocol error', error);
  }

  // State management
  setState(newState) {
    const oldState = this.state;

    this.state = newState;
    this.handlers.onStateChange?.(oldState, newState);
    this.logDebug('State changed', { from: oldState, to: newState });
  }

  // Logging helpers
  logDebug(message, data) {
    if (typeof message === 'string' && !message.includes('[Protocol]')) {
      message = `[Protocol] ${message}`;
    }

    this.handlers.log?.('debug', message, data);
  }

  logInfo(message, data) {
    if (typeof message === 'string' && !message.includes('[Protocol]')) {
      message = `[Protocol] ${message}`;
    }

    this.handlers.log?.('info', message, data);
  }

  logError(message, error) {
    if (typeof message === 'string' && !message.includes('[Protocol]')) {
      message = `[Protocol] ${message}`;
    }

    this.handlers.log?.('error', message, error);
  }

  logWarn(message, data) {
    if (typeof message === 'string' && !message.includes('[Protocol]')) {
      message = `[Protocol] ${message}`;
    }

    this.handlers.log?.('warn', message, data);
  }

  // Utility methods
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isValidProtocol(protocol) {
    return Object.values(Protocol.PROTOCOLS).includes(protocol);
  }

  isConnected() {
    return this.connected;
  }

  getState() {
    return this.state;
  }

  getLastError() {
    return this.lastError;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  getTimeout() {
    return this.timeout;
  }

  // Add core protocol methods
  async queryEcus() {
    this.setState(Protocol.STATUS.ECU_DETECT);
    this.ecuAddresses.clear();
    this.selectedEcuAddress = 0;
  }

  setEcuAddress(address) {
    this.selectedEcuAddress = address;
    this.logInfo('ECU address set', { address: `0x${address.toString(16)}` });
  }

  // Add data handling methods
  async handleDataMessage(message, service) {
    this.handlers.onData?.(message, service);
  }

  async handleDTCResponse(message, service) {
    this.handlers.onDtcFound?.({ message, service });
  }

  // Add response handling methods
  isValidResponse(response) {
    return false; // To be implemented by derived class
  }

  isErrorResponse(response) {
    return false; // To be implemented by derived class
  }

  getResponseId(response) {
    return Protocol.RESPONSE_IDS.UNKNOWN; // To be implemented by derived class
  }

  // Add command queue methods
  pushCommand(command) {
    this.cmdQueue.push(command);
  }

  // Add timing methods
  async initializeAdaptiveTiming() {
    // To be implemented by derived class
  }

  // Add utility methods
  hexToBytes(hex) {
    return hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
  }

  hexToAscii(hex) {
    return (
      hex
        .match(/.{1,2}/g)
        ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
        .join('') || ''
    );
  }
}

export default Protocol;
```

## docs/ecu-ProtocolServiceBased.js

```javascript
// filepath: docs/ecu-ProtocolServiceBased.js
import { createDecodedECUConnector } from '@src/helper/OBDManagerHelper/OBDUtils';
import { log as logMain } from '@src/utils/logs';

import ElmProtocol from './decoder/lib/ElmProtocol';
import Protocol from './decoder/lib/Protocol';

const log = (...props) => {
  // TODO: remove this after testing
  // return;

  if (typeof props[1] === 'string') {
    props[1] = `[ProtocolServiceBased] ${props[1]}`;
  }

  logMain(...props);
};

/**
 * Manages protocol-based communication with ECU.
 * Implements singleton pattern for consistent state management.
 */
class ProtocolServiceBased {
  static instance = null;
  static isConnecting = false; // Add connection state tracking

  /**
   * Creates or returns the singleton instance
   * @param {Object} obdMonitor - The OBD monitor instance
   * @returns {ProtocolServiceBased} The singleton instance
   */
  static getInstance(obdMonitor) {
    if (!ProtocolServiceBased.instance) {
      new ProtocolServiceBased(obdMonitor);
    } else if (obdMonitor) {
      ProtocolServiceBased.instance.updateMonitor(obdMonitor);
    }

    return ProtocolServiceBased.instance;
  }

  /**
   * Resets the singleton instance and all its dependencies
   */
  static resetInstance() {
    if (ProtocolServiceBased.instance) {
      // Reset core properties
      ProtocolServiceBased.instance.currentProtocol = null;
      ProtocolServiceBased.instance.maxRetries = 3;
      ProtocolServiceBased.instance.retryDelay = 2000;
      ProtocolServiceBased.instance.status = 'Undefined';
      ProtocolServiceBased.instance.lastCommand = null;

      // Reset ELM protocol instance
      if (ProtocolServiceBased.instance.elmProtocol) {
        ProtocolServiceBased.instance.elmProtocol.setStatus(
          Protocol.STATUS.UNDEFINED,
        );
        ProtocolServiceBased.instance.elmProtocol.setProtocol(null);
        ProtocolServiceBased.instance.elmProtocol = null;
      }
    }

    ProtocolServiceBased.instance = null;
  }

  /**
   * Updates the instance with a new OBD monitor
   * @param {Object} obdMonitor - The new OBD monitor instance
   */
  updateMonitor(obdMonitor) {
    if (!obdMonitor) return;

    // Prevent multiple simultaneous updates
    if (this.isUpdating) {
      log('debug', 'Update already in progress, skipping');

      return;
    }

    this.isUpdating = true;

    try {
      this.obdMonitor = obdMonitor;

      // Only create ecuConnector if it doesn't exist or obdMonitor changed
      if (!this.ecuConnector || this.ecuConnector.obdMonitor !== obdMonitor) {
        this.ecuConnector = createDecodedECUConnector(obdMonitor);
      }

      // If elmProtocol exists, just update its handlers
      if (this.elmProtocol) {
        log('debug', 'Updating existing ElmProtocol handlers');
        this.elmProtocol.updateHandlers(this.createHandlers());

        return;
      }

      // Only create new ElmProtocol if we don't have one
      log('info', 'Initializing ElmProtocol instance');
      this.elmProtocol = ElmProtocol.getInstance(this.createHandlers());

      if (!this.isInitialized) {
        log('info', 'Initializing protocol service');
        this.isInitialized = true;

        // Set initial state
        this.elmProtocol.setStatus(Protocol.STATUS.UNDEFINED);

        if (this.currentProtocol) {
          this.elmProtocol.setProtocol(this.currentProtocol);
        }
      }
    } catch (error) {
      log('error', 'Error in updateMonitor:', error);
      this.isInitialized = false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Private constructor to enforce singleton pattern
   * @param {Object} obdMonitor - The OBD monitor instance
   */
  constructor(obdMonitor) {
    if (ProtocolServiceBased.instance) {
      ProtocolServiceBased.instance.updateMonitor(obdMonitor);

      return ProtocolServiceBased.instance;
    }

    // Initialize core properties first
    this.status = 'Undefined';
    this.lastCommand = null;
    this.currentProtocol = null;
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.elmProtocol = null;
    this.isInitialized = false;

    // Then update with monitor
    this.updateMonitor(obdMonitor);
    ProtocolServiceBased.instance = this;

    return this;
  }

  /**
   * Creates handlers for ELM protocol
   * @returns {Object} The protocol handlers
   */
  createHandlers() {
    const self = this; // Preserve instance reference

    return {
      // Communication handlers
      send: async (command, forceFireCommand = false) => {
        if (!command) throw new Error('Command is required');

        log('debug', 'HC:', command);
        const r = await self.ecuConnector.sendCommand(
          command,
          false,
          forceFireCommand,
        );

        log('debug', 'HR:', r);

        return r;
      },
      receive: async () => {
        return await self.ecuConnector.getLastResponse();
      },
      handleTelegram: async buffer => {
        return await self.elmProtocol.handleTelegram(buffer);
      },

      // Protocol handlers
      setProtocol: async protocol => {
        log('debug', '[ProtocolServiceBased] Setting protocol:', protocol);

        return await self.ecuConnector.setProtocol(protocol);
      },
      getProtocol: async () => {
        return await self.ecuConnector.getProtocol();
      },

      // Event handlers
      log: (...props) => {
        // Prevent duplicate logging by checking if message is already prefixed
        if (
          typeof props[1] === 'string' &&
          !props[1].includes('[ProtocolServiceBased]')
        ) {
          props[1] = `[ProtocolServiceBased] ${props[1]}`;
        }

        log(...props);
      },
      onPropertyChange: (property, value) => {
        log('info', `Property changed: ${property}`, value);
        switch (property) {
          case 'status':
            self.handleStatusChange(value);
            break;
          case 'ecuaddr':
            self.handleEcuAddressChange(value);
            break;
        }
      },
    };
  }

  // Status change handler
  handleStatusChange(status) {
    const { old, new: newStatus } = status;

    log('info', `ELM Status changed: ${old} -> ${newStatus}`);

    switch (newStatus) {
      case Protocol.STATUS.CONNECTED:
        this.onConnected();
        break;
      case Protocol.STATUS.DISCONNECTED:
        this.onDisconnected();
        break;
      case Protocol.STATUS.ERROR:
        this.onError();
        break;
    }
  }

  // ECU address change handler
  handleEcuAddressChange(addresses) {
    log('info', 'ECU addresses updated:', addresses);
    // Handle ECU address updates
  }

  async sendCommandWithRetry(command, maxRetries = this.maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const response = await this.ecuConnector.sendCommand(command);

      if (response && !response.includes('NO DATA')) {
        return response;
      }

      log(
        `Attempt ${attempt}/${maxRetries} failed for command ${command}, retrying...`,
      );

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }

    log('error', `Command ${command} failed after ${maxRetries} attempts`);

    return null;
  }

  // Connection methods
  async connectToECU() {
    // Prevent parallel connection attempts
    if (ProtocolServiceBased.isConnecting) {
      log('warn', 'Connection attempt already in progress, waiting...');
      while (ProtocolServiceBased.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return this.isConnected;
    }

    try {
      ProtocolServiceBased.isConnecting = true;
      log('info', '=== Starting ECU Connection Process ===');

      // Ensure proper initialization
      if (!this.isInitialized || !this.elmProtocol) {
        log('warn', 'Reinitializing protocol service...');
        this.updateMonitor(this.obdMonitor);

        if (!this.isInitialized || !this.elmProtocol) {
          throw new Error('Failed to initialize protocol service');
        }
      }

      // Check if we already have a protocol
      const currentProtocol = await this.ecuConnector.getProtocol();

      log('info', '>>>> Current protocol:', currentProtocol);

      if (currentProtocol) {
        log('info', 'Already connected with protocol:', currentProtocol);
        this.currentProtocol = currentProtocol;
        await this.elmProtocol.setProtocol(currentProtocol);
        this.elmProtocol.setStatus(Protocol.STATUS.CONNECTED);
        this.isConnected = true;

        this.handleStatusChange({
          old: Protocol.STATUS.DISCONNECTED,
          new: Protocol.STATUS.CONNECTED,
        });

        return true;
      }

      // Attempt connection
      const connected = await this.elmProtocol.connectToECU();

      if (connected) {
        this.currentProtocol = await this.ecuConnector.getProtocol();
        this.isConnected = true;
        log('info', 'ECU Communication verified');

        return true;
      }

      this.isConnected = false;

      return false;
    } catch (error) {
      log('error', '=== ECU Connection Process Failed ===');
      log('error', 'Failure reason:', error.message);
      this.isConnected = false;

      return false;
    } finally {
      ProtocolServiceBased.isConnecting = false;
    }
  }

  async handleTelegram(buffer) {
    return await this.elmProtocol.handleTelegram(buffer);
  }

  async sendCommand(command, forceFireCommand = false) {
    this.ecuConnector.deactivateRawResponse();

    return await this.ecuConnector.sendCommand(
      command,
      false,
      forceFireCommand,
    );
  }

  async sendCommandGetRawResponse(command, forceFireCommand = false) {
    this.ecuConnector.activateRawResponse();
    const response = await this.ecuConnector.sendCommand(
      command,
      false,
      forceFireCommand,
    );

    this.ecuConnector.deactivateRawResponse();

    return response;
  }

  // Connection state handlers
  onConnected() {
    log('info', 'Connection established');
  }

  onDisconnected() {
    log('info', 'Connection lost');
  }

  onError() {
    log('error', 'Connection error occurred');
  }

  async setProtocol(protocol) {
    if (!protocol) return;

    try {
      log('debug', '[ProtocolServiceBased] Setting protocol:', protocol);
      this.currentProtocol = protocol;

      if (this.elmProtocol) {
        await this.elmProtocol.setProtocol(protocol);
        await this.ecuConnector.setProtocol(protocol);
      }
    } catch (error) {
      log('error', '[ProtocolServiceBased] Error setting protocol:', error);
    }
  }
}

export default ProtocolServiceBased;

/**
 * Utility function to flush all protocol state
 */
export const flushEverything = () => {
  if (ProtocolServiceBased.instance) {
    // Reset core properties
    ProtocolServiceBased.instance.currentProtocol = null;
    ProtocolServiceBased.instance.maxRetries = 3;
    ProtocolServiceBased.instance.retryDelay = 2000;
    ProtocolServiceBased.instance.status = 'Undefined';
    ProtocolServiceBased.instance.lastCommand = null;

    // Reset ELM protocol instance
    if (ProtocolServiceBased.instance.elmProtocol) {
      ProtocolServiceBased.instance.elmProtocol.setStatus(
        Protocol.STATUS.UNDEFINED,
      );
      ProtocolServiceBased.instance.elmProtocol.setProtocol(null);
      ProtocolServiceBased.instance.elmProtocol = null;
    }

    // Reset instance
    ProtocolServiceBased.resetInstance();
  }
};
```

## docs/ecu-constants.js

```javascript
// filepath: docs/ecu-constants.js
export const PROTOCOL_TYPES = {
  CAN: 'CAN',
  ISO15765: 'ISO15765',
  ISO14230: 'ISO14230',
  J1850PWM: 'J1850PWM',
  J1850VPW: 'J1850VPW',
};

export const HEADER_FORMATS = {
  STANDARD: '11bit',
  EXTENDED: '29bit',
};

export const PROTOCOL_STATES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  INITIALIZING: 'INITIALIZING',
};

export const DEFAULT_PROTOCOL_CONFIG = {
  [PROTOCOL_TYPES.CAN]: {
    currentState: {
      protocolType: PROTOCOL_TYPES.CAN,
      headerFormat: HEADER_FORMATS.EXTENDED,
      ecuAddress: null,
      canID: null,
      currentProtocol: null,
      protocolState: PROTOCOL_STATES.INITIALIZING,
      isEchoEnabled: false,
      isHeaderEnabled: false,
      minCommandDelay: 100,
    },
  },
  [PROTOCOL_TYPES.ISO15765]: {
    currentState: {
      protocolType: PROTOCOL_TYPES.ISO15765,
      headerFormat: HEADER_FORMATS.STANDARD,
      ecuAddress: null,
      canID: null,
      currentProtocol: null,
      protocolState: PROTOCOL_STATES.INITIALIZING,
      isEchoEnabled: false,
      isHeaderEnabled: true,
      minCommandDelay: 200,
    },
  },
};

export const initializeProtocolConfigs = (customConfigs = {}) => {
  const mergedConfigs = {};

  // Deep merge custom configs with defaults
  Object.keys(DEFAULT_PROTOCOL_CONFIG).forEach(protocolType => {
    mergedConfigs[protocolType] = {
      currentState: {
        ...DEFAULT_PROTOCOL_CONFIG[protocolType].currentState,
        ...(customConfigs[protocolType]?.currentState || {}),
      },
    };
  });

  // Add any additional custom protocol types not in defaults
  Object.keys(customConfigs).forEach(protocolType => {
    if (!mergedConfigs[protocolType]) {
      mergedConfigs[protocolType] = {
        currentState: {
          ...customConfigs[protocolType].currentState,
        },
      };
    }
  });

  return mergedConfigs;
};
```

## docs/ecu-protocol.config.js

```javascript
// filepath: docs/ecu-protocol.config.js
export const PROTOCOL_TYPES = {
  CAN: 'CAN',
  ISO15765: 'ISO15765',
  ISO9141: 'ISO9141',
  ISO14230: 'ISO14230',
  J1850PWM: 'J1850PWM',
  J1850VPW: 'J1850VPW',
};

export const HEADER_FORMATS = {
  STANDARD: '11bit',
  EXTENDED: '29bit',
};

export const PROTOCOL_STATES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  INITIALIZING: 'INITIALIZING',
  ERROR: 'ERROR',
};

export const HEADER_PATTERNS = {
  CAN_11BIT: /^7E[0-F]|^7DF|^[0-7][0-9A-F]{2}/,
  CAN_29BIT: /^7E[0-F]|^18DA[0-F]{2}|^18DB[0-F]{2}/,
  KWP: /^48|^68/,
  ISO9141: /^48|^6B/,
  J1850: /^41|^48|^6B|^A8|^B8/,
};

export const DEFAULT_PROTOCOL_CONFIG = {
  [PROTOCOL_TYPES.CAN]: {
    currentState: {
      protocolType: PROTOCOL_TYPES.CAN,
      headerFormat: HEADER_FORMATS.EXTENDED,
      ecuAddress: null,
      canID: null,
      currentProtocol: null,
      protocolState: PROTOCOL_STATES.INACTIVE,
      isEchoEnabled: false,
      isHeaderEnabled: true,
      minCommandDelay: 100,
    },
  },
};

export const initializeProtocolConfigs = (customConfigs = {}) => {
  // Deep merge custom configs with defaults
  const mergedConfigs = {};

  // First, copy default configs
  Object.entries(DEFAULT_PROTOCOL_CONFIG).forEach(([protocol, config]) => {
    mergedConfigs[protocol] = {
      currentState: { ...config.currentState },
    };
  });

  // Then merge custom configs
  Object.entries(customConfigs).forEach(([protocol, config]) => {
    if (!mergedConfigs[protocol]) {
      mergedConfigs[protocol] = { currentState: {} };
    }

    if (config.currentState) {
      mergedConfigs[protocol].currentState = {
        ...mergedConfigs[protocol].currentState,
        ...config.currentState,
      };
    }
  });

  return mergedConfigs;
};
```

## docs/ecu-utils.js

```javascript
// filepath: docs/ecu-utils.js
import { log } from '@src/helper/OBDManagerHelper/OBDUtils';
import { TextDecoder } from 'text-decoding';

/**
 * Convert hex string to byte array
 * @param {string} hex
 * @returns {number[]}
 */
export const hexToBytes = hex => {
  const bytes = [];

  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }

  return bytes;
};

/**
 * Convert byte array to hex string
 * @param {number[]} bytes
 * @returns {string}
 */
export const bytesToHex = bytes => {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Get payload from buffer
 * @param {number[]} buffer
 * @returns {string}
 */
export const getPayLoad = buffer => {
  if (!buffer || buffer.length < 2) return '';

  return bytesToHex(buffer.slice(2));
};

/**
 * Decode value to string
 * @param {number[] | number} value
 * @returns {string}
 */
export const decodeValue = value => {
  if (!value) return '';

  const textDecoder = new TextDecoder('utf-8');

  try {
    return textDecoder.decode(new Uint8Array(value));
  } catch (error) {
    log('error', '[ECUDecoder] Error decoding value:', error);

    return '';
  }
};

/**
 * Convert byte array to string
 * @param {number[] | number | string} bytes
 * @returns {string}
 */
export const byteArrayToString = bytes => {
  try {
    // Handle null/undefined/empty cases
    if (!bytes) return '';

    // If it's already a string, return as is
    if (typeof bytes === 'string') return bytes;

    // If it's a number, convert to single byte array
    if (typeof bytes === 'number') return decodeValue([bytes]);

    // If it's not an array at all, try to stringify
    if (!Array.isArray(bytes)) return String(bytes);

    // If empty array
    if (bytes.length === 0) return '';

    // Handle nested arrays of any depth
    const flatten = arr => {
      return arr.reduce((flat, item) => {
        return flat.concat(Array.isArray(item) ? flatten(item) : item);
      }, []);
    };

    // Flatten and decode
    const flattened = flatten(bytes);

    return decodeValue(flattened);
  } catch (error) {
    log('error', '[ECUDecoder] Error in byteArrayToString:', error);

    return '';
  }
};

/**
 * Format number as hex string
 * @param {number} num
 * @param {number} width
 * @returns {string}
 */
export const toHexString = (num, width = 2) => {
  return num.toString(16).toUpperCase().padStart(width, '0');
};

/**
 * Create empty buffer with padding
 * @param {number} size
 * @param {string} paddingChar
 * @returns {string}
 */
export const createEmptyBuffer = (size, paddingChar = '0') => {
  return paddingChar.repeat(size);
};

/**
 * Validate hex string
 * @param {string} hex
 * @returns {boolean}
 */
export const isValidHex = hex => {
  return /^[0-9A-Fa-f]+$/.test(hex);
};

/**
 * Calculate checksum
 * @param {number[]} data
 * @returns {number}
 */
export const calculateChecksum = data => {
  return data.reduce((acc, val) => acc ^ val, 0);
};

/**
 * Format message with header and footer
 * @param {string} message
 * @param {string} header
 * @param {string} footer
 * @returns {string}
 */
export const formatMessage = (message, header = '', footer = '') => {
  return `${header}${message}${footer}`;
};

/**
 * Parse hex string to number
 * @param {string} hex
 * @returns {number}
 */
export const parseHexInt = hex => {
  return parseInt(hex, 16);
};

/**
 * Format number as decimal string with padding
 * @param {number} num
 * @param {number} width
 * @returns {string}
 */
export const toDecString = (num, width = 0) => {
  return num.toString().padStart(width, '0');
};
```

