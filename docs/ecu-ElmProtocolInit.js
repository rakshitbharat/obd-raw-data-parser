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
