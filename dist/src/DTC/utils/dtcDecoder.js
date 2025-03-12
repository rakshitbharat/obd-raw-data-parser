import { toHexString, parseHexInt } from "../../utils.js";
export function decodeDTC(byte1, byte2) {
    try {
        const b1 = parseHexInt(byte1);
        const b2 = parseHexInt(byte2);
        if (isNaN(b1) || isNaN(b2) || (b1 === 0 && b2 === 0)) {
            return null;
        }
        // Try standard format first
        const type = (b1 >> 6) & 0x03;
        const digit2 = (b1 >> 4) & 0x03;
        const digit3 = b1 & 0x0f;
        const digits45 = b2;
        if (isValidDTCComponents(type, digit2, digit3, digits45)) {
            return { type, digit2, digit3, digits45 };
        }
        // Try car format (swapped bytes)
        const swappedType = (b2 >> 6) & 0x03;
        const swappedDigit2 = (b2 >> 4) & 0x03;
        const swappedDigit3 = b2 & 0x0f;
        const swappedDigits45 = b1;
        if (isValidDTCComponents(swappedType, swappedDigit2, swappedDigit3, swappedDigits45)) {
            return {
                type: swappedType,
                digit2: swappedDigit2,
                digit3: swappedDigit3,
                digits45: swappedDigits45
            };
        }
        return null;
    }
    catch {
        return null;
    }
}
export function dtcToString(dtc) {
    try {
        if (!dtc || typeof dtc !== "object")
            return null;
        const { type: typeIndex, digit2, digit3, digits45 } = dtc;
        if (!isValidDTCComponents(typeIndex, digit2, digit3, digits45)) {
            return null;
        }
        const types = ["P", "C", "B", "U"];
        const typeChar = types[typeIndex];
        const digit3Hex = toHexString(digit3, 1).toUpperCase();
        const digits45Hex = toHexString(digits45, 2).toUpperCase();
        return `${typeChar}${digit2}${digit3Hex}${digits45Hex}`;
    }
    catch {
        return null;
    }
}
export function isValidDTCComponents(type, digit2, digit3, digits45) {
    const validations = [
        { value: type, max: 3 },
        { value: digit2, max: 3 },
        { value: digit3, max: 15 },
        { value: digits45, max: 255 },
    ];
    return validations.every(({ value, max }) => value >= 0 && value <= max);
}
export function normalizeResponse(bytes) {
    // Remove common terminators (CR, LF, >)
    return bytes.filter((b) => ![13, 10, 62].includes(b));
}
export function isValidDTCFrame(frame) {
    if (!frame || frame.length < 2)
        return false;
    // Check for mode response bytes (0x43, 0x47, 0x4A)
    const validModeResponses = [0x43, 0x47, 0x4a];
    return validModeResponses.includes(frame[0]);
}
// Add new function to handle frame sequence interruptions
export function handleFrameSequence(frames) {
    if (!frames || frames.length === 0)
        return frames;
    return frames
        .filter((frame) => frame && frame.length > 0)
        .map((frame) => normalizeResponse(frame))
        .filter((frame) => {
        // Filter out invalid frames and keep sequence
        const isValid = isValidDTCFrame(frame) ||
            frame.some((byte) => byte >= 0x30 && byte <= 0x39); // Check for sequence numbers
        return isValid;
    });
}
