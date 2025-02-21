import { VinDecoder } from '../VIN/VinDecoder';

describe('VinDecoder', () => {
  describe('decodeVin', () => {
    it('should decode VIN from byte array format', () => {
      const input = [
        [48,49,52,13,48,58,52,57,48,50,48,49,53,55,51,48,52,67,13],
        [49,58,52,65,52,52,51,55,52,53,52,51,51,50,52,55,13],
        [50,58,52,50,51,53,51,56,51,57,51,50,51,55,51,55,13],
        [13,62]
      ];
      const result = VinDecoder.decodeVin(input);
      expect(result).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
      expect(result.length).toBe(17);
    });
    
    it('should handle invalid data gracefully', () => {
      expect(VinDecoder.decodeVin('')).toBe('');
      expect(VinDecoder.decodeVin(null)).toBe('');
      expect(VinDecoder.decodeVin(undefined)).toBe('');
      expect(VinDecoder.decodeVin('invalid-data')).toBe('');
      expect(VinDecoder.decodeVin([])).toBe('');
      expect(VinDecoder.decodeVin([[]])).toBe('');
    });

    it('should reject invalid VIN formats', () => {
      // Too short
      expect(VinDecoder.decodeVin('490201ABCDEF')).toBe('');
      // Invalid characters
      expect(VinDecoder.decodeVin('49020157304I334D544E3236383935')).toBe('');
      // Non-hex characters
      expect(VinDecoder.decodeVin('GHIJKLMNOPQRSTUVW')).toBe('');
    });
  });
});