import {setVIN} from '@src/store/obdLiveDataSlice/__OBDU';
import {DEMO_DEVICE} from '@src/config/mockBluetoothData';
import {log as logMain} from '@src/utils/logs';

const log = (...args) => {
  if (typeof args[1] === 'string') {
    args[1] = `[VinCommand] ${args[1]}`;
  }
  logMain(...args);
};

class VinCommand {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  static isVinData(obdData) {
    const isVin =
      typeof obdData === 'string' &&
      (obdData.includes('0902') || obdData.includes('490201'));

    log('debug', 'VIN Check:', {
      data: obdData,
      isVinData: isVin,
    });

    return isVin;
  }

  async performCalculations(rawData) {
    log('debug', '>>>>> VIN Calculation Start:', {rawData});

    if (!rawData || typeof rawData !== 'string') {
      log('warn', 'Invalid raw data:', rawData);
      return null;
    }

    if (
      rawData &&
      typeof rawData === 'string' &&
      rawData.includes(DEMO_DEVICE)
    ) {
      return this.performDemoCalculations();
    }

    // Extract all 4902 segments from the concatenated string
    const vinSegments = [];
    let currentIndex = 0;
    while (currentIndex < rawData.length) {
      const segmentStart = rawData.indexOf('4902', currentIndex);
      if (segmentStart === -1) break;

      const nextSegmentStart = rawData.indexOf('4902', segmentStart + 4);
      const segmentEnd =
        nextSegmentStart === -1 ? rawData.length : nextSegmentStart;

      const segment = rawData.substring(segmentStart, segmentEnd);
      if (segment) {
        vinSegments.push(segment);
      }

      currentIndex = segmentEnd;
    }

    log('debug', 'Extracted VIN segments:', vinSegments);

    if (vinSegments.length > 0) {
      let completeVin = '';
      for (const segment of vinSegments) {
        const vinPart = this.extractVinPart(segment);
        if (vinPart) {
          completeVin += vinPart;
        }
      }

      log('debug', 'Assembled VIN:', completeVin);
      if (this.isValidVin(completeVin)) {
        log('info', 'Valid Complete VIN Found:', completeVin);
        setVIN(completeVin);
        return completeVin;
      }
    }

    return null;
  }

  extractVinPart(frame) {
    try {
      // Remove service and PID bytes (4902xx)
      const vinData = frame.substring(6);
      log('debug', 'Extracting VIN part from:', vinData);

      // Convert hex to ASCII
      const asciiPart = this.hexToAscii(vinData);
      log('debug', 'Extracted VIN part:', asciiPart);

      return asciiPart;
    } catch (error) {
      log('error', 'Error extracting VIN part:', error);
      return '';
    }
  }

  hexToAscii(hex) {
    log('debug', 'Converting HEX to ASCII:', hex);
    let ascii = '';
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substring(i, i + 2), 16);
      if (charCode >= 32 && charCode <= 126) {
        // Only printable ASCII
        const char = String.fromCharCode(charCode);
        ascii += char;
      }
    }
    log('debug', 'Final ASCII:', ascii);
    return ascii;
  }

  isValidVin(vin) {
    const isValid = vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
    log('debug', 'VIN Validation:', {
      vin,
      length: vin.length,
      isValid,
    });
    return isValid;
  }

  performDemoCalculations() {
    setVIN('YV1ZW72V1K1012783');
  }

  getATCommand() {
    return '0902';
  }

  getName() {
    return 'VIN';
  }

  // Add retry method
  async retryVinRequest(protocol) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      log('debug', `VIN Request Attempt ${attempt}/${this.maxRetries}`);

      // Send VIN request
      const response = await protocol.sendCommand('0902');

      if (response && !response.includes('NO DATA')) {
        return response;
      }

      log('warn', 'NO DATA received, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }

    log('error', 'Failed to get VIN after all retries');
    return null;
  }
}

export default VinCommand;
