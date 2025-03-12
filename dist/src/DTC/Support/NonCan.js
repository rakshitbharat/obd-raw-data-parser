import { BaseDecoder } from "./BaseDecoder.js";
import { byteArrayToString, parseHexInt, formatMessage } from "../../utils.js";
import { decodeDTC, dtcToString } from "../utils/dtcDecoder.js";
export class NonCanDecoder extends BaseDecoder {
    _determineFrameType(frame) {
        const colonIndex = frame.indexOf(58);
        return colonIndex !== -1 ? "colon" : "no-colon";
    }
    _extractBytesFromColonFrame(frame, colonIndex) {
        let dataStartIndex = colonIndex + 1;
        while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
            dataStartIndex++;
        }
        return this._extractBytesFromData(frame.slice(dataStartIndex));
    }
    _extractBytesFromNoColonFrame(frame) {
        let dataStartIndex = 0;
        while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
            dataStartIndex++;
        }
        return this._extractBytesFromData(frame.slice(dataStartIndex));
    }
    _extractBytesFromData(dataArray) {
        const bytes = [];
        const hexString = byteArrayToString(dataArray).replace(/[\s\x00-\x1F]/g, "");
        for (let i = 0; i < hexString.length; i += 2) {
            const pair = hexString.substr(i, 2);
            if (pair.length === 2) {
                bytes.push(pair);
            }
        }
        this._log("debug", formatMessage("Converted ASCII to bytes:", "", JSON.stringify(bytes)));
        return bytes;
    }
    decodeDTCs(rawResponseBytes) {
        try {
            this.reset();
            const dtcs = new Set();
            for (let frameIndex = 0; frameIndex < rawResponseBytes.length; frameIndex++) {
                const frame = rawResponseBytes[frameIndex];
                if (!Array.isArray(frame) || frame.length === 0)
                    continue;
                const frameType = this._determineFrameType(frame);
                let bytes;
                if (frameType === "colon") {
                    bytes = this._extractBytesFromColonFrame(frame, frame.indexOf(58));
                }
                else {
                    bytes = this._extractBytesFromNoColonFrame(frame);
                }
                if (!bytes || bytes.length === 0)
                    continue;
                if (frameIndex === 0) {
                    const modeResponse = parseHexInt(bytes[0]);
                    if (modeResponse === this.getModeResponseByte()) {
                        bytes = bytes.slice(1);
                    }
                }
                for (let i = 0; i < bytes.length; i += 2) {
                    if (i + 1 >= bytes.length) {
                        this.leftoverByte = bytes[i];
                        break;
                    }
                    const dtc = this._decodeDTC(bytes[i], bytes[i + 1]);
                    if (dtc) {
                        this.rawDtcObjects.push(dtc);
                        const dtcString = this._dtcToString(dtc);
                        if (dtcString) {
                            dtcs.add(dtcString);
                            this.setDTC(dtcString);
                        }
                    }
                }
            }
            return Array.from(dtcs);
        }
        catch (error) {
            this._log("error", formatMessage("Failed to parse response:", "", String(error)));
            return [];
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _log(_level, ..._message) {
        // Implementation provided by parent
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setDTC(_dtc) {
        // Implementation provided by parent
    }
    getModeResponseByte() {
        // Implementation provided by parent
        return 0;
    }
    setModeResponse(modeResponse) {
        Object.defineProperty(this, "getModeResponseByte", {
            value: () => modeResponse,
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _getDTCInfo(_dtcLevel, _dtcMessage) {
        return undefined;
    }
    _decodeDTC(byte1, byte2) {
        return decodeDTC(byte1, byte2);
    }
    _dtcToString(dtc) {
        return dtcToString(dtc);
    }
}
