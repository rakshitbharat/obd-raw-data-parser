import { RSP_ID } from '@src/helper/OBDManagerHelper/OBDUtils';

import Protocol from './Protocol';

/**
 * Protocol detection methods that will be part of ElmProtocol
 * Provides functionality for:
 * - Protocol response parsing
 * - Auto protocol detection
 * - Protocol testing and validation
 */
const ElmProtocolTelegramProtocol = {
  /**
   * Verify required dependencies are available
   * @private
   */
  _verifyDependencies() {
    const required = [
      'getResponseId',
      'setStatus',
      'isValidResponse',
      'handleEcuDetection',
      'initialize',
      'sendCommand',
    ];

    const missing = required.filter(method => !this[method]);

    if (missing.length > 0) {
      this.handlers?.log?.('error', '[Telegram] Missing required methods', {
        missing,
      });
      throw new Error(`Missing required methods: ${missing.join(', ')}`);
    }
  },

  /**
   * Handle response processing and error recovery
   */
  async handleResponse(response, responseInfo = null, isEcuDetection = false) {
    this._verifyDependencies();

    if (!response) return false;

    const info = responseInfo || this.getResponseId(response);
    const { cleanResponse, id: responseId } = info;

    switch (responseId) {
      case RSP_ID.UNABLE:
      case RSP_ID.CANERROR:
      case RSP_ID.BUSERROR:
        this.setStatus(Protocol.STATUS.DISCONNECTED);

        if (this.lastCommand) {
          this.cmdQueue.push(this.lastCommand);
        }

        this.cmdQueue.push('ATSP0');

        return true;

      case RSP_ID.DATAERROR:
        this.setStatus(Protocol.STATUS.DATAERROR);

        return true;

      case RSP_ID.BUFFERFULL:
      case RSP_ID.RXERROR:
        this.setStatus(Protocol.STATUS.RXERROR);

        return true;

      case RSP_ID.ERROR:
        this.setStatus(Protocol.STATUS.ERROR);

        return true;

      case RSP_ID.NODATA:
        this.setStatus(Protocol.STATUS.NODATA);

        if (this.adaptiveTiming?.adapt) {
          this.adaptiveTiming.adapt(false);
        }

        return true;
    }

    if (this.status === Protocol.STATUS.ECU_DETECT && !isEcuDetection) {
      const ecuDetected = await this.handleEcuDetection(cleanResponse);

      if (ecuDetected) {
        this.setStatus(Protocol.STATUS.ECU_DETECTED);
        this.handlers.onEcuDetected?.(Array.from(this.ecuAddresses));

        return true;
      }

      return false;
    }

    if (this.adaptiveTiming?.adapt) {
      this.adaptiveTiming.adapt(false);
    }

    return false;
  },

  /**
   * Handle incoming telegram data
   */
  async handleTelegram(buffer) {
    this._verifyDependencies();

    if (!buffer || buffer.length === 0) return false;

    if (this.lastTxMsg === buffer) {
      return false;
    }

    const responseInfo = this.getResponseId(buffer);
    const { cleanResponse, id: responseId } = responseInfo;

    switch (responseId) {
      case RSP_ID.SEARCHING: {
        this.setStatus(
          this.status !== Protocol.STATUS.ECU_DETECT
            ? Protocol.STATUS.CONNECTING
            : this.status,
        );
        this.lastRxMsg = buffer;

        return await this.handleResponse(buffer, responseInfo);
      }

      case RSP_ID.NODATA:
      case RSP_ID.OK:
      case RSP_ID.ERROR:
      case RSP_ID.UNABLE:
      case RSP_ID.CANERROR:
      case RSP_ID.BUSERROR:
      case RSP_ID.DATAERROR:
      case RSP_ID.BUFFERFULL:
      case RSP_ID.RXERROR: {
        this.lastRxMsg = buffer;

        return await this.handleResponse(buffer, responseInfo);
      }

      case RSP_ID.STOPPED: {
        this.lastRxMsg = buffer;

        if (this.lastCommand) {
          const cmdToRetry = this.lastCommand;

          Promise.resolve().then(() => this.cmdQueue.push(cmdToRetry));
        }

        return false;
      }

      case RSP_ID.MODEL:
        const initSuccess = await this.initialize();

        if (!initSuccess) {
          this.handlers.log?.(
            'error',
            '[Telegram] Failed to initialize after MODEL response',
          );

          return false;
        }

        return false;

      case RSP_ID.PROMPT:
        if (
          await this.handleResponse(
            this.lastRxMsg,
            this.getResponseId(this.lastRxMsg),
          )
        ) {
          return false;
        }

        if (this.isValidResponse(this.lastRxMsg)) {
          if (this.status !== Protocol.STATUS.CONNECTED) {
            this.setStatus(Protocol.STATUS.CONNECTED);
          }

          if (this.adaptiveTiming?.adapt) {
            this.adaptiveTiming.adapt(true);
          }

          return this.lastRxMsg;
        }

        if (this.cmdQueue.length > 0) {
          const cmd = this.cmdQueue.shift();

          if (!cmd) {
            this.handlers.log?.('warn', '[Telegram] Empty command in queue');

            return false;
          }

          await this.sendCommand(cmd);
        }

        return false;

      default:
        if (buffer.charAt(0) === '+') {
          return false;
        }

        this.lastRxMsg = buffer;

        const firstChar = buffer.charAt(0);

        if (firstChar === '0' && buffer.length === 3) {
          const parsedLength = parseInt(buffer, 16);

          if (isNaN(parsedLength)) {
            return false;
          }

          this.charsExpected = parsedLength * 2;
          this.lastRxMsg = '';

          return false;
        }

        const idx = buffer.indexOf(':');

        if (idx >= 0) {
          if (idx === 0) {
            this.lastRxMsg = buffer;
            this.charsExpected = 0;
          } else if (buffer[0] === '0') {
            this.lastRxMsg = buffer.substring(idx + 1);
          } else {
            this.lastRxMsg += buffer.substring(idx + 1);
          }

          this.responsePending = this.charsExpected === 0;
        } else {
          this.lastRxMsg = buffer;
          this.charsExpected = 0;
          this.responsePending = false;
        }

        if (this.lastRxMsg.length < this.charsExpected) {
          return false;
        }

        if (
          this.charsExpected > 0 &&
          this.lastRxMsg.length > this.charsExpected
        ) {
          this.lastRxMsg = this.lastRxMsg.substring(0, this.charsExpected);
        }

        if (!this.responsePending) {
          if (await this.handleResponse(this.lastRxMsg)) {
            return false;
          }

          if (this.isValidResponse(this.lastRxMsg)) {
            if (this.status !== Protocol.STATUS.CONNECTED) {
              this.setStatus(Protocol.STATUS.CONNECTED);
            }

            if (this.adaptiveTiming?.adapt) {
              this.adaptiveTiming.adapt(true);
            }

            return this.lastRxMsg;
          }
        }

        return false;
    }
  },
};

export default ElmProtocolTelegramProtocol;
