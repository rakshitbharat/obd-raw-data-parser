import { DTCObject } from "../dtc.js";
export declare function decodeDTC(byte1: string, byte2: string): DTCObject | null;
export declare function dtcToString(dtc: DTCObject): string | null;
export declare function isValidDTCComponents(type: number, digit2: number, digit3: number, digits45: number): boolean;
export declare function normalizeResponse(bytes: number[]): number[];
export declare function isValidDTCFrame(frame: number[]): boolean;
export declare function handleFrameSequence(frames: number[][]): number[][];
