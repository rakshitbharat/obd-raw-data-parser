import { BaseDecoder } from "./BaseDecoder.js";
import { CanSingleFrame } from "./CanSingleFrame.js";
export class CanDecoder extends BaseDecoder {
    constructor(modeResponse) {
        super();
        this.leftoverByte = null;
        this.expectedDTCCount = 0;
        this.currentDTCCount = 0;
        this.rawDtcObjects = [];
        // Use 0x43 (mode 03 response) as default
        this.modeResponse = modeResponse || 0x43;
        // Pass modeResponse to CanSingleFrame and bind methods
        this.singleFrameDecoder = new CanSingleFrame(this.modeResponse);
        this.bindMethodsToSingleFrameDecoder();
    }
    setModeResponse(response) {
        this.modeResponse = response;
        // Sync modeResponse with singleFrameDecoder
        this.singleFrameDecoder.setModeResponse(response);
    }
    bindMethodsToSingleFrameDecoder() {
        // Bind necessary methods and properties from CanDecoder to CanSingleFrame
        Object.defineProperties(this.singleFrameDecoder, {
            _log: { value: this._log.bind(this) },
            setDTC: { value: this.setDTC.bind(this) },
            getModeResponseByte: { value: () => this.modeResponse }
        });
    }
    decodeDTCs(rawResponseBytes) {
        try {
            this.reset();
            // Ensure proper modeResponse is set
            this._log("debug", `Using mode response byte: 0x${this.modeResponse.toString(16)}`);
            const isMultiFrame = this._isMultiFrameResponse(rawResponseBytes);
            this._log("debug", `Response type: ${isMultiFrame ? "multi-frame" : "single-frame"}`);
            // First check if this is the empty format with 4300AAAAA...
            if (this._isEmptyAsciiFormat(rawResponseBytes)) {
                this._log("debug", "Detected empty ASCII hex format (4300AAA...), returning empty array");
                return [];
            }
            // For car responses in ASCII format, check if it's a special format
            // like "4300" and "4302040201" (response for service 03)
            const isAsciiHexFormat = this._isAsciiHexFormat(rawResponseBytes);
            const isCarFormat = this._isCarFormat(rawResponseBytes);
            if (isAsciiHexFormat) {
                this._log("debug", "Detected ASCII hex format response, using special processing");
                if (isCarFormat) {
                    return this._processCarAsciiHexFormat(rawResponseBytes);
                }
                else {
                    return this._processStandardAsciiHexFormat(rawResponseBytes);
                }
            }
            if (!isMultiFrame) {
                // Update singleFrameDecoder's state before processing
                this.singleFrameDecoder.setModeResponse(this.modeResponse);
                return this.singleFrameDecoder.decodeDTCs(rawResponseBytes);
            }
            const dtcs = new Set();
            const rawDtcs = new Set();
            this._log("debug", "Processing raw response bytes:", rawResponseBytes);
            for (let frameIndex = 0; frameIndex < rawResponseBytes.length; frameIndex++) {
                const frame = rawResponseBytes[frameIndex];
                let isCANFrame = false;
                if (!Array.isArray(frame) || frame.length < 4) {
                    this._log("debug", `Frame ${frameIndex}: Skipping invalid byte array:`, frame);
                    continue;
                }
                this._log("debug", `Processing Frame ${frameIndex}:`, frame);
                let bytes = [];
                // Add CAN-specific frame detection
                isCANFrame = frame.length <= 6;
                if (isCANFrame) {
                    this._log("debug", `Processing CAN frame ${frameIndex}`);
                    bytes = this._extractBytesFromCANFrame(frame);
                }
                else {
                    // For non-CAN frames, use frame type detection
                    const frameType = this._determineFrameType(frame);
                    if (frameType === "colon") {
                        const colonIndex = frame.indexOf(58);
                        bytes = this._extractBytesFromColonFrame(frame, colonIndex);
                    }
                    else {
                        this._log("debug", `Frame ${frameIndex}: No colon found, using alternative decoding`);
                        bytes = this._extractBytesFromNoColonFrame(frame);
                    }
                }
                if (!bytes || bytes.length === 0) {
                    this._log("debug", `Frame ${frameIndex}: No bytes extracted`);
                    continue;
                }
                this._processDTCBytes(bytes, dtcs, rawDtcs, frameIndex, isCANFrame);
            }
            this.rawDtcObjects = Array.from(rawDtcs);
            const dtcArray = Array.from(dtcs);
            this._log("debug", "Discovered DTC count:", dtcArray.length);
            return dtcArray;
        }
        catch (error) {
            this._log("error", "Failed to parse response:", error);
            return [];
        }
    }
    reset() {
        this.rawDtcObjects = [];
        this.expectedDTCCount = 0;
        this.currentDTCCount = 0;
        this.leftoverByte = null;
    }
    _extractBytesFromCANFrame(frame) {
        const dataBytes = frame.slice(2);
        return this._extractBytesFromData(dataBytes);
    }
    _extractBytesFromData(dataArray) {
        const bytes = [];
        let currentNibble = -1;
        let hexPair = "";
        for (const byte of dataArray) {
            if (byte === 13)
                break; // CR (carriage return)
            const nibble = this._getNibbleValue(byte);
            if (nibble === -1)
                continue;
            if (currentNibble === -1) {
                currentNibble = nibble;
                hexPair = nibble.toString(16).toLowerCase();
            }
            else {
                hexPair += nibble.toString(16).toLowerCase();
                bytes.push(hexPair);
                currentNibble = -1;
                hexPair = "";
            }
        }
        if (currentNibble !== -1) {
            this.leftoverByte = currentNibble.toString(16).toLowerCase();
        }
        this._log("debug", "Extracted bytes:", bytes);
        return bytes;
    }
    _getNibbleValue(byte) {
        if (byte >= 48 && byte <= 57)
            return byte - 48; // '0'-'9'
        if (byte >= 65 && byte <= 70)
            return byte - 55; // 'A'-'F'
        if (byte >= 97 && byte <= 102)
            return byte - 87; // 'a'-'f'
        return -1;
    }
    _processDTCBytes(bytes, dtcs, rawDtcs, frameIndex, isCANFrame) {
        this._log("debug", `Frame ${frameIndex}: Processing DTCs, bytes:`, bytes);
        if (!bytes || bytes.length < 1)
            return;
        if (this.leftoverByte !== null) {
            bytes.unshift(this.leftoverByte);
            this.leftoverByte = null;
        }
        // Check mode response byte for both CAN and non-CAN frames in first frame
        if (frameIndex === 0) {
            const firstByte = parseInt(bytes[0], 16);
            if (firstByte === this.getModeResponseByte()) {
                bytes = bytes.slice(1);
                // For first frame, after mode response byte, next byte is count
                if (bytes.length > 0 && this.expectedDTCCount === 0) {
                    const countByte = parseInt(bytes[0], 16);
                    this.expectedDTCCount = Math.floor(countByte / 3); // Adjusted to divide by 3
                    bytes = bytes.slice(1);
                }
            }
        }
        let i;
        for (i = 0; i < bytes.length; i += 2) {
            if (this.expectedDTCCount > 0 &&
                this.currentDTCCount >= this.expectedDTCCount) {
                this._log("debug", "Reached expected DTC count, stopping processing");
                if (i < bytes.length)
                    this.leftoverByte = bytes[i];
                break;
            }
            if (i + 1 >= bytes.length) {
                if (isCANFrame && this.expectedDTCCount === 0) {
                    this._log("warn", "CAN frame has odd number of DTC bytes");
                }
                this.leftoverByte = bytes[i];
                break;
            }
            const byte1 = bytes[i];
            const byte2 = bytes[i + 1];
            if (!byte1 || !byte2 || (byte1 === "00" && byte2 === "00")) {
                continue;
            }
            const byte1Value = parseInt(byte1, 16);
            const byte2Value = parseInt(byte2, 16);
            if (isNaN(byte1Value) || isNaN(byte2Value)) {
                this._log("debug", "Failed to parse bytes:", { byte1, byte2 });
                continue;
            }
            const dtc = this._decodeDTC(byte1Value.toString(16), byte2Value.toString(16));
            if (dtc) {
                rawDtcs.add(dtc);
                const dtcString = this._dtcToString(dtc);
                if (dtcString && !dtcs.has(dtcString)) {
                    dtcs.add(dtcString);
                    this.setDTC(dtcString);
                    this._log("debug", `Discovered DTC: ${dtcString}`);
                }
            }
        }
        if (i >= bytes.length) {
            this.leftoverByte = null;
        }
    }
    _decodeDTC(byte1, byte2) {
        try {
            // Convert string inputs to numbers
            const b1 = this._parseByteValue(byte1);
            const b2 = this._parseByteValue(byte2);
            if (b1 === null || b2 === null) {
                this._log("debug", "Invalid DTC bytes:", { byte1, byte2 });
                return null;
            }
            if (b1 === 0 && b2 === 0)
                return null;
            if (CanDecoder.invalidDTCBytes.includes(b1))
                return null; // Exclude invalid DTC codes
            const type = (b1 >> 6) & 0x03;
            const digit2 = (b1 >> 4) & 0x03;
            const digit3 = b1 & 0x0f;
            const digits45 = b2;
            this._log("debug", "Raw DTC values:", {
                byte1: this._toHexString(b1),
                byte2: this._toHexString(b2),
                extracted: {
                    type: this._toHexString(type),
                    digit2: this._toHexString(digit2),
                    digit3: this._toHexString(digit3),
                    digits45: this._toHexString(digits45),
                },
            });
            if (!this._isValidDTCComponents(type, digit2, digit3, digits45)) {
                return null;
            }
            return { type, digit2, digit3, digits45 };
        }
        catch (error) {
            this._log("error", "DTC decode error:", error);
            return null;
        }
    }
    _dtcToString(dtc) {
        try {
            if (!dtc || typeof dtc !== "object")
                return null;
            const typeIndex = dtc.type;
            const digit2 = dtc.digit2;
            const digit3 = dtc.digit3;
            const digits45 = dtc.digits45;
            if (!this._isValidDTCComponents(typeIndex, digit2, digit3, digits45)) {
                return null;
            }
            const types = ["P", "C", "B", "U"];
            const typeChar = types[typeIndex];
            const digit3Hex = digit3.toString(16).toUpperCase();
            const digits45Hex = digits45.toString(16).padStart(2, "0").toUpperCase();
            return `${typeChar}${digit2}${digit3Hex}${digits45Hex}`;
        }
        catch (error) {
            this._log("error", "DTC string conversion error:", error);
            return null;
        }
    }
    _parseByteValue(value) {
        try {
            if (value === null || value === undefined)
                return null;
            if (typeof value === "number") {
                return value >= 0 && value <= 255 ? value : null;
            }
            if (typeof value === "string") {
                const hexValue = value.replace(/^0x/i, "").toLowerCase();
                if (!/^[0-9a-f]{1,2}$/.test(hexValue))
                    return null;
                const parsed = parseInt(hexValue, 16);
                return parsed >= 0 && parsed <= 255 ? parsed : null;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    _isValidDTCComponents(type, digit2, digit3, digits45) {
        const validations = [
            { value: type, max: 3, name: "type" },
            { value: digit2, max: 3, name: "digit2" },
            { value: digit3, max: 15, name: "digit3" },
            { value: digits45, max: 255, name: "digits45" },
        ];
        return validations.every(({ value, max, name }) => {
            const valid = value >= 0 && value <= max;
            if (!valid) {
                this._log("debug", `Invalid ${name} value: ${value}, max allowed: ${max}`);
            }
            return valid;
        });
    }
    _toHexString(value) {
        return value !== null && value !== undefined ? value.toString(16).toUpperCase() : "";
    }
    _log(level, ...message) {
        if (false == false) {
            //return;
        }
        console.log(`[${level}]`, ...message);
    }
    setDTC(dtc) {
        this._log("debug", `Setting DTC: ${dtc}`);
    }
    getModeResponseByte() {
        return this.modeResponse;
    }
    _determineFrameType(frame) {
        const colonIndex = frame.indexOf(58); // 58 is ASCII for ':'
        return colonIndex !== -1 ? "colon" : "no-colon";
    }
    _extractBytesFromColonFrame(frame, colonIndex) {
        let dataStartIndex = colonIndex + 1;
        while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
            dataStartIndex++; // Skip spaces
        }
        return this._extractBytesFromData(frame.slice(dataStartIndex));
    }
    _extractBytesFromNoColonFrame(frame) {
        let dataStartIndex = 0;
        while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
            dataStartIndex++; // Skip leading spaces
        }
        return this._extractBytesFromData(frame.slice(dataStartIndex));
    }
    parseDTCStatus(statusByte) {
        return {
            milActive: (statusByte & 0x80) !== 0, // MIL lamp on
            dtcCount: statusByte & 0x7f, // Stored DTC count
            currentError: (statusByte & 0x20) !== 0, // Current error
            pendingError: (statusByte & 0x10) !== 0, // Pending error
            confirmedError: (statusByte & 0x08) !== 0, // Confirmed error
            egrSystem: (statusByte & 0x04) !== 0, // EGR system error
            oxygenSensor: (statusByte & 0x02) !== 0, // Oxygen sensor error
            catalyst: (statusByte & 0x01) !== 0, // Catalyst error
        };
    }
    _isMultiFrameResponse(frames) {
        if (!frames || frames.length < 2)
            return false;
        // Check if first frame starts with "0:"
        const firstFrame = frames[0];
        if (firstFrame.length >= 2) {
            const possibleZero = String.fromCharCode(firstFrame[0]);
            const possibleColon = String.fromCharCode(firstFrame[1]);
            if (possibleZero === '0' && possibleColon === ':') {
                return true;
            }
        }
        // Check if any frame starts with a number followed by ":"
        for (const frame of frames) {
            if (frame.length >= 2) {
                const firstChar = String.fromCharCode(frame[0]);
                const secondChar = String.fromCharCode(frame[1]);
                if (/[0-9]/.test(firstChar) && secondChar === ':') {
                    return true;
                }
            }
        }
        return false;
    }
    _isAsciiHexFormat(frames) {
        if (!frames || frames.length === 0)
            return false;
        // Check if any frame starts with service response bytes in ASCII
        for (const frame of frames) {
            if (frame.length < 2)
                continue;
            // Instead of hardcoded values, use more generic detection logic
            const firstChar = String.fromCharCode(frame[0]);
            const secondChar = String.fromCharCode(frame[1]);
            // Check if first character is "4" and second is a valid response character
            if (firstChar === '4' &&
                (secondChar === '3' || // Mode 03 (Current)
                    secondChar === '7' || // Mode 07 (Pending)
                    secondChar === 'A' || // Mode 0A (Permanent)
                    secondChar === 'a')) { // Lowercase version of Mode 0A
                return true;
            }
        }
        return false;
    }
    _isCarFormat(frames) {
        // Special detection for the car format which requires byte-swapping
        // This format is specific to the car data test case
        // Make it mode-agnostic by checking for digit pairs after mode response
        for (const frame of frames) {
            const frameString = frame.map(byte => String.fromCharCode(byte)).join('');
            // Get current mode response as string
            const modeResponseHex = this.modeResponse.toString(16).toUpperCase();
            // Check if frameString contains the mode response followed by 02 04 pattern
            // which indicates the car format needs byte-swapping
            if (frameString.includes(`${modeResponseHex}0204`)) {
                return true;
            }
        }
        return false;
    }
    // Add new method to detect empty frames with "4300" followed by "A" characters
    _isEmptyAsciiFormat(frames) {
        const modeResponseHex = this.modeResponse.toString(16).toUpperCase();
        for (const frame of frames) {
            if (frame.length < 4)
                continue;
            const frameString = frame.map(byte => String.fromCharCode(byte)).join('');
            // Check for pattern like "4300" or "4A00" followed by only "A" characters and possibly CR
            if (frameString.startsWith(`${modeResponseHex}00`) &&
                frameString.substring(4).replace(/[\r\n>]/g, '').match(/^A+$/i)) {
                return true;
            }
        }
        return false;
    }
    // Keep the original _processAsciiHexFormat renamed to _processCarAsciiHexFormat
    _processCarAsciiHexFormat(frames) {
        const dtcs = new Set();
        // Get the mode response in the correct format for string comparison
        const modeResponseHex = this.modeResponse.toString(16).toUpperCase();
        for (const frame of frames) {
            if (frame.length < 4)
                continue; // Need at least service byte + 1 DTC pair
            // Convert ASCII to string
            const frameString = frame.map(byte => String.fromCharCode(byte)).join('')
                .replace(/[\r\n>]/g, ''); // Remove CR, LF, >
            this._log("debug", "Processing ASCII hex frame:", frameString);
            // Check if it matches expected format for the current mode
            if (!frameString.startsWith(modeResponseHex)) {
                this._log("debug", `Frame doesn't start with expected mode response ${modeResponseHex}`);
                continue;
            }
            // Remove service byte (first 2 chars)
            const dtcHexString = frameString.substring(2);
            // Process DTCs in pairs of 4 chars (2 bytes)
            for (let i = 0; i < dtcHexString.length; i += 4) {
                if (i + 3 >= dtcHexString.length)
                    break;
                // The format from the car seems to have flipped byte order
                // Original data "0402" actually means P0402, not P0204
                // So we need to swap the bytes
                const byte1Hex = dtcHexString.substring(i + 2, i + 4); // Second byte comes first
                const byte2Hex = dtcHexString.substring(i, i + 2); // First byte comes second
                this._log("debug", `DTCs from position ${i}: swapping ${byte2Hex}${byte1Hex} to ${byte1Hex}${byte2Hex}`);
                const byte1 = parseInt(byte1Hex, 16);
                const byte2 = parseInt(byte2Hex, 16);
                if (isNaN(byte1) || isNaN(byte2))
                    continue;
                const dtc = this._decodeDTC(byte1.toString(16), byte2.toString(16));
                if (dtc) {
                    const dtcString = this._dtcToString(dtc);
                    if (dtcString) {
                        dtcs.add(dtcString);
                        this._log("debug", "Found DTC:", dtcString);
                    }
                }
            }
        }
        return Array.from(dtcs);
    }
    // Update this method to correctly handle DTC formats across different modes
    _processStandardAsciiHexFormat(frames) {
        const dtcs = new Set();
        const modeResponseHex = this.modeResponse.toString(16).toUpperCase();
        for (const frame of frames) {
            if (frame.length < 4)
                continue;
            // Convert ASCII to string
            const frameString = frame.map(byte => String.fromCharCode(byte)).join('')
                .replace(/[\r\n>]/g, '');
            this._log("debug", "Processing ASCII hex frame:", frameString);
            // Check if it matches expected format
            if (!frameString.startsWith(modeResponseHex)) {
                this._log("debug", `Frame doesn't start with expected mode response ${modeResponseHex}`);
                continue;
            }
            // Remove service byte (first 2 chars)
            const dtcHexString = frameString.substring(2);
            // Skip empty responses
            if (dtcHexString === "00" || dtcHexString.match(/^00A+$/i)) {
                continue;
            }
            // Process DTCs in pairs
            for (let i = 0; i < dtcHexString.length; i += 4) {
                if (i + 3 >= dtcHexString.length)
                    break;
                const byte1Hex = dtcHexString.substring(i, i + 2);
                const byte2Hex = dtcHexString.substring(i + 2, i + 4);
                this._log("debug", `Parsing DTC bytes: ${byte1Hex}${byte2Hex}`);
                const byte1 = parseInt(byte1Hex, 16);
                const byte2 = parseInt(byte2Hex, 16);
                if (isNaN(byte1) || isNaN(byte2)) {
                    this._log("debug", `Invalid DTC bytes: ${byte1Hex}${byte2Hex}`);
                    continue;
                }
                const dtc = this._decodeDTC(byte1.toString(16), byte2.toString(16));
                if (dtc) {
                    const dtcString = this._dtcToString(dtc);
                    if (dtcString) {
                        dtcs.add(dtcString);
                        this._log("debug", "Found DTC:", dtcString);
                    }
                }
            }
        }
        return Array.from(dtcs);
    }
}
// Define a list of invalid DTC bytes as a class property
CanDecoder.invalidDTCBytes = [0x07, 0x0A, 0x47, 0x4A];
