import { BaseDecoder } from './BaseDecoder.js';
export class NonCanDecoder extends BaseDecoder {
    _determineFrameType(frame) {
        const colonIndex = frame.indexOf(58);
        return colonIndex !== -1 ? 'colon' : 'no-colon';
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
        let hexString = '';
        for (const byte of dataArray) {
            if (byte < 32 || byte === 32)
                continue;
            hexString += String.fromCharCode(byte);
        }
        for (let i = 0; i < hexString.length; i += 2) {
            const pair = hexString.substr(i, 2);
            if (pair.length === 2) {
                bytes.push(pair);
            }
        }
        this._log('debug', 'Converted ASCII to bytes:', bytes);
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
                if (frameType === 'colon') {
                    bytes = this._extractBytesFromColonFrame(frame, frame.indexOf(58));
                }
                else {
                    bytes = this._extractBytesFromNoColonFrame(frame);
                }
                if (!bytes || bytes.length === 0)
                    continue;
                if (frameIndex === 0) {
                    const modeResponse = parseInt(bytes[0], 16);
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
            this._log('error', 'Failed to parse response:', error);
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
        Object.defineProperty(this, 'getModeResponseByte', {
            value: () => modeResponse
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _getDTCInfo(_dtcLevel, _dtcMessage) {
        return undefined;
    }
    _decodeDTC(byte1, byte2) {
        try {
            const b1 = parseInt(byte1, 16);
            const b2 = parseInt(byte2, 16);
            if (isNaN(b1) || isNaN(b2) || (b1 === 0 && b2 === 0)) {
                return null;
            }
            const type = (b1 >> 6) & 0x03;
            const digit2 = (b1 >> 4) & 0x03;
            const digit3 = b1 & 0x0f;
            const digits45 = b2;
            if (!this.isValidDTCComponents(type, digit2, digit3, digits45)) {
                return null;
            }
            return { type, digit2, digit3, digits45 };
        }
        catch (error) {
            this._log('error', 'DTC decode error:', error);
            return null;
        }
    }
}
