type ByteInput = number | number[] | number[][];
type HexString = string;
/**
 * Convert hex string to byte array
 * @param {string} hex - The hex string to convert
 * @returns {number[]} Array of bytes
 */
export declare const hexToBytes: (hex: HexString) => number[];
/**
 * Convert byte array to hex string
 * @param {number[]} bytes - Array of bytes to convert
 * @returns {string} Hex string
 */
export declare const bytesToHex: (bytes: number[]) => HexString;
/**
 * Convert byte array to string using UTF-8 decoding
 * @param {number[] | number | string} bytes - Input to convert
 * @returns {string} Decoded string
 */
export declare const byteArrayToString: (bytes: ByteInput) => string;
/**
 * Get payload from buffer
 * @param {number[]} buffer - Buffer to extract payload from
 * @returns {string} Hex string payload
 */
export declare const getPayLoad: (buffer: number[]) => string;
/**
 * Format number as hex string
 * @param {number} num - Number to format
 * @param {number} width - Padding width
 * @returns {string} Formatted hex string
 */
export declare const toHexString: (num: number, width?: number) => string;
/**
 * Create empty buffer with padding
 * @param {number} size - Size of buffer
 * @param {string} paddingChar - Character to use for padding
 * @returns {string} Padded string
 */
export declare const createEmptyBuffer: (size: number, paddingChar?: string) => string;
/**
 * Validate hex string
 * @param {string} hex - Hex string to validate
 * @returns {boolean} Whether string is valid hex
 */
export declare const isValidHex: (hex: string) => boolean;
/**
 * Calculate checksum
 * @param {number[]} data - Data to calculate checksum for
 * @returns {number} Calculated checksum
 */
export declare const calculateChecksum: (data: number[]) => number;
/**
 * Format message with header and footer
 * @param {string} message - Message to format
 * @param {string} header - Header to prepend
 * @param {string} footer - Footer to append
 * @returns {string} Formatted message
 */
export declare const formatMessage: (message: string, header?: string, footer?: string) => string;
/**
 * Parse hex string to number
 * @param {string} hex - Hex string to parse
 * @returns {number} Parsed number
 */
export declare const parseHexInt: (hex: string) => number;
/**
 * Format number as decimal string with padding
 * @param {number} num - Number to format
 * @param {number} width - Padding width
 * @returns {string} Formatted decimal string
 */
export declare const toDecString: (num: number, width?: number) => string;
/**
 * Decode value to string using UTF-8 decoding
 * @param {number[] | number} value - Value to decode
 * @returns {string} Decoded string
 */
export declare const decodeValue: (value: number[] | number) => string;
/**
 * Convert hex string to decimal value
 * @param {string} hex - Hex string to convert
 * @returns {number} Decimal value
 */
export declare const convertPIDHexToValue: (hex: string) => number;
/**
 * Convert voltage hex value to actual voltage
 * @param {string} hex - Hex string to convert
 * @returns {number} Voltage value
 */
export declare const convertVoltageHexToValue: (hex: string) => number;
/**
 * Extract value from OBD response
 * @param {string} command - OBD command
 * @param {string} response - OBD response
 * @returns {string} Extracted value
 */
export declare const getValueFromResponse: (command: string, response: string) => string;
/**
 * Get unsigned integer from hex string
 * @param {string} hex - Hex string to parse
 * @returns {number} Unsigned integer value
 */
export declare const getUnsignedInt: (hex: string) => number;
/**
 * Round number to 2 decimal places
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
export declare const fixed: (num: number) => number;
export {};
