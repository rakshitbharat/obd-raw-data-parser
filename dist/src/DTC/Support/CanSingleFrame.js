import { BaseDecoder } from "./BaseDecoder.js";
import { byteArrayToString, toHexString, parseHexInt, formatMessage, } from "../../utils.js";
export class CanSingleFrame extends BaseDecoder {
    constructor(modeResponse) {
        super();
        this.leftoverByte = null;
        this.expectedDTCCount = 0;
        this.currentDTCCount = 0;
        this.rawDtcObjects = [];
        // Use 0x43 (mode 03 response) as default instead of 0x00
        this.modeResponse = modeResponse || 0x43;
    }
    setModeResponse(response) {
        this.modeResponse = response;
    }
    decodeDTCs(rawResponseBytes) {
        try {
            this.reset();
            const dtcs = new Set();
            const rawDtcs = new Set();
            this._log("debug", "Processing raw response bytes:", rawResponseBytes);
            if (!rawResponseBytes.length || !rawResponseBytes[0].length) {
                return [];
            }
            // Process all frames, not just the first one
            for (const frame of rawResponseBytes) {
                if (!frame.length)
                    continue;
                // Skip common response terminators
                if (frame.length <= 2 &&
                    frame.some((b) => b === 13 || b === 10 || b === 62)) {
                    // CR, LF, >
                    continue;
                }
                // Parse CAN frame format or standard ASCII format
                let bytes = [];
                const frameString = frame
                    .map((byte) => String.fromCharCode(byte))
                    .join("");
                // Log the frame as string for debugging
                this._log("debug", "Processing frame as string:", frameString);
                const colonIndex = frameString.indexOf(":");
                if (colonIndex !== -1) {
                    // Extract everything after the colon
                    const dataAfterColon = frameString.substring(colonIndex + 1);
                    // Convert ASCII hex to bytes
                    for (let i = 0; i < dataAfterColon.length; i++) {
                        if (dataAfterColon[i] === "\r")
                            continue;
                        const hexPair = dataAfterColon.substr(i, 2);
                        if (hexPair.length === 2) {
                            const byteValue = parseInt(hexPair, 16);
                            if (!isNaN(byteValue)) {
                                bytes.push(byteValue);
                            }
                            i++; // Skip next character since we used it
                        }
                    }
                }
                else {
                    // Use enhanced ASCII conversion
                    bytes = this._convertAsciiToBytes(frame);
                }
                this._log("debug", "Converted bytes:", bytes);
                if (bytes.length < 2) {
                    continue; // Skip this frame and try next one
                }
                // Handle CAN format with 01 00 prefix
                if (bytes[0] === 0x01 && bytes[1] === 0x00) {
                    // Remove the 01 00 prefix and any bytes up to the mode response
                    const modeIndex = bytes.findIndex((b) => b === this.getModeResponseByte());
                    if (modeIndex !== -1) {
                        bytes = bytes.slice(modeIndex);
                    }
                }
                // Check for mode response byte - now using passed in mode response
                const expectedResponse = this.getModeResponseByte();
                if (bytes[0] !== expectedResponse) {
                    this._log("debug", `Invalid mode response byte. Expected ${expectedResponse.toString(16)}, got ${bytes[0].toString(16)}`);
                    continue;
                }
                // Remove the mode response byte
                const dtcBytes = bytes.slice(1);
                this._log("debug", "DTC bytes:", dtcBytes);
                // Check if all remaining bytes are zero (empty DTCs)
                if (dtcBytes.every((b) => b === 0)) {
                    continue;
                }
                // Process DTC bytes in pairs
                for (let i = 0; i < dtcBytes.length - 1; i += 2) {
                    const byte1 = dtcBytes[i];
                    const byte2 = dtcBytes[i + 1];
                    // Skip if both bytes are zero
                    if (byte1 === 0 && byte2 === 0) {
                        continue;
                    }
                    const dtc = this._decodeDTC(byte1.toString(16).padStart(2, "0"), byte2.toString(16).padStart(2, "0"));
                    if (dtc) {
                        rawDtcs.add(dtc);
                        const dtcString = this._dtcToString(dtc);
                        this._log("debug", "Decoded DTC:", dtcString);
                        if (dtcString) {
                            dtcs.add(dtcString);
                            this.setDTC(dtcString);
                        }
                    }
                }
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
    _convertAsciiToBytes(asciiBytes) {
        const bytes = [];
        let currentByte = -1;
        const asciiString = byteArrayToString(asciiBytes);
        this._log("debug", formatMessage("Converting ASCII string:", "", asciiString));
        const modeResponsePrefix = toHexString(this.getModeResponseByte()).toUpperCase();
        if (asciiString.startsWith(modeResponsePrefix)) {
            let hexDump = asciiString.replace(/[\r\n>]/g, "");
            for (let i = 0; i < hexDump.length; i += 2) {
                if (i + 1 < hexDump.length) {
                    const hexPair = hexDump.substr(i, 2);
                    const byteValue = parseHexInt(hexPair);
                    if (!isNaN(byteValue)) {
                        bytes.push(byteValue);
                    }
                }
            }
            this._log("debug", formatMessage("Extracted bytes from ASCII hex string:", "", JSON.stringify(bytes)));
            return bytes;
        }
        // Original conversion method as fallback
        for (const ascii of asciiBytes) {
            if (ascii === 13)
                continue; // Skip CR
            const nibble = this._getNibbleValue(ascii);
            if (nibble === -1)
                continue;
            if (currentByte === -1) {
                currentByte = nibble << 4;
            }
            else {
                currentByte |= nibble;
                // Skip if byte pair is 0x00 or 0xAA
                if (currentByte !== 0x00 && currentByte !== 0xaa) {
                    bytes.push(currentByte);
                }
                currentByte = -1;
            }
        }
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
    _decodeDTC(byte1, byte2) {
        try {
            const b1 = parseHexInt(byte1);
            const b2 = parseHexInt(byte2);
            if (isNaN(b1) || isNaN(b2)) {
                this._log("debug", formatMessage("Invalid DTC bytes:", "", JSON.stringify({ byte1, byte2 })));
                return null;
            }
            if (b1 >> 4 === 0x0c) {
                const digit2 = b1 & 0x0f;
                const byte2Hex = toHexString(parseHexInt(byte2), 2);
                const digit3 = parseHexInt(byte2Hex[0]);
                const digits45 = parseHexInt(byte2Hex[1]);
                return {
                    type: 1,
                    digit2,
                    digit3,
                    digits45,
                };
            }
            const type = (b1 >> 6) & 0x03;
            const digit2 = (b1 >> 4) & 0x03;
            const digit3 = b1 & 0x0f;
            const digits45 = b2;
            return { type, digit2, digit3, digits45 };
        }
        catch (error) {
            this._log("error", formatMessage("DTC decode error:", "", String(error)));
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
            const digit3Hex = toHexString(digit3, 1).toUpperCase();
            const digits45Hex = toHexString(digits45, 2).toUpperCase();
            return `${typeChar}${digit2}${digit3Hex}${digits45Hex}`;
        }
        catch (error) {
            this._log("error", formatMessage("DTC string conversion error:", "", String(error)));
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
    _log(level, ...message) {
        if (false == false) {
            //return;
        }
        console.log(formatMessage(`[${level}]`, "", ""), ...message);
    }
    reset() {
        this.rawDtcObjects = [];
        this.expectedDTCCount = 0;
        this.currentDTCCount = 0;
        this.leftoverByte = null;
    }
    getModeResponseByte() {
        return this.modeResponse;
    }
    setDTC(dtc) {
        this._log("debug", `Setting DTC: ${dtc}`);
    }
    isNoDataResponse(frame) {
        if (frame.length >= 7) {
            // Check for "NO DATA" ASCII sequence
            const noDataString = String.fromCharCode(...frame.slice(0, 7));
            return noDataString === "NO DATA";
        }
        return false;
    }
    isAllAFrameResponse(frameString) {
        // Remove any carriage returns and line feeds
        const cleanFrame = frameString.replace(/[\r\n]/g, "");
        // Check if all characters are 'A' (case insensitive)
        return /^[Aa]+$/.test(cleanFrame);
    }
}
