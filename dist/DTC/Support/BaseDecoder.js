export class BaseDecoder {
    constructor() {
        this.rawDtcObjects = [];
        this.expectedDTCCount = 0;
        this.currentDTCCount = 0;
        this.leftoverByte = null;
        this.DTC_MODES = {
            CURRENT: { RESPONSE: 0x43, DESCRIPTION: 'Current DTCs' },
            PENDING: { RESPONSE: 0x47, DESCRIPTION: 'Pending DTCs' },
            PERMANENT: { RESPONSE: 0x4A, DESCRIPTION: 'Permanent DTCs' }
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
    _dtcToString(dtc) {
        try {
            if (!dtc || typeof dtc !== 'object')
                return null;
            const typeIndex = dtc.type;
            const digit2 = dtc.digit2;
            const digit3 = dtc.digit3;
            const digits45 = dtc.digits45;
            if (!this.isValidDTCComponents(typeIndex, digit2, digit3, digits45)) {
                return null;
            }
            const types = ['P', 'C', 'B', 'U'];
            const typeChar = types[typeIndex];
            const digit3Hex = digit3.toString(16).toUpperCase();
            const digits45Hex = digits45.toString(16).padStart(2, '0').toUpperCase();
            return `${typeChar}${digit2}${digit3Hex}${digits45Hex}`;
        }
        catch (error) {
            this._log('error', 'DTC string conversion error:', error);
            return null;
        }
    }
    isValidDTCComponents(type, digit2, digit3, digits45) {
        const validations = [
            { value: type, max: 3, name: 'type' },
            { value: digit2, max: 3, name: 'digit2' },
            { value: digit3, max: 15, name: 'digit3' },
            { value: digits45, max: 255, name: 'digits45' },
        ];
        return validations.every(({ value, max, name }) => {
            const valid = value >= 0 && value <= max;
            if (!valid) {
                this._log('debug', `Invalid ${name} value: ${value}, max allowed: ${max}`);
            }
            return valid;
        });
    }
    toHexString(value) {
        try {
            if (value === null || value === undefined)
                return 'null';
            return '0x' + value.toString(16).padStart(2, '0').toUpperCase();
        }
        catch {
            return 'invalid';
        }
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
            this._log('debug', 'Raw DTC values:', {
                byte1: this.toHexString(b1),
                byte2: this.toHexString(b2),
                extracted: {
                    type: this.toHexString(type),
                    digit2: this.toHexString(digit2),
                    digit3: this.toHexString(digit3),
                    digits45: this.toHexString(digits45),
                },
            });
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
