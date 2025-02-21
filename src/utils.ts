// Type definitions
type ByteInput = number | number[] | number[][];
type HexString = string;

/**
 * Convert hex string to byte array
 * @param {string} hex - The hex string to convert
 * @returns {number[]} Array of bytes
 */
export const hexToBytes = (hex: HexString): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
};

/**
 * Convert byte array to hex string
 * @param {number[]} bytes - Array of bytes to convert
 * @returns {string} Hex string
 */
export const bytesToHex = (bytes: number[]): HexString => {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Convert byte array to string using UTF-8 decoding
 * @param {number[] | number | string} bytes - Input to convert
 * @returns {string} Decoded string
 */
export const byteArrayToString = (bytes: ByteInput): string => {
  try {
    // Handle null/undefined/empty cases
    if (!bytes) return '';

    // If it's already a string, return as is
    if (typeof bytes === 'string') return bytes;

    // If it's a number, convert to single byte array
    if (typeof bytes === 'number') return decodeValue([bytes]);

    // If it's not an array at all, try to stringify
    if (!Array.isArray(bytes)) return String(bytes);

    // If empty array
    if (bytes.length === 0) return '';

    // Handle nested arrays of any depth
    const flatten = (arr: any[]): number[] => {
      return arr.reduce((flat: number[], item: any) => {
        return flat.concat(Array.isArray(item) ? flatten(item) : item);
      }, []);
    };

    // Flatten and decode
    const flattened = flatten(bytes);
    return decodeValue(flattened);
  } catch (error) {
    console.error('[ECUDecoder] Error in byteArrayToString:', error);
    return '';
  }
};

/**
 * Get payload from buffer
 * @param {number[]} buffer - Buffer to extract payload from
 * @returns {string} Hex string payload
 */
export const getPayLoad = (buffer: number[]): string => {
  if (!buffer || buffer.length < 2) return '';
  return bytesToHex(buffer.slice(2));
};

/**
 * Format number as hex string
 * @param {number} num - Number to format
 * @param {number} width - Padding width
 * @returns {string} Formatted hex string
 */
export const toHexString = (num: number, width = 2): string => {
  return num.toString(16).toUpperCase().padStart(width, '0');
};

/**
 * Create empty buffer with padding
 * @param {number} size - Size of buffer
 * @param {string} paddingChar - Character to use for padding
 * @returns {string} Padded string
 */
export const createEmptyBuffer = (size: number, paddingChar = '0'): string => {
  return paddingChar.repeat(size);
};

/**
 * Validate hex string
 * @param {string} hex - Hex string to validate
 * @returns {boolean} Whether string is valid hex
 */
export const isValidHex = (hex: string): boolean => {
  return /^[0-9A-Fa-f]+$/.test(hex);
};

/**
 * Calculate checksum
 * @param {number[]} data - Data to calculate checksum for
 * @returns {number} Calculated checksum
 */
export const calculateChecksum = (data: number[]): number => {
  return data.reduce((acc, val) => acc ^ val, 0);
};

/**
 * Format message with header and footer
 * @param {string} message - Message to format
 * @param {string} header - Header to prepend
 * @param {string} footer - Footer to append
 * @returns {string} Formatted message
 */
export const formatMessage = (message: string, header = '', footer = ''): string => {
  return `${header}${message}${footer}`;
};

/**
 * Parse hex string to number
 * @param {string} hex - Hex string to parse
 * @returns {number} Parsed number
 */
export const parseHexInt = (hex: string): number => {
  return parseInt(hex, 16);
};

/**
 * Format number as decimal string with padding
 * @param {number} num - Number to format
 * @param {number} width - Padding width
 * @returns {string} Formatted decimal string
 */
export const toDecString = (num: number, width = 0): string => {
  return num.toString().padStart(width, '0');
};

/**
 * Decode value to string using UTF-8 decoding
 * @param {number[] | number} value - Value to decode
 * @returns {string} Decoded string
 */
export const decodeValue = (value: number[] | number): string => {
  if (!value) return '';
  try {
    const textDecoder = new TextDecoder('utf-8');
    return textDecoder.decode(new Uint8Array(Array.isArray(value) ? value : [value]));
  } catch (error) {
    console.error('[ECUDecoder] Error decoding value:', error);
    return '';
  }
};

/**
 * Convert hex string to decimal value
 * @param {string} hex - Hex string to convert
 * @returns {number} Decimal value
 */
export const convertPIDHexToValue = (hex: string): number => {
  const value = parseInt(hex, 16);
  return isNaN(value) ? 0 : value;
};

/**
 * Convert voltage hex value to actual voltage
 * @param {string} hex - Hex string to convert
 * @returns {number} Voltage value
 */
export const convertVoltageHexToValue = (hex: string): number => {
  const value = parseInt(hex, 16) / 1000;
  return fixed(value);
};

/**
 * Extract value from OBD response
 * @param {string} command - OBD command
 * @param {string} response - OBD response
 * @returns {string} Extracted value
 */
export const getValueFromResponse = (command: string, response: string): string => {
  if (!command || !response) return '';
  // Response processing logic would go here
  return response.replace(command, '').trim();
};

/**
 * Get unsigned integer from hex string
 * @param {string} hex - Hex string to parse
 * @returns {number} Unsigned integer value
 */
export const getUnsignedInt = (hex: string): number => {
  const value = parseInt(hex, 16);
  return isNaN(value) ? 0 : value >>> 0;
};

/**
 * Round number to 2 decimal places
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
export const fixed = (num: number): number => {
  return Math.round(num * 100) / 100;
};