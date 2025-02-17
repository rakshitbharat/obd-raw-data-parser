export class DTCBaseDecoder {
  constructor() {
    this.reset();
  }

  reset() {
    // Only keep DTC-related state
    this.rawDtcObjects = []; // Store raw DTC objects
    this.expectedDTCCount = 0; // Track expected number of DTCs
    this.currentDTCCount = 0; // Track how many DTCs we've processed
    this.leftoverByte = null; // Track leftover byte between frames
  }

  /**
   * Public method to convert DTC object to string format
   * @param {Object} dtc - DTC object with type, digit2, digit3, digits45
   * @returns {string} DTC string in format PXXXX, CXXXX, BXXXX, or UXXXX
   */
  dtcToString(dtc) {
    return this._dtcToString(dtc);
  }

  /**
   * Internal method to convert DTC object to string format
   * @param {Object} dtc - DTC object with type, digit2, digit3, digits45
   * @returns {string} DTC string in format PXXXX, CXXXX, BXXXX, or UXXXX
   */
  _dtcToString(dtc) {
    try {
      if (!dtc || typeof dtc !== 'object') return null;

      // Use already extracted components from DTC object
      const typeIndex = dtc.type;
      const digit2 = dtc.digit2;
      const digit3 = dtc.digit3;
      const digits45 = dtc.digits45;

      // Validate components
      if (!this.isValidDTCComponents(typeIndex, digit2, digit3, digits45)) {
        return null;
      }

      // Map type index to character (P/C/B/U)
      const types = ['P', 'C', 'B', 'U'];
      const typeChar = types[typeIndex];

      // Convert to hexadecimal strings
      const digit3Hex = digit3.toString(16).toUpperCase();
      const digits45Hex = digits45.toString(16).padStart(2, '0').toUpperCase();

      // Construct DTC string in PXXXX format
      return `${typeChar}${digit2}${digit3Hex}${digits45Hex}`;
    } catch (error) {
      this._log('error', 'DTC string conversion error:', error);
      return null;
    }
  }

  /**
   * Get raw DTC objects
   * @returns {Array} Array of raw DTC objects
   */
  getRawDTCs() {
    return this.rawDtcObjects;
  }

  // Extract bytes from raw data array (common processing)
  _extractBytesFromData(dataArray) {
    const bytes = [];
    let currentNibble = -1;
    let hexPair = '';

    for (const byte of dataArray) {
      if (byte === 13) break; // CR (carriage return)

      const nibble = this._getNibbleValue(byte);
      if (nibble === -1) continue;

      if (currentNibble === -1) {
        currentNibble = nibble;
        hexPair = nibble.toString(16).toLowerCase();
      } else {
        hexPair += nibble.toString(16).toLowerCase();
        bytes.push(hexPair);
        currentNibble = -1;
        hexPair = '';
      }
    }

    // Handle leftover nibble
    if (currentNibble !== -1) {
      this.leftoverByte = currentNibble.toString(16).toLowerCase();
    }

    this._log('debug', 'Extracted bytes:', bytes);
    return bytes;
  }

  // Helper method to get nibble value from byte
  _getNibbleValue(byte) {
    if (byte >= 48 && byte <= 57) return byte - 48; // '0'-'9'
    if (byte >= 65 && byte <= 70) return byte - 55; // 'A'-'F'
    if (byte >= 97 && byte <= 102) return byte - 87; // 'a'-'f'
    return -1;
  }

  _processDTCBytes(bytes, dtcs, rawDtcs, frameIndex, isCANFrame) {
    this._log('debug', `Frame ${frameIndex}: Processing DTCs, bytes:`, bytes);

    // Skip if no bytes
    if (!bytes || bytes.length < 1) return;

    // Prepend leftover byte from previous frame if exists
    if (this.leftoverByte !== null) {
      bytes.unshift(this.leftoverByte);
      this.leftoverByte = null;
    }

    // For first frame, get number of DTCs and skip mode response
    if (frameIndex === 0) {
      if (!isCANFrame) {
        // Only do this for non-CAN frames
        const modeResponse = this.getModeResponseByte();
        if (bytes[0] === modeResponse.toString(16)) {
          bytes = bytes.slice(1);

          if (bytes.length > 0 && this.expectedDTCCount === 0) {
            const countByte = parseInt(bytes[0], 16);
            this.expectedDTCCount = Math.floor(countByte / 2);
            bytes = bytes.slice(1);
          }
        }
      }
    }

    // Process bytes in pairs for DTCs
    let i;
    for (i = 0; i < bytes.length; i += 2) {
      // Stop if we've reached the expected count
      if (
        this.expectedDTCCount > 0 &&
        this.currentDTCCount >= this.expectedDTCCount
      ) {
        this._log('debug', 'Reached expected DTC count, stopping processing');
        // Store any leftover byte for next frame
        if (i < bytes.length) this.leftoverByte = bytes[i];
        break;
      }

      // Check if pair is available
      if (i + 1 >= bytes.length) {
        // Special handling for CAN frames with odd bytes
        if (isCANFrame && this.expectedDTCCount === 0) {
          this._log('warn', 'CAN frame has odd number of DTC bytes');
        }
        this.leftoverByte = bytes[i];
        break;
      }

      const byte1 = bytes[i];
      const byte2 = bytes[i + 1];

      // Skip if bytes are invalid or both are zero
      if (!byte1 || !byte2 || (byte1 === '00' && byte2 === '00')) {
        continue;
      }

      // Convert hex strings to numbers
      const byte1Value = parseInt(byte1, 16);
      const byte2Value = parseInt(byte2, 16);

      // Skip if conversion failed
      if (isNaN(byte1Value) || isNaN(byte2Value)) {
        this._log('debug', 'Failed to parse bytes:', {byte1, byte2});
        continue;
      }

      const dtc = this._decodeDTC(byte1Value, byte2Value);
      if (dtc) {
        rawDtcs.add(dtc);
        const dtcString = this._dtcToString(dtc);
        if (dtcString && !dtcs.has(dtcString)) {
          dtcs.add(dtcString);
          // Simply pass through the DTC string to the mode-specific handler
          this.setDTC(dtcString);
          this._log('debug', `Discovered DTC: ${dtcString}`);
        }
      }
    }

    // Clear leftover if all bytes processed
    if (i >= bytes.length) {
      this.leftoverByte = null;
    }
  }

  /**
   * Decode DTCs from raw response bytes
   * @param {Array} rawResponseBytes - Raw response bytes
   * @returns {Array} Array of decoded DTC strings
   */
  decodeDTCs(rawResponseBytes) {
    try {
      // Reset all decoder state before processing new response
      this.reset();
      const dtcs = new Set();
      const rawDtcs = new Set();
      this._log('debug', 'Processing raw response bytes:', rawResponseBytes);

      for (
        let frameIndex = 0;
        frameIndex < rawResponseBytes.length;
        frameIndex++
      ) {
        const frame = rawResponseBytes[frameIndex];
        let isCANFrame = false; // Initialize here

        if (!Array.isArray(frame) || frame.length < 4) {
          this._log(
            'debug',
            `Frame ${frameIndex}: Skipping invalid byte array:`,
            frame,
          );
          continue;
        }

        this._log('debug', `Processing Frame ${frameIndex}:`, frame);

        let bytes = this._extractBytesFromCANFrame(frame);

        if (!bytes || bytes.length === 0) {
          this._log('debug', `Frame ${frameIndex}: No bytes extracted`);
          continue;
        }

        // Add CAN-specific frame detection
        isCANFrame = frame.length <= 6;
        if (isCANFrame) {
          this._log('debug', `Processing CAN frame ${frameIndex}`);
          bytes = this._extractBytesFromCANFrame(frame);
        }

        this._processDTCBytes(bytes, dtcs, rawDtcs, frameIndex, isCANFrame);
      }

      this.rawDtcObjects = Array.from(rawDtcs);
      const dtcArray = Array.from(dtcs);
      this._log('debug', 'Discovered DTC count:', dtcArray.length);
      return dtcArray;
    } catch (error) {
      this._log('error', 'Failed to parse response:', error);
      return [];
    }
  }

  _decodeDTC(byte1, byte2) {
    try {
      // Convert inputs to numbers, handling any format
      const b1 = this.parseByteValue(byte1);
      const b2 = this.parseByteValue(byte2);

      if (b1 === null || b2 === null) {
        this._log('debug', 'Invalid DTC bytes:', {byte1, byte2});
        return null;
      }

      if (b1 === 0 && b2 === 0) return null;

      // Extract DTC components using binary operations
      // First byte format: TTDDNNNN
      // TT: Type (2 bits) - 00=P, 01=C, 10=B, 11=U
      // DD: Digit2 (2 bits) - 0-3
      // NNNN: Digit3 (4 bits) - 0-F
      const type = (b1 >> 6) & 0x03; // Get top 2 bits for type
      const digit2 = (b1 >> 4) & 0x03; // Get next 2 bits for second digit
      const digit3 = b1 & 0x0f; // Get bottom 4 bits for third digit
      const digits45 = b2; // Second byte is digits 4-5

      // Log raw values for debugging
      this._log('debug', 'Raw DTC values:', {
        byte1: this.toHexString(b1),
        byte2: this.toHexString(b2),
        extracted: {
          type: this.toHexString(type),
          digit2: this.toHexString(digit2),
          digit3: this.toHexString(digit3),
          digits45: this.toHexString(digits45),
        },
      });

      if (!this.isValidDTCComponents(type, digit2, digit3, digits45)) {
        return null;
      }

      return {type, digit2, digit3, digits45};
    } catch (error) {
      this._log('error', 'DTC decode error:', error);
      return null;
    }
  }

  // Helper methods for robust value handling
  parseByteValue(value) {
    try {
      if (value === null || value === undefined) return null;

      // If already a number
      if (typeof value === 'number') {
        return value >= 0 && value <= 255 ? value : null;
      }

      // If hex string (with or without 0x prefix)
      if (typeof value === 'string') {
        const hexValue = value.replace(/^0x/i, '').toLowerCase();
        if (!/^[0-9a-f]{1,2}$/.test(hexValue)) return null;
        const parsed = parseInt(hexValue, 16);
        return parsed >= 0 && parsed <= 255 ? parsed : null;
      }

      return null;
    } catch {
      return null;
    }
  }

  isValidDTCComponents(type, digit2, digit3, digits45) {
    // Replicate Java validation ranges
    const validations = [
      {value: type, max: 3, name: 'type'},
      {value: digit2, max: 3, name: 'digit2'},
      {value: digit3, max: 15, name: 'digit3'},
      {value: digits45, max: 255, name: 'digits45'},
    ];

    return validations.every(({value, max, name}) => {
      const valid = value >= 0 && value <= max;
      if (!valid) {
        this._log(
          'debug',
          `Invalid ${name} value: ${value}, max allowed: ${max}`,
        );
      }
      return valid;
    });
  }

  toHexString(value) {
    try {
      if (value === null || value === undefined) return 'null';
      return '0x' + value.toString(16).padStart(2, '0').toUpperCase();
    } catch {
      return 'invalid';
    }
  }

  // Add this new method to handle CAN frames
  _extractBytesFromCANFrame(frame) {
    // CAN frames typically have: [ID1, ID2, DATA...]
    // Skip first 2 bytes (CAN ID) and extract data bytes
    const dataBytes = frame.slice(2);
    return this._extractBytesFromData(dataBytes);
  }
}
