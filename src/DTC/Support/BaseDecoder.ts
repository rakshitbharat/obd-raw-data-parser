import { DTCObject, LogLevel, DTCModes } from '../dtc';

export abstract class BaseDecoder {
  protected rawDtcObjects: DTCObject[] = [];
  protected expectedDTCCount = 0;
  protected currentDTCCount = 0;
  protected leftoverByte: string | null = null;
  protected DTC_MODES: DTCModes = {
    CURRENT: { RESPONSE: 0x43, DESCRIPTION: 'Current DTCs' },
    PENDING: { RESPONSE: 0x47, DESCRIPTION: 'Pending DTCs' },
    PERMANENT: { RESPONSE: 0x4A, DESCRIPTION: 'Permanent DTCs' }
  };

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.rawDtcObjects = [];
    this.expectedDTCCount = 0;
    this.currentDTCCount = 0;
    this.leftoverByte = null;
  }

  public getRawDTCs(): DTCObject[] {
    return this.rawDtcObjects;
  }

  public abstract decodeDTCs(rawResponseBytes: number[][]): string[];
  protected abstract _log(level: LogLevel, ...message: unknown[]): void;
  protected abstract setDTC(dtc: string): void;
  protected abstract getModeResponseByte(): number;

  protected _dtcToString(dtc: DTCObject): string | null {
    try {
      if (!dtc || typeof dtc !== 'object') return null;

      const typeIndex = dtc.type;
      const digit2 = dtc.digit2;
      const digit3 = dtc.digit3;
      const digits45 = dtc.digits45;

      if (!this.isValidDTCComponents(typeIndex, digit2, digit3, digits45)) {
        return null;
      }

      const types: string[] = ['P', 'C', 'B', 'U'];
      const typeChar: string = types[typeIndex];

      const digit3Hex: string = digit3.toString(16).toUpperCase();
      const digits45Hex: string = digits45.toString(16).padStart(2, '0').toUpperCase();

      return `${typeChar}${digit2}${digit3Hex}${digits45Hex}`;
    } catch (error) {
      this._log('error', 'DTC string conversion error:', error);
      return null;
    }
  }

  protected isValidDTCComponents(
    type: number,
    digit2: number,
    digit3: number,
    digits45: number
  ): boolean {
    const validations = [
      { value: type, max: 3, name: 'type' },
      { value: digit2, max: 3, name: 'digit2' },
      { value: digit3, max: 15, name: 'digit3' },
      { value: digits45, max: 255, name: 'digits45' },
    ];

    return validations.every(({ value, max, name }) => {
      const valid = value >= 0 && value <= max;
      if (!valid) {
        this._log('debug', `Invalid ${name} value: ${value}, max allowed: ${max}`);
      }
      return valid;
    });
  }

  protected toHexString(value: number | null | undefined): string {
    try {
      if (value === null || value === undefined) return 'null';
      return '0x' + value.toString(16).padStart(2, '0').toUpperCase();
    } catch {
      return 'invalid';
    }
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

      this._log('debug', 'Raw DTC values:', {
        byte1: this.toHexString(b1),
        byte2: this.toHexString(b2),
        extracted: {
          type: this.toHexString(type),
          digit2: this.toHexString(digit2),
          digit3: this.toHexString(digit3),
          digits45: this.toHexString(digits45),
        },
      });

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