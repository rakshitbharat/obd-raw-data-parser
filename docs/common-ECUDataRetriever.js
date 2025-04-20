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
