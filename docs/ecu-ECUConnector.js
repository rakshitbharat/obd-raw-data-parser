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
