import { IObdPIDDescriptor, IParsedOBDResponse } from "./obdTypes.js";
export declare function parseOBDResponse(hexString: string): IParsedOBDResponse;
export declare function getPIDInfo(pid: string): IObdPIDDescriptor | null;
export declare function getAllPIDs(): IObdPIDDescriptor[];
export { DTCBaseDecoder } from "./DTC/DTCBaseDecoder.js";
export { VinDecoder } from "./VIN/VinDecoder.js";
