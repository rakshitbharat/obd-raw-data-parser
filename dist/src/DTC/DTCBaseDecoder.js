import { CanDecoder } from "./Support/Can.js";
import { NonCanDecoder } from "./Support/NonCan.js";
import { toHexString, formatMessage } from "../utils.js";
import { handleFrameSequence } from "./utils/dtcDecoder.js";
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
        // Set the service mode first so getModeResponseByte() can properly determine the response byte
        this.serviceMode = serviceMode.toUpperCase();
        this.troubleCodeType = troubleCodeType;
        this.logPrefix = `${logPrefix} [DTC-${isCan ? "CAN" : "NonCAN"}]`;
        // Get mode response after setting serviceMode
        const modeResponse = this.getModeResponseByte();
        // Use the correct mode response byte for both CAN and non-CAN decoders
        this.decoder = isCan ? new CanDecoder(modeResponse) : new NonCanDecoder();
        if (!isCan) {
            this.decoder.setModeResponse(modeResponse);
        }
        else {
            this.decoder.setModeResponse(modeResponse);
        }
        // Reference the methods rather than binding them to avoid property conflicts
        const decoderAny = this.decoder;
        if (typeof decoderAny._log !== "function") {
            decoderAny._log = this.log.bind(this);
        }
        if (typeof decoderAny.setDTC !==
            "function") {
            decoderAny.setDTC =
                this.setDTC.bind(this);
        }
    }
    decodeDTCs(rawResponseBytes) {
        if (!this.validateServiceMode(this.serviceMode)) {
            return [];
        }
        // Handle frame sequences and normalize
        const processedFrames = handleFrameSequence(rawResponseBytes);
        return this.decoder.decodeDTCs(processedFrames);
    }
    getRawDTCs() {
        return this.decoder.getRawDTCs();
    }
    parseDTCStatus(statusByte) {
        // Convert status byte to hex for logging
        const statusHex = toHexString(statusByte);
        this.log("debug", `Parsing DTC status: ${statusHex}`);
        // Extract MIL status
        const milActive = (statusByte & 0x80) !== 0;
        // Simple DTC count case - when value is less than 0x20 and MIL is not set
        if (!milActive && statusByte < 0x20) {
            return {
                milActive: false,
                dtcCount: statusByte,
                currentError: false,
                pendingError: false,
                confirmedError: false,
                egrSystem: false,
                oxygenSensor: false,
                catalyst: false,
            };
        }
        // Parse individual status bits
        return {
            milActive,
            dtcCount: milActive ? statusByte & 0x7f : statusByte & 0x0f,
            currentError: (statusByte & 0x20) !== 0,
            pendingError: (statusByte & 0x10) !== 0,
            confirmedError: (statusByte & 0x08) !== 0,
            egrSystem: (statusByte & 0x04) !== 0,
            oxygenSensor: (statusByte & 0x02) !== 0,
            catalyst: (statusByte & 0x01) !== 0,
        };
    }
    getModeResponseByte() {
        if (!this.serviceMode) {
            this.log("error", formatMessage(`Invalid service mode: ${this.serviceMode}`, this.logPrefix));
            return 0x43; // Default to mode 03 response
        }
        const upperMode = this.serviceMode.toUpperCase();
        const service = Object.values(DTC_MODES).find((s) => s.REQUEST === upperMode);
        if (!service) {
            this.log("error", `Invalid service mode: ${this.serviceMode}`);
            return 0x43;
        }
        return service.RESPONSE;
    }
    validateServiceMode(mode) {
        if (!mode) {
            this.log("error", `Invalid service mode: ${mode}`);
            return false;
        }
        const upperMode = mode.toUpperCase();
        const isValid = Object.values(DTC_MODES).some((service) => service.REQUEST === upperMode);
        if (!isValid) {
            this.log("error", `Invalid service mode: ${mode}`);
        }
        return isValid;
    }
    log(level, ...message) {
        if (false == false) {
            //return;
        }
        console.log(formatMessage(`[${level}] ${this.logPrefix}`, "", ""), ...message);
    }
    setDTC(dtc) {
        this.log("info", formatMessage(`Setting ${this.troubleCodeType} DTC: ${dtc}`, this.logPrefix));
    }
}
