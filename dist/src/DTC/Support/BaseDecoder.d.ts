import { DTCObject, LogLevel, DTCModes, DTCResult } from "../dtc.js";
export declare abstract class BaseDecoder {
    protected rawDtcObjects: DTCResult[];
    protected expectedDTCCount: number;
    protected currentDTCCount: number;
    protected leftoverByte: string | null;
    protected DTC_MODES: DTCModes;
    constructor();
    reset(): void;
    getRawDTCs(): DTCResult[];
    protected isNoDataResponse(frame: number[]): boolean;
    protected validateFrame(frame: number[]): boolean;
    protected abstract _decodeDTC(byte1: string, byte2: string): DTCResult | null;
    protected abstract _dtcToString(dtc: DTCResult): string | null;
    protected _defaultDecodeDTC(byte1: string, byte2: string): DTCObject | null;
    protected _defaultDtcToString(dtc: DTCObject): string | null;
    abstract decodeDTCs(rawResponseBytes: number[][]): string[];
    protected abstract _log(level: LogLevel, ...message: unknown[]): void;
    protected abstract setDTC(dtc: string): void;
    protected abstract getModeResponseByte(): number;
}
