import { DTCBaseDecoder } from '../index.js';

describe('DTC Status Tests', () => {
  const baseConfig = {
    logPrefix: 'TEST',
  };

  describe('Status Byte Parsing', () => {
    const decoder = new DTCBaseDecoder({
      ...baseConfig,
      isCan: true,
      serviceMode: '03',
      troubleCodeType: 'CURRENT',
    });

    test('should parse status byte with all flags set', () => {
      const status = decoder.parseDTCStatus(0xff);
      expect(status).toEqual({
        milActive: true,
        dtcCount: 127,
        currentError: true,
        pendingError: true,
        confirmedError: true,
        egrSystem: true,
        oxygenSensor: true,
        catalyst: true,
      });
    });

    test('should parse status byte with no flags set', () => {
      const status = decoder.parseDTCStatus(0x00);
      expect(status).toEqual({
        milActive: false,
        dtcCount: 0,
        currentError: false,
        pendingError: false,
        confirmedError: false,
        egrSystem: false,
        oxygenSensor: false,
        catalyst: false,
      });
    });

    test('should parse status byte with only MIL active', () => {
      const status = decoder.parseDTCStatus(0x80);
      expect(status).toEqual({
        milActive: true,
        dtcCount: 0,
        currentError: false,
        pendingError: false,
        confirmedError: false,
        egrSystem: false,
        oxygenSensor: false,
        catalyst: false,
      });
    });

    test('should parse status byte with DTC count only', () => {
      const status = decoder.parseDTCStatus(0x03);
      expect(status).toEqual({
        milActive: false,
        dtcCount: 3,
        currentError: false,
        pendingError: false,
        confirmedError: false,
        egrSystem: false,
        oxygenSensor: false,
        catalyst: false,
      });
    });

    test('should parse status byte with specific error flags', () => {
      // Set current error and EGR system flags
      const status = decoder.parseDTCStatus(0x24);
      expect(status).toEqual({
        milActive: false,
        dtcCount: 4,
        currentError: true,
        pendingError: false,
        confirmedError: false,
        egrSystem: true,
        oxygenSensor: false,
        catalyst: false,
      });
    });
  });

  describe('Error Response Handling', () => {
    test('should handle service mode errors', () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: 'FF', // Invalid mode
        troubleCodeType: 'CURRENT',
      });

      const response = [
        [
          48, 49, 48, 13, 48, 58, 52, 51, 48, 55, 48, 49, 48, 49, 48, 49, 49,
          51, 13,
        ],
        [13, 62],
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual([]);
    });

    test('should handle error frames', () => {
      const decoder = new DTCBaseDecoder({
        ...baseConfig,
        isCan: true,
        serviceMode: '03',
        troubleCodeType: 'CURRENT',
      });

      const response = [
        // Error frame
        [55, 50, 51, 13], // "7" indicates error
        [13, 62],
      ];
      const result = decoder.decodeDTCs(response);
      expect(result).toEqual([]);
    });
  });
});
