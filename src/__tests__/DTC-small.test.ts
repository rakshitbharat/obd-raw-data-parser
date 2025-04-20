/* eslint-disable */

// @ts-ignore
 
import obdResponses from "../data/obd_responses.json" with { type: "json" };
import { DTCBaseDecoder } from "../index.js";

// Create decoders for different modes
const mode03Decoder = new DTCBaseDecoder({
  logPrefix: "MODE03",
  isCan: true,
  serviceMode: "03",
  troubleCodeType: "CURRENT",
});

const mode07Decoder = new DTCBaseDecoder({
  logPrefix: "MODE07",
  isCan: true,
  serviceMode: "07",
  troubleCodeType: "PENDING",
});

const mode0ADecoder = new DTCBaseDecoder({
  logPrefix: "MODE0A",
  isCan: true,
  serviceMode: "0A",
  troubleCodeType: "PERMANENT",
});

const mode03CANDecoder = new DTCBaseDecoder({
  logPrefix: "MODE03-CAN",
  isCan: true,
  serviceMode: "03",
  troubleCodeType: "CURRENT",
});
test('should decode single frame Mode 07 Pending DTCs', () => {
  const result = mode07Decoder.decodeDTCs([
    [52, 55, 48, 49, 48, 49, 13],
    [13, 62]
  ]);
  // The input is "470101" which represents a P0101 DTC in mode 07
  expect(result).toEqual(['P0101']);
});


describe('DTC Small Tests - Single Frame', () => {
  test('should decode single frame Mode 03 Current DTCs', () => {
    const result = mode03Decoder.decodeDTCs([
      [52, 51, 48, 49, 48, 49, 48, 49, 49, 51, 13],
      [13, 62]
    ]);
    expect(result).toEqual(['P0101', 'P0113']);
  });

  test('should handle NO DATA response for single frame', () => {
    const result = mode03Decoder.decodeDTCs([
      [78, 79, 32, 68, 65, 84, 65, 13],
      [13, 62]
    ]);
    expect(result).toEqual([]);
  });

  test('should handle empty DTCs in single frame', () => {
    const result = mode03Decoder.decodeDTCs([
      [52, 51, 48, 48, 48, 48, 13],
      [13, 62]
    ]);
    expect(result).toEqual([]);
  });

  test('should decode single U-type DTC', () => {
    const result = mode03Decoder.decodeDTCs([
      [52, 51, 68, 49, 52, 66, 13],
      [13, 62]
    ]);
    expect(result).toEqual(['U114B']);
  });
  
  test('should decode single frame Mode 07 Pending DTCs', () => {
    const result = mode07Decoder.decodeDTCs([
      [52, 55, 48, 49, 48, 49, 13],
      [13, 62]
    ]);
    // The input is "470101" which represents a P0101 DTC in mode 07
    expect(result).toEqual(['P0101']);
  });
});

describe('DTC Small Tests - CAN Single Frame', () => {
  test('should decode CAN single frame Mode 03 Current DTCs', () => {
    const result = mode03CANDecoder.decodeDTCs([
      [48, 49, 48, 13, 48, 58, 52, 51, 48, 55, 48, 49, 13],
      [13, 62]
    ]);
    expect(result).toEqual(['P0701']);
  });

  test('should handle NO DATA in CAN format', () => {
    const result = mode03CANDecoder.decodeDTCs([
      [78, 79, 32, 68, 65, 84, 65, 13],
      [13, 62]
    ]);
    expect(result).toEqual([]);
  });

  test('should handle empty DTCs in CAN format', () => {
    const result = mode03CANDecoder.decodeDTCs([
      [48, 49, 48, 13, 48, 58, 52, 51, 48, 48, 48, 48, 13],
      [13, 62]
    ]);
    expect(result).toEqual([]);
  });
});

// Function to demonstrate parsing
function demonstrateDTCParsing() {
  console.log("=== DTC Parsing Demonstration ===\n");

  // Parse Mode 03 responses
  console.log("Mode 03 Responses:");
  (obdResponses as any)["03"].forEach((response: number[][], index: number) => {
    console.log(`Response ${index + 1}:`);
    console.log(mode03Decoder.decodeDTCs(response));
    console.log();
  });

  // Parse Mode 07 responses
  console.log("Mode 07 Responses:");
  (obdResponses as any)["07"].forEach((response: number[][], index: number) => {
    console.log(`Response ${index + 1}:`);
    console.log(mode07Decoder.decodeDTCs(response));
    console.log();
  });

  // Parse Mode 0A responses
  console.log("Mode 0A Responses:");
  (obdResponses as any)["0A"].forEach((response: number[][], index: number) => {
    console.log(`Response ${index + 1}:`);
    console.log(mode0ADecoder.decodeDTCs(response));
    console.log();
  });
}

// Run the demonstration
demonstrateDTCParsing();
