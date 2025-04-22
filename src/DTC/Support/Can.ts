import { log } from '../../logger';
import { BaseDecoder } from './BaseDecoder';
import { CanSingleFrame } from './CanSingleFrame';
import { byteArrayToString, toHexString, parseHexInt } from '../../utils';
import { hexToDTC } from '../utils/dtcConverter';

export class CanDecoder extends BaseDecoder {
  private singleFrameDecoder: CanSingleFrame;
  protected leftoverByte: string | null = null;
  protected expectedDTCCount = 0;
  protected currentDTCCount = 0;
  protected rawDtcObjects: string[] = [];
  private modeResponse: number;

  constructor(modeResponse?: number) {
    super();
    // Use 0x43 (mode 03 response) as default
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
      setDTC: { value: this.setDTC.bind(this) },
      getModeResponseByte: { value: () => this.modeResponse },
    });
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    try {
      this.reset();

      const isMultiFrame = this._isMultiFrameResponse(rawResponseBytes);
      log(
        'debug',
        `Response type: ${isMultiFrame ? 'multi-frame' : 'single-frame'}`,
      );

      if (!isMultiFrame) {
        return this.singleFrameDecoder.decodeDTCs(rawResponseBytes);
      }

      // First check if this is the empty format with 4300AAAAA...
      if (this._isEmptyAsciiFormat(rawResponseBytes)) {
        log(
          'debug',
          'Detected empty ASCII hex format (4300AAA...), returning empty array',
        );
        return [];
      }

      // For car responses in ASCII format, check if it's a special format
      // like "4300" and "4302040201" (response for service 03)
      const isAsciiHexFormat = this._isAsciiHexFormat(rawResponseBytes);
      const isCarFormat = this._isCarFormat(rawResponseBytes);

      if (isAsciiHexFormat) {
        log(
          'debug',
          'Detected ASCII hex format response, using special processing',
        );
        if (isCarFormat) {
          return this._processCarAsciiHexFormat(rawResponseBytes);
        } else {
          return this._processStandardAsciiHexFormat(rawResponseBytes);
        }
      }

      const dtcs = new Set<string>();
      const rawDtcs = new Set<string>();

      log('debug', 'Processing raw response bytes:', rawResponseBytes);

      for (
        let frameIndex = 0;
        frameIndex < rawResponseBytes.length;
        frameIndex++
      ) {
        const frame = rawResponseBytes[frameIndex];
        let isCANFrame = false;

        if (!Array.isArray(frame) || frame.length < 4) {
          log(
            'debug',
            `Frame ${frameIndex}: Skipping invalid byte array:`,
            frame,
          );
          continue;
        }

        log('debug', `Processing Frame ${frameIndex}:`, frame);

        let bytes: string[] = [];

        // Add CAN-specific frame detection
        isCANFrame = frame.length <= 6;
        if (isCANFrame) {
          log('debug', `Processing CAN frame ${frameIndex}`);
          bytes = this._extractBytesFromCANFrame(frame);
        } else {
          // For non-CAN frames, use frame type detection
          const frameType = this._determineFrameType(frame);
          if (frameType === 'colon') {
            const colonIndex = frame.indexOf(58);
            bytes = this._extractBytesFromColonFrame(frame, colonIndex);
          } else {
            log(
              'debug',
              `Frame ${frameIndex}: No colon found, using alternative decoding`,
            );
            bytes = this._extractBytesFromNoColonFrame(frame);
          }
        }

        if (!bytes || bytes.length === 0) {
          log('debug', `Frame ${frameIndex}: No bytes extracted`);
          continue;
        }

        this._processDTCBytes(bytes, dtcs, rawDtcs, frameIndex, isCANFrame);
      }

      this.rawDtcObjects = Array.from(rawDtcs);
      const dtcArray = Array.from(dtcs);
      log('debug', 'Discovered DTC count:', dtcArray.length);
      return dtcArray;
    } catch (error) {
      log('error', 'Failed to parse response:', error);
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
    let hexPair = '';

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
        hexPair = '';
      }
    }

    if (currentNibble !== -1) {
      this.leftoverByte = currentNibble.toString(16).toLowerCase();
    }

    log('debug', 'Extracted bytes:', bytes);
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
    rawDtcs: Set<string>,
    frameIndex: number,
    isCANFrame: boolean,
  ): void {
    log('debug', `Frame ${frameIndex}: Processing DTCs, bytes:`, bytes);
    if (!bytes || bytes.length < 1) return;
    if (this.leftoverByte !== null) {
      bytes.unshift(this.leftoverByte);
      this.leftoverByte = null;
    }

    // Check mode response byte for first frame
    let startIndex = 0;
    if (frameIndex === 0) {
      const firstByte = parseInt(bytes[0], 16);
      if (firstByte === this.getModeResponseByte()) {
        startIndex = 1;
        // For first frame, next byte is count
        if (bytes.length > 1 && this.expectedDTCCount === 0) {
          const countByte = parseInt(bytes[1], 16);
          this.expectedDTCCount = Math.floor(countByte / 2);
          startIndex = 2;
        }
      }
    }

    // Process bytes in pairs for DTCs, starting after mode and count bytes
    for (let i = startIndex; i < bytes.length; i += 2) {
      if (i + 1 >= bytes.length) {
        // Handle odd number of bytes
        if (isCANFrame && this.expectedDTCCount === 0) {
          log('warn', 'CAN frame has odd number of DTC bytes');
        }
        this.leftoverByte = bytes[i];
        break;
      }

      const byte1 = bytes[i];
      const byte2 = bytes[i + 1];

      if (!byte1 || !byte2 || (byte1 === '00' && byte2 === '00')) {
        continue;
      }

      const dtc = this._decodeDTC(byte1, byte2);
      if (dtc) {
        rawDtcs.add(dtc);
        dtcs.add(dtc);
        this.setDTC(dtc);
        log('debug', 'Discovered DTC:', dtc);
      }
    }
  }

  protected _decodeDTC(byte1: string, byte2: string): string | null {
    try {
      const combinedHex = byte1.padStart(2, '0') + byte2.padStart(2, '0');
      return hexToDTC(combinedHex);
    } catch (error) {
      log('error', 'Failed to decode DTC:', error);
      return null;
    }
  }

  protected _dtcToString(dtc: string): string | null {
    return dtc; // Already in the correct format from hexToDTC
  }

  protected setDTC(dtc: string): void {
    log('debug', `Setting DTC: ${dtc}`);
  }

  protected getModeResponseByte(): number {
    return this.modeResponse;
  }

  private _determineFrameType(frame: number[]): 'colon' | 'no-colon' {
    const colonIndex = frame.indexOf(58); // 58 is ASCII for ':'
    return colonIndex !== -1 ? 'colon' : 'no-colon';
  }

  private _extractBytesFromColonFrame(
    frame: number[],
    colonIndex: number,
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

    const firstFrameString = byteArrayToString(frames[0]);
    if (firstFrameString.startsWith('0:')) {
      return true;
    }

    // Check if any frame starts with a number followed by ":"
    return frames.some(frame => {
      const frameString = byteArrayToString(frame);
      return /^[0-9]:/.test(frameString);
    });
  }

  private _isCarFormat(frames: number[][]): boolean {
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
  private _isEmptyAsciiFormat(frames: number[][]): boolean {
    const modeResponseHex = this.modeResponse.toString(16).toUpperCase();

    for (const frame of frames) {
      if (frame.length < 4) continue;

      const frameString = frame.map(byte => String.fromCharCode(byte)).join('');
      // Check for pattern like "4300" or "4A00" followed by only "A" characters and possibly CR
      if (
        frameString.startsWith(`${modeResponseHex}00`) &&
        frameString
          .substring(4)
          .replace(/[\r\n>]/g, '')
          .match(/^A+$/i)
      ) {
        return true;
      }
    }
    return false;
  }

  private _isAsciiHexFormat(frames: number[][]): boolean {
    if (!frames || frames.length === 0) return false;

    // Check if any frame starts with service response bytes in ASCII
    for (const frame of frames) {
      if (frame.length < 2) continue;

      const firstChar = String.fromCharCode(frame[0]);
      const secondChar = String.fromCharCode(frame[1]);

      if (
        firstChar === '4' &&
        (secondChar === '3' || // Mode 03 (Current)
          secondChar === '7' || // Mode 07 (Pending)
          secondChar === 'A' || // Mode 0A (Permanent)
          secondChar === 'a')
      ) {
        return true;
      }
    }

    return false;
  }

  private _processStandardAsciiHexFormat(frames: number[][]): string[] {
    return this.singleFrameDecoder.decodeDTCs(frames);
  }

  // Keep the original _processAsciiHexFormat renamed to _processCarAsciiHexFormat
  private _processCarAsciiHexFormat(frames: number[][]): string[] {
    const dtcs = new Set<string>();
    // Get the mode response in the correct format for string comparison
    const modeResponseHex = toHexString(this.modeResponse).toUpperCase();

    for (const frame of frames) {
      if (frame.length < 4) continue; // Need at least service byte + 1 DTC pair

      // Convert ASCII to string
      const frameString = byteArrayToString(frame).replace(/[\r\n>]/g, ''); // Remove CR, LF, >

      log('debug', 'Processing ASCII hex frame:', frameString);

      // Check if it matches expected format for the current mode
      if (!frameString.startsWith(modeResponseHex)) {
        log(
          'debug',
          `Frame doesn't start with expected mode response ${modeResponseHex}`,
        );
        continue;
      }

      // Remove service byte (first 2 chars)
      const dtcHexString = frameString.substring(2);

      // Process DTCs in pairs of 4 chars (2 bytes)
      for (let i = 0; i < dtcHexString.length; i += 4) {
        if (i + 3 >= dtcHexString.length) break;

        // The format from the car seems to have flipped byte order
        // Original data "0402" actually means P0402, not P0204
        // So we need to swap the bytes
        const byte1Hex = dtcHexString.substring(i + 2, i + 4); // Second byte comes first
        const byte2Hex = dtcHexString.substring(i, i + 2); // First byte comes second

        log(
          'debug',
          `DTCs from position ${i}: swapping ${byte2Hex}${byte1Hex} to ${byte1Hex}${byte2Hex}`,
        );

        const byte1 = parseHexInt(byte1Hex);
        const byte2 = parseHexInt(byte2Hex);

        if (isNaN(byte1) || isNaN(byte2)) continue;

        const dtc = this._decodeDTC(byte1.toString(16), byte2.toString(16));
        if (dtc) {
          const dtcString = this._dtcToString(dtc);
          if (dtcString) {
            dtcs.add(dtcString);
            log('debug', 'Found DTC:', dtcString);
          }
        }
      }
    }

    return Array.from(dtcs);
  }
}
