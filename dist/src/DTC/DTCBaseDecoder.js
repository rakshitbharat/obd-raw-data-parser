import { CanDecoder } from "./Support/Can.js";
import { NonCanDecoder } from "./Support/NonCan.js";
const DTC_MODES = {
    MODE03: {
        REQUEST: "03",
        RESPONSE: 0x43,
        DIVIDER: 1,
        NAME: "CURRENT",
        DESCRIPTION: "Current DTCs",
    },
    MODE07: {
        REQUEST: "07",
        RESPONSE: 0x47,
        DIVIDER: 1,
        NAME: "PENDING",
        DESCRIPTION: "Pending DTCs",
    },
    MODE0A: {
        REQUEST: "0A",
        RESPONSE: 0x4a,
        DIVIDER: 1,
        NAME: "PERMANENT",
        DESCRIPTION: "Permanent DTCs",
    },
};
export class DTCBaseDecoder {
    constructor(config) {
        const { isCan = false, serviceMode, troubleCodeType, logPrefix } = config;
        // Get mode response before creating decoder
        const modeResponse = this.getModeResponseByte();
        // Use the correct mode response byte for both CAN and non-CAN decoders
        this.decoder = isCan ? new CanDecoder(modeResponse) : new NonCanDecoder();
        if (!isCan) {
            this.decoder.setModeResponse(modeResponse);
        }
        else {
            this.decoder.setModeResponse(modeResponse);
        }
        this.serviceMode = serviceMode.toUpperCase();
        this.troubleCodeType = troubleCodeType;
        this.logPrefix = `${logPrefix} [DTC-${isCan ? "CAN" : "NonCAN"}]`;
        // Reference the methods rather than binding them to avoid property conflicts
        const decoderAny = this.decoder;
        if (typeof decoderAny._log !== 'function') {
            decoderAny._log = this._log.bind(this);
        }
        if (typeof decoderAny.setDTC !== 'function') {
            decoderAny.setDTC = this.setDTC.bind(this);
        }
    }
    decodeDTCs(rawResponseBytes) {
        if (!this._validateServiceMode(this.serviceMode)) {
            return [];
        }
        return this.decoder.decodeDTCs(rawResponseBytes);
    }
    getRawDTCs() {
        return this.decoder.getRawDTCs();
    }
    parseDTCStatus(statusByte) {
        return {
            milActive: (statusByte & 0x80) !== 0,
            dtcCount: statusByte & 0x7f,
            currentError: (statusByte & 0x20) !== 0,
            pendingError: (statusByte & 0x10) !== 0,
            confirmedError: (statusByte & 0x08) !== 0,
            egrSystem: (statusByte & 0x04) !== 0,
            oxygenSensor: (statusByte & 0x02) !== 0,
            catalyst: (statusByte & 0x01) !== 0,
        };
    }
    getModeResponseByte() {
        const service = Object.values(DTC_MODES).find((s) => s.REQUEST === this.serviceMode);
        if (!service) {
            this._log("error", `Invalid service mode: ${this.serviceMode}`);
            return 0x43;
        }
        return service.RESPONSE;
    }
    _validateServiceMode(mode) {
        const upperMode = mode.toUpperCase();
        const isValid = Object.values(DTC_MODES).some((service) => service.REQUEST === upperMode);
        if (!isValid) {
            this._log("error", `Invalid service mode: ${mode}`);
        }
        return isValid;
    }
    _log(level, ...message) {
        if (false == false) {
            return;
        }
        console.log(`[${level}] ${this.logPrefix}`, ...message);
    }
    setDTC(dtc) {
        console.log(`Setting ${this.troubleCodeType} DTC: ${dtc}`);
    }
}
