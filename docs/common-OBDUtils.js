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
