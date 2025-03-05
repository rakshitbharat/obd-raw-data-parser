import { LogLevel } from "../dtc.js";
import { BaseDecoder } from "./BaseDecoder.js";
import { CanSingleFrame } from "./CanSingleFrame.js";

// Add DTCObject interface at the top
interface DTCObject {
  type: number;
  digit2: number;
  digit3: number;
  digits45: number;
}

export class CanDecoder extends BaseDecoder {
  private singleFrameDecoder: CanSingleFrame;
  protected leftoverByte: string | null = null;
  protected expectedDTCCount = 0;
  protected currentDTCCount = 0;
  protected rawDtcObjects: DTCObject[] = [];
  private modeResponse: number;

  // Define a list of invalid DTC bytes as a class property
  private static readonly invalidDTCBytes = [0x07, 0x0A, 0x47, 0x4A];

  constructor(modeResponse?: number) {
    super();
    this.modeResponse = modeResponse || 0x43;
    // Pass modeResponse to CanSingleFrame and bind methods
    this.singleFrameDecoder = new CanSingleFrame(this.modeResponse);
    this.bindMethodsToSingleFrameDecoder();
  }

  public setModeResponse(response: number): void {
    this.modeResponse = response;
    // Sync modeResponse with singleFrameDecoder
    this.singleFrameDecoder.setModeResponse(response);
  }

  private bindMethodsToSingleFrameDecoder(): void {
    // Bind necessary methods and properties from CanDecoder to CanSingleFrame
    Object.defineProperties(this.singleFrameDecoder, {
      _log: { value: this._log.bind(this) },
      setDTC: { value: this.setDTC.bind(this) },
      getModeResponseByte: { value: () => this.modeResponse }
    });
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    try {
      this.reset();
      const isMultiFrame = this._isMultiFrameResponse(rawResponseBytes);
      this._log("debug", `Response type: ${isMultiFrame ? "multi-frame" : "single-frame"}`);

      if (!isMultiFrame) {
        // Update singleFrameDecoder's state before processing
        this.singleFrameDecoder.setModeResponse(this.modeResponse);
        return this.singleFrameDecoder.decodeDTCs(rawResponseBytes);
      }

      const dtcs = new Set<string>();
      const rawDtcs = new Set<DTCObject>();

      this._log("debug", "Processing raw response bytes:", rawResponseBytes);

      for (let frameIndex = 0; frameIndex < rawResponseBytes.length; frameIndex++) {
        const frame = rawResponseBytes[frameIndex];
        let isCANFrame = false;

        if (!Array.isArray(frame) || frame.length < 4) {
          this._log("debug", `Frame ${frameIndex}: Skipping invalid byte array:`, frame);
          continue;
        }

        this._log("debug", `Processing Frame ${frameIndex}:`, frame);

        let bytes: string[] = [];

        // Add CAN-specific frame detection
        isCANFrame = frame.length <= 6;
        if (isCANFrame) {
          this._log("debug", `Processing CAN frame ${frameIndex}`);
          bytes = this._extractBytesFromCANFrame(frame);
        } else {
          // For non-CAN frames, use frame type detection
          const frameType = this._determineFrameType(frame);
          if (frameType === "colon") {
            const colonIndex = frame.indexOf(58);
            bytes = this._extractBytesFromColonFrame(frame, colonIndex);
          } else {
            this._log(
              "debug",
              `Frame ${frameIndex}: No colon found, using alternative decoding`
            );
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
    } catch (error) {
      this._log("error", "Failed to parse response:", error);
      return [];
    }
  }

  public reset(): void {
    this.rawDtcObjects = [];
    this.expectedDTCCount = 0;
    this.currentDTCCount = 0;
    this.leftoverByte = null;
  }

  private _extractBytesFromCANFrame(frame: number[]): string[] {
    const dataBytes = frame.slice(2);
    return this._extractBytesFromData(dataBytes);
  }

  private _extractBytesFromData(dataArray: number[]): string[] {
    const bytes: string[] = [];
    let currentNibble = -1;
    let hexPair = "";

    for (const byte of dataArray) {
      if (byte === 13) break; // CR (carriage return)

      const nibble = this._getNibbleValue(byte);
      if (nibble === -1) continue;

      if (currentNibble === -1) {
        currentNibble = nibble;
        hexPair = nibble.toString(16).toLowerCase();
      } else {
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

  private _getNibbleValue(byte: number): number {
    if (byte >= 48 && byte <= 57) return byte - 48; // '0'-'9'
    if (byte >= 65 && byte <= 70) return byte - 55; // 'A'-'F'
    if (byte >= 97 && byte <= 102) return byte - 87; // 'a'-'f'
    return -1;
  }

  private _processDTCBytes(
    bytes: string[],
    dtcs: Set<string>,
    rawDtcs: Set<DTCObject>,
    frameIndex: number,
    isCANFrame: boolean
  ): void {
    this._log("debug", `Frame ${frameIndex}: Processing DTCs, bytes:`, bytes);
    if (!bytes || bytes.length < 1) return;
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
      if (
        this.expectedDTCCount > 0 &&
        this.currentDTCCount >= this.expectedDTCCount
      ) {
        this._log("debug", "Reached expected DTC count, stopping processing");
        if (i < bytes.length) this.leftoverByte = bytes[i];
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

      const dtc = this._decodeDTC(
        byte1Value.toString(16),
        byte2Value.toString(16)
      );
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

  protected _decodeDTC(byte1: string, byte2: string): DTCObject | null {
    try {
      // Convert string inputs to numbers
      const b1 = this._parseByteValue(byte1);
      const b2 = this._parseByteValue(byte2);

      if (b1 === null || b2 === null) {
        this._log("debug", "Invalid DTC bytes:", { byte1, byte2 });
        return null;
      }

      if (b1 === 0 && b2 === 0) return null;
      if (CanDecoder.invalidDTCBytes.includes(b1)) return null; // Exclude invalid DTC codes

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
    } catch (error) {
      this._log("error", "DTC decode error:", error);
      return null;
    }
  }

  protected _dtcToString(dtc: {
    type: number;
    digit2: number;
    digit3: number;
    digits45: number;
  }): string | null {
    try {
      if (!dtc || typeof dtc !== "object") return null;

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
    } catch (error) {
      this._log("error", "DTC string conversion error:", error);
      return null;
    }
  }

  private _parseByteValue(
    value: number | string | null | undefined
  ): number | null {
    try {
      if (value === null || value === undefined) return null;

      if (typeof value === "number") {
        return value >= 0 && value <= 255 ? value : null;
      }

      if (typeof value === "string") {
        const hexValue = value.replace(/^0x/i, "").toLowerCase();
        if (!/^[0-9a-f]{1,2}$/.test(hexValue)) return null;
        const parsed = parseInt(hexValue, 16);
        return parsed >= 0 && parsed <= 255 ? parsed : null;
      }

      return null;
    } catch {
      return null;
    }
  }

  private _isValidDTCComponents(
    type: number,
    digit2: number,
    digit3: number,
    digits45: number
  ): boolean {
    const validations = [
      { value: type, max: 3, name: "type" },
      { value: digit2, max: 3, name: "digit2" },
      { value: digit3, max: 15, name: "digit3" },
      { value: digits45, max: 255, name: "digits45" },
    ];

    return validations.every(({ value, max, name }) => {
      const valid = value >= 0 && value <= max;
      if (!valid) {
        this._log(
          "debug",
          `Invalid ${name} value: ${value}, max allowed: ${max}`
        );
      }
      return valid;
    });
  }

  private _toHexString(value: number | null | undefined): string {
    try {
      if (value === null || value === undefined) return "null";
      return "0x" + value.toString(16).padStart(2, "0").toUpperCase();
    } catch {
      return "invalid";
    }
  }

  protected _log(level: LogLevel, ...message: unknown[]): void {
    if (false == false) {
      return;
    }
    console.log(`[${level}]`, ...message);
  }

  protected setDTC(dtc: string): void {
    this._log("debug", `Setting DTC: ${dtc}`);
  }

  protected getModeResponseByte(): number {
    return this.modeResponse;
  }

  private _determineFrameType(frame: number[]): "colon" | "no-colon" {
    const colonIndex = frame.indexOf(58); // 58 is ASCII for ':'
    return colonIndex !== -1 ? "colon" : "no-colon";
  }

  private _extractBytesFromColonFrame(
    frame: number[],
    colonIndex: number
  ): string[] {
    let dataStartIndex = colonIndex + 1;
    while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
      dataStartIndex++; // Skip spaces
    }
    return this._extractBytesFromData(frame.slice(dataStartIndex));
  }

  private _extractBytesFromNoColonFrame(frame: number[]): string[] {
    let dataStartIndex = 0;
    while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
      dataStartIndex++; // Skip leading spaces
    }
    return this._extractBytesFromData(frame.slice(dataStartIndex));
  }

  protected parseDTCStatus(statusByte: number): {
    milActive: boolean;
    dtcCount: number;
    currentError: boolean;
    pendingError: boolean;
    confirmedError: boolean;
    egrSystem: boolean;
    oxygenSensor: boolean;
    catalyst: boolean;
  } {
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

  private _isMultiFrameResponse(frames: number[][]): boolean {
    if (!frames || frames.length < 2) return false;

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

  protected _decodeCAN_DTC(byte1: number, byte2: number): DTCObject | null {
    // CAN DTC format: [SAE Standard DTC]
    // Same decoding as regular DTC but without header bytes
    return this._decodeDTC(byte1.toString(16), byte2.toString(16));
  }
}
