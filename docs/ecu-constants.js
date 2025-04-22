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
