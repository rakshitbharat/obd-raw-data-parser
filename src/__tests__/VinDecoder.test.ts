import { VinDecoder } from '../VIN/VinDecoder';

describe('VinDecoder', () => {
  describe('VIN processing', () => {
    it('should process VIN from byte array format correctly', () => {
      const input = '014\r0:49020157304C\r1:4A443745433247\r2:42353839323737\r\r>';
      const result = VinDecoder.processVINResponse(input);
      expect(result).toBe('W0LJD7EC2GB589277');
    });

    it('should process VIN segments correctly', () => {
      const input = '49020157304C4A443745433247423538393237373E';
      const result = VinDecoder.processVINSegments(input);
      expect(result).toBe('W0LJD7EC2GB589277');
    });
    
    it('should handle invalid data gracefully', () => {
      expect(VinDecoder.processVINResponse('')).toBeNull();
      expect(VinDecoder.processVINSegments('')).toBeNull();
      expect(VinDecoder.processVINResponse('invalid-data')).toBeNull();
    });

    it('should reject invalid VIN formats', () => {
      // Too short
      expect(VinDecoder.processVINResponse('490201ABCDEF')).toBeNull();
      // Invalid characters
      expect(VinDecoder.processVINResponse('49020157304I334D544E3236383935')).toBeNull();
      // Non-hex characters
      expect(VinDecoder.processVINResponse('GHIJKLMNOPQRSTUVW')).toBeNull();
    });

    it('should handle multiple response formats', () => {
      const multiFormatInputs = [
        '014\r0:49020157304C\r1:4A443745433247\r2:42353839323737\r\r>',
        '49020157304C4A443745433247423538393237373E'
      ];

      multiFormatInputs.forEach(input => {
        const result = VinDecoder.processVINResponse(input) || VinDecoder.processVINSegments(input);
        expect(result).toBe('W0LJD7EC2GB589277');
      });
    });

    it('should properly validate VIN data format', () => {
      expect(VinDecoder.isVinData('0902')).toBe(true);
      expect(VinDecoder.isVinData('490201')).toBe(true);
      expect(VinDecoder.isVinData('someotherdata')).toBe(false);
    });

    it('should process VIN from specific byte array format correctly', () => {
      const byteArrayInput = [
        [48,49,52,13,48,58,52,57,48,50,48,49,53,55,51,48,52,67,13],
        [49,58,52,65,52,52,51,55,52,53,52,51,51,50,52,55,13],
        [50,58,52,50,51,53,51,56,51,57,51,50,51,55,51,55,13],
        [13,62]
      ];
      const result = VinDecoder.processVINByteArray(byteArrayInput);
      expect(result).toBe('W0LJD7EC2GB589277');
    });
  });
});