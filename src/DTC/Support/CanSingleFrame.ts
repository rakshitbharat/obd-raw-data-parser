import { LogLevel } from "../dtc.js";
import { BaseDecoder } from "./BaseDecoder.js";
import {
  byteArrayToString,
  toHexString,
  formatMessage,
} from "../../utils.js";
import { hexToDTC } from "../utils/dtcConverter.js";

export class CanSingleFrame extends BaseDecoder {
  protected leftoverByte: string | null = null;
  protected expectedDTCCount = 0;
  protected currentDTCCount = 0;
  protected rawDtcObjects: string[] = [];
  private modeResponse: number;

  constructor(modeResponse?: number) {
    super();
    // Use 0x43 (mode 03 response) as default instead of 0x00
    this.modeResponse = modeResponse || 0x43;
  }

  public setModeResponse(response: number): void {
    this.modeResponse = response;
  }

  public _isAsciiHexFormat(frames: number[][]): boolean {
    if (!frames || frames.length === 0) return false;

    for (const frame of frames) {
      if (frame.length < 2) continue;

      const firstChar = String.fromCharCode(frame[0]);
      const secondChar = String.fromCharCode(frame[1]);

      if (
        firstChar === "4" &&
        (secondChar === "3" || 
         secondChar === "7" || 
         secondChar === "A" || 
         secondChar === "a")
      ) {
        return true;
      }
    }

    return false;
  }

  public _isEmptyAsciiFormat(frames: number[][]): boolean {
    const modeResponseHex = this.modeResponse.toString(16).toUpperCase();

    for (const frame of frames) {
      if (frame.length < 4) continue;

      const frameString = frame
        .map((byte) => String.fromCharCode(byte))
        .join("");
      if (
        frameString.startsWith(`${modeResponseHex}00`) &&
        frameString
          .substring(4)
          .replace(/[\r\n>]/g, "")
          .match(/^A+$/i)
      ) {
        return true;
      }
    }
    return false;
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
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

      const dtcs = new Set<string>();
      const rawDtcs = new Set<string>();

      this._log("debug", "Processing raw response bytes:", rawResponseBytes);

      if (!rawResponseBytes.length || !rawResponseBytes[0].length) {
        return [];
      }

      // Process all frames, not just the first one
      for (const frame of rawResponseBytes) {
        if (!frame.length) continue;

        // Skip common response terminators
        if (frame.length <= 2 && frame.some((b) => b === 13 || b === 10 || b === 62)) {
          continue;
        }

        let bytes: number[] = [];
        const frameString = frame.map((byte) => String.fromCharCode(byte)).join("");

        this._log("debug", "Processing frame as string:", frameString);

        const colonIndex = frameString.indexOf(":");
        
        if (colonIndex !== -1) {
          const dataAfterColon = frameString.substring(colonIndex + 1);
          bytes = [];
          let currentByte = -1;

          for (let i = 0; i < dataAfterColon.length; i++) {
            const nibble = this._getNibbleValue(dataAfterColon.charCodeAt(i));
            if (nibble === -1) continue;

            if (currentByte === -1) {
              currentByte = nibble << 4;
            } else {
              currentByte |= nibble;
              bytes.push(currentByte);
              currentByte = -1;
            }
          }
        } else {
          bytes = this._convertAsciiToBytes(frame);
        }

        this._log("debug", "Converted bytes:", bytes);

        if (bytes.length < 2) continue;

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
        if (startIndex >= bytes.length) continue;

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

            if (byte1 === 0 && byte2 === 0) continue;

            const dtc = this._decodeDTC(
              byte1.toString(16).padStart(2, "0"),
              byte2.toString(16).padStart(2, "0")
            );

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
    } catch (error) {
      this._log("error", "Failed to parse response:", error);
      return [];
    }
  }

  public _processStandardAsciiHexFormat(frames: number[][]): string[] {
    const dtcs = new Set<string>();
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

      // Process DTCs directly without looking for count
      const dtcData = dataAfterMode;
      this._log("debug", `DTC hex data: ${dtcData}`);

      // Process DTCs in chunks of 4 characters
      for (let i = 0; i < dtcData.length; i += 4) {
        // Make sure we have enough characters for a complete DTC
        if (i + 3 < dtcData.length) {
          const dtcHex = dtcData.substring(i, i + 4);
          
          // Skip empty or all-zero DTCs
          if (dtcHex === "0000" || !/^[0-9A-F]{4}$/i.test(dtcHex)) {
            continue;
          }

          const dtc = hexToDTC(dtcData);
          if (dtc) {
            dtcs.add(dtc);
            this._log("debug", `Found DTC: ${dtc}`);
          }
        }
      }
    }

    const result = Array.from(dtcs);
    this._log("debug", `Discovered DTC count: ${result.length}`);
    return result;
  }

  protected _decodeDTC(byte1: string, byte2: string): string | null {
    try {
      const combinedHex = byte1.padStart(2, '0') + byte2.padStart(2, '0');
      return hexToDTC(combinedHex);
    } catch (error) {
      this._log("error", "Failed to decode DTC:", error);
      return null;
    }
  }

  private _convertAsciiToBytes(asciiBytes: number[]): number[] {
    const bytes: number[] = [];
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
      if (ascii === 13) continue; // Skip CR

      const nibble = this._getNibbleValue(ascii);
      if (nibble === -1) continue;

      if (currentByte === -1) {
        currentByte = nibble << 4;
      } else {
        currentByte |= nibble;
        bytes.push(currentByte);
        currentByte = -1;
      }
    }

    return bytes;
  }

  protected _getNibbleValue(byte: number): number {
    if (byte >= 48 && byte <= 57) return byte - 48; // '0'-'9'
    if (byte >= 65 && byte <= 70) return byte - 55; // 'A'-'F'
    if (byte >= 97 && byte <= 102) return byte - 87; // 'a'-'f'
    return -1;
  }

  protected _dtcToString(dtc: string): string | null {
    return dtc; // Already in the correct format from hexToDTC
  }

  protected _log(level: LogLevel, ...message: unknown[]): void {
    if (false == false) {
      //return;
    }
    console.log(formatMessage(`[${level}]`, "", ""), ...message);
  }

  public reset(): void {
    this.rawDtcObjects = [];
    this.expectedDTCCount = 0;
    this.currentDTCCount = 0;
    this.leftoverByte = null;
  }

  protected getModeResponseByte(): number {
    return this.modeResponse;
  }

  protected setDTC(dtc: string): void {
    this._log("debug", `Setting DTC: ${dtc}`);
  }

  protected isNoDataResponse(frame: number[]): boolean {
    if (frame.length >= 7) {
      // Check for "NO DATA" ASCII sequence
      const noDataString = String.fromCharCode(...frame.slice(0, 7));
      return noDataString === "NO DATA";
    }
    return false;
  }

  protected isAllAFrameResponse(frameString: string): boolean {
    // Remove any carriage returns and line feeds
    const cleanFrame = frameString.replace(/[\r\n]/g, "");
    // Check if all characters are 'A' (case insensitive)
    return /^[Aa]+$/.test(cleanFrame);
  }
}
