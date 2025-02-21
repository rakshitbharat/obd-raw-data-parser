// Type definitions
type ByteInput = number | number[] | number[][];
type HexString = string;

/**
 * Converts hex string to byte array
 */
export const hexToBytes = (hex: HexString): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
};

/**
 * Converts byte array to hex string
 */
export const bytesToHex = (bytes: number[]): HexString => {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Converts byte array or number to string
 */
export const byteArrayToString = (bytes: ByteInput): string => {
  try {
    if (!bytes) return '';
    if (typeof bytes === 'string') return bytes;
    if (typeof bytes === 'number') return String.fromCharCode(bytes);
    if (!Array.isArray(bytes)) return String(bytes);
    
    // Handle OBD frame format
    if (Array.isArray(bytes[0])) {
      // First, join all frames
      const allBytes = (bytes as number[][]).reduce((acc: number[], frame) => {
        // Remove frame number prefix and other control chars
        const cleanFrame = frame.filter(byte => byte >= 32 && byte <= 126);
        return [...acc, ...cleanFrame];
      }, []);

      // Convert to string
      return allBytes
        .map(byte => String.fromCharCode(byte))
        .join('')
        .replace(/\d+:/g, ''); // Remove frame numbers
    }

    // Handle single array of bytes
    return (bytes as number[])
      .filter(byte => byte >= 32 && byte <= 126)
      .map(byte => String.fromCharCode(byte))
      .join('');
  } catch (error) {
    console.error('Error in byteArrayToString:', error);
    return '';
  }
};