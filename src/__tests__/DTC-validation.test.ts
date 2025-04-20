import { DTCBaseDecoder } from '../index';

describe('DTC Validation Tests', () => {
  const baseConfig = {
    logPrefix: 'TEST',
  };

  describe('Service Mode Validation', () => {
    test('should validate all supported service modes', () => {
      const modes = ['03', '07', '0A'] as const;
      // Define the type for the modeResponses to ensure type safety
      const modeResponses: Record<(typeof modes)[number], number[][]> = {
        '03': [[52, 51, 48, 49, 48, 49, 13]], // 430101 - Mode 03 response with P0101
        '07': [[52, 55, 48, 49, 48, 49, 13]], // 470101 - Mode 07 response with P0101
        '0A': [[52, 65, 48, 49, 48, 49, 13]], // 4A0101 - Mode 0A response with P0101
      };

      const results = modes.map(mode => {
        const decoder = new DTCBaseDecoder({
          ...baseConfig,
          isCan: true,
          serviceMode: mode,
          troubleCodeType: 'CURRENT',
        });

        // Use the appropriate response format for each mode
        return decoder.decodeDTCs([modeResponses[mode][0], [13, 62]]);
      });

      // All supported modes should decode DTCs
      expect(results.every(r => r.length > 0)).toBe(true);
    });

    test('should reject unsupported service modes', () => {
      const invalidModes = [
        '00',
        '01',
        '02',
        '04',
        '05',
        '06',
        '08',
        '09',
        '0B',
      ];
      const results = invalidModes.map(mode => {
        const decoder = new DTCBaseDecoder({
          ...baseConfig,
          isCan: true,
          serviceMode: mode,
          troubleCodeType: 'CURRENT',
        });

        return decoder.decodeDTCs([
          [
            48, 49, 48, 13, 48, 58, 52, 51, 48, 55, 48, 49, 48, 49, 48, 49, 49,
            51, 13,
          ],
          [13, 62],
        ]);
      });

      // All invalid modes should return empty arrays
      expect(results.every(r => r.length === 0)).toBe(true);
    });
  });
});
