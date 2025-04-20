import { DEMO_DEVICE } from '@src/config/mockBluetoothData';
import VinCommand from '@src/helper/OBDManagerHelper/Commands/VinCommand';
import {
  setDataStreamingStatus,
  setVIN,
  triggerVINNotFound,
} from '@src/store/obdLiveDataSlice/__OBDU';
import { log as logMain } from '@src/utils/logs';

const log = (...props) => {
  if (typeof props[1] === 'string') {
    props[1] = `[VINRetriever] ${props[1]}`;
  }

  logMain(...props);
};

class VINRetriever {
  static SERVICE_MODE = {
    REQUEST: '0902',
    NAME: 'VIN',
    DESCRIPTION: 'Vehicle Identification Number',
  };

  static _instance = null;

  constructor(ecuDataRetriever = null) {
    if (VINRetriever._instance) {
      if (ecuDataRetriever) {
        VINRetriever._instance.ecuDataRetriever = ecuDataRetriever;
      }

      return VINRetriever._instance;
    }

    this.ecuDataRetriever = ecuDataRetriever;
    this.maxRetries = 3;
    this.retryDelay = 2000;
    VINRetriever._instance = this;
  }

  static getInstance(ecuDataRetriever = null) {
    if (!VINRetriever._instance) {
      new VINRetriever(ecuDataRetriever);
    } else if (ecuDataRetriever) {
      VINRetriever._instance.ecuDataRetriever = ecuDataRetriever;
    }

    return VINRetriever._instance;
  }

  static resetInstance() {
    VINRetriever._instance = null;
  }

  async retrieveDTCs() {
    try {
      log('info', 'Starting VIN retrieval sequence');

      const vinResponse = await this.retryVinRequest();

      if (!vinResponse) {
        log('warn', 'No response from VIN command');
        triggerVINNotFound();

        return null;
      }

      const vin = this.processVINResponse(vinResponse);

      if (!vin) {
        log('warn', 'Failed to process VIN response');
        const vinResponseFromFallBack = new VinCommand().performCalculations(
          vinResponse,
        );

        if (vinResponseFromFallBack) {
          log('info', 'Fallback VIN response:', vinResponseFromFallBack);

          // we dont need to call setVIN here because internally it will call setVIN
          return vinResponseFromFallBack;
        }

        log('error', 'No valid VIN found, triggering fallback');
        triggerVINNotFound();

        return null;
      }

      log('info', `Successfully retrieved VIN: ${vin}`);
      setVIN(vin);

      return vin;
    } catch (error) {
      log('error', 'Error retrieving VIN:', error);
      triggerVINNotFound();

      return null;
    }
  }

  async retryVinRequest() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      log('debug', `VIN Request Attempt ${attempt}/${this.maxRetries}`);

      try {
        const response = await this.sendCommand(
          VINRetriever.SERVICE_MODE.REQUEST,
        );

        if (response && !response.includes('NO DATA')) {
          return response;
        }

        log('debug', 'NO DATA received, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      } catch (error) {
        log('error', `Error in attempt ${attempt}:`, error);
      }
    }

    log('error', 'Failed to get VIN after all retries');

    return null;
  }

  processVINResponse(response) {
    if (!response) return null;

    if (
      response &&
      typeof response === 'string' &&
      response.includes(DEMO_DEVICE)
    ) {
      return null;
    }

    log('debug', 'Raw VIN response:', response);

    // First cleaning pass - remove line breaks and ELM327 prompt
    const initialClean = response
      .replace(/>/g, '')
      .replace(/\r/g, '')
      .replace(/\s/g, '');

    log('debug', 'After initial cleaning:', initialClean);

    // Clean the response string
    const cleanResponse = initialClean
      .split(/[\r\n]+/) // Split into lines
      .map(line => line.replace(/^\d+:/, '')) // Remove frame numbers from start of lines
      .join('')
      .replace(/^4902/, '') // Remove service/PID header once
      .toUpperCase();

    log('debug', 'Processing VIN response:', cleanResponse);

    try {
      // Convert hex to ASCII, filtering non-printable characters
      let ascii = '';

      for (let i = 0; i < cleanResponse.length; i += 2) {
        const hexPair = cleanResponse.substring(i, i + 2);
        const charCode = parseInt(hexPair, 16);

        // Only allow printable ASCII characters (space to tilde)
        if (charCode >= 32 && charCode <= 126) {
          ascii += String.fromCharCode(charCode);
        }
      }

      // Trim and validate final VIN
      const vin = ascii.trim();

      log('debug', 'Processed VIN candidate:', vin);

      if (this.isValidVin(vin)) {
        log('debug', 'Valid VIN Found:', vin);

        return vin;
      }

      log('debug', 'Invalid VIN format after processing');

      return null;
    } catch (error) {
      log('error', 'Error processing VIN response:', error);

      return null;
    }
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

  sendCommand(command) {
    setDataStreamingStatus(true);

    return this.ecuDataRetriever.protocolServiceBased.sendCommand(command);
  }

  getName() {
    return VINRetriever.SERVICE_MODE.NAME;
  }
}

export default VINRetriever;
