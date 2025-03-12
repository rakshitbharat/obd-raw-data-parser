import { DTCObject } from "./dtc.js";
import { DecoderConfig, DTCStatus } from "./dtc.js";
export declare class DTCBaseDecoder {
    private readonly decoder;
    private readonly serviceMode;
    private readonly troubleCodeType;
    private readonly logPrefix;
    constructor(config: DecoderConfig);
    decodeDTCs(rawResponseBytes: number[][]): string[];
    getRawDTCs(): DTCObject[];
    parseDTCStatus(statusByte: number): DTCStatus;
    private getModeResponseByte;
    private validateServiceMode;
    private log;
    private setDTC;
}
