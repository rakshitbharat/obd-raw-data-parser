import BaseDTCRetriever from './Base/BaseDTCRetriever';

class PendingDTCRetriever extends BaseDTCRetriever {
  static SERVICE_MODE = {
    REQUEST: '07',
    RESPONSE: 0x47,
    NAME: 'PENDING_DTC', // Make sure this matches the troubleCodeType
    DESCRIPTION: 'Pending DTCs',
  };

  static _instance = null;
  static _state = {
    isHeaderEnabled: false,
    isEchoEnabled: false,
    isResponseReady: false,
    lastProtocol: null,
    lastCommandTime: 0,
    minCommandDelay: 100,
    currentProtocol: null,
    protocolType: null,
    ecuAddress: null,
    canID: null,
    headerFormat: null,
    protocolConfig: null,
    protocolState: BaseDTCRetriever.PROTOCOL_STATES.INITIALIZED,
  };

  constructor(ecuDataRetriever = null) {
    super(ecuDataRetriever);

    if (PendingDTCRetriever._instance) {
      return PendingDTCRetriever._instance;
    }

    PendingDTCRetriever._instance = this;
  }

  // Override getters and setters to use PendingDTCRetriever's state
  get isHeaderEnabled() {
    return PendingDTCRetriever._state.isHeaderEnabled;
  }
  set isHeaderEnabled(value) {
    PendingDTCRetriever._state.isHeaderEnabled = value;
  }

  get isEchoEnabled() {
    return PendingDTCRetriever._state.isEchoEnabled;
  }
  set isEchoEnabled(value) {
    PendingDTCRetriever._state.isEchoEnabled = value;
  }

  get isResponseReady() {
    return PendingDTCRetriever._state.isResponseReady;
  }
  set isResponseReady(value) {
    PendingDTCRetriever._state.isResponseReady = value;
  }

  get lastProtocol() {
    return PendingDTCRetriever._state.lastProtocol;
  }
  set lastProtocol(value) {
    PendingDTCRetriever._state.lastProtocol = value;
  }

  get lastCommandTime() {
    return PendingDTCRetriever._state.lastCommandTime;
  }
  set lastCommandTime(value) {
    PendingDTCRetriever._state.lastCommandTime = value;
  }

  get minCommandDelay() {
    return PendingDTCRetriever._state.minCommandDelay;
  }
  set minCommandDelay(value) {
    PendingDTCRetriever._state.minCommandDelay = value;
  }

  get currentProtocol() {
    return PendingDTCRetriever._state.currentProtocol;
  }
  set currentProtocol(value) {
    PendingDTCRetriever._state.currentProtocol = value;
  }

  get protocolType() {
    return PendingDTCRetriever._state.protocolType;
  }
  set protocolType(value) {
    PendingDTCRetriever._state.protocolType = value;
  }

  get ecuAddress() {
    return PendingDTCRetriever._state.ecuAddress;
  }
  set ecuAddress(value) {
    PendingDTCRetriever._state.ecuAddress = value;
  }

  get canID() {
    return PendingDTCRetriever._state.canID;
  }
  set canID(value) {
    PendingDTCRetriever._state.canID = value;
  }

  get headerFormat() {
    return PendingDTCRetriever._state.headerFormat;
  }
  set headerFormat(value) {
    PendingDTCRetriever._state.headerFormat = value;
  }

  get protocolConfig() {
    return PendingDTCRetriever._state.protocolConfig;
  }
  set protocolConfig(value) {
    PendingDTCRetriever._state.protocolConfig = value;
  }

  get protocolState() {
    return PendingDTCRetriever._state.protocolState;
  }
  set protocolState(value) {
    PendingDTCRetriever._state.protocolState = value;
  }

  resetState() {
    PendingDTCRetriever._state = {
      isHeaderEnabled: false,
      isEchoEnabled: false,
      isResponseReady: false,
      lastProtocol: null,
      lastCommandTime: 0,
      minCommandDelay: 100,
      currentProtocol: null,
      protocolType: null,
      ecuAddress: null,
      canID: null,
      headerFormat: null,
      protocolConfig: null,
      protocolState: BaseDTCRetriever.PROTOCOL_STATES.INITIALIZED,
    };
  }

  getServiceMode() {
    return PendingDTCRetriever.SERVICE_MODE;
  }
}

export default PendingDTCRetriever;
