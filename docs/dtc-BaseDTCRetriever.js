import {
  PROT_DESCRIPTIONS,
  PROTOCOL_PRIORITIES,
} from '@src/helper/OBDManagerHelper/OBDUtils';
import { setDataStreamingStatus } from '@src/store/obdLiveDataSlice/__OBDU';
import { log as logMain } from '@src/utils/logs';

import { DTCAPIDecoder } from '../../ECUConnector/decoder/DTCAPIDecoder';
import { DTCBaseDecoder } from '../../ECUConnector/decoder/DTCBaseDecoder';
import { byteArrayToString } from '../../ECUConnector/decoder/lib/utils';

const log = (...args) => {
  // TODO: remove this after testing
  // return;

  if (typeof args[1] === 'string') {
    args[1] = `[BaseDTCRetriever] ${args[1]}`;
  }

  logMain(...args);
};

class BaseDTCRetriever {
  // Common constants for all DTC retrievers
  static PROTOCOL_STATES = {
    INITIALIZED: 'INITIALIZED',
    CONFIGURING: 'CONFIGURING',
    READY: 'READY',
    ERROR: 'ERROR',
  };

  static PROTOCOL_TYPES = {
    CAN: 'CAN',
    KWP: 'KWP',
    ISO9141: 'ISO9141',
    J1850: 'J1850',
  };

  static HEADER_FORMATS = {
    CAN_11BIT: '11bit',
    CAN_29BIT: '29bit',
    KWP: 'kwp',
    ISO9141: 'iso9141',
    J1850: 'j1850',
    UNKNOWN: 'unknown',
  };

  static AT_COMMANDS = {
    ENABLE_HEADERS: 'ATH1',
    DISABLE_HEADERS: 'ATH0',
    ENABLE_ECHO: 'ATE1',
    DISABLE_ECHO: 'ATE0',
    DISABLE_LINEFEEDS: 'ATL0',
    DISABLE_SPACES: 'ATS0',
    PROTOCOL_CLOSE: 'ATPC',
  };

  // Add SERVICE_MODES at the top with other static constants
  static SERVICE_MODES = {
    MODE03: {
      REQUEST: '03',
      RESPONSE: 0x43,
      NAME: 'MODE03',
      DESCRIPTION: 'Current Trouble Codes',
      troubleCodeType: 'TROUBLE_CODES',
    },
    MODE07: {
      REQUEST: '07',
      RESPONSE: 0x47,
      NAME: 'MODE07',
      DESCRIPTION: 'Pending Trouble Codes',
      troubleCodeType: 'U_TROUBLE_CODES',
    },
    MODE0A: {
      REQUEST: '0A',
      RESPONSE: 0x4a,
      NAME: 'MODE0A',
      DESCRIPTION: 'Permanent Trouble Codes',
      troubleCodeType: 'P_TROUBLE_CODES',
    },
  };

  // Protocol and ECU related constants
  static CAN_11BIT_HEADER = /^7E[8-F]/;
  static CAN_29BIT_HEADER = /^18DAF1/;
  static KWP_HEADER = /^48|^68/;
  static ISO9141_HEADER = /^48|^6B/;
  static J1850_HEADER = /^41|^48|^6B|^A8|^B8/;

  static VALID_RESPONSE_PATTERNS = {
    CAN_11BIT: /^7E[8-F][0-9A-F]*$/,
    CAN_29BIT: /^18DAF1[0-9A-F]*$/,
    KWP_FAST: /^48[0-9A-F]*$/,
    KWP_SLOW: /^68[0-9A-F]*$/,
    ISO9141: /^(48|6B)[0-9A-F]*$/,
    J1850_PWM: /^41[0-9A-F]*$/,
    J1850_VPW: /^(48|6B|A8|B8)[0-9A-F]*$/,
  };

  static ERROR_RESPONSES = [
    'UNABLE TO CONNECT',
    'BUS INIT: ERROR',
    'CAN ERROR',
    'BUS ERROR',
    'FB ERROR',
    'DATA ERROR',
    'ERR',
    'ACT ALERT',
    'BUFFER FULL',
    'BUS BUSY',
    'NO DATA',
    '7F',
    'STOPPED',
    'TIMEOUT',
    '<DATA ERROR>',
    'SEARCHING',
    'ERROR',
    'UNABLETOCONNECT',
    'BUSERROR',
    'DATAERROR',
    'BUFFERFULL',
    'BUSBUSY',
    'NODATA',
  ];

  // Shared state across all instances
  static _sharedState = {
    isHeaderEnabled: false,
    isEchoEnabled: false,
    lineFeedsDisabled: false,
    spacesDisabled: false,
    isResponseReady: false,
    lastProtocol: null,
    currentProtocol: null,
    protocolType: null,
    ecuAddress: null,
    canID: null,
    headerFormat: null,
    protocolConfig: null,
    protocolState: BaseDTCRetriever.PROTOCOL_STATES.INITIALIZED,
  };

  static TIMING_COMMANDS = {
    SET_TIMEOUT: 'ATST', // Set timeout (xx is multiplied by 4ms)
    ADAPTIVE_TIMING: 'ATAT', // Set adaptive timing (0=off, 1=auto1, 2=auto2)
    SET_RESPONSE_TIMEOUT: 'ATBRD', // Try to detect baud rate timeout
    SET_PROTOCOL_TIMEOUT: 'ATTP', // Set protocol timeout
    RESET_ADAPTIVE: 'ATRT', // Reset adaptive timing
  };

  static TIMING_CONFIGS = [
    // More aggressive timing configurations
    {
      steps: [
        { command: 'ATAT2', desc: 'Aggressive adaptive timing' },
        { command: 'ATST64', desc: 'Medium timeout' },
      ],
      desc: 'Aggressive adaptive with medium timeout',
    },
    {
      steps: [
        { command: 'ATAT1', desc: 'Normal adaptive timing' },
        { command: 'ATST96', desc: 'Long timeout' },
      ],
      desc: 'Normal adaptive with long timeout',
    },
    {
      steps: [
        { command: 'ATAT2', desc: 'Aggressive adaptive timing' },
        { command: 'ATST32', desc: 'Short timeout' },
      ],
      desc: 'Aggressive adaptive with short timeout',
    },
    {
      steps: [
        { command: 'ATAT0', desc: 'Disable adaptive timing' },
        { command: 'ATST96', desc: 'Long timeout without adaptive' },
      ],
      desc: 'No adaptive with long timeout',
    },
  ];

  constructor(ecuDataRetriever = null) {
    log('debug', '[BaseDTCRetriever] Constructor called', {
      hasEcuDataRetriever: !!ecuDataRetriever,
      ecuDataRetrieverType: ecuDataRetriever ? typeof ecuDataRetriever : 'null',
      ecuDataRetrieverKeys: ecuDataRetriever
        ? Object.keys(ecuDataRetriever)
        : [],
      protocolServiceBased: ecuDataRetriever?.protocolServiceBased
        ? 'exists'
        : 'missing',
    });

    this.ecuDataRetriever = ecuDataRetriever;
    log('debug', '[BaseDTCRetriever] ecuDataRetriever set', {
      hasEcuDataRetriever: !!this.ecuDataRetriever,
      instanceEcuDataRetrieverType: this.ecuDataRetriever
        ? typeof this.ecuDataRetriever
        : 'null',
    });

    // Initialize shared state if not already initialized
    if (!BaseDTCRetriever._sharedState) {
      log('debug', '[BaseDTCRetriever] Initializing shared state');
      this.resetState();
    }

    // If ecuDataRetriever is provided, try to initialize protocol info
    if (ecuDataRetriever?.protocolServiceBased) {
      log('debug', '[BaseDTCRetriever] Initializing protocol info', {
        currentProtocol: ecuDataRetriever.protocolServiceBased.currentProtocol,
      });

      // Get current protocol from protocolServiceBased
      const { currentProtocol } = ecuDataRetriever.protocolServiceBased;

      // If protocol is available, update it
      if (currentProtocol) {
        log(
          'debug',
          `[BaseDTCRetriever] Setting initial protocol: ${currentProtocol}`,
        );
        this.updateProtocolInfo(currentProtocol);
        this.lastProtocol = currentProtocol;
        this.currentProtocol = currentProtocol;
      }
    } else {
      log('debug', '[BaseDTCRetriever] No protocol info to initialize', {
        hasProtocolService: !!ecuDataRetriever?.protocolServiceBased,
        currentProtocol:
          ecuDataRetriever?.protocolServiceBased?.currentProtocol,
      });
    }
  }

  // Getters and setters for shared state
  get isHeaderEnabled() {
    return BaseDTCRetriever._sharedState.isHeaderEnabled;
  }
  set isHeaderEnabled(value) {
    BaseDTCRetriever._sharedState.isHeaderEnabled = value;
  }

  get isEchoEnabled() {
    return BaseDTCRetriever._sharedState.isEchoEnabled;
  }
  set isEchoEnabled(value) {
    BaseDTCRetriever._sharedState.isEchoEnabled = value;
  }

  get isResponseReady() {
    return BaseDTCRetriever._sharedState.isResponseReady;
  }
  set isResponseReady(value) {
    BaseDTCRetriever._sharedState.isResponseReady = value;
  }

  get lastProtocol() {
    return BaseDTCRetriever._sharedState.lastProtocol;
  }
  set lastProtocol(value) {
    BaseDTCRetriever._sharedState.lastProtocol = value;
  }

  get currentProtocol() {
    return BaseDTCRetriever._sharedState.currentProtocol;
  }
  set currentProtocol(value) {
    BaseDTCRetriever._sharedState.currentProtocol = value;
  }

  get protocolType() {
    return BaseDTCRetriever._sharedState.protocolType;
  }
  set protocolType(value) {
    BaseDTCRetriever._sharedState.protocolType = value;
  }

  get ecuAddress() {
    return BaseDTCRetriever._sharedState.ecuAddress;
  }
  set ecuAddress(value) {
    BaseDTCRetriever._sharedState.ecuAddress = value;
  }

  get canID() {
    return BaseDTCRetriever._sharedState.canID;
  }
  set canID(value) {
    BaseDTCRetriever._sharedState.canID = value;
  }

  get headerFormat() {
    return BaseDTCRetriever._sharedState.headerFormat;
  }
  set headerFormat(value) {
    BaseDTCRetriever._sharedState.headerFormat = value;
  }

  get protocolConfig() {
    return BaseDTCRetriever._sharedState.protocolConfig;
  }
  set protocolConfig(value) {
    BaseDTCRetriever._sharedState.protocolConfig = value;
  }

  get protocolState() {
    return BaseDTCRetriever._sharedState.protocolState;
  }
  set protocolState(value) {
    BaseDTCRetriever._sharedState.protocolState = value;
  }

  get lineFeedsDisabled() {
    return BaseDTCRetriever._sharedState.lineFeedsDisabled;
  }
  set lineFeedsDisabled(value) {
    BaseDTCRetriever._sharedState.lineFeedsDisabled = value;
  }

  get spacesDisabled() {
    return BaseDTCRetriever._sharedState.spacesDisabled;
  }
  set spacesDisabled(value) {
    BaseDTCRetriever._sharedState.spacesDisabled = value;
  }

  // Abstract method to be implemented by child classes
  getServiceMode() {
    throw new Error('getServiceMode must be implemented by child class');
  }

  resetState() {
    log('debug', '[BaseDTCRetriever] Resetting state', {
      currentEcuDataRetriever: !!this.ecuDataRetriever,
      currentState: this.getState(),
    });

    // Reset shared state
    BaseDTCRetriever._sharedState = {
      isHeaderEnabled: false,
      isEchoEnabled: false,
      lineFeedsDisabled: false,
      spacesDisabled: false,
      isResponseReady: false,
      lastProtocol: null,
      currentProtocol: null,
      protocolType: null,
      ecuAddress: null,
      canID: null,
      headerFormat: null,
      protocolConfig: null,
      protocolState: BaseDTCRetriever.PROTOCOL_STATES.INITIALIZED,
    };

    // Store ecuDataRetriever before reset
    const savedEcuDataRetriever = this.ecuDataRetriever;

    // Reset instance-specific properties
    this.ecuDataRetriever = null;

    log('debug', '[BaseDTCRetriever] State reset complete', {
      hadEcuDataRetriever: !!savedEcuDataRetriever,
      newState: this.getState(),
    });

    // Restore ecuDataRetriever if it existed
    if (savedEcuDataRetriever) {
      log('debug', '[BaseDTCRetriever] Restoring ecuDataRetriever after reset');
      this.ecuDataRetriever = savedEcuDataRetriever;
    }
  }

  async getProtocol() {
    log('debug', '[BaseDTCRetriever] Getting protocol', {
      hasEcuDataRetriever: !!this.ecuDataRetriever,
      hasProtocolService: !!this.ecuDataRetriever?.protocolServiceBased,
      currentState: this.getState(),
    });

    try {
      // Add this check first
      if (
        this.currentProtocol &&
        this.protocolState === BaseDTCRetriever.PROTOCOL_STATES.READY
      ) {
        return this.currentProtocol;
      }

      // If we're already in CONFIGURING state with the same protocol, don't update
      if (
        this.protocolState === BaseDTCRetriever.PROTOCOL_STATES.CONFIGURING &&
        this.currentProtocol ===
          this.ecuDataRetriever?.protocolServiceBased?.currentProtocol
      ) {
        return this.currentProtocol;
      }

      const currentProtocol =
        this.ecuDataRetriever?.protocolServiceBased?.currentProtocol;

      log(
        'debug',
        `[BaseDTCRetriever] Current protocol state: ${currentProtocol}`,
        {
          hasEcuDataRetriever: !!this.ecuDataRetriever,
          hasProtocolService: !!this.ecuDataRetriever?.protocolServiceBased,
          currentProtocol,
          currentState: this.getState(),
        },
      );

      if (!currentProtocol) {
        log(
          'debug',
          '[BaseDTCRetriever] No protocol detected - trying to reconnect',
          {
            ecuDataRetriever: !!this.ecuDataRetriever,
            protocolService: !!this.ecuDataRetriever?.protocolServiceBased,
          },
        );

        // Add protocol reinitialization logic
        try {
          await this.ecuDataRetriever.protocolServiceBased.connectToECU();

          return this.ecuDataRetriever.protocolServiceBased.currentProtocol;
        } catch (error) {
          log('error', 'Failed to reconnect to ECU:', error);

          return null;
        }
      }

      // Only update if protocol has changed or we don't have a config
      if (currentProtocol !== this.lastProtocol || !this.protocolConfig) {
        log(
          'info',
          `[BaseDTCRetriever] Protocol changed from ${this.lastProtocol} to ${currentProtocol}`,
        );

        // Save important state values
        const savedEcuAddress = this.ecuAddress;
        const savedCanID = this.canID;

        this.resetState();

        // Restore important state values
        if (savedEcuAddress) this.ecuAddress = savedEcuAddress;

        if (savedCanID) this.canID = savedCanID;

        this.lastProtocol = currentProtocol;
        this.currentProtocol = currentProtocol;

        // Set state to CONFIGURING before updating protocol info
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.CONFIGURING,
          'Updating protocol info',
        );
        this.updateProtocolInfo(currentProtocol);
      }

      return currentProtocol;
    } catch (error) {
      log('error', '[BaseDTCRetriever] Error getting protocol:', error, {
        hasEcuDataRetriever: !!this.ecuDataRetriever,
        hasProtocolService: !!this.ecuDataRetriever?.protocolServiceBased,
        state: this.getState(),
      });

      return null;
    }
  }

  updateProtocolInfo(protocol) {
    if (!protocol) {
      log('debug', 'Skipping protocol update - no protocol provided');

      return;
    }

    log('info', `Updating protocol state to: ${protocol}`);

    // Convert protocol to number for comparison
    const protocolNum = parseInt(protocol, 10);

    // Determine protocol type based on protocol number
    if (protocolNum >= 6 && protocolNum <= 9) {
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.CAN;
      this.headerFormat =
        protocolNum === 6 || protocolNum === 8
          ? BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT
          : BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT;
    } else if (protocolNum === 3) {
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.ISO9141;
      this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.ISO9141;
    } else if (protocolNum === 4 || protocolNum === 5) {
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.KWP;
      this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.KWP;
      this.protocolConfig = {
        protocol: protocolNum,
        desc: PROT_DESCRIPTIONS[protocolNum] || 'Unknown Protocol',
        priority: 99,
        responseType: BaseDTCRetriever.PROTOCOL_TYPES.KWP,
        kwpType: protocolNum === 5 ? 'FAST' : 'SLOW',
      };
    } else if (protocolNum === 1 || protocolNum === 2) {
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.J1850;
      this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.J1850;
    } else {
      this.protocolType = 'AUTO';
    }

    // Set protocol state to ready if validation passes
    if (this.validateProtocolState()) {
      this.setProtocolState(
        BaseDTCRetriever.PROTOCOL_STATES.READY,
        'Protocol info updated successfully',
      );
    }

    log('info', 'Protocol info updated:', {
      protocol: this.currentProtocol,
      type: this.protocolType,
      format: this.headerFormat,
      state: this.protocolState,
      config: this.protocolConfig,
    });
  }

  // Factory method to get decoder command based on service mode
  getDecoderCommand() {
    const serviceMode = this.getServiceMode();

    if (!serviceMode) {
      log('error', 'Service mode not available');

      return null;
    }

    const isCan = this.protocolType.toLowerCase().includes('can');

    return new DTCAPIDecoder({
      modeResponseByte: serviceMode.RESPONSE,
      logPrefix: `[${serviceMode.NAME}]`,
      troubleCodeType: serviceMode.NAME, // This should match the NAME in SERVICE_MODE
      serviceMode: serviceMode.REQUEST,
      isCan,
    });
  }

  async retrieveDTCs() {
    let retryCount = 0;
    const MAX_RETRIES = 3;

    try {
      log(
        'info',
        `=== Starting ${this.getServiceMode()?.NAME} retrieval sequence ===`,
      );

      // Validate prerequisites
      if (!this.ecuDataRetriever?.protocolServiceBased) {
        throw new Error('Invalid ECU data retriever configuration');
      }

      while (retryCount < MAX_RETRIES) {
        try {
          // Configure response format
          if (!(await this.configureResponseFormat())) {
            throw new Error('Failed to configure response format');
          }

          // Get and verify response
          const result = await this.verifyAndGetResponse();
          const { response: verifiedResponse, rawResponseArrayBytes } = result;

          if (!verifiedResponse && retryCount < MAX_RETRIES - 1) {
            log('warn', `Retry attempt ${retryCount + 1} of ${MAX_RETRIES}`);
            retryCount++;
            await this.delay(1000); // Wait before retry
            continue;
          }

          if (verifiedResponse) {
            log('info', 'Successfully retrieved verified response');

            // Handle empty response case
            if (verifiedResponse.rawString === '') {
              log('info', 'No DTCs found in verified response');

              return this.createResponse([], '');
            }

            // Decode DTCs if we have a response
            const decoder = this.getDecoderCommand();

            if (decoder && rawResponseArrayBytes) {
              await decoder.decodeDTCs(rawResponseArrayBytes);
            }

            return verifiedResponse;
          }

          // If we get here with no response after all retries
          log('error', 'Failed to get valid response after all retries');

          return null;
        } catch (innerError) {
          log('error', `Error during retry ${retryCount + 1}:`, innerError);

          if (retryCount >= MAX_RETRIES - 1) throw innerError;

          retryCount++;
          await this.delay(1000);
        }
      }
    } catch (error) {
      log('error', 'Fatal error retrieving DTCs:', error);
      this.resetState();
      throw error;
    } finally {
      // Ensure we clean up regardless of success/failure
      if (this.protocolState === BaseDTCRetriever.PROTOCOL_STATES.ERROR) {
        await this.sendCommand(BaseDTCRetriever.AT_COMMANDS.PROTOCOL_CLOSE);
      }
    }
  }

  getECUAddress(response) {
    if (!response) return null;

    const lines = response.split('\r').filter(line => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Handle raw byte response for KWP
      if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP) {
        // First try to parse as raw bytes
        if (/^[\d,\s]+$/.test(trimmedLine)) {
          const bytes = trimmedLine.split(',').map(b => parseInt(b));

          if (bytes.length >= 2 && bytes.every(b => !isNaN(b))) {
            // For KWP, first byte is ECU address
            const ecuAddr = bytes[0]
              .toString(16)
              .padStart(2, '0')
              .toUpperCase();

            if (/^[0-9A-F]{2}$/.test(ecuAddr)) {
              log('debug', `Found ECU address from raw bytes: ${ecuAddr}`);
              this.ecuAddress = ecuAddr;

              return this.ecuAddress;
            }
          }
        }

        // Try to parse hex string format (83F111017F3136)
        const hexMatch = trimmedLine.match(/^([0-9A-F]{2})/i);

        if (hexMatch) {
          const ecuAddr = hexMatch[1].toUpperCase();

          log('debug', `Found ECU address from hex string: ${ecuAddr}`);
          this.ecuAddress = ecuAddr;

          return this.ecuAddress;
        }

        // For KWP Fast, check special format with F1
        const kwpFastMatch = trimmedLine.match(/^([0-9A-F]{2})\s*F1/i);

        if (kwpFastMatch) {
          const ecuAddr = kwpFastMatch[1].toUpperCase();

          log('debug', `Found ECU address from KWP Fast format: ${ecuAddr}`);
          this.ecuAddress = ecuAddr;

          return this.ecuAddress;
        }
      } else if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.CAN) {
        if (BaseDTCRetriever.CAN_11BIT_HEADER.test(trimmedLine)) {
          this.ecuAddress = trimmedLine.substring(0, 3);

          return this.ecuAddress;
        }

        if (BaseDTCRetriever.CAN_29BIT_HEADER.test(trimmedLine)) {
          this.ecuAddress = trimmedLine.substring(0, 6);

          return this.ecuAddress;
        }
      } else if (
        this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.ISO9141 &&
        BaseDTCRetriever.ISO9141_HEADER.test(trimmedLine)
      ) {
        this.ecuAddress = trimmedLine.substring(0, 2);

        return this.ecuAddress;
      } else if (
        this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.J1850 &&
        BaseDTCRetriever.J1850_HEADER.test(trimmedLine)
      ) {
        this.ecuAddress = trimmedLine.substring(0, 2);

        return this.ecuAddress;
      }
    }

    // If we haven't found an address yet, try to parse from raw response
    if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP) {
      const rawBytes = response.split(',').map(b => parseInt(b));

      if (rawBytes.length >= 2 && !isNaN(rawBytes[0])) {
        const ecuAddr = rawBytes[0].toString(16).padStart(2, '0').toUpperCase();

        if (/^[0-9A-F]{2}$/.test(ecuAddr)) {
          log('debug', `Found ECU address from raw response: ${ecuAddr}`);
          this.ecuAddress = ecuAddr;

          return this.ecuAddress;
        }
      }
    }

    return null;
  }

  getCanID() {
    if (this.protocolType !== BaseDTCRetriever.PROTOCOL_TYPES.CAN) return null;

    // For CAN protocol, CAN ID is the same as ECU address
    return this.canID || this.ecuAddress;
  }

  getProtocolType() {
    return this.protocolType;
  }

  getHeaderFormat() {
    return this.headerFormat;
  }

  getProtocolConfig() {
    const protocol = this.getProtocol();

    if (!protocol) return null;

    // Find protocol configuration from PROTOCOL_PRIORITIES
    const protocolConfig = PROTOCOL_PRIORITIES.find(
      p => p.protocol === parseInt(protocol),
    );

    // If no specific config found, create a basic config based on protocol number
    if (!protocolConfig) {
      const protocolNum = parseInt(protocol);
      const config = {
        protocol: protocolNum,
        desc: PROT_DESCRIPTIONS[protocolNum] || 'Unknown Protocol',
        priority: 99, // Low priority for unknown protocols
      };

      // Set response type based on protocol number
      if (protocolNum >= 6 && protocolNum <= 20) {
        config.responseType = BaseDTCRetriever.PROTOCOL_TYPES.CAN;
        config.canType =
          protocolNum % 2 === 0
            ? BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT
            : BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT;
      } else if (protocolNum === 3) {
        config.responseType = BaseDTCRetriever.PROTOCOL_TYPES.ISO9141;
      } else if (protocolNum === 4) {
        config.responseType = BaseDTCRetriever.PROTOCOL_TYPES.KWP;
        config.kwpType = 'SLOW'; // 5-baud init
      } else if (protocolNum === 5) {
        config.responseType = BaseDTCRetriever.PROTOCOL_TYPES.KWP;
        config.kwpType = 'FAST'; // Fast init
      } else if (protocolNum === 1 || protocolNum === 2) {
        config.responseType = BaseDTCRetriever.PROTOCOL_TYPES.J1850;
      } else {
        config.responseType = 'AUTO';
      }

      return config;
    }

    // For existing configs, ensure responseType matches our enum
    if (protocolConfig.responseType) {
      switch (protocolConfig.responseType.toUpperCase()) {
        case 'CAN':
          protocolConfig.responseType = BaseDTCRetriever.PROTOCOL_TYPES.CAN;
          break;
        case 'ISO9141':
          protocolConfig.responseType = BaseDTCRetriever.PROTOCOL_TYPES.ISO9141;
          break;
        case 'KWP':
          protocolConfig.responseType = BaseDTCRetriever.PROTOCOL_TYPES.KWP;
          // Set KWP type based on protocol number
          protocolConfig.kwpType =
            protocolConfig.protocol === 5 ? 'FAST' : 'SLOW';
          break;
        case 'J1850':
          protocolConfig.responseType = BaseDTCRetriever.PROTOCOL_TYPES.J1850;
          break;
      }
    }

    return protocolConfig;
  }

  isErrorResponse(response) {
    if (!response) return true;

    // Special case for AT commands and OK responses
    if (response.includes('OK')) {
      return false;
    }

    // Don't treat raw byte responses as errors for KWP
    if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP) {
      const bytes = response.split(',').map(b => parseInt(b));

      if (bytes.every(b => !isNaN(b))) {
        return false;
      }
    }

    // Don't treat 'E>' as an error for non-CAN protocols
    if (
      this.protocolType &&
      this.protocolType !== BaseDTCRetriever.PROTOCOL_TYPES.CAN &&
      response.trim() === 'E>'
    ) {
      return false;
    }

    // Check for standard error responses
    if (BaseDTCRetriever.ERROR_RESPONSES.some(err => response.includes(err))) {
      // For KWP, validate if this is actually a valid response that happens to contain an error pattern
      if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP) {
        const cleanResponse = response.replace(/[\r\n\s>]+/g, '');
        const hasValidKWPFormat = /^[0-9A-F]+$/.test(cleanResponse);

        if (hasValidKWPFormat) {
          return false;
        }
      }

      log('debug', `Found error response: ${response}`);

      return true;
    }

    // Check for malformed responses - allow OK, E>, and > in responses
    if (!/^[0-9A-F\s:>EOK\r\n,]+$/i.test(response)) {
      log('debug', `Malformed response detected: ${response}`);

      return true;
    }

    return false;
  }

  async sendCommand(command, retryCount = 0, getStringOnly = true) {
    setDataStreamingStatus(true);
    const makeResponse = (responseString, rawResponse, flag) => {
      if (flag) {
        return responseString;
      }

      return {
        rawResponse,
        responseString,
      };
    };

    try {
      // Validate command input
      if (!command || typeof command !== 'string') {
        throw new Error(
          'Invalid command format: Command must be a non-empty string.',
        );
      }

      log('debug', ' Sending command', {
        command,
        hasEcuDataRetriever: !!this.ecuDataRetriever,
        hasProtocolService: !!this.ecuDataRetriever?.protocolServiceBased,
      });

      if (!this.ecuDataRetriever?.protocolServiceBased) {
        log('error', '[BaseDTCRetriever] Protocol service not initialized', {
          hasEcuDataRetriever: !!this.ecuDataRetriever,
          ecuDataRetrieverType: typeof this.ecuDataRetriever,
          protocolService: this.ecuDataRetriever?.protocolServiceBased,
        });
        throw new Error('Protocol service not initialized.');
      }

      // Send command
      let rawResponse =
        await this.ecuDataRetriever.protocolServiceBased.sendCommandGetRawResponse(
          command,
        );
      let response = byteArrayToString(rawResponse);

      // Check if we got NO DATA and it's not an AT command
      if (response.includes('NO DATA') && !command.startsWith('AT')) {
        log('debug', 'NO DATA received, attempting timing adjustments');

        // Try timing configurations
        const timingSuccess = await this.tryTimingConfiguration(command);

        if (timingSuccess) {
          // Retry the original command
          rawResponse =
            await this.ecuDataRetriever.protocolServiceBased.sendCommandGetRawResponse(
              command,
            );
          response = byteArrayToString(rawResponse);

          if (!response.includes('NO DATA')) {
            log('info', 'Successfully got response after timing adjustment');
          } else {
            log('warn', 'Still getting NO DATA after timing adjustment');
          }
        }
      }

      // Final response validation
      if (!response.trim()) {
        log('debug', '[BaseDTCRetriever] Empty response received', { command });

        return makeResponse('', rawResponse, getStringOnly);
      }

      // Handle AT commands separately
      if (command.startsWith('AT')) {
        if (response.toUpperCase().includes('OK')) {
          log('info', `AT command '${command}' executed successfully.`);

          return makeResponse(response, rawResponse, getStringOnly);
        } else {
          log(
            'warn',
            `AT command response does not contain 'OK'. Response: ${response}`,
          );
          throw new Error(`AT command failed with response: ${response}`);
        }
      }

      // Check for error responses
      if (this.isErrorResponse(response)) {
        log('warn', '[BaseDTCRetriever] Error response received', {
          command,
          response,
        });
        await this.sendCommand('\r');
      }

      // Return response based on getStringOnly flag
      return makeResponse(response, rawResponse, getStringOnly);
    } catch (error) {
      log('error', `[BaseDTCRetriever] Command '${command}' failed`, {
        error: error.message,
        command,
      });
      throw error;
    }
  }

  async tryTimingConfiguration(command) {
    if (!command || command.startsWith('AT')) {
      return false;
    }

    log('debug', 'Starting timing configuration sequence');

    for (const config of BaseDTCRetriever.TIMING_CONFIGS) {
      try {
        log('debug', `Trying timing config: ${config.desc}`);

        // Reset any existing timing configurations
        await this.sendCommand('ATRT');
        await this.delay(100);

        // Apply each step in the configuration
        for (const step of config.steps) {
          log('debug', `Applying timing step: ${step.desc}`);
          const response = await this.sendCommand(step.command);

          if (this.isErrorResponse(response)) {
            log('warn', `Failed to apply timing step: ${step.desc}`);
            continue;
          }

          await this.delay(100);
        }

        // Try the original command with the new timing configuration
        log('debug', `Testing command with timing config: ${config.desc}`);
        const testResponse = await this.sendCommand(command);

        // If we get a valid response, keep this timing configuration
        if (
          !this.isErrorResponse(testResponse) &&
          !testResponse.includes('NO DATA')
        ) {
          log('info', `Found working timing configuration: ${config.desc}`);

          return true;
        }

        // Add a delay before trying the next configuration
        await this.delay(200);
      } catch (error) {
        log('warn', `Error during timing config ${config.desc}:`, error);
        continue;
      }
    }

    log('warn', 'No working timing configuration found');

    return false;
  }

  async enableHeader() {
    try {
      const headerResponse = await this.sendCommand(
        BaseDTCRetriever.AT_COMMANDS.ENABLE_HEADERS,
      );
      const lines = headerResponse?.split('\r').filter(line => line.trim());

      this.isHeaderEnabled = lines?.some(line => line.trim() === 'OK');

      log('debug', 'Header response:', {
        raw: headerResponse,
        parsed: lines,
        enabled: this.isHeaderEnabled,
      });

      return this.isHeaderEnabled;
    } catch (error) {
      this.isHeaderEnabled = false;
      throw error;
    }
  }

  async enableEcho() {
    try {
      const echoResponse = await this.sendCommand(
        BaseDTCRetriever.AT_COMMANDS.ENABLE_ECHO,
      );
      const lines = echoResponse?.split('\r').filter(line => line.trim());

      this.isEchoEnabled = lines?.some(line => line.trim() === 'OK');

      log('debug', 'Echo response:', {
        raw: echoResponse,
        parsed: lines,
        enabled: this.isEchoEnabled,
      });

      return this.isEchoEnabled;
    } catch (error) {
      this.isEchoEnabled = false;
      throw error;
    }
  }

  async disableLineFeeds() {
    try {
      const lfResponse = await this.sendCommand(
        BaseDTCRetriever.AT_COMMANDS.DISABLE_LINEFEEDS,
      );
      const lines = lfResponse?.split('\r').filter(line => line.trim());

      this.lineFeedsDisabled = lines?.some(line => line.trim() === 'OK');

      log('debug', 'Linefeed response:', {
        raw: lfResponse,
        parsed: lines,
        disabled: this.lineFeedsDisabled,
      });

      return this.lineFeedsDisabled;
    } catch (error) {
      this.lineFeedsDisabled = false;
      throw error;
    }
  }

  async disableSpaces() {
    try {
      const spaceResponse = await this.sendCommand(
        BaseDTCRetriever.AT_COMMANDS.DISABLE_SPACES,
      );
      const lines = spaceResponse?.split('\r').filter(line => line.trim());

      this.spacesDisabled = lines?.some(line => line.trim() === 'OK');

      log('debug', 'Space response:', {
        raw: spaceResponse,
        parsed: lines,
        disabled: this.spacesDisabled,
      });

      return this.spacesDisabled;
    } catch (error) {
      this.spacesDisabled = false;
      throw error;
    }
  }

  async configureResponseFormat() {
    try {
      if (!this.getProtocolConfig()) {
        throw new Error('No protocol configuration available');
      }

      log('debug', 'Starting response format configuration in sequence');

      // Reset all flags to their initial state
      this.isHeaderEnabled = false;
      this.isEchoEnabled = false;
      this.lineFeedsDisabled = false;
      this.spacesDisabled = false;

      // Set state to CONFIGURING
      this.setProtocolState(
        BaseDTCRetriever.PROTOCOL_STATES.CONFIGURING,
        'Configuring response format',
      );

      // Step 1: Disable headers first
      log('debug', 'Step 1: Disabling headers');
      const headerDisabled = await this.disableHeader();

      if (!headerDisabled) {
        log('error', 'Failed to disable headers');
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.ERROR,
          'Failed to disable headers',
        );

        return false;
      }

      this.isHeaderEnabled = false; // Headers are now disabled
      await this.delay(100); // Small delay between commands

      // Step 2: Disable echo
      log('debug', 'Step 2: Disabling echo');
      const echoDisabled = await this.disableEcho();

      if (!echoDisabled) {
        log('error', 'Failed to disable echo');
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.ERROR,
          'Failed to disable echo',
        );

        return false;
      }

      this.isEchoEnabled = false; // Echo is now disabled
      await this.delay(100); // Small delay between commands

      // Step 3: Disable line feeds
      log('debug', 'Step 3: Disabling line feeds');
      const lineFeedsDisabled = await this.disableLineFeeds();

      if (!lineFeedsDisabled) {
        log('error', 'Failed to disable line feeds');
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.ERROR,
          'Failed to disable line feeds',
        );

        return false;
      }

      this.lineFeedsDisabled = true;
      await this.delay(100); // Small delay between commands

      // Step 4: Disable spaces
      log('debug', 'Step 4: Disabling spaces');
      const spacesDisabled = await this.disableSpaces();

      if (!spacesDisabled) {
        log('error', 'Failed to disable spaces');
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.ERROR,
          'Failed to disable spaces',
        );

        return false;
      }

      this.spacesDisabled = true;

      // Log configuration status
      log('debug', 'Configuration status:', {
        headerDisabled,
        echoDisabled,
        lineFeedsDisabled,
        spacesDisabled,
        isHeaderEnabled: this.isHeaderEnabled,
        isEchoEnabled: this.isEchoEnabled,
      });

      // Verify all configurations were successful
      if (
        headerDisabled &&
        echoDisabled &&
        lineFeedsDisabled &&
        spacesDisabled
      ) {
        // All configurations successful, set state to READY
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.READY,
          'Response format configured successfully',
        );
        log('info', 'Response format configured successfully');

        // Double check protocol state validation
        if (!this.validateProtocolState()) {
          log('error', 'Protocol validation failed after configuration');
          this.setProtocolState(
            BaseDTCRetriever.PROTOCOL_STATES.ERROR,
            'Protocol validation failed',
          );

          return false;
        }

        return true;
      }

      log('error', 'Configuration incomplete');
      this.setProtocolState(
        BaseDTCRetriever.PROTOCOL_STATES.ERROR,
        'Configuration incomplete',
      );

      return false;
    } catch (error) {
      log('error', 'Configuration error:', error);
      this.setProtocolState(
        BaseDTCRetriever.PROTOCOL_STATES.ERROR,
        'Configuration error',
      );
      this.resetState();
      throw error;
    }
  }

  async disableHeader() {
    try {
      const headerResponse = await this.sendCommand(
        BaseDTCRetriever.AT_COMMANDS.DISABLE_HEADERS,
      );
      const lines = headerResponse?.split('\r').filter(line => line.trim());
      const isDisabled = lines?.some(line => line.trim() === 'OK');

      log('debug', 'Header disable response:', {
        raw: headerResponse,
        parsed: lines,
        disabled: isDisabled,
      });

      return isDisabled;
    } catch (error) {
      log('error', 'Failed to disable header:', error);

      return false;
    }
  }

  async disableEcho() {
    try {
      const echoResponse = await this.sendCommand(
        BaseDTCRetriever.AT_COMMANDS.DISABLE_ECHO,
      );
      const lines = echoResponse?.split('\r').filter(line => line.trim());
      const isDisabled = lines?.some(line => line.trim() === 'OK');

      log('debug', 'Echo disable response:', {
        raw: echoResponse,
        parsed: lines,
        disabled: isDisabled,
      });

      return isDisabled;
    } catch (error) {
      log('error', 'Failed to disable echo:', error);

      return false;
    }
  }

  verifyResponseFormat(response) {
    if (!response) {
      log('debug', 'Null response received');

      return false;
    }

    // Clean and normalize the response
    const cleanResponse = response.replace(/\s+/g, ' ').trim();
    const lines = cleanResponse.split('\r').filter(line => line.trim());

    // Check if we have any valid lines
    if (lines.length === 0) {
      log('debug', 'No valid response lines found');

      return false;
    }

    // Handle empty but valid responses
    if (this.isEmptyOrNoDataResponse(cleanResponse)) {
      log('debug', 'Valid empty response detected');

      return true;
    }

    // Get the current service mode
    const serviceMode = this.getServiceMode();

    if (!serviceMode) {
      log('error', 'No service mode available');

      return false;
    }

    // Protocol-specific validation with detailed error tracking
    try {
      switch (this.protocolType) {
        case BaseDTCRetriever.PROTOCOL_TYPES.CAN:
          return this.verifyCANResponse(lines);

        case BaseDTCRetriever.PROTOCOL_TYPES.KWP:
          return this.verifyKWPResponse(lines, serviceMode);

        case BaseDTCRetriever.PROTOCOL_TYPES.ISO9141:
          return this.verifyISO9141Response(lines, serviceMode);

        case BaseDTCRetriever.PROTOCOL_TYPES.J1850:
          return this.verifyJ1850Response(lines, serviceMode);

        default:
          log('error', `Unknown protocol type: ${this.protocolType}`);

          return false;
      }
    } catch (error) {
      log('error', 'Error during response verification:', error);

      return false;
    }
  }

  verifyCANResponse(lines) {
    const validLines = lines.filter(line => {
      const trimmedLine = line.trim();

      // Skip command echoes and prompts
      if (
        trimmedLine === '>' ||
        trimmedLine === this.getServiceMode()?.REQUEST
      ) {
        return false;
      }

      // Handle responses without headers
      if (!this.isHeaderEnabled && trimmedLine.includes(':')) {
        const [frameNum, frameData] = trimmedLine.split(':');

        return frameData && frameData.trim().length > 0;
      }

      // Validate header format
      const hasValidHeader =
        this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT
          ? BaseDTCRetriever.CAN_11BIT_HEADER.test(trimmedLine)
          : BaseDTCRetriever.CAN_29BIT_HEADER.test(trimmedLine);

      return hasValidHeader || this.isValidServiceResponse(trimmedLine);
    });

    const isValid = validLines.length > 0;

    log('debug', `CAN response validation: ${isValid ? 'valid' : 'invalid'}`, {
      validLines: validLines.length,
      totalLines: lines.length,
      hasHeaders: this.isHeaderEnabled,
      firstValidLine: validLines[0],
    });

    return isValid;
  }

  isValidServiceResponse(line) {
    const serviceMode = this.getServiceMode();

    if (!serviceMode) return false;

    // Convert response code to hex string and pad with leading zero if needed
    const expectedResponse = serviceMode.RESPONSE.toString(16)
      .padStart(2, '0')
      .toUpperCase();

    // Create patterns for all valid service modes
    const validResponsePatterns = [
      new RegExp(`^${expectedResponse}`), // Direct response code
      new RegExp(serviceMode.REQUEST), // Request code
      /^4[37A]/, // Generic pattern for all modes (0x43, 0x47, 0x4A)
      /^[0-9A-F]{2}${expectedResponse}/, // Protocol header + response
      // Add specific patterns for each mode
      /^43[0-9A-F]+$/, // Mode 03 pattern
      /^47[0-9A-F]+$/, // Mode 07 pattern
      /^4[Aa][0-9A-F]+$/, // Mode 0A pattern (case insensitive)
    ];

    return validResponsePatterns.some(pattern => pattern.test(line));
  }

  verifyKWPResponse(lines, serviceMode) {
    const validLines = lines.filter(line => {
      const trimmedLine = line.trim().replace(/\s+/g, '').replace(/[>\r]/g, '');
      const protocolConfig = this.getProtocolConfig();
      const isKWPFast = protocolConfig?.kwpType === 'FAST';

      // Accept 'E>' response for KWP
      if (trimmedLine === 'E') return true;

      // Accept single byte response followed by 7F (negative response format)
      if (/^[0-9A-F]{2}7F/i.test(trimmedLine)) {
        return true;
      }

      // Check for valid response patterns for all modes
      const responsePatterns = [
        /^4[37A][0-9A-F]+$/i, // Generic response pattern for all modes
        new RegExp(
          `^${serviceMode.RESPONSE.toString(16).toUpperCase()}[0-9A-F]+$`,
        ), // Specific mode response
        /^[0-9A-F]{2}F1/i, // KWP Fast header pattern
        /^[0-9A-F]{2}7F/i, // Negative response pattern (expanded)
        /^[0-9A-F]{6,}$/i, // Any valid hex string of 6 or more characters
      ];

      if (responsePatterns.some(pattern => pattern.test(trimmedLine))) {
        return true;
      }

      // Handle raw byte responses
      if (/^[\d,\s]+$/.test(trimmedLine)) {
        const bytes = trimmedLine.split(',').map(b => parseInt(b.trim()));

        if (bytes.every(b => !isNaN(b) && b >= 0 && b <= 255)) {
          // Check for valid response bytes including negative response (0x7F)
          const validResponseBytes = [0x43, 0x47, 0x4a, 0x7f];

          return bytes.some(b => validResponseBytes.includes(b));
        }
      }

      return false;
    });

    const isValid = validLines.length > 0;

    log('debug', `KWP response validation: ${isValid ? 'valid' : 'invalid'}`, {
      validLines,
      totalLines: lines.length,
      protocolConfig: this.getProtocolConfig(),
    });

    return isValid;
  }

  verifyISO9141Response(lines, serviceMode) {
    const validLines = lines.filter(line => {
      const trimmedLine = line.trim();

      // Accept 'E>' response for ISO9141
      if (trimmedLine === 'E>') {
        return true;
      }

      // Check for ISO header patterns
      const hasISOHeader = BaseDTCRetriever.ISO9141_HEADER.test(trimmedLine);

      // Check for service response
      const hasServiceResponse =
        trimmedLine.includes(serviceMode.REQUEST) ||
        trimmedLine.includes(serviceMode.RESPONSE.toString(16).toUpperCase());

      // Check for valid data pattern (after header)
      const hasValidData = /^[0-9A-F\s]+$/i.test(trimmedLine.substring(2));

      return (hasISOHeader && hasValidData) || hasServiceResponse;
    });

    const isValid = validLines.length > 0;

    log(
      'debug',
      `ISO9141 response validation: ${isValid ? 'valid' : 'invalid'}`,
      {
        validLines: validLines.length,
        totalLines: lines.length,
        lines: validLines,
      },
    );

    return isValid;
  }

  verifyJ1850Response(lines, serviceMode) {
    const validLines = lines.filter(line => {
      const trimmedLine = line.trim();

      // Accept 'E>' response for J1850
      if (trimmedLine === 'E>') {
        return true;
      }

      // Check for J1850 header patterns
      const hasJ1850Header = BaseDTCRetriever.J1850_HEADER.test(trimmedLine);

      // Check for service response
      const hasServiceResponse =
        trimmedLine.includes(serviceMode.REQUEST) ||
        trimmedLine.includes(serviceMode.RESPONSE.toString(16).toUpperCase());

      // Check for valid data pattern (after header)
      const hasValidData = /^[0-9A-F\s]+$/i.test(trimmedLine.substring(2));

      return (hasJ1850Header && hasValidData) || hasServiceResponse;
    });

    const isValid = validLines.length > 0;

    log(
      'debug',
      `J1850 response validation: ${isValid ? 'valid' : 'invalid'}`,
      {
        validLines: validLines.length,
        totalLines: lines.length,
        lines: validLines,
      },
    );

    return isValid;
  }

  hasValidHeader(line) {
    if (!line || !this.protocolType) {
      log('debug', 'Missing line or protocol type for header validation');

      return false;
    }

    const trimmedLine = line.trim();

    // For CAN, check if the line contains a valid header anywhere
    if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.CAN) {
      if (this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT) {
        return BaseDTCRetriever.CAN_11BIT_HEADER.test(trimmedLine);
      } else {
        return BaseDTCRetriever.CAN_29BIT_HEADER.test(trimmedLine);
      }
    }

    // For other protocols, be more lenient with header validation
    switch (this.protocolType) {
      case BaseDTCRetriever.PROTOCOL_TYPES.KWP:
        return BaseDTCRetriever.KWP_HEADER.test(trimmedLine);
      case BaseDTCRetriever.PROTOCOL_TYPES.ISO9141:
        return BaseDTCRetriever.ISO9141_HEADER.test(trimmedLine);
      case BaseDTCRetriever.PROTOCOL_TYPES.J1850:
        return BaseDTCRetriever.J1850_HEADER.test(trimmedLine);
      default:
        return (
          BaseDTCRetriever.VALID_RESPONSE_PATTERNS[this.protocolType]?.test(
            trimmedLine,
          ) || false
        );
    }
  }

  /**
   * Checks if the response indicates an empty or NO DATA state
   * @param {string} response - The response string to check
   * @returns {boolean} - True if the response indicates empty or NO DATA state
   */
  isEmptyOrNoDataResponse(response) {
    if (!response) return true;

    const trimmed = response.trim().toUpperCase();

    // Check for actual DTC presence in CAN responses
    if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.CAN) {
      // Look for valid DTC patterns (4-character codes)
      const dtcPattern = /[0-9A-F]{4}/;

      if (dtcPattern.test(trimmed)) return false;
    }

    // Update empty patterns to be more precise
    const emptyPatterns = [
      /^NO[\s-]DATA$/i,
      /^NO[\s-]DTCS$/i,
      /^0+$/, // All zeros
      /^7E8 00$/,
      /^7E9 00$/,
      /^(OK|NONE|NOERROR)$/i,
    ];

    return emptyPatterns.some(pattern => pattern.test(trimmed));
  }

  async getCleanResponse(result = null) {
    if (!result) {
      // Fire all AT commands in parallel
      await this.sendCommand('\r');
      await this.delay(100);
      await this.sendCommand('ATH0');
      await this.delay(100);
      await this.sendCommand('ATE0');
      await this.delay(100);

      // Request raw response
      result = await this.sendCommand(this.getServiceMode().REQUEST, 0, false);
    }

    log('debug', 'Clean response result:', {
      hasResponse: !!result,
      responseString: result?.responseString,
      rawResponse: result?.rawResponse,
    });

    // Handle case where there are no DTCs using the new method
    if (this.isEmptyOrNoDataResponse(result?.responseString)) {
      log('debug', 'Empty or NO DATA response detected');

      return {
        responseString: '',
        rawResponse: [],
      };
    }

    return result;
  }

  async verifyAndGetResponse() {
    const makeRawResponse = (response, rawResponseArrayBytes) => {
      // validate response it should be a string and not empty and not null
      if (
        typeof response !== 'string' ||
        response === '' ||
        response === null
      ) {
        response = null;
      }

      // validate rawResponse it should array of bytes from the device
      if (!Array.isArray(rawResponseArrayBytes)) {
        rawResponseArrayBytes = null;
      }

      if (!response && !rawResponseArrayBytes) {
        return {
          response: this.createResponse([], ''),
          rawResponseArrayBytes: null,
          rawString: null,
        };
      }

      const preparedResponse = this.prepareResponse(response);

      return {
        response: preparedResponse,
        rawResponseArrayBytes,
        rawString: response,
      };
    };

    try {
      // Reset response ready flag at the start
      this.isResponseReady = false;

      // Update protocol information before sending command
      const protocol = await this.getProtocol();

      if (!protocol) {
        log('debug', 'No protocol detected');

        return makeRawResponse(null, null);
      }

      // Set state to CONFIGURING while we set up the communication
      this.setProtocolState(
        BaseDTCRetriever.PROTOCOL_STATES.CONFIGURING,
        'Setting up communication',
      );

      const resultFromECU = await this.sendCommand(
        this.getServiceMode().REQUEST,
        0,
        false,
      );

      const { responseString: testResponse, rawResponse } = resultFromECU;

      log(
        'debug',
        'Raw test response:',
        JSON.stringify(testResponse),
        'this.protocolType',
        this.protocolType,
      );

      // Check if we need to try flow control configurations
      if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.CAN) {
        // Check if response is incomplete or indicates flow control might be needed
        const needsFlowControl =
          !testResponse ||
          testResponse.includes('BUFFER FULL') ||
          testResponse.includes('FB ERROR') ||
          (testResponse.length > 0 && testResponse.length < 10); // Typically incomplete response

        if (needsFlowControl) {
          log(
            'debug',
            'Response indicates flow control might be needed, attempting flow control configuration',
          );

          // Get flow control address based on protocol format
          let flowControlAddress;

          if (this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT) {
            flowControlAddress = '7E0'; // Standard 11-bit diagnostic address
          } else if (
            this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT
          ) {
            flowControlAddress = '18DA10F1'; // Standard 29-bit diagnostic address
          }

          // Try flow control configurations
          const flowControlSuccess = await this.tryFlowControlConfigs(
            flowControlAddress,
            this.getServiceMode().REQUEST,
          );

          if (flowControlSuccess) {
            // Retry the command with flow control configured
            const retryResult = await this.sendCommand(
              this.getServiceMode().REQUEST,
              0,
              false,
            );

            // Update our response variables with the new result
            const { responseString: newResponse, rawResponse: newRawResponse } =
              retryResult;

            if (newResponse && !this.isErrorResponse(newResponse)) {
              log(
                'debug',
                'Successfully got response after flow control configuration',
              );
              testResponse = newResponse;
              rawResponse = newRawResponse;
            }
          }
        }
      }

      // Check for valid response
      if (!testResponse || this.isErrorResponse(testResponse)) {
        log('debug', 'Invalid or error response received');
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.ERROR,
          'Invalid response',
        );

        return makeRawResponse(null, null);
      }

      // Verify response format based on protocol
      if (!this.verifyResponseFormat(testResponse)) {
        log('debug', 'Response format verification failed');
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.ERROR,
          'Invalid response format',
        );

        return makeRawResponse(null, null);
      }

      // If we got here, all conditions are met
      this.isResponseReady = true;
      this.setProtocolState(
        BaseDTCRetriever.PROTOCOL_STATES.READY,
        'Valid response verified',
      );

      const { responseString: cleanResponse, rawResponse: cleanRawResponse } =
        await this.getCleanResponse(resultFromECU);

      log(
        'debug',
        '>>>>>>>>>>>>cleanResponse',
        JSON.stringify(cleanResponse, cleanRawResponse),
      );

      if (!cleanResponse) {
        log('error', 'Failed to get clean response');
        this.setProtocolState(
          BaseDTCRetriever.PROTOCOL_STATES.ERROR,
          'No clean response',
        );

        return makeRawResponse(null, null);
      }

      // Handle empty but valid response
      if (this.isEmptyOrNoDataResponse(testResponse)) {
        log('info', 'Valid empty response detected - no DTCs present');

        return makeRawResponse(
          this.createResponse([], ''), // Explicit NO DATA indication
          rawResponse,
        );
      }

      return makeRawResponse(cleanResponse, cleanRawResponse);
    } catch (error) {
      log('error', 'Error in verifyAndGetResponse:', error);
      this.isResponseReady = false;
      this.setProtocolState(
        BaseDTCRetriever.PROTOCOL_STATES.ERROR,
        'Exception occurred',
      );

      return makeRawResponse(null, null);
    }
  }

  prepareResponse(response) {
    // Handle valid empty responses first
    if (this.isEmptyOrNoDataResponse(response)) {
      log('info', 'Preparing valid empty response');

      return this.createResponse([], response);
    }

    // Basic response validation
    if (!response) {
      log('debug', 'Null response in prepareResponse');

      return null;
    }

    // Check if we have the minimum required state
    if (!this.currentProtocol || !this.protocolType) {
      log('error', 'Missing protocol information', {
        currentProtocol: this.currentProtocol,
        protocolType: this.protocolType,
      });

      return null;
    }

    const cleanResponse = this.cleanResponse(response);

    if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.CAN) {
      return this.prepareCANResponse(cleanResponse);
    } else {
      return this.prepareStandardResponse(cleanResponse);
    }
  }

  /**
   * Checks if response can be prepared
   */
  canPrepareResponse(response) {
    if (!response) {
      log('debug', 'Null response in prepareResponse');

      return false;
    }

    if (this.protocolState !== BaseDTCRetriever.PROTOCOL_STATES.READY) {
      log('error', 'Cannot prepare response - protocol not ready');

      return false;
    }

    return true;
  }

  /**
   * Cleans and normalizes the response
   */
  cleanResponse(response) {
    return response.replace(/\s+/g, ' ').trim();
  }

  /**
   * Prepares response for CAN protocol
   */
  prepareCANResponse(cleanResponse) {
    const frames = this.getValidCANFrames(cleanResponse);

    if (frames.length === 0) {
      log(
        'debug',
        'No valid CAN frames found - checking if this is a valid empty response',
      );

      // Check if this is a valid empty response
      const lines = cleanResponse.split('\r').filter(line => line.trim());
      const hasValidResponse = lines.some(line => {
        const trimmedLine = line.trim();

        return (
          trimmedLine.includes(this.getServiceMode().REQUEST) ||
          trimmedLine.includes('>') ||
          this.isEmptyOrNoDataResponse(trimmedLine)
        );
      });

      if (hasValidResponse) {
        log('debug', 'Valid empty response found - no DTCs present');

        return this.createResponse([], cleanResponse);
      }

      log('debug', 'No valid response found');

      return this.createEmptyResponse();
    }

    // Return both processed frames and original response
    return this.createResponse(frames, cleanResponse);
  }

  /**
   * Gets valid CAN frames from the response
   * @param {string} response - The raw response string
   * @returns {string[]} Array of valid CAN frames
   */
  getValidCANFrames(response) {
    if (!response) return [];

    // Split by both spaces and carriage returns, and filter empty lines
    const lines = response.split(/[\r\s]+/).filter(line => line.trim());
    const validFrames = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines, echo of command, and error responses
      if (
        !trimmedLine ||
        trimmedLine === '>' ||
        trimmedLine === this.getServiceMode().REQUEST ||
        this.isErrorResponse(trimmedLine)
      ) {
        continue;
      }

      // Handle responses without headers (after ATH0 and ATE0)
      if (trimmedLine.includes(':')) {
        const [frameNum, frameData] = trimmedLine.split(':');

        if (frameData && frameData.trim()) {
          validFrames.push(frameData.trim());
          log(
            'debug',
            `Valid CAN frame found without header: ${frameData.trim()}`,
          );
          continue;
        }
      }

      // Check for valid CAN header pattern (7Ex) for responses with headers
      const has11BitHeader = /^7E[1-F]/.test(trimmedLine);
      const has29BitHeader =
        BaseDTCRetriever.CAN_29BIT_HEADER.test(trimmedLine);

      if (has11BitHeader || has29BitHeader) {
        validFrames.push(trimmedLine);
        log('debug', `Valid CAN frame found with header: ${trimmedLine}`);
      }
    }

    log('debug', `CAN frames found: ${validFrames.length}`, {
      frames: validFrames,
      headerFormat: this.headerFormat,
      firstFrame: validFrames[0],
      hasHeaders: this.isHeaderEnabled,
    });

    return validFrames;
  }

  /**
   * Gets valid response lines for non-CAN protocols
   */
  getValidResponseLines(response) {
    if (!response) return [];

    const lines = response.split('\r').filter(line => line.trim());
    const validLines = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines, prompts, and error responses
      if (
        !trimmedLine ||
        trimmedLine === '>' ||
        this.isErrorResponse(trimmedLine)
      ) {
        continue;
      }

      // Check for valid protocol-specific headers
      if (this.hasValidHeader(trimmedLine)) {
        validLines.push(trimmedLine);
        log(
          'debug',
          `Valid ${this.protocolType} response line found: ${trimmedLine}`,
        );
      } else if (
        trimmedLine.includes(this.getServiceMode().REQUEST) ||
        trimmedLine.includes(
          this.getServiceMode().RESPONSE.toString(16).toUpperCase(),
        )
      ) {
        // Also include lines that contain the service request/response identifiers
        validLines.push(trimmedLine);
        log('debug', `Valid service response line found: ${trimmedLine}`);
      }
    }

    return validLines;
  }

  /**
   * Prepares response for non-CAN protocols
   */
  prepareStandardResponse(cleanResponse) {
    const validLines = this.getValidResponseLines(cleanResponse);

    if (validLines.length === 0) {
      // Check if we have raw byte response for KWP
      if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP) {
        // Try to parse as raw bytes
        if (/^[\d,\s]+$/.test(cleanResponse)) {
          const bytes = cleanResponse.split(',').map(b => parseInt(b));

          if (bytes.every(b => !isNaN(b))) {
            // Convert bytes to hex string
            const hexString = bytes
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');

            // Set ECU address if not already set
            if (!this.ecuAddress && bytes.length >= 2) {
              this.ecuAddress = bytes[0]
                .toString(16)
                .padStart(2, '0')
                .toUpperCase();
            }

            return this.createResponse([hexString], cleanResponse);
          }
        }

        // Try to parse as hex string
        const hexMatch = cleanResponse.match(/^([0-9A-F]{2})/i);

        if (hexMatch) {
          if (!this.ecuAddress) {
            this.ecuAddress = hexMatch[1].toUpperCase();
          }

          return this.createResponse([cleanResponse], cleanResponse);
        }
      }

      log('debug', `No valid ${this.protocolType} response lines found`);

      return this.createEmptyResponse();
    }

    // For KWP and ISO protocols, we need to extract the data portion
    const processedLines = validLines.map(line => {
      // Handle raw byte responses
      if (/^[\d,\s]+$/.test(line)) {
        const bytes = line.split(',').map(b => parseInt(b));

        if (bytes.every(b => !isNaN(b))) {
          // Set ECU address if not already set
          if (!this.ecuAddress && bytes.length >= 2) {
            this.ecuAddress = bytes[0]
              .toString(16)
              .padStart(2, '0')
              .toUpperCase();
          }

          return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
        }
      }

      if (
        this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP ||
        this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.ISO9141
      ) {
        // Set ECU address if not already set
        if (!this.ecuAddress) {
          this.ecuAddress = line.substring(0, 2).toUpperCase();
        }

        // Remove header (first 2 bytes) for KWP and ISO protocols
        return line.substring(2);
      } else if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.J1850) {
        // For J1850, check header type and remove accordingly
        if (!this.ecuAddress) {
          this.ecuAddress = line.substring(0, 2).toUpperCase();
        }

        if (line.match(/^(41|48|6B)/)) {
          return line.substring(2);
        } else if (line.match(/^(A8|B8)/)) {
          return line.substring(2);
        }
      }

      return line;
    });

    return this.createResponse(processedLines, cleanResponse);
  }

  /**
   * Creates the response object
   */
  createResponse(rawResponse, originalRawString) {
    const serviceMode = this.getServiceMode();

    if (!serviceMode) {
      log('error', 'Service mode not defined');

      return null;
    }

    return {
      type: serviceMode.NAME,
      service: serviceMode.RESPONSE & 0x3f,
      serviceName: serviceMode.NAME,
      serviceDescription: serviceMode.DESCRIPTION,
      troubleCodeType: serviceMode.troubleCodeType,
      rawResponse,
      rawString: originalRawString || '',
      protocolInfo: this.getProtocolInfo(),
      timestamp: Date.now(),
    };
  }

  /**
   * Creates an empty response object
   */
  createEmptyResponse() {
    if (this.protocolState === BaseDTCRetriever.PROTOCOL_STATES.READY) {
      return this.createResponse([], '');
    }

    log('debug', 'Cannot create empty response - protocol not ready');

    return null;
  }

  validateProtocolState() {
    log('debug', 'Validating protocol state', {
      currentState: this.getState(),
    });

    // Check for required dependencies first
    if (!this.ecuDataRetriever?.protocolServiceBased) {
      log('error', 'Missing required ECU data retriever');

      return false;
    }

    // Check protocol configuration
    const protocolConfig = this.getProtocolConfig();

    if (!protocolConfig) {
      log('error', 'No protocol configuration available');

      return false;
    }

    if (!this.currentProtocol) {
      log('error', 'No current protocol set');

      return false;
    }

    // Validate protocol type
    if (
      !this.protocolType ||
      !Object.values(BaseDTCRetriever.PROTOCOL_TYPES).includes(
        this.protocolType,
      )
    ) {
      log('error', `Invalid protocol type: ${this.protocolType}`);

      return false;
    }

    // Protocol-specific validations with detailed logging
    const validationResult = this.validateProtocolSpecificState();

    if (!validationResult.isValid) {
      log(
        'error',
        `Protocol-specific validation failed: ${validationResult.reason}`,
      );

      return false;
    }

    // Communication configuration validation
    const commConfigValid = this.validateCommunicationConfig();

    if (!commConfigValid) {
      log('warn', 'Communication configuration is incomplete');
      // Don't fail here - just warn since some devices work without full config
    }

    log('debug', 'Protocol state validation successful');

    return true;
  }

  validateProtocolSpecificState() {
    switch (this.protocolType) {
      case BaseDTCRetriever.PROTOCOL_TYPES.CAN:
        if (
          !this.headerFormat ||
          ![
            BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT,
            BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT,
          ].includes(this.headerFormat)
        ) {
          return {
            isValid: false,
            reason: `Invalid CAN header format: ${this.headerFormat}`,
          };
        }

        break;

      case BaseDTCRetriever.PROTOCOL_TYPES.KWP:
        if (this.headerFormat !== BaseDTCRetriever.HEADER_FORMATS.KWP) {
          return {
            isValid: false,
            reason: `Invalid KWP header format: ${this.headerFormat}`,
          };
        }

        break;

      // ... similar checks for ISO9141 and J1850 ...
    }

    return { isValid: true };
  }

  validateCommunicationConfig() {
    const config = {
      headers: this.isHeaderEnabled === false,
      echo: this.isEchoEnabled === false,
      linefeeds: this.lineFeedsDisabled === true,
      spaces: this.spacesDisabled === true,
    };

    const isValid = Object.values(config).every(Boolean);

    log('debug', 'Communication config validation:', {
      config,
      isValid,
    });

    return isValid;
  }

  getProtocolInfo() {
    // For CAN protocol, ensure we have both canID and ecuAddress
    if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.CAN) {
      if (this.canID && !this.ecuAddress) {
        this.ecuAddress = this.canID;
        log('debug', `Setting ecuAddress from canID: ${this.canID}`);
      } else if (this.ecuAddress && !this.canID) {
        this.canID = this.ecuAddress;
        log('debug', `Setting canID from ecuAddress: ${this.ecuAddress}`);
      }
    }

    return {
      protocol: this.currentProtocol,
      protocolType: this.protocolType,
      ecuAddress: this.ecuAddress,
      canID: this.getCanID(),
      headerFormat: this.headerFormat,
      state: this.protocolState,
    };
  }

  getState() {
    return {
      // Protocol state
      currentProtocol: this.currentProtocol,
      protocolType: this.protocolType,
      protocolState: this.protocolState,

      // Communication state
      isHeaderEnabled: this.isHeaderEnabled,
      isEchoEnabled: this.isEchoEnabled,
      isResponseReady: this.isResponseReady,

      // Addressing
      ecuAddress: this.ecuAddress,
      canID: this.canID,
      headerFormat: this.headerFormat,

      // History
      lastProtocol: this.lastProtocol,

      // Dependencies status
      hasEcuDataRetriever: !!this.ecuDataRetriever,
      hasProtocolService: !!this.ecuDataRetriever?.protocolServiceBased,
    };
  }

  setProtocolState(newState, reason = '') {
    const oldState = this.protocolState;

    this.protocolState = newState;

    log(
      'debug',
      `Protocol state transition: ${oldState} -> ${newState}${reason ? ` (${reason})` : ''}`,
    );

    // Validate state after transition
    if (newState === BaseDTCRetriever.PROTOCOL_STATES.READY) {
      if (!this.validateProtocolState()) {
        this.protocolState = BaseDTCRetriever.PROTOCOL_STATES.ERROR;
        log(
          'error',
          'Protocol validation failed after transition to READY state',
        );
      }
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Attempts different flow control configurations for CAN protocol
   * @param {string} flowControlAddress - The flow control address to use
   * @param {string} testCommand - The command to test with
   * @returns {Promise<boolean>} - True if a working flow control configuration was found
   */
  async tryFlowControlConfigs(flowControlAddress, testCommand) {
    if (!flowControlAddress || !testCommand) {
      log(
        'debug',
        'Missing required parameters for flow control configuration',
      );

      return false;
    }

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
      log('debug', `[BaseDTCRetriever] Trying ${config.desc}`, config);

      try {
        // Send flow control configuration commands
        const fcshResponse = await this.sendCommand(`ATFCSH${config.fcsh}`);

        if (this.isErrorResponse(fcshResponse)) {
          log('debug', `Flow control header set failed for ${config.desc}`);
          continue;
        }

        const fcsdResponse = await this.sendCommand(`ATFCSD${config.fcsd}`);

        if (this.isErrorResponse(fcsdResponse)) {
          log('debug', `Flow control data set failed for ${config.desc}`);
          continue;
        }

        const fcsmResponse = await this.sendCommand(`ATFCSM${config.fcsm}`);

        if (this.isErrorResponse(fcsmResponse)) {
          log('debug', `Flow control mode set failed for ${config.desc}`);
          continue;
        }

        // Test the configuration
        const testResponse = await this.sendCommand(testCommand);

        if (
          !this.isErrorResponse(testResponse) &&
          this.verifyResponseFormat(testResponse)
        ) {
          log(
            'success',
            `[BaseDTCRetriever] Flow control established with ${config.desc}`,
          );

          return true;
        }

        await this.delay(100); // Small delay between attempts
      } catch (error) {
        log('error', `Error trying flow control config ${config.desc}:`, error);
        continue;
      }
    }

    log('warn', '[BaseDTCRetriever] Could not establish optimal flow control');

    return false;
  }
}

export default BaseDTCRetriever;
