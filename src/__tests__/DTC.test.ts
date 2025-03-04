import {
  DTCBaseDecoder,
} from "../index";

describe("DTC Decoder", () => {
  describe("DTCBaseDecoder", () => {
    const baseConfig = {
      logPrefix: "TEST",
    };

    test("should decode DTCs from non-CAN mode 03 response with data", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      // From DTC_WITH_DATA_EXAMPLE.txt
      const response = [
        [52, 51, 48, 49, 48, 49, 48, 49, 49, 51, 68, 49, 52, 66, 13],
        [13, 62],
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual(["P0101", "P0113", "U114B"]);
    });

    test("should decode DTCs from non-CAN mode 07 response with data", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "07",
        troubleCodeType: "PENDING",
      });

      // From DTC_WITH_DATA_EXAMPLE.txt
      const response = [
        [52, 55, 48, 49, 48, 49, 48, 49, 49, 51, 68, 49, 52, 66, 13],
        [13, 62],
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual(["P0101", "P0113", "U114B"]);
    });

    test("should handle NO DATA response in non-CAN format", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "0A",
        troubleCodeType: "PERMANENT",
      });

      // From DTC_9141_2.txt
      const response = [
        [78, 79, 32, 68, 65, 84, 65, 13],
        [13, 62],
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual([]);
    });

    test("should handle empty DTCs in non-CAN format", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      // From DTC_NO_DATA_EXAMPLE.txt
      const response = [
        [52, 51, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 13],
        [13, 62],
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual([]);
    });

    // test("should decode multiple DTCs from CAN format mode 03", () => {
    //   const decoder = new DTCBaseDecoder({
    //     ...baseConfig,
    //     isCan: true,
    //     serviceMode: "03",
    //     troubleCodeType: "CURRENT",
    //   });

    //   // From BASIC.txt CAN format
    //   const response = [
    //     [
    //       48, 49, 48, 13, 48, 58, 52, 51, 48, 55, 48, 49, 48, 49, 48, 49, 49,
    //       51, 13,
    //     ],
    //     [49, 58, 68, 49, 52, 66, 68, 49, 53, 66, 68, 49, 53, 69, 68, 49, 13],
    //     [50, 58, 54, 52, 69, 50, 50, 50, 48, 48, 48, 48, 48, 48, 48, 48, 13],
    //     [13, 62],
    //   ];
    //   const result = decoder.decodeDTCs(response);
    //   expect(result).toEqual([
    //     "P0101",
    //     "P0113",
    //     "U114B",
    //     "U115B",
    //     "U115E",
    //     "U1164",
    //     "U2222",
    //   ]);
    // });

    // test("should decode multiple DTCs from CAN format mode 07", () => {
    //   const decoder = new DTCBaseDecoder({
    //     ...baseConfig,
    //     isCan: true,
    //     serviceMode: "07",
    //     troubleCodeType: "PENDING",
    //   });

    //   // From BASIC.txt CAN format
    //   const response = [
    //     [
    //       48, 49, 48, 13, 48, 58, 52, 55, 48, 55, 48, 49, 48, 49, 48, 49, 49,
    //       51, 13,
    //     ],
    //     [49, 58, 68, 49, 52, 66, 68, 49, 53, 66, 68, 49, 53, 69, 68, 49, 13],
    //     [50, 58, 54, 52, 69, 50, 50, 50, 48, 48, 48, 48, 48, 48, 48, 48, 13],
    //     [51, 58, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 13],
    //     [13, 62],
    //   ];
    //   const result = decoder.decodeDTCs(response);
    //   expect(result).toEqual([
    //     "P0101",
    //     "P0113",
    //     "U114B",
    //     "U115B",
    //     "U115E",
    //     "U1164",
    //     "U2222",
    //   ]);
    // });

    // test("should decode multiple DTCs from CAN format mode 0A", () => {
    //   const decoder = new DTCBaseDecoder({
    //     ...baseConfig,
    //     isCan: true,
    //     serviceMode: "0A",
    //     troubleCodeType: "PERMANENT",
    //   });

    //   // From BASIC.txt CAN format
    //   const response = [
    //     [
    //       48, 49, 48, 13, 48, 58, 52, 65, 48, 55, 48, 49, 48, 49, 48, 49, 49,
    //       51, 13,
    //     ],
    //     [49, 58, 68, 49, 52, 66, 68, 49, 53, 66, 68, 49, 53, 69, 68, 49, 13],
    //     [50, 58, 54, 52, 69, 50, 50, 50, 48, 48, 48, 48, 48, 48, 48, 48, 13],
    //     [51, 58, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 13],
    //     [13, 62],
    //   ];
    //   const result = decoder.decodeDTCs(response);
    //   expect(result).toEqual([
    //     "P0101",
    //     "P0113",
    //     "U114B",
    //     "U115B",
    //     "U115E",
    //     "U1164",
    //     "U2222",
    //   ]);
    // });

    test("should decode DTCs from non-CAN mode 0A with numeric response", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "0A",
        troubleCodeType: "PERMANENT",
      });

      // From DTC_WITH_DATA_EXAMPLE.txt
      const response = [
        [48, 49, 55, 70, 51, 49, 13],
        [13, 62],
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual(["P017F"]);
    });

    test("should handle sequential commands and responses", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      // Test multiple commands in sequence
      const responses = [
        // Mode 03 response
        [
          [52, 51, 48, 49, 48, 49, 48, 49, 49, 51, 68, 49, 52, 66, 13],
          [13, 62],
        ],
        // Mode 07 response
        [
          [52, 55, 48, 49, 48, 49, 48, 49, 49, 51, 68, 49, 52, 66, 13],
          [13, 62],
        ],
        // Mode 0A response
        [
          [48, 49, 55, 70, 51, 49, 13],
          [13, 62],
        ],
      ];

      const results = responses.map((response) => decoder.decodeDTCs(response));
      expect(results).toEqual([
        ["P0101", "P0113", "U114B"],
        ["C0701", "P0101", "P13D1"],
        ["P017F"],
      ]);
    });

    test("should handle mixed response patterns", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "0A",
        troubleCodeType: "PERMANENT",
      });

      const mixedResponses = [
        // NO DATA response
        [
          [78, 79, 32, 68, 65, 84, 65, 13],
          [13, 62],
        ],
        // Numeric response
        [
          [48, 49, 55, 70, 51, 49, 13],
          [13, 62],
        ],
      ];

      const results = mixedResponses.map((response) =>
        decoder.decodeDTCs(response)
      );
      expect(results).toEqual([[], ["P017F"]]);
    });

    test("should handle responses with termination characters", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      // Test responses with different termination patterns
      const responses = [
        // Response with CR
        [[52, 51, 48, 49, 48, 49, 48, 49, 49, 51, 68, 49, 52, 66, 13], [13]],
        // Response with CR + prompt
        [
          [52, 51, 48, 49, 48, 49, 48, 49, 49, 51, 68, 49, 52, 66, 13],
          [13, 62],
        ],
      ];

      responses.forEach((response) => {
        const result = decoder.decodeDTCs(response);
        expect(result).toEqual(["P0101", "P0113", "U114B"]);
      });
    });

    test("should handle malformed responses", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      const malformedResponses = [
        // Empty response
        [[], []],
        // Incomplete response
        [
          [52, 51],
          [13, 62],
        ],
        // Invalid characters
        [
          [255, 255, 255],
          [13, 62],
        ],
      ];

      malformedResponses.forEach((response) => {
        const result = decoder.decodeDTCs(response);
        expect(result).toEqual([]);
      });
    });

    test("should handle different DTC prefix types", () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: false,
        serviceMode: "03",
        troubleCodeType: "CURRENT",
      });

      // Test responses with different DTC prefixes (P, C, B, U)
      const responses = [
        // P-type DTC
        [
          [52, 51, 48, 49, 48, 49, 13], // P0101
          [13, 62],
        ],
        // U-type DTC
        [
          [52, 51, 68, 49, 52, 66, 13], // U114B
          [13, 62],
        ],
      ];

      const results = responses.map((response) => decoder.decodeDTCs(response));
      expect(results).toEqual([["P0101"], ["U114B"]]);
    });
  });
});
