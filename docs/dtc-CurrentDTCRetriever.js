import BaseDTCRetriever from './Base/BaseDTCRetriever';

class CurrentDTCRetriever extends BaseDTCRetriever {
  static SERVICE_MODE = {
    REQUEST: '03',
    RESPONSE: 0x43,
    NAME: 'CURRENT_DTC', // Make sure this matches the troubleCodeType
    DESCRIPTION: 'Current DTCs',
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

    if (CurrentDTCRetriever._instance) {
      return CurrentDTCRetriever._instance;
    }

    CurrentDTCRetriever._instance = this;
  }

  // Override getters and setters to use CurrentDTCRetriever's state
  get isHeaderEnabled() {
    return CurrentDTCRetriever._state.isHeaderEnabled;
  }
  set isHeaderEnabled(value) {
    CurrentDTCRetriever._state.isHeaderEnabled = value;
  }

  get isEchoEnabled() {
    return CurrentDTCRetriever._state.isEchoEnabled;
  }
  set isEchoEnabled(value) {
    CurrentDTCRetriever._state.isEchoEnabled = value;
  }

  get isResponseReady() {
    return CurrentDTCRetriever._state.isResponseReady;
  }
  set isResponseReady(value) {
    CurrentDTCRetriever._state.isResponseReady = value;
  }

  get lastProtocol() {
    return CurrentDTCRetriever._state.lastProtocol;
  }
  set lastProtocol(value) {
    CurrentDTCRetriever._state.lastProtocol = value;
  }

  get lastCommandTime() {
    return CurrentDTCRetriever._state.lastCommandTime;
  }
  set lastCommandTime(value) {
    CurrentDTCRetriever._state.lastCommandTime = value;
  }

  get minCommandDelay() {
    return CurrentDTCRetriever._state.minCommandDelay;
  }
  set minCommandDelay(value) {
    CurrentDTCRetriever._state.minCommandDelay = value;
  }

  get currentProtocol() {
    return CurrentDTCRetriever._state.currentProtocol;
  }
  set currentProtocol(value) {
    CurrentDTCRetriever._state.currentProtocol = value;
  }

  get protocolType() {
    return CurrentDTCRetriever._state.protocolType;
  }
  set protocolType(value) {
    CurrentDTCRetriever._state.protocolType = value;
  }

  get ecuAddress() {
    return CurrentDTCRetriever._state.ecuAddress;
  }
  set ecuAddress(value) {
    CurrentDTCRetriever._state.ecuAddress = value;
  }

  get canID() {
    return CurrentDTCRetriever._state.canID;
  }
  set canID(value) {
    CurrentDTCRetriever._state.canID = value;
  }

  get headerFormat() {
    return CurrentDTCRetriever._state.headerFormat;
  }
  set headerFormat(value) {
    CurrentDTCRetriever._state.headerFormat = value;
  }

  get protocolConfig() {
    return CurrentDTCRetriever._state.protocolConfig;
  }
  set protocolConfig(value) {
    CurrentDTCRetriever._state.protocolConfig = value;
  }

  get protocolState() {
    return CurrentDTCRetriever._state.protocolState;
  }
  set protocolState(value) {
    CurrentDTCRetriever._state.protocolState = value;
  }

  resetState() {
    CurrentDTCRetriever._state = {
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
    return CurrentDTCRetriever.SERVICE_MODE;
  }
}

export default CurrentDTCRetriever;
