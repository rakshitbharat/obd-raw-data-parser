import { DTCObject, LogLevel, DTCModes, DTCResult } from "../dtc.js";
import {
  decodeDTC,
  dtcToString,
  isValidDTCFrame,
} from "../utils/dtcDecoder.js";

export abstract class BaseDecoder {
  protected rawDtcObjects: DTCResult[] = [];
  protected expectedDTCCount = 0;
  protected currentDTCCount = 0;
  protected leftoverByte: string | null = null;
  protected DTC_MODES: DTCModes = {
    CURRENT: { RESPONSE: 0x43, DESCRIPTION: "Current DTCs" },
    PENDING: { RESPONSE: 0x47, DESCRIPTION: "Pending DTCs" },
    PERMANENT: { RESPONSE: 0x4a, DESCRIPTION: "Permanent DTCs" },
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

  public getRawDTCs(): DTCResult[] {
    return this.rawDtcObjects;
  }

  protected isNoDataResponse(frame: number[]): boolean {
    if (frame.length >= 7) {
      // Check for "NO DATA" ASCII sequence
      const noDataSequence = [78, 79, 32, 68, 65, 84, 65]; // "NO DATA"
      return noDataSequence.every((byte, index) => frame[index] === byte);
    }
    return false;
  }

  protected validateFrame(frame: number[]): boolean {
    if (this.isNoDataResponse(frame)) return false;
    return isValidDTCFrame(frame);
  }

  protected abstract _decodeDTC(byte1: string, byte2: string): DTCResult | null;
  protected abstract _dtcToString(dtc: DTCResult): string | null;

  // Make these methods available to implementing classes
  protected _defaultDecodeDTC(byte1: string, byte2: string): DTCObject | null {
    return decodeDTC(byte1, byte2);
  }

  protected _defaultDtcToString(dtc: DTCObject): string | null {
    return dtcToString(dtc);
  }

  public abstract decodeDTCs(rawResponseBytes: number[][]): string[];
  protected abstract _log(level: LogLevel, ...message: unknown[]): void;
  protected abstract setDTC(dtc: string): void;
  protected abstract getModeResponseByte(): number;
}
