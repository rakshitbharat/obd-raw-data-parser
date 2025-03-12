import { decodeDTC, dtcToString, isValidDTCFrame, } from "../utils/dtcDecoder.js";
export class BaseDecoder {
    constructor() {
        this.rawDtcObjects = [];
        this.expectedDTCCount = 0;
        this.currentDTCCount = 0;
        this.leftoverByte = null;
        this.DTC_MODES = {
            CURRENT: { RESPONSE: 0x43, DESCRIPTION: "Current DTCs" },
            PENDING: { RESPONSE: 0x47, DESCRIPTION: "Pending DTCs" },
            PERMANENT: { RESPONSE: 0x4a, DESCRIPTION: "Permanent DTCs" },
        };
        this.reset();
    }
    reset() {
        this.rawDtcObjects = [];
        this.expectedDTCCount = 0;
        this.currentDTCCount = 0;
        this.leftoverByte = null;
    }
    getRawDTCs() {
        return this.rawDtcObjects;
    }
    isNoDataResponse(frame) {
        if (frame.length >= 7) {
            // Check for "NO DATA" ASCII sequence
            const noDataSequence = [78, 79, 32, 68, 65, 84, 65]; // "NO DATA"
            return noDataSequence.every((byte, index) => frame[index] === byte);
        }
        return false;
    }
    validateFrame(frame) {
        if (this.isNoDataResponse(frame))
            return false;
        return isValidDTCFrame(frame);
    }
    // Make these methods available to implementing classes
    _defaultDecodeDTC(byte1, byte2) {
        return decodeDTC(byte1, byte2);
    }
    _defaultDtcToString(dtc) {
        return dtcToString(dtc);
    }
}
