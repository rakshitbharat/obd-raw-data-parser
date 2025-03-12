import {
  DTCBaseDecoder,
} from "../index.js";

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
      const response = [[52,51,48,48,65,65,65,65,65,65,65,65,65,65,13],[52,51,48,48,65,65,65,65,65,65,65,65,65,65,13],[52,51,48,48,65,65,65,65,65,65,65,65,65,65,13],[52,51,48,48,65,65,65,65,65,65,65,65,65,65,13],[13,62]];
      const result = decoder.decodeDTCs(response);

      console.log({result})
      expect(result).toEqual([]);
    });

    test("should handle all zero frames", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      const response = [
        [52,51,48,48,48,48,48,48,48,48,48,48,48,48,13],
        [52,51,48,48,48,48,48,48,48,48,48,48,48,48,13],
        [13,62]
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual([]);
    });

    test("should handle mixed empty and zero frames", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: "07",
        troubleCodeType: "PENDING",
      });

      const response = [
        [52,55,48,48,65,65,65,65,65,65,65,65,65,65,13],
        [52,55,48,48,48,48,48,48,48,48,48,48,48,48,13],
        [13,62]
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual([]);
    });

    test("should handle partial frame with zeros", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: "0A",
        troubleCodeType: "PERMANENT",
      });

      const response = [
        [52,65,48,48,48,48,13],
        [13,62]
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual([]);
    });

    test("should handle empty frame with valid mode byte", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      const response = [
        [52,51,13], // Just the mode byte (43h) and CR
        [13,62]
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual([]);
    });
  });
});
