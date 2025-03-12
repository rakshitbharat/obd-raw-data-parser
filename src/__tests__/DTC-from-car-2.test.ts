import { DTCBaseDecoder } from "../index.js";

describe("DTC From Car Tests - Part 2", () => {
  const baseConfig = {
    logPrefix: "TEST",
  };

  test("should handle empty response in mode 03", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "03",
      troubleCodeType: "CURRENT",
    });

    const response = [[52,51,48,48,13],[52,51,48,48,13],[13,62]];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual([]);
  });

  test("should decode DTCs in mode 0A", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "0A",
      troubleCodeType: "PERMANENT",
    });

    const response = [[52,65,48,50,48,53,57,70,48,50,57,57,13],[52,65,48,48,13],[13,62]];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual([
      "P059F",
      "P0299"
    ]);
  });

  test("should decode DTCs in mode 07", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "07",
      troubleCodeType: "PENDING",
    });

    const response = [[52,55,48,50,48,50,57,57,48,53,57,70,13],[13,62]];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual([
      "P0299",
      "P059F"
    ]);
  });
});
