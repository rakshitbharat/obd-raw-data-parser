import { LogLevel } from "../dtc.js";
import { BaseDecoder } from "./BaseDecoder.js";
interface DTCObject {
    type: number;
    digit2: number;
    digit3: number;
    digits45: number;
}
export declare class CanDecoder extends BaseDecoder {
    private singleFrameDecoder;
    protected leftoverByte: string | null;
    protected expectedDTCCount: number;
    protected currentDTCCount: number;
    protected rawDtcObjects: DTCObject[];
    private modeResponse;
    private static readonly invalidDTCBytes;
    constructor(modeResponse?: number);
    setModeResponse(response: number): void;
    private bindMethodsToSingleFrameDecoder;
    decodeDTCs(rawResponseBytes: number[][]): string[];
    reset(): void;
    private _extractBytesFromCANFrame;
    private _extractBytesFromData;
    private _getNibbleValue;
    private _processDTCBytes;
    protected _decodeDTC(byte1: string, byte2: string): DTCObject | null;
    protected _dtcToString(dtc: {
        type: number;
        digit2: number;
        digit3: number;
        digits45: number;
    }): string | null;
    private _parseByteValue;
    private _isValidDTCComponents;
    private _toHexString;
    protected _log(level: LogLevel, ...message: unknown[]): void;
    protected setDTC(dtc: string): void;
    protected getModeResponseByte(): number;
    private _determineFrameType;
    private _extractBytesFromColonFrame;
    private _extractBytesFromNoColonFrame;
    protected parseDTCStatus(statusByte: number): {
        milActive: boolean;
        dtcCount: number;
        currentError: boolean;
        pendingError: boolean;
        confirmedError: boolean;
        egrSystem: boolean;
        oxygenSensor: boolean;
        catalyst: boolean;
    };
    private _isMultiFrameResponse;
    private _isAsciiHexFormat;
    private _isCarFormat;
    private _isEmptyAsciiFormat;
    private _processCarAsciiHexFormat;
    private _processStandardAsciiHexFormat;
    protected _decodeCAN_DTC(byte1: number, byte2: number): DTCObject | null;
}
export {};
