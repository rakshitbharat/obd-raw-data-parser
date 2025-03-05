import { DTCObject, LogLevel, DTCModes } from '../dtc.js';
export declare abstract class BaseDecoder {
    protected rawDtcObjects: DTCObject[];
    protected expectedDTCCount: number;
    protected currentDTCCount: number;
    protected leftoverByte: string | null;
    protected DTC_MODES: DTCModes;
    constructor();
    reset(): void;
    getRawDTCs(): DTCObject[];
    protected isNoDataResponse(frame: number[]): boolean;
    abstract decodeDTCs(rawResponseBytes: number[][]): string[];
    protected abstract _log(level: LogLevel, ...message: unknown[]): void;
    protected abstract setDTC(dtc: string): void;
    protected abstract getModeResponseByte(): number;
    protected _dtcToString(dtc: DTCObject): string | null;
    protected isValidDTCComponents(type: number, digit2: number, digit3: number, digits45: number): boolean;
    protected toHexString(value: number | null | undefined): string;
    protected _decodeDTC(byte1: string, byte2: string): DTCObject | null;
}
