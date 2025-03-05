import {
  DTCBaseDecoder
  } from "../index.js";

  const baseConfig = {
    logPrefix: "TEST",
  };

test("should decode multiple DTCs from CAN format mode 07", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "07",
      troubleCodeType: "PENDING",
    });

    // From BASIC.txt CAN format
    const response = [
      [
        48, 49, 48, 13, 48, 58, 52, 55, 48, 55, 48, 49, 48, 49, 48, 49, 49,
        51, 13,
      ],
      [49, 58, 68, 49, 52, 66, 68, 49, 53, 66, 68, 49, 53, 69, 68, 49, 13],
      [50, 58, 54, 52, 69, 50, 50, 50, 48, 48, 48, 48, 48, 48, 48, 48, 13],
      [51, 58, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 13],
      [13, 62],
    ];
    const result = decoder.decodeDTCs(response);
    console.log("Raw response:", response);
    console.log("Decoded result:", result);
    expect(result).toEqual([
      "P0101",
      "P0113",
      "U114B",
      "U115B",
      "U115E",
      "U1164",
      "U2222",
    ]);
  });

  test("should decode multiple DTCs from CAN format mode 0A", () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: "0A",
      troubleCodeType: "PERMANENT",
    });

    // From BASIC.txt CAN format
    const response = [
      [
        48, 49, 48, 13, 48, 58, 52, 65, 48, 55, 48, 49, 48, 49, 48, 49, 49,
        51, 13,
      ],
      [49, 58, 68, 49, 52, 66, 68, 49, 53, 66, 68, 49, 53, 69, 68, 49, 13],
      [50, 58, 54, 52, 69, 50, 50, 50, 48, 48, 48, 48, 48, 48, 48, 48, 13],
      [51, 58, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 13],
      [13, 62],
    ];
    const result = decoder.decodeDTCs(response);
    console.log("Raw response:", response);
    console.log("Decoded result:", result);
    expect(result).toEqual([
      "P0101",
      "P0113",
      "U114B",
      "U115B",
      "U115E",
      "U1164",
      "U2222",
    ]);
  });