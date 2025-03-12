import { DTCBaseDecoder } from "../index.js";

describe("DTC From Car Tests - Complete", () => {
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

  test("should handle empty response in mode 07", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "07",
      troubleCodeType: "PENDING",
    });

    const response = [[52,55,48,48,13],[52,55,48,48,13],[13,62]];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual([]);
  });

  test("should handle empty response in mode 0A", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "0A",
      troubleCodeType: "PERMANENT",
    });

    const response = [[52,65,48,48,13],[52,65,48,48,13],[13,62]];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual([]);
  });

  test("should decode multiple DTCs in mode 03", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "03",
      troubleCodeType: "CURRENT",
    });

    const response = [[52,51,48,50,48,49,48,50,48,49,49,51,13],[13,62]];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(["P0102", "P0113"]);
  });

  test("should decode multiple DTCs in mode 07", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "07",
      troubleCodeType: "PENDING",
    });

    const response = [[52,55,48,50,48,50,57,57,48,53,57,70,13],[13,62]];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(["P0299", "P059F"]);
  });

  test("should decode multiple DTCs in mode 0A", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "0A",
      troubleCodeType: "PERMANENT",
    });

    const response = [[52,65,48,50,48,53,57,70,48,50,57,57,13],[13,62]];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(["P059F", "P0299"]);
  });

  test("should handle complex response with mixed empty and DTC frames in mode 03", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "03",
      troubleCodeType: "CURRENT",
    });

    const response = [
      [52,51,48,48,13],
      [52,51,48,50,48,50,57,57,48,53,57,70,13],
      [13,62]
    ];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(["P0299", "P059F"]);
  });

  test("should handle complex response with mixed empty and DTC frames in mode 07", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "07",
      troubleCodeType: "PENDING",
    });

    const response = [
      [52,55,48,48,13],
      [52,55,48,50,48,50,57,57,48,53,57,70,13],
      [13,62]
    ];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(["P0299", "P059F"]);
  });

  test("should handle complex response with mixed empty and DTC frames in mode 0A", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "0A",
      troubleCodeType: "PERMANENT",
    });

    const response = [
      [52,65,48,50,48,53,57,70,48,50,57,57,13],
      [52,65,48,48,13],
      [13,62]
    ];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(["P059F", "P0299"]);
  });
});
