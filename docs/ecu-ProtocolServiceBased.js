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
