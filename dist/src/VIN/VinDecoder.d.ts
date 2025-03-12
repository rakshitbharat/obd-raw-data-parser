export declare class VinDecoder {
    private static readonly VALID_VIN_PATTERN;
    static isVinData(obdData: string): boolean;
    static validateVIN(vin: string): boolean;
    private static cleanHexData;
    private static processHexData;
    static processVINByteArray(byteArray: number[][]): string | null;
    static processVINResponse(response: string): string | null;
    static processVINSegments(rawData: string): string | null;
}
