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
