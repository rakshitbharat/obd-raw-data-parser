import { DTCBaseDecoder } from "../index.js";

describe("DTC Multi-Frame Tests", () => {
  const baseConfig = {
    logPrefix: "TEST",
  };

  describe("Multi-Frame Parsing", () => {
    test("should handle split DTCs across frames", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      const response = [
        // First frame with partial DTC
        [48,49,48,13,48,58,52,51,48,55,48,49,13],
        // Second frame with rest of the DTC
        [49,58,48,49,48,49,49,51,13],
        [13,62]
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual(["P0101", "P0113"]);
    });

    test("should handle leftover bytes between frames", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: "07",
        troubleCodeType: "PENDING",
      });

      const response = [
        // First frame with odd number of bytes
        [48,49,48,13,48,58,52,55,48,55,48,49,48,49,48,49,13],
        // Second frame should handle leftover byte
        [49,58,49,51,68,49,52,66,68,49,53,66,13],
        [13,62]
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual(["P0101", "P0113", "U114B", "U115B"]);
    });

    test("should handle frame sequence interruptions", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      const response = [
        // Start of sequence
        [48,49,48,13,48,58,52,51,48,55,48,49,48,49,48,49,49,51,13],
        // Interrupting NO DATA frame
        [78,79,32,68,65,84,65,13],
        // Continue sequence
        [49,58,68,49,52,66,68,49,53,66,68,49,53,69,68,49,13],
        [13,62]
      ];
      const result = decoder.decodeDTCs(response);
      // Should ignore NO DATA frame and continue processing
      expect(result).toEqual([
        "P0101", "P0113",
        "U114B", "U115B", "U115E"
      ]);
    });
  });
});