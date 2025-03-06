import {
  DTCBaseDecoder,
} from "../index.js";

describe("DTC Decoder", () => {
  describe("DTCBaseDecoder", () => {
    const baseConfig = {
      logPrefix: "TEST",
    };
    test("should decode DTCs from non-CAN mode 03 response with data", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      // From DTC_WITH_DATA_EXAMPLE.txt
      const response = [[52,51,48,48,65,65,65,65,65,65,65,65,65,65,13],[52,51,48,48,65,65,65,65,65,65,65,65,65,65,13],[52,51,48,48,65,65,65,65,65,65,65,65,65,65,13],[52,51,48,48,65,65,65,65,65,65,65,65,65,65,13],[13,62]];
      const result = decoder.decodeDTCs(response);

      console.log({result})
      expect(result).toEqual([]);
    });
  });
});
