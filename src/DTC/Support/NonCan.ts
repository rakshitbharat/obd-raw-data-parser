import { LogLevel, DTCObject } from '../dtc';
import { BaseDecoder } from './BaseDecoder';

export class NonCanDecoder extends BaseDecoder {
  protected _determineFrameType(frame: number[]): 'colon' | 'no-colon' {
    const colonIndex = frame.indexOf(58);
    return colonIndex !== -1 ? 'colon' : 'no-colon';
  }

  protected _extractBytesFromColonFrame(frame: number[], colonIndex: number): string[] {
    let dataStartIndex = colonIndex + 1;
    while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
      dataStartIndex++;
    }
    return this._extractBytesFromData(frame.slice(dataStartIndex));
  }

  protected _extractBytesFromNoColonFrame(frame: number[]): string[] {
    let dataStartIndex = 0;
    while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
      dataStartIndex++;
    }
    return this._extractBytesFromData(frame.slice(dataStartIndex));
  }

  protected _extractBytesFromData(dataArray: number[]): string[] {
    const bytes: string[] = [];
    let hexString = '';

    for (const byte of dataArray) {
      if (byte < 32 || byte === 32) continue;
      hexString += String.fromCharCode(byte);
    }

    for (let i = 0; i < hexString.length; i += 2) {
      const pair = hexString.substr(i, 2);
      if (pair.length === 2) {
        bytes.push(pair);
      }
    }

    this._log('debug', 'Converted ASCII to bytes:', bytes);
    return bytes;
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    try {
      this.reset();
      const dtcs = new Set<string>();

      for (let frameIndex = 0; frameIndex < rawResponseBytes.length; frameIndex++) {
        const frame = rawResponseBytes[frameIndex];
        if (!Array.isArray(frame) || frame.length === 0) continue;

        const frameType = this._determineFrameType(frame);
        let bytes: string[];

        if (frameType === 'colon') {
          bytes = this._extractBytesFromColonFrame(frame, frame.indexOf(58));
        } else {
          bytes = this._extractBytesFromNoColonFrame(frame);
        }

        if (!bytes || bytes.length === 0) continue;

        if (frameIndex === 0) {
          const modeResponse = parseInt(bytes[0], 16);
          if (modeResponse === this.getModeResponseByte()) {
            bytes = bytes.slice(1);
          }
        }

        for (let i = 0; i < bytes.length; i += 2) {
          if (i + 1 >= bytes.length) {
            this.leftoverByte = bytes[i];
            break;
          }

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
    } catch (error) {
      this._log('error', 'Failed to parse response:', error);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected _log(_level: LogLevel, ..._message: unknown[]): void {
    // Implementation provided by parent
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setDTC(_dtc: string): void {
    // Implementation provided by parent
  }

  protected getModeResponseByte(): number {
    // Implementation provided by parent
    return 0;
  }

  public setModeResponse(modeResponse: number): void {
    Object.defineProperty(this, 'getModeResponseByte', {
      value: () => modeResponse
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected _getDTCInfo(_dtcLevel: string, _dtcMessage: string): Error | undefined {
    return undefined;
  }

  protected _decodeDTC(byte1: string, byte2: string): DTCObject | null {
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
      
      if (!this.isValidDTCComponents(type, digit2, digit3, digits45)) {
        return null;
      }
      return { type, digit2, digit3, digits45 };
    } catch (error) {
      this._log('error', 'DTC decode error:', error);
      return null;
    }
  }
}
