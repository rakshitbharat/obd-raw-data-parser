export class DTCBaseDecoder {
  constructor() {
    // Add service mode constants
    this.DTC_MODES = {
      CURRENT: {
        RESPONSE: 0x43,
        NAME: 'MODE03',
        DESCRIPTION: 'Current Trouble Codes',
      },
      PENDING: {
        RESPONSE: 0x47,
        NAME: 'MODE07',
        DESCRIPTION: 'Pending Trouble Codes',
      },
      PERMANENT: {
        RESPONSE: 0x4a,
        NAME: 'MODE0A',
        DESCRIPTION: 'Permanent Trouble Codes',
      },
    };
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

  // Add new helper method to determine frame type
  _determineFrameType(frame) {
    const colonIndex = frame.indexOf(58); // 58 is ASCII for ':'
    return colonIndex !== -1 ? 'colon' : 'no-colon';
  }

  // Update existing _extractBytesFromFrame to handle colon frames
  _extractBytesFromColonFrame(frame, colonIndex) {
    let dataStartIndex = colonIndex + 1;
    while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
      dataStartIndex++; // Skip spaces
    }
    return this._extractBytesFromData(frame.slice(dataStartIndex));
  }

  // Add new method to handle no-colon frames
  _extractBytesFromNoColonFrame(frame) {
    let dataStartIndex = 0;
    while (dataStartIndex < frame.length && frame[dataStartIndex] === 32) {
      dataStartIndex++; // Skip leading spaces
    }
    return this._extractBytesFromData(frame.slice(dataStartIndex));
  }

  // Extract bytes from raw data array (common processing)
  _extractBytesFromData(dataArray) {
    const bytes = [];
    let hexString = '';

    // Convert ASCII values to actual characters first
    for (const byte of dataArray) {
      // Skip control characters and spaces
      if (byte < 32 || byte === 32) continue;
      hexString += String.fromCharCode(byte);
    }

    // Now process the clean hex string
    for (let i = 0; i < hexString.length; i += 2) {
      const pair = hexString.substr(i, 2);
      if (pair.length === 2) {
        bytes.push(pair);
      }
    }

    this._log('debug', 'Converted ASCII to bytes:', bytes);
    return bytes;
  }

  _processDTCBytes(bytes, dtcs, rawDtcs, frameIndex) {
    this._log('debug', `Frame ${frameIndex}: Processing DTCs, bytes:`, bytes);

    if (!bytes || bytes.length < 1) return;

    // Handle leftover byte from previous frame
    if (this.leftoverByte !== null) {
      bytes.unshift(this.leftoverByte);
      this.leftoverByte = null;
    }

    // For first frame, verify mode response
    if (frameIndex === 0) {
      const modeResponse = parseInt(bytes[0], 16);
      const validResponses = [
        this.DTC_MODES.CURRENT.RESPONSE,
        this.DTC_MODES.PENDING.RESPONSE,
        this.DTC_MODES.PERMANENT.RESPONSE,
      ];

      if (!validResponses.includes(modeResponse)) {
        this._log('debug', `Invalid mode response: ${modeResponse}`);
        return;
      }

      // Log which type of DTCs we're processing
      const modeType = Object.entries(this.DTC_MODES).find(
        ([_, mode]) => mode.RESPONSE === modeResponse,
      );
      if (modeType) {
        this._log('debug', `Processing ${modeType[1].DESCRIPTION}`);
      }

      bytes = bytes.slice(1);
    }

    // Process all valid DTC pairs regardless of count
    let i;
    for (i = 0; i < bytes.length; i += 2) {
      // Make sure we have a complete pair
      if (i + 1 >= bytes.length) {
        this.leftoverByte = bytes[i];
        break;
      }

      const byte1 = bytes[i];
      const byte2 = bytes[i + 1];

      // Debug the actual bytes being processed
      this._log('debug', `Processing DTC bytes: ${byte1},${byte2}`);

      // Skip invalid or zero pairs
      if (!byte1 || !byte2 || (byte1 === '00' && byte2 === '00')) {
        continue;
      }

      const dtc = this._decodeDTC(byte1, byte2);
      if (dtc) {
        rawDtcs.add(dtc);
        const dtcString = this._dtcToString(dtc);
        if (dtcString && !dtcs.has(dtcString)) {
          dtcs.add(dtcString);
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
      // Reset counters before starting new decode
      this.expectedDTCCount = 0;
      this.currentDTCCount = 0;

      const dtcs = new Set();
      const rawDtcs = new Set();
      this._log('debug', 'Processing raw response bytes:', rawResponseBytes);

      for (
        let frameIndex = 0;
        frameIndex < rawResponseBytes.length;
        frameIndex++
      ) {
        const frame = rawResponseBytes[frameIndex];
        // CORRECTED: Allow any non-empty array
        if (!Array.isArray(frame) || frame.length === 0) {
          this._log(
            'debug',
            `Frame ${frameIndex}: Skipping invalid byte array:`,
            frame,
          );
          continue;
        }

        this._log('debug', `Processing Frame ${frameIndex}:`, frame);

        // Find the colon that separates frame number from data
        const frameType = this._determineFrameType(frame);
        let bytes;

        if (frameType === 'colon') {
          const colonIndex = frame.indexOf(58);
          bytes = this._extractBytesFromColonFrame(frame, colonIndex);
        } else {
          this._log(
            'debug',
            `Frame ${frameIndex}: No colon found, using alternative decoding`,
          );
          bytes = this._extractBytesFromNoColonFrame(frame);
        }

        if (!bytes || bytes.length === 0) {
          this._log('debug', `Frame ${frameIndex}: No bytes extracted`);
          continue;
        }

        this._processDTCBytes(bytes, dtcs, rawDtcs, frameIndex);
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

  // Add new helper method
  _convertHexStringsToBytes(hexStrings) {
    return hexStrings.map(hex => parseInt(hex, 16));
  }

  _decodeDTC(byte1, byte2) {
    try {
      const b1 = parseInt(byte1, 16);
      const b2 = parseInt(byte2, 16);

      if (isNaN(b1) || isNaN(b2) || (b1 === 0 && b2 === 0)) {
        return null;
      }

      // Extract DTC components
      const type = (b1 >> 6) & 0x03;
      const digit2 = (b1 >> 4) & 0x03;
      const digit3 = b1 & 0x0f;
      const digits45 = b2;

      // Log for debugging
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

      // Validate components
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

  // Add status flag parsing similar to Java status display
  parseDTCStatus(statusByte) {
    return {
      milActive: (statusByte & 0x80) !== 0, // MIL lamp on
      dtcCount: statusByte & 0x7f, // Stored DTC count
      currentError: (statusByte & 0x20) !== 0, // Current error
      pendingError: (statusByte & 0x10) !== 0, // Pending error
      confirmedError: (statusByte & 0x08) !== 0, // Confirmed error
      egrSystem: (statusByte & 0x04) !== 0, // EGR system error
      oxygenSensor: (statusByte & 0x02) !== 0, // Oxygen sensor error
      catalyst: (statusByte & 0x01) !== 0, // Catalyst error
    };
  }
}
