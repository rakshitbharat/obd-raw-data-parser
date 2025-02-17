import { LogLevel } from '../dtc';
import { BaseDecoder } from './BaseDecoder';

export class CanDecoder extends BaseDecoder {
  protected _extractBytesFromCANFrame(frame: number[]): string[] {
    const dataBytes = frame.slice(2);
    return this._extractBytesFromData(dataBytes);
  }

  protected _extractBytesFromData(dataArray: number[]): string[] {
    const bytes: string[] = [];
    let currentNibble = -1;
    let hexPair = '';

    for (const byte of dataArray) {
      if (byte === 13) break;

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

    this._log('debug', 'Extracted bytes:', bytes);
    return bytes;
  }

  protected _getNibbleValue(byte: number): number {
    if (byte >= 48 && byte <= 57) return byte - 48;
    if (byte >= 65 && byte <= 70) return byte - 55;
    if (byte >= 97 && byte <= 102) return byte - 87;
    return -1;
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    const dtcs = new Set<string>();

    for (let frameIndex = 0; frameIndex < rawResponseBytes.length; frameIndex++) {
      const frame = rawResponseBytes[frameIndex];
      
      if (!Array.isArray(frame) || frame.length < 4) {
        this._log('debug', `Frame ${frameIndex}: Invalid byte array:`, frame);
        continue;
      }

      const bytes = this._extractBytesFromCANFrame(frame);
      
      if (!bytes || bytes.length < 2) continue;

      for (let i = 0; i < bytes.length; i += 2) {
        if (i + 1 >= bytes.length) break;

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

  protected _log(_level: LogLevel, ..._message: any[]): void {
    // Implementation provided by parent
  }

  protected setDTC(_dtc: string): void {
    // Implementation provided by parent
  }

  protected getModeResponseByte(): number {
    // Implementation provided by parent
    return 0;
  }
}
