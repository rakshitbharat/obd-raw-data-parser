import BleManagerWrapper from '@src/helper/BleManagerWrapper';
import { setDataStreamingStatus } from '@src/store/obdLiveDataSlice/__OBDU';
import { log as logMain } from '@src/utils/logs';

// TODO: below we will use to enhance clear fault code with alternative with 03 command
// >0101 to see how many codes (2nd digit of the 3rd byte)
// >04 to reset the codes

const log = (...props) => {
  if (typeof props[1] === 'string') {
    props[1] = `[DTCClearRetriever] ${props[1]}`;
  }

  logMain(...props);
};

class DTCClearRetriever {
  static SERVICE_MODE = {
    REQUEST: '04',
    NAME: 'CLEAR_FAULT_CODES',
  };

  static COMMAND_RESULT = {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    ERROR: 'ERROR',
  };

  static MAX_RETRIES = 3;
  static VERIFY_DELAY = 500;
  static TIMEOUT = 20000; // 20 seconds timeout

  static _instance = null;

  constructor(ecuDataRetriever = null) {
    if (DTCClearRetriever._instance) {
      if (ecuDataRetriever) {
        DTCClearRetriever._instance.ecuDataRetriever = ecuDataRetriever;
      }

      return DTCClearRetriever._instance;
    }

    this.ecuDataRetriever = ecuDataRetriever;
    DTCClearRetriever._instance = this;
  }

  static getInstance(ecuDataRetriever = null) {
    if (!DTCClearRetriever._instance) {
      new DTCClearRetriever(ecuDataRetriever);
    } else if (ecuDataRetriever) {
      DTCClearRetriever._instance.ecuDataRetriever = ecuDataRetriever;
    }

    return DTCClearRetriever._instance;
  }

  static resetInstance() {
    DTCClearRetriever._instance = null;
  }

  async retrieveDTCs() {
    log('debug', 'Entering retrieveDTCs');
    await this.setup();
    const result = await this.clearDTCs();

    log('debug', 'Exiting retrieveDTCs with result:', result);

    return result;
  }

  async clearDTCs() {
    log('debug', 'Entering clearDTCs');
    try {
      log('info', 'Starting Clear DTC sequence');

      const clearResponse = await this.sendClearCommand();

      log('debug', 'Clear command response:', clearResponse);

      if (!clearResponse || !this.isSuccessResponse(clearResponse)) {
        log('warn', 'Clear command failed');
        this.notifyStatus(DTCClearRetriever.COMMAND_RESULT.FAILED);

        return false;
      }

      // Wait a moment before verification
      await new Promise(resolve =>
        setTimeout(resolve, DTCClearRetriever.VERIFY_DELAY),
      );

      // Try Mode 03 first, if fails try Mode 01 PID 01
      const mode03Response = await this.sendCommand('03');
      const mode0101Response = await this.sendCommand('0101');

      // If either check shows codes are cleared, consider it successful
      const isCleared =
        this.checkMode03Response(mode03Response) ||
        this.checkMode0101Response(mode0101Response);

      if (isCleared) {
        log('info', 'DTCs successfully cleared');
        this.notifyStatus(DTCClearRetriever.COMMAND_RESULT.SUCCESS);

        return true;
      }

      log('error', 'Failed to clear DTCs');
      this.notifyStatus(DTCClearRetriever.COMMAND_RESULT.FAILED);

      return true; // Return true to indicate the process completed, even if DTCs were not cleared
    } catch (error) {
      log('error', 'Error in clearDTCs:', error);
      this.notifyStatus(DTCClearRetriever.COMMAND_RESULT.ERROR);

      return false;
    }
  }

  checkMode03Response(response) {
    if (!response) return false;

    const cleanResponse = response.replace(/[>\s\r]/g, '').trim();

    return (
      cleanResponse === '43' ||
      cleanResponse.includes('NO DATA') ||
      cleanResponse.split('').every(char => char === '0')
    );
  }

  checkMode0101Response(response) {
    if (!response) return false;

    const cleanResponse = response.replace(/[>\s\r]/g, '').trim();

    if (cleanResponse.length >= 6 && cleanResponse.startsWith('4101')) {
      const statusByte = parseInt(cleanResponse.substring(4, 6), 16);
      const dtcCount = (statusByte >> 4) & 0x7;

      return dtcCount === 0;
    }

    return false;
  }

  async sendClearCommand() {
    try {
      log('info', '=== Sending clear DTCs command ===');
      log('debug', `Using command: ${DTCClearRetriever.SERVICE_MODE.REQUEST}`);
      const response = await this.sendCommand(
        DTCClearRetriever.SERVICE_MODE.REQUEST,
      );

      // Added logging for detailed response analysis
      log('debug', 'Raw clear command response:', response);
      const trimmedResponse =
        typeof response === 'string' ? response.trim() : response;

      log('debug', 'Trimmed clear command response:', trimmedResponse);

      return response;
    } catch (error) {
      log('error', 'Error sending clear command:', error);

      return null;
    }
  }

  async verifyDTCsCleared() {
    log('debug', 'Entering verifyDTCsCleared');
    try {
      log('info', '=== Starting DTC verification ===');
      log('debug', 'Sending Mode 03 command to check DTCs');
      const response = await this.sendCommand('03');

      log('debug', 'Raw Mode 03 response:', response);
      const result = this.checkDTCCount(response);

      log(
        'info',
        `DTC verification result: ${result.cleared ? 'CLEARED' : 'NOT CLEARED'}`,
      );
      log('info', '=== DTC verification completed ===');

      return result;
    } catch (error) {
      log('error', 'Error during DTC verification:', error);

      return { cleared: false };
    }
  }

  checkDTCCount(response) {
    log('debug', 'Entering checkDTCCount with response:', response);

    if (!response) {
      log('debug', 'No response received for DTC check');

      return { cleared: false };
    }

    const cleanResponse = response.replace(/[>\s\r]/g, '').trim();

    log('debug', 'Processing DTC response:', {
      original: response,
      cleaned: cleanResponse,
    });

    const isCleared =
      cleanResponse === '43' ||
      cleanResponse.includes('NO DATA') ||
      cleanResponse.split('').every(char => char === '0');

    log('info', 'DTC check analysis details:', {
      cleaned: cleanResponse,
      is43: cleanResponse === '43',
      isNoData: cleanResponse.includes('NO DATA'),
      isAllZeros: cleanResponse.split('').every(char => char === '0'),
      finalResult: isCleared,
    });

    return { cleared: isCleared };
  }

  isSuccessResponse(response) {
    log('debug', 'Entering isSuccessResponse with raw response:', response);

    if (!response) {
      log('debug', 'No response to check in isSuccessResponse');

      return false;
    }

    const cleanResponse = response.replace(/[>\s\r]/g, '').trim();

    log('debug', 'Cleaned response in isSuccessResponse:', cleanResponse);
    const isSuccess =
      cleanResponse.includes('OK') || cleanResponse.includes('44');

    log(
      'debug',
      `isSuccessResponse result: ${isSuccess} for cleaned response: ${cleanResponse}`,
    );

    return isSuccess;
  }

  notifyStatus(status) {
    BleManagerWrapper.handleObdDataReceived({
      cmdID: DTCClearRetriever.SERVICE_MODE.NAME,
      cmdResult: status,
    });
  }

  async setup() {
    log('debug', 'Entering setup - starting adapter configuration');
    log('info', '=== Starting adapter configuration ===');

    // Configure adapter settings before sending 03 command
    log('debug', 'Step 1/4: Disabling headers');
    await this.sendCommand('ATH0');
    await new Promise(resolve => setTimeout(resolve, 100));
    log('debug', 'Headers disabled successfully');

    log('debug', 'Step 2/4: Disabling echo');
    await this.sendCommand('ATE0');
    await new Promise(resolve => setTimeout(resolve, 100));
    log('debug', 'Echo disabled successfully');

    log('debug', 'Step 3/4: Disabling line feeds');
    await this.sendCommand('ATL0');
    await new Promise(resolve => setTimeout(resolve, 100));
    log('debug', 'Line feeds disabled successfully');

    log('debug', 'Step 4/4: Disabling spaces');
    await this.sendCommand('ATS0');
    await new Promise(resolve => setTimeout(resolve, 100));
    log('debug', 'Spaces disabled successfully');

    log('info', '=== Adapter configuration completed ===');
  }

  sendCommand(command) {
    setDataStreamingStatus(true);

    return this.ecuDataRetriever.protocolServiceBased.sendCommand(command);
  }

  getName() {
    return DTCClearRetriever.SERVICE_MODE.NAME;
  }

  async getDTCCount() {
    try {
      log('debug', 'Getting DTC count using Mode 01 PID 01');
      const response = await this.sendCommand('0101');

      return this.parseDTCCountResponse(response);
    } catch (error) {
      log('error', 'Error getting DTC count:', error);

      return -1;
    }
  }

  parseDTCCountResponse(response) {
    if (!response) return -1;

    const cleanResponse = response.replace(/[>\s\r]/g, '').trim();

    log('debug', 'Parsing Mode 01 PID 01 response:', cleanResponse);

    // Response format: 4101XX where XX is the status
    // The second digit of the third byte indicates DTC count
    if (cleanResponse.length >= 6 && cleanResponse.startsWith('4101')) {
      const statusByte = parseInt(cleanResponse.substring(4, 6), 16);
      const dtcCount = (statusByte >> 4) & 0x7;

      log('debug', `Parsed DTC count: ${dtcCount}`);

      return dtcCount;
    }

    return -1;
  }
}

export default DTCClearRetriever;
