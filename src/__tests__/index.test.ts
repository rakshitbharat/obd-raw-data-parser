import { parseOBDResponse, getPIDInfo, getAllPIDs } from '../index';

describe('OBD Parser', () => {
  describe('parseOBDResponse', () => {
    it('should parse vehicle speed correctly', () => {
      const response = parseOBDResponse('41 0D 32');
      expect(response).toEqual({
        mode: '41',
        pid: '0D',
        name: 'vss',
        unit: 'km/h',
        value: 50 // hex 32 = decimal 50
      });
    });

    it('should parse engine RPM correctly', () => {
      const response = parseOBDResponse('41 0C 1A F8');
      expect(response).toEqual({
        mode: '41',
        pid: '0C',
        name: 'rpm',
        unit: 'rev/min',
        value: 1726 // (1A F8) = 6904 / 4 = 1726 RPM
      });
    });

    it('should handle NO DATA response', () => {
      const response = parseOBDResponse('NO DATA');
      expect(response).toEqual({
        value: 'NO DATA'
      });
    });
  });

  describe('getPIDInfo', () => {
    it('should return correct PID information', () => {
      const pidInfo = getPIDInfo('0C');
      expect(pidInfo).toMatchObject({
        mode: '01',
        pid: '0C',
        name: 'rpm',
        description: 'Engine RPM',
        unit: 'rev/min'
      });
    });

    it('should return null for invalid PID', () => {
      const pidInfo = getPIDInfo('XX');
      expect(pidInfo).toBeNull();
    });
  });

  describe('getAllPIDs', () => {
    it('should return array of all PIDs', () => {
      const pids = getAllPIDs();
      expect(Array.isArray(pids)).toBeTruthy();
      expect(pids.length).toBeGreaterThan(0);
    });
  });
});
