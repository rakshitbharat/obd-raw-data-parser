import { decToDTC, hexToDTC } from '../DTC/utils/dtcConverter.js';
describe('DTC Converter Tests', () => {
    // Test cases from the Excel sheet examples
    const excelTestCases = [
        { dec: 8253, hex: '203D', expected: 'P203D' },
        { dec: 8260, hex: '2044', expected: 'P2044' },
        { dec: 8285, hex: '205D', expected: 'P205D' },
        { dec: 8426, hex: '20EA', expected: 'P20EA' },
        { dec: 49408, hex: 'C100', expected: 'U0100' },
        { dec: 49434, hex: 'C11A', expected: 'U011A' },
        { dec: 323, hex: '0143', expected: 'P0143' },
        { dec: 406, hex: '0196', expected: 'P0196' },
        { dec: 564, hex: '0234', expected: 'P0234' },
        { dec: 717, hex: '02CD', expected: 'P02CD' },
        { dec: 855, hex: '0357', expected: 'P0357' },
        { dec: 2596, hex: '0A24', expected: 'P0A24' },
        { dec: 408, hex: '0198', expected: 'P0198' },
        { dec: 256, hex: '0100', expected: 'P0100' },
        { dec: 258, hex: '0102', expected: 'P0102' },
        { dec: 263, hex: '0107', expected: 'P0107' },
        { dec: 387, hex: '0183', expected: 'P0183' },
        { dec: 403, hex: '0193', expected: 'P0193' },
        { dec: 1541, hex: '0605', expected: 'P0605' },
        { dec: 5887, hex: '16FF', expected: 'P16FF' }
    ];
    describe('Excel Formula Test Cases', () => {
        test.each(excelTestCases)('decimal $dec (hex $hex) should convert to $expected', ({ dec, hex, expected }) => {
            expect(decToDTC(dec)).toBe(expected);
            expect(hexToDTC(hex)).toBe(expected);
        });
    });
    describe('Category Boundary Tests', () => {
        const categoryTests = [
            { hex: '0000', expected: 'P0000' }, // P category (00)
            { hex: '4000', expected: 'C0000' }, // C category (01)
            { hex: '8000', expected: 'B0000' }, // B category (10)
            { hex: 'C000', expected: 'U0000' } // U category (11)
        ];
        test.each(categoryTests)('hex $hex should map to category in $expected', ({ hex, expected }) => {
            expect(hexToDTC(hex)).toBe(expected);
        });
    });
    describe('Bit Position Tests', () => {
        // Testing specific bit positions as per Excel formula
        // Length: [2,2,4,4,4]
        // Start:  [1,3,7,11,15]
        test('should correctly parse bits at specified positions', () => {
            const testCases = [
                { hex: 'FFFF', expected: 'U3FFF' }, // All bits set
                { hex: '5555', expected: 'C1555' }, // Alternating bits
                { hex: 'AAAA', expected: 'B2AAA' } // Inverse alternating bits
            ];
            testCases.forEach(({ hex, expected }) => {
                expect(hexToDTC(hex)).toBe(expected);
            });
        });
    });
    describe('Edge Cases', () => {
        test('should handle padding for short hex values', () => {
            expect(hexToDTC('1')).toBe('P0001');
            expect(hexToDTC('10')).toBe('P0010');
            expect(hexToDTC('100')).toBe('P0100');
        });
        test('should handle zero values', () => {
            expect(decToDTC(0)).toBe('P0000');
            expect(hexToDTC('0000')).toBe('P0000');
        });
        test('should handle maximum values', () => {
            expect(decToDTC(65535)).toBe('U3FFF');
            expect(hexToDTC('FFFF')).toBe('U3FFF');
        });
    });
});
