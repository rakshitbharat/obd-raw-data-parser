import { LogLevel } from "../dtc.js";
import { BaseDecoder } from "./BaseDecoder.js";
export declare class CanSingleFrame extends BaseDecoder {
    protected leftoverByte: string | null;
    protected expectedDTCCount: number;
    protected currentDTCCount: number;
    protected rawDtcObjects: string[];
    private modeResponse;
    constructor(modeResponse?: number);
    setModeResponse(response: number): void;
    _isAsciiHexFormat(frames: number[][]): boolean;
    _isEmptyAsciiFormat(frames: number[][]): boolean;
    decodeDTCs(rawResponseBytes: number[][]): string[];
    _processStandardAsciiHexFormat(frames: number[][]): string[];
    protected _decodeDTC(byte1: string, byte2: string): string | null;
    private _convertAsciiToBytes;
    protected _getNibbleValue(byte: number): number;
    protected _dtcToString(dtc: string): string | null;
    protected _log(level: LogLevel, ...message: unknown[]): void;
    reset(): void;
    protected getModeResponseByte(): number;
    protected setDTC(dtc: string): void;
    protected isNoDataResponse(frame: number[]): boolean;
    protected isAllAFrameResponse(frameString: string): boolean;
}
