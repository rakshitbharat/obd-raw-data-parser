import { log } from '../../logger';
import { BaseDecoder } from './BaseDecoder';
import { byteArrayToString, parseHexInt } from '../../utils';
import { hexToDTC } from '../utils/dtcConverter';

export class NonCanDecoder extends BaseDecoder {
  protected _determineFrameType(frame: number[]): 'colon' | 'no-colon' {
    const colonIndex = frame.indexOf(58);
    return colonIndex !== -1 ? 'colon' : 'no-colon';
  }

  protected _extractBytesFromColonFrame(
    frame: number[],
    colonIndex: number,
  ): string[] {
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

    const hexString = byteArrayToString(dataArray).replace(
      // eslint-disable-next-line no-control-regex
      /[\s\x00-\x1F]/g,
      '',
    );

    for (let i = 0; i < hexString.length; i += 2) {
      const pair = hexString.substr(i, 2);
      if (pair.length === 2) {
        bytes.push(pair);
      }
    }

    log('debug', 'Converted ASCII to bytes:', JSON.stringify(bytes));
    return bytes;
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    try {
      this.reset();
      const dtcs = new Set<string>();

      for (
        let frameIndex = 0;
        frameIndex < rawResponseBytes.length;
        frameIndex++
      ) {
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
          const modeResponse = parseHexInt(bytes[0]);
          if (modeResponse === this.getModeResponseByte()) {
            bytes = bytes.slice(1);
          } else if (modeResponse === 0x01 && bytes.length >= 3) {
            // Check for KWP2000 negative response
            const responseCode = parseHexInt(bytes[1]);
            const serviceId = parseHexInt(bytes[2]);
            if (responseCode === 0x7f) {
              log(
                'debug',
                `KWP2000 negative response detected: 7F ${serviceId.toString(16).toUpperCase()}`,
              );
              return [];
            }
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
      log('error', 'Failed to parse response:', String(error));
      return [];
    }
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
      value: () => modeResponse,
    });
  }

  protected _getDTCInfo(): Error | undefined {
    return undefined;
  }

  protected _decodeDTC(byte1: string, byte2: string): string | null {
    try {
      // Skip null, undefined, or "00" bytes
      if (!byte1 || !byte2 || (byte1 === '00' && byte2 === '00')) {
        return null;
      }
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
}
