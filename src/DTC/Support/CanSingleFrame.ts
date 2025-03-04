import { LogLevel } from "../dtc";
import { BaseDecoder } from "./BaseDecoder";

interface DTCObject {
  type: number;
  digit2: number;
  digit3: number;
  digits45: number;
}

export class CanSingleFrame extends BaseDecoder {
  protected leftoverByte: string | null = null;
  protected expectedDTCCount = 0;
  protected currentDTCCount = 0;
  protected rawDtcObjects: DTCObject[] = [];

  constructor() {
    super();
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    try {
      this.reset();
      const dtcs = new Set<string>();
      const rawDtcs = new Set<DTCObject>();

      this._log("debug", "Processing raw response bytes:", rawResponseBytes);

      if (!rawResponseBytes.length || !rawResponseBytes[0].length) {
        return [];
      }

      const frame = rawResponseBytes[0];
      let bytes: string[] = [];

      this._log("debug", `Processing CAN frame`);
      bytes = this._extractBytesFromCANFrame(frame);

      if (!bytes || bytes.length === 0) {
        this._log("debug", "No bytes extracted");
        return [];
      }

      this._processDTCBytes(bytes, dtcs, rawDtcs, 0, true);

      this.rawDtcObjects = Array.from(rawDtcs);
      const dtcArray = Array.from(dtcs);
      this._log("debug", "Discovered DTC count:", dtcArray.length);
      return dtcArray;
    } catch (error) {
      this._log("error", "Failed to parse response:", error);
      return [];
    }
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

  protected _processDTCBytes(
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

    let i;
    for (i = 0; i < bytes.length; i += 2) {
      if (i + 1 >= bytes.length) {
        if (isCANFrame) {
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

  protected _getNibbleValue(byte: number): number {
    if (byte >= 48 && byte <= 57) return byte - 48; // '0'-'9'
    if (byte >= 65 && byte <= 70) return byte - 55; // 'A'-'F'
    if (byte >= 97 && byte <= 102) return byte - 87; // 'a'-'f'
    return -1;
  }

  protected _decodeDTC(byte1: string, byte2: string): DTCObject | null {
    try {
      const b1 = parseInt(byte1, 16);
      const b2 = parseInt(byte2, 16);

      if (isNaN(b1) || isNaN(b2)) {
        this._log("debug", "Invalid DTC bytes:", { byte1, byte2 });
        return null;
      }

      if (b1 === 0 && b2 === 0) return null;

      const type = (b1 >> 6) & 0x03;
      const digit2 = (b1 >> 4) & 0x03;
      const digit3 = b1 & 0x0f;
      const digits45 = b2;

      if (!this._isValidDTCComponents(type, digit2, digit3, digits45)) {
        return null;
      }

      return { type, digit2, digit3, digits45 };
    } catch (error) {
      this._log("error", "DTC decode error:", error);
      return null;
    }
  }

  protected _dtcToString(dtc: DTCObject): string | null {
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

  protected _log(level: LogLevel, ...message: unknown[]): void {
    console.log(`[${level}]`, ...message);
  }

  public reset(): void {
    this.rawDtcObjects = [];
    this.expectedDTCCount = 0;
    this.currentDTCCount = 0;
    this.leftoverByte = null;
  }

  protected getModeResponseByte(): number {
    return 0x43; // Standard mode 3 response for DTCs
  }

  protected setDTC(dtc: string): void {
    this._log("debug", `Setting DTC: ${dtc}`);
  }
}
