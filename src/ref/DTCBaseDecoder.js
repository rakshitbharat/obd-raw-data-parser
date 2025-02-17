import {DTCBaseDecoder as CanDecoder} from './DTC/Can';
import {DTCBaseDecoder as NonCanDecoder} from './DTC/NonCan';

const logMain = (level, ...message) => {
  console.log(`[${level}]`, ...message);
};

setTroubleCode = (type, code) => {
  console.log(`Setting ${type} DTC: ${code}`);
};

const DTC_SERVICES = {
  MODE03: {REQUEST: '03', RESPONSE: 0x43, DIVIDER: 1},
  MODE07: {REQUEST: '07', RESPONSE: 0x47, DIVIDER: 1},
  MODE0A: {REQUEST: '0A', RESPONSE: 0x4a, DIVIDER: 1},
};

export class DTCBaseDecoder {
  constructor({isCan = false, serviceMode, troubleCodeType, logPrefix}) {
    // Initialize the appropriate decoder implementation
    this._log('debug', '>>>>isCan', isCan);
    this.decoder = isCan ? new CanDecoder() : new NonCanDecoder();

    // Configure service mode and logging
    this.serviceMode = serviceMode;
    this.troubleCodeType = troubleCodeType;
    this.logPrefix = `${logPrefix} [DTC-${isCan ? 'CAN' : 'NonCAN'}]`;

    // Bind decoder methods to maintain context
    this.decoder._log = this._log.bind(this);
    this.decoder.setDTC = this.setDTC.bind(this);
    this.decoder.getModeResponseByte = this.getModeResponseByte.bind(this);
  }

  // Add getModeResponseByte method
  getModeResponseByte() {
    // Get response byte based on service mode
    const service = Object.values(DTC_SERVICES).find(
      s => s.REQUEST === this.serviceMode,
    );
    if (!service) {
      this._log('error', `Invalid service mode: ${this.serviceMode}`);
      return 0x00;
    }
    return service.RESPONSE;
  }

  // Improve service mode validation
  _validateServiceMode(mode) {
    const isValid = Object.values(DTC_SERVICES).some(
      service => service.REQUEST === mode,
    );
    if (!isValid) {
      this._log('error', `Invalid service mode: ${mode}`);
    }
    return isValid;
  }

  // Update decodeDTCs to include service mode validation
  decodeDTCs(rawResponseBytes) {
    this._log('debug', '>>>>rawResponseBytes', rawResponseBytes);
    if (!this._validateServiceMode(this.serviceMode)) {
      return [];
    }
    return this.decoder.decodeDTCs(rawResponseBytes);
  }

  reset() {
    return this.decoder.reset();
  }

  dtcToString(dtc) {
    return this.decoder.dtcToString(dtc);
  }

  getRawDTCs() {
    return this.decoder.getRawDTCs();
  }

  // Common logging implementation
  _log(level, ...message) {
    logMain(level, `${this.logPrefix}`, ...message);
  }

  // Common DTC storage handler
  setDTC(dtc) {
    this._log('debug', `Setting ${this.troubleCodeType} DTC: ${dtc}`);
    setTroubleCode(this.troubleCodeType, dtc);
  }
}
