import { DTCBaseDecoder, } from "../index.js";
describe("DTC Decoder", () => {
    describe("DTCBaseDecoder", () => {
        const baseConfig = {
            logPrefix: "TEST",
        };
        test("empty raw data should have empty response", () => {
            const decoder = new DTCBaseDecoder({
                ...baseConfig,
                isCan: true,
                serviceMode: "03",
                troubleCodeType: "CURRENT",
            });
            // From DTC_WITH_DATA_EXAMPLE.txt
            const response = [[52, 51, 48, 48, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 13], [52, 51, 48, 48, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 13], [52, 51, 48, 48, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 13], [52, 51, 48, 48, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 13], [13, 62]];
            const result = decoder.decodeDTCs(response);
            console.log({ result });
            expect(result).toEqual([]);
        });
    });
});
