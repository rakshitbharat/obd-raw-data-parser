import { BaseDecoder } from "./BaseDecoder.js";
import { byteArrayToString, toHexString, formatMessage, } from "../../utils.js";
import { hexToDTC } from "../utils/dtcConverter.js";
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
    _isAsciiHexFormat(frames) {
        if (!frames || frames.length === 0)
            return false;
        for (const frame of frames) {
            if (frame.length < 2)
                continue;
            const firstChar = String.fromCharCode(frame[0]);
            const secondChar = String.fromCharCode(frame[1]);
            if (firstChar === "4" &&
                (secondChar === "3" ||
                    secondChar === "7" ||
                    secondChar === "A" ||
                    secondChar === "a")) {
                return true;
            }
        }
        return false;
    }
    _isEmptyAsciiFormat(frames) {
        const modeResponseHex = this.modeResponse.toString(16).toUpperCase();
        for (const frame of frames) {
            if (frame.length < 4)
                continue;
            const frameString = frame
                .map((byte) => String.fromCharCode(byte))
                .join("");
            if (frameString.startsWith(`${modeResponseHex}00`) &&
                frameString
                    .substring(4)
                    .replace(/[\r\n>]/g, "")
                    .match(/^A+$/i)) {
                return true;
            }
        }
        return false;
    }
    decodeDTCs(rawResponseBytes) {
        try {
            this.reset();
            if (this._isEmptyAsciiFormat(rawResponseBytes)) {
                this._log("debug", "Detected empty ASCII hex format, returning empty array");
                return [];
            }
            const isAsciiHexFormat = this._isAsciiHexFormat(rawResponseBytes);
            if (isAsciiHexFormat) {
                this._log("debug", "Detected ASCII hex format response");
                return this._processStandardAsciiHexFormat(rawResponseBytes);
            }
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
                if (frame.length <= 2 && frame.some((b) => b === 13 || b === 10 || b === 62)) {
                    continue;
                }
                let bytes = [];
                const frameString = frame.map((byte) => String.fromCharCode(byte)).join("");
                this._log("debug", "Processing frame as string:", frameString);
                const colonIndex = frameString.indexOf(":");
                if (colonIndex !== -1) {
                    const dataAfterColon = frameString.substring(colonIndex + 1);
                    bytes = [];
                    let currentByte = -1;
                    for (let i = 0; i < dataAfterColon.length; i++) {
                        const nibble = this._getNibbleValue(dataAfterColon.charCodeAt(i));
                        if (nibble === -1)
                            continue;
                        if (currentByte === -1) {
                            currentByte = nibble << 4;
                        }
                        else {
                            currentByte |= nibble;
                            bytes.push(currentByte);
                            currentByte = -1;
                        }
                    }
                }
                else {
                    bytes = this._convertAsciiToBytes(frame);
                }
                this._log("debug", "Converted bytes:", bytes);
                if (bytes.length < 2)
                    continue;
                // Find mode response position
                let startIndex = 0;
                const modeResponseByte = this.getModeResponseByte();
                // Find the mode response byte
                for (let i = 0; i < bytes.length; i++) {
                    if (bytes[i] === modeResponseByte) {
                        startIndex = i;
                        break;
                    }
                }
                // Skip if mode response byte not found
                if (startIndex >= bytes.length)
                    continue;
                // Get the bytes after mode response
                const dtcData = bytes.slice(startIndex + 1);
                // Check if there might be a count byte
                if (dtcData.length > 0) {
                    let dataStartIndex = 0;
                    const possibleCount = dtcData[0];
                    // If first byte looks like a count (smaller than the mode response and not a DTC byte)
                    if (possibleCount < modeResponseByte && possibleCount <= dtcData.length / 2) {
                        dataStartIndex = 1;
                        this.expectedDTCCount = possibleCount;
                    }
                    // Process DTC bytes in pairs
                    for (let i = dataStartIndex; i < dtcData.length - 1; i += 2) {
                        const byte1 = dtcData[i];
                        const byte2 = dtcData[i + 1];
                        if (byte1 === 0 && byte2 === 0)
                            continue;
                        const dtc = this._decodeDTC(byte1.toString(16).padStart(2, "0"), byte2.toString(16).padStart(2, "0"));
                        if (dtc) {
                            if (!dtcs.has(dtc)) {
                                dtcs.add(dtc);
                                rawDtcs.add(dtc);
                                this.setDTC(dtc);
                                this._log("debug", "Found DTC:", dtc);
                            }
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
    _processStandardAsciiHexFormat(frames) {
        const dtcs = new Set();
        const modeResponseHex = toHexString(this.getModeResponseByte()).toUpperCase();
        for (const frame of frames) {
            const frameString = byteArrayToString(frame).replace(/[\r\n>]/g, "");
            this._log("debug", `Processing ASCII hex frame: ${frameString}`);
            // Skip if frame doesn't start with mode response
            if (!frameString.startsWith(modeResponseHex)) {
                this._log("debug", `Frame doesn't start with ${modeResponseHex}, skipping`);
                continue;
            }
            // Get everything after the mode response byte
            const dataAfterMode = frameString.substring(2);
            this._log("debug", `Full data after mode response: ${dataAfterMode}`);
            // Try to detect if the first byte is a count
            let dtcData = dataAfterMode;
            let countByte = false;
            if (dataAfterMode.length >= 2) {
                const possibleCountHex = dataAfterMode.substring(0, 2);
                const possibleCount = parseInt(possibleCountHex, 16);
                // Check if this looks like a valid count:
                // 1. It's a reasonable number (not too large)
                // 2. It's not likely part of a DTC itself
                if (!isNaN(possibleCount) &&
                    possibleCount > 0 &&
                    possibleCount <= 20) { // Reasonable max limit
                    this._log("debug", `Detected count byte: ${possibleCountHex} (${possibleCount} DTCs)`);
                    this.expectedDTCCount = possibleCount;
                    dtcData = dataAfterMode.substring(2); // Skip the count byte
                    countByte = true;
                }
                else {
                    this._log("debug", `No count byte detected, parsing all data as DTCs`);
                }
            }
            this._log("debug", `DTC hex data: ${dtcData}`);
            // Special case for 4301010113 pattern (count=1 with additional data)
            if (countByte) {
                // With a count byte, process the expected number of DTCs first
                for (let i = 0; i < this.expectedDTCCount; i++) {
                    const startPos = i * 4;
                    // Make sure we have at least 2 chars for a minimal DTC
                    if (startPos + 1 < dtcData.length) {
                        let dtcHex;
                        // Check if we have a full 4-char DTC
                        if (startPos + 3 < dtcData.length) {
                            dtcHex = dtcData.substring(startPos, startPos + 4);
                        }
                        else {
                            // Handle shortened DTC (like "01" for P0101)
                            const shortCode = dtcData.substring(startPos);
                            if (shortCode.length === 2) {
                                // For 2-char codes like "01", use the format 0101 for P0101
                                dtcHex = `01${shortCode}`;
                                this._log("debug", `Expanded shortened DTC code: ${shortCode} -> ${dtcHex}`);
                            }
                            else {
                                // Default padding if we don't have exactly 2 chars
                                dtcHex = shortCode.padEnd(4, '0');
                            }
                        }
                        if (dtcHex === "0000" || !/^[0-9A-F]{4}$/i.test(dtcHex)) {
                            continue;
                        }
                        const dtc = hexToDTC(dtcHex);
                        if (dtc) {
                            dtcs.add(dtc);
                            this._log("debug", `Found DTC: ${dtc} from hex ${dtcHex}`);
                            this.currentDTCCount++;
                        }
                    }
                }
                // After processing the expected DTCs, check for any additional DTCs in the remaining data
                const processedChars = this.expectedDTCCount * 4;
                if (dtcData.length > processedChars) {
                    const remainingData = dtcData.substring(processedChars);
                    // Check for additional complete DTCs (4 chars)
                    for (let i = 0; i < remainingData.length; i += 2) {
                        // If we have at least 2 chars, try to parse as a DTC
                        if (i + 1 < remainingData.length) {
                            const shortCode = remainingData.substring(i, i + 2);
                            // For P-type DTCs with 2 chars (like "13"), use format 0113 (P0113)
                            const additionalDtcHex = `01${shortCode}`;
                            const additionalDtc = hexToDTC(additionalDtcHex);
                            if (additionalDtc) {
                                dtcs.add(additionalDtc);
                                this._log("debug", `Found additional DTC: ${additionalDtc} from hex ${additionalDtcHex}`);
                            }
                        }
                    }
                }
            }
            else {
                // Standard processing in 4-byte chunks for no count byte format
                for (let i = 0; i < dtcData.length; i += 4) {
                    // Make sure we have enough characters for a complete DTC
                    if (i + 3 < dtcData.length) {
                        const dtcHex = dtcData.substring(i, i + 4);
                        // Skip empty or all-zero DTCs
                        if (dtcHex === "0000" || !/^[0-9A-F]{4}$/i.test(dtcHex)) {
                            continue;
                        }
                        const dtc = hexToDTC(dtcHex);
                        if (dtc) {
                            dtcs.add(dtc);
                            this._log("debug", `Found DTC: ${dtc} from hex ${dtcHex}`);
                            this.currentDTCCount++;
                        }
                    }
                }
            }
        }
        const result = Array.from(dtcs);
        this._log("debug", `Discovered DTC count: ${result.length}`);
        return result;
    }
    _decodeDTC(byte1, byte2) {
        try {
            const combinedHex = byte1.padStart(2, '0') + byte2.padStart(2, '0');
            return hexToDTC(combinedHex);
        }
        catch (error) {
            this._log("error", "Failed to decode DTC:", error);
            return null;
        }
    }
    _convertAsciiToBytes(asciiBytes) {
        const bytes = [];
        let currentByte = -1;
        const asciiString = byteArrayToString(asciiBytes);
        this._log("debug", formatMessage("Converting ASCII string:", "", asciiString));
        // First check if this is a hex dump format
        const modeResponseHex = toHexString(this.getModeResponseByte()).toUpperCase();
        if (asciiString.startsWith(modeResponseHex)) {
            let hexDump = asciiString.replace(/[\r\n>]/g, "");
            for (let i = 0; i < hexDump.length; i += 2) {
                if (i + 1 < hexDump.length) {
                    const hexPair = hexDump.substring(i, i + 2);
                    const byteValue = parseInt(hexPair, 16);
                    if (!isNaN(byteValue)) {
                        bytes.push(byteValue);
                    }
                }
            }
            return bytes;
        }
        // Standard ASCII hex processing
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
                bytes.push(currentByte);
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
    _dtcToString(dtc) {
        return dtc; // Already in the correct format from hexToDTC
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
