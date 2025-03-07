import { DTCBaseDecoder } from "../index.js";

describe("DTC Basic Parsing Tests", () => {
  const baseConfig = {
    logPrefix: "TEST",
  };

  test("should correctly decode P0101 and P0402 from raw response", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: false, // This appears to be a non-CAN format
      serviceMode: "03",
      troubleCodeType: "CURRENT",
    });

    // Original raw data: [[52,51,48,48,13],[52,51,48,50,48,52,48,50,48,49,48,49,13],[13,62]]
    const response = [[52,51,48,48,13],[52,51,48,50,48,52,48,50,48,49,48,49,13],[13,62]];

    const result = decoder.decodeDTCs(response);
    
    // The decoder may find additional codes, but we specifically want to verify
    // that P0402 and P0101 are present
    expect(result).toEqual(expect.arrayContaining(["P0402", "P0101"]));
  });
});