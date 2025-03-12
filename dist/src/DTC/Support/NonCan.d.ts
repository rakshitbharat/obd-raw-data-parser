import { LogLevel } from "../dtc.js";
import { BaseDecoder } from "./BaseDecoder.js";
export declare class NonCanDecoder extends BaseDecoder {
    protected _determineFrameType(frame: number[]): "colon" | "no-colon";
    protected _extractBytesFromColonFrame(frame: number[], colonIndex: number): string[];
    protected _extractBytesFromNoColonFrame(frame: number[]): string[];
    protected _extractBytesFromData(dataArray: number[]): string[];
    decodeDTCs(rawResponseBytes: number[][]): string[];
    protected _log(_level: LogLevel, ..._message: unknown[]): void;
    protected setDTC(_dtc: string): void;
    protected getModeResponseByte(): number;
    setModeResponse(modeResponse: number): void;
    protected _getDTCInfo(_dtcLevel: string, _dtcMessage: string): Error | undefined;
    protected _decodeDTC(byte1: string, byte2: string): string | null;
    protected _dtcToString(dtc: string): string | null;
}
