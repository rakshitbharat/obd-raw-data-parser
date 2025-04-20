const DTC_CATEGORIES = {
  0: 'P',
  1: 'C',
  2: 'B',
  3: 'U',
};

function extractBits(binary: string, start: number, length: number): string {
  return binary.substring(start - 1, start - 1 + length);
}

export function hexToDTC(hexValue: string): string {
  // Normalize hex input to 4 characters
  hexValue = hexValue.padStart(4, '0').toUpperCase();

  // Convert to 16-bit binary
  const fullBinary = parseInt(hexValue, 16).toString(2).padStart(16, '0');

  // Extract bits according to the correct positions:
  // First 2 bits: category (00=P, 01=C, 10=B, 11=U)
  // Next 2 bits: first digit
  // Remaining 12 bits: split into three 4-bit groups
  const categoryBits = extractBits(fullBinary, 1, 2);
  const firstDigitBits = extractBits(fullBinary, 3, 2);
  const secondDigitBits = extractBits(fullBinary, 5, 4);
  const thirdDigitBits = extractBits(fullBinary, 9, 4);
  const fourthDigitBits = extractBits(fullBinary, 13, 4);

  // Convert category
  const category =
    DTC_CATEGORIES[parseInt(categoryBits, 2) as keyof typeof DTC_CATEGORIES];

  // Convert digits
  const firstDigit = parseInt(firstDigitBits, 2).toString(16).toUpperCase();
  const secondDigit = parseInt(secondDigitBits, 2).toString(16).toUpperCase();
  const thirdDigit = parseInt(thirdDigitBits, 2).toString(16).toUpperCase();
  const fourthDigit = parseInt(fourthDigitBits, 2).toString(16).toUpperCase();

  return `${category}${firstDigit}${secondDigit}${thirdDigit}${fourthDigit}`;
}

export function decToDTC(decValue: number): string {
  const hexValue = decValue.toString(16).padStart(4, '0').toUpperCase();
  return hexToDTC(hexValue);
}
