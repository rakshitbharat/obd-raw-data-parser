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
