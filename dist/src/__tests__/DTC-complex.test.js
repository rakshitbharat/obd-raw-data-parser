// disable eslint for this file
/* eslint-disable */
import { DTCBaseDecoder } from "../index.js";
describe("DTC Decoder", () => {
    describe("DTCBaseDecoder", () => {
        test("should be defined", () => {
            expect(DTCBaseDecoder).toBeDefined();
        });
    });
});
describe("DTC Complex Tests", () => {
    const baseConfig = {
        logPrefix: "TEST",
    };
    test("should handle DTCs with special byte patterns", () => {
        const decoder = new DTCBaseDecoder({
            ...baseConfig,
            isCan: true,
            serviceMode: "03",
            troubleCodeType: "CURRENT",
        });
        const response = [
            // Frame with DTCs containing boundary values
            [48, 49, 48, 13, 48, 58, 52, 51, 48, 70, 70, 70, 48, 48, 48, 48, 13], // Max values
            [49, 58, 52, 51, 48, 48, 48, 48, 48, 70, 70, 70, 48, 48, 13], // Min values
            [50, 58, 52, 51, 48, 55, 65, 65, 48, 55, 66, 66, 48, 55, 13], // Mixed values
            [13, 62]
        ];
        const result = decoder.decodeDTCs(response);
        // We expect only valid DTCs to be included in the result
        expect(result.length).toBeGreaterThan(0);
        // All DTCs should match the format PXXXX, CXXXX, BXXXX, or UXXXX
        expect(result.every(dtc => /^[PCBU][0-9A-F]{4}$/.test(dtc))).toBe(true);
    });
});
