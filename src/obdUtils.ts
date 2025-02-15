export function checkHex(n: string): boolean {
  return /^[0-9A-Fa-f]{1,64}$/.test(n);
}

export function Hex2Bin(n: string): string {
  if (!checkHex(n)) {
    return '';
  }
  const binary = parseInt(n, 16).toString(2);
  return zeroFill(binary.slice(-4), 4); // Take last 4 bits only
}

function zeroFill(number: string, width: number): string {
  width -= number.length;
  if (width > 0) {
    return '0'.repeat(width) + number;
  }
  return number;
}
