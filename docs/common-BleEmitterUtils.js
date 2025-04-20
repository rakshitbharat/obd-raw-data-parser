import { DeviceEventEmitter } from '@own-react-native';
import { stringToBytes } from 'convert-string';

/**
 * Utility class for handling BLE characteristic value emissions
 */
class BleEmitterUtils {
  /**
   * Emits a BLE characteristic value update event
   * @param {string | Uint8Array} data - The data to emit. If string, will be converted to bytes
   * @param {boolean} appendPrompt - Whether to append '>' prompt to string data (default: true)
   */
  static emitCharacteristicValue(data, appendPrompt = true) {
    let byteData;

    if (typeof data === 'string') {
      // If string data, optionally append prompt and convert to bytes
      const dataWithPrompt = appendPrompt ? `${data}>` : data;

      byteData = stringToBytes(dataWithPrompt);
    } else if (data instanceof Uint8Array) {
      // If already byte data, use as is
      byteData = Array.from(data);
    } else {
      throw new Error('Data must be either string or Uint8Array');
    }

    DeviceEventEmitter.emit('BleManagerDidUpdateValueForCharacteristic', {
      value: byteData,
    });
  }

  /**
   * Emits a demo device response
   * @param {string} deviceId - The demo device ID
   */
  static emitDemoDeviceResponse(deviceId) {
    this.emitCharacteristicValue(deviceId);
  }

  /**
   * Emits a raw byte array as characteristic value
   * @param {Uint8Array} byteArray - The byte array to emit
   */
  static emitRawBytes(byteArray) {
    if (!(byteArray instanceof Uint8Array)) {
      throw new Error('Data must be a Uint8Array');
    }

    this.emitCharacteristicValue(byteArray, false);
  }

  /**
   * Emits a command failure event
   * @param {Error} error - The error that caused the command to fail
   * @param {Object} context - Additional context about the command that failed
   */
  static emitCommandFailure(error, context = {}) {
    DeviceEventEmitter.emit('LiveDataStatus', 'COMMAND_FAILED');
    _c_log_h('Command failed:', { error: error.message, ...context });
  }
}

export default BleEmitterUtils;
