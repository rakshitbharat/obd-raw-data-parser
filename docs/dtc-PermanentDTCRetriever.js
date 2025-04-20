import BaseDTCRetriever from './Base/BaseDTCRetriever';

class PermanentDTCRetriever extends BaseDTCRetriever {
  static SERVICE_MODE = {
    REQUEST: '0A',
    RESPONSE: 0x4a,
    NAME: 'PERMANENT_DTC', // Make sure this matches the troubleCodeType
    DESCRIPTION: 'Permanent DTCs',
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

    if (PermanentDTCRetriever._instance) {
      return PermanentDTCRetriever._instance;
    }

    PermanentDTCRetriever._instance = this;
  }

  // Override getters and setters to use PermanentDTCRetriever's state
  get isHeaderEnabled() {
    return PermanentDTCRetriever._state.isHeaderEnabled;
  }
  set isHeaderEnabled(value) {
    PermanentDTCRetriever._state.isHeaderEnabled = value;
  }

  get isEchoEnabled() {
    return PermanentDTCRetriever._state.isEchoEnabled;
  }
  set isEchoEnabled(value) {
    PermanentDTCRetriever._state.isEchoEnabled = value;
  }

  get isResponseReady() {
    return PermanentDTCRetriever._state.isResponseReady;
  }
  set isResponseReady(value) {
    PermanentDTCRetriever._state.isResponseReady = value;
  }

  get lastProtocol() {
    return PermanentDTCRetriever._state.lastProtocol;
  }
  set lastProtocol(value) {
    PermanentDTCRetriever._state.lastProtocol = value;
  }

  get lastCommandTime() {
    return PermanentDTCRetriever._state.lastCommandTime;
  }
  set lastCommandTime(value) {
    PermanentDTCRetriever._state.lastCommandTime = value;
  }

  get minCommandDelay() {
    return PermanentDTCRetriever._state.minCommandDelay;
  }
  set minCommandDelay(value) {
    PermanentDTCRetriever._state.minCommandDelay = value;
  }

  get currentProtocol() {
    return PermanentDTCRetriever._state.currentProtocol;
  }
  set currentProtocol(value) {
    PermanentDTCRetriever._state.currentProtocol = value;
  }

  get protocolType() {
    return PermanentDTCRetriever._state.protocolType;
  }
  set protocolType(value) {
    PermanentDTCRetriever._state.protocolType = value;
  }

  get ecuAddress() {
    return PermanentDTCRetriever._state.ecuAddress;
  }
  set ecuAddress(value) {
    PermanentDTCRetriever._state.ecuAddress = value;
  }

  get canID() {
    return PermanentDTCRetriever._state.canID;
  }
  set canID(value) {
    PermanentDTCRetriever._state.canID = value;
  }

  get headerFormat() {
    return PermanentDTCRetriever._state.headerFormat;
  }
  set headerFormat(value) {
    PermanentDTCRetriever._state.headerFormat = value;
  }

  get protocolConfig() {
    return PermanentDTCRetriever._state.protocolConfig;
  }
  set protocolConfig(value) {
    PermanentDTCRetriever._state.protocolConfig = value;
  }

  get protocolState() {
    return PermanentDTCRetriever._state.protocolState;
  }
  set protocolState(value) {
    PermanentDTCRetriever._state.protocolState = value;
  }

  resetState() {
    PermanentDTCRetriever._state = {
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
    return PermanentDTCRetriever.SERVICE_MODE;
  }
}

export default PermanentDTCRetriever;
