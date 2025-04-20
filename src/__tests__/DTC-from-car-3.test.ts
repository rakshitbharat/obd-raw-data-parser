import { DTCBaseDecoder } from '../index';

describe('DTC From Car Tests - Additional Patterns', () => {
  const baseConfig = {
    logPrefix: 'TEST',
  };

  test('should handle mode 03 response with repeating patterns', () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: '03',
      troubleCodeType: 'CURRENT',
    });

    // From Raw_CAR.txt - a pattern where same response appears multiple times
    const response = [
      [52, 51, 48, 50, 48, 49, 48, 50, 48, 49, 49, 51, 13],
      [52, 51, 48, 48, 13],
      [13, 62],
    ];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(['P0102', 'P0113']);
  });

  test('should handle longer mode 07 responses', () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: '07',
      troubleCodeType: 'PENDING',
    });

    // From Raw_CAR.txt - a pattern with longer DTC sequence
    const response = [
      [52, 55, 48, 50, 48, 49, 48, 50, 48, 49, 49, 51, 13],
      [52, 55, 48, 48, 13],
      [13, 62],
    ];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(['P0102', 'P0113']);
  });

  test('should handle status responses in mode 0A', () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: '0A',
      troubleCodeType: 'PERMANENT',
    });

    // From Raw_CAR.txt - handling status response pattern
    const response = [
      [52, 65, 48, 50, 48, 53, 57, 70, 48, 50, 57, 57, 13],
      [52, 65, 48, 48, 13],
      [13, 62],
    ];
    const result = decoder.decodeDTCs(response);
    expect(result).toEqual(['P059F', 'P0299']);
  });

  test('should handle consecutive data requests', () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: '03',
      troubleCodeType: 'CURRENT',
    });

    // From Raw_CAR.txt - testing consecutive data requests pattern
    const responses = [
      // First request
      [
        [52, 51, 48, 48, 13],
        [52, 51, 48, 48, 13],
        [13, 62],
      ],
      // Second request
      [
        [52, 51, 48, 50, 48, 50, 57, 57, 48, 53, 57, 70, 13],
        [13, 62],
      ],
      // Third request
      [
        [52, 51, 48, 50, 48, 49, 48, 50, 48, 49, 49, 51, 13],
        [13, 62],
      ],
    ];

    const results = responses.map(response => decoder.decodeDTCs(response));
    expect(results).toEqual([[], ['P0299', 'P059F'], ['P0102', 'P0113']]);
  });

  test('should handle mode changes in sequence', () => {
    const modes = [
      { mode: '03', type: 'CURRENT' },
      { mode: '07', type: 'PENDING' },
      { mode: '0A', type: 'PERMANENT' },
    ];

    const responses = [
      [
        [52, 51, 48, 50, 48, 49, 48, 50, 48, 49, 49, 51, 13],
        [13, 62],
      ], // Mode 03
      [
        [52, 55, 48, 50, 48, 50, 57, 57, 48, 53, 57, 70, 13],
        [13, 62],
      ], // Mode 07
      [
        [52, 65, 48, 50, 48, 53, 57, 70, 48, 50, 57, 57, 13],
        [13, 62],
      ], // Mode 0A
    ];

    const results = modes.map((config, index) => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: config.mode,
        troubleCodeType: config.type,
      });
      return decoder.decodeDTCs(responses[index]);
    });

    expect(results).toEqual([
      ['P0102', 'P0113'],
      ['P0299', 'P059F'],
      ['P059F', 'P0299'],
    ]);
  });
});
