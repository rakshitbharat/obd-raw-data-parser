import { LogLevel } from "../dtc.js";
import { BaseDecoder } from "./BaseDecoder.js";
interface DTCObject {
    type: number;
    digit2: number;
    digit3: number;
    digits45: number;
}
export declare class CanSingleFrame extends BaseDecoder {
    protected leftoverByte: string | null;
    protected expectedDTCCount: number;
    protected currentDTCCount: number;
    protected rawDtcObjects: DTCObject[];
    private modeResponse;
    constructor(modeResponse?: number);
    setModeResponse(response: number): void;
    decodeDTCs(rawResponseBytes: number[][]): string[];
    private _convertAsciiToBytes;
    protected _getNibbleValue(byte: number): number;
    protected _decodeDTC(byte1: string, byte2: string): DTCObject | null;
    protected _dtcToString(dtc: DTCObject): string | null;
    private _isValidDTCComponents;
    protected _log(level: LogLevel, ...message: unknown[]): void;
    reset(): void;
    protected getModeResponseByte(): number;
    protected setDTC(dtc: string): void;
    protected isNoDataResponse(frame: number[]): boolean;
    protected isAllAFrameResponse(frameString: string): boolean;
}
export {};
