import { byteArrayToString, hexToBytes } from '../utils';

type VinInput = number[][] | string | null | undefined;

/**
 * VinDecoder class for handling Vehicle Identification Number (VIN) decoding from OBD-II responses
 */
export class VinDecoder {
  /**
   * Validates if a string is a valid VIN
   */
  private static isValidVin(vin: string): boolean {
    return vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
  }

  /**
   * Process byte array frame format
   */
  private static processFrameData(frames: number[][]): string {
    try {
      let vinData = '';
      for (const frame of frames) {
        // Convert frame bytes to string using utility function
        const frameStr = byteArrayToString(frame);

        // Extract data portion after frame number
        const matches = frameStr.match(/\d+:([0-9A-Fa-f]+)/);
        if (matches && matches[1]) {
          // Remove service mode and PID (4902)
          const cleanData = matches[1].replace(/^4902/, '');
          vinData += cleanData;
        }
      }
      
      // Convert final hex string to ASCII
      return this.hexToString(vinData);
    } catch (error) {
      console.error("Error processing frame data:", error);
      return '';
    }
  }

  /**
   * Process hex string format directly to string
   */
  private static hexToString(hex: string): string {
    try {
      // Clean up the hex string
      const cleanHex = hex.replace(/[^A-F0-9]/gi, '').toUpperCase();
      
      // Remove service mode and PID if present
      const vinHex = cleanHex.replace(/^4902/, '');
      
      // Convert hex to bytes using utility function
      const bytes = hexToBytes(vinHex);
      
      // Convert bytes to string using utility function
      return byteArrayToString(bytes);
    } catch (error) {
      console.error("Error converting hex to string:", error);
      return '';
    }
  }

  /**
   * Decodes VIN from raw OBD data
   * @param rawData Raw OBD data containing VIN information (byte array or hex string)
   * @returns Decoded VIN or empty string if invalid
   */
  public static decodeVin(rawData: VinInput): string {
    try {
      if (!rawData) return "";

      let decodedVin = '';

      // Handle byte array format
      if (Array.isArray(rawData)) {
        decodedVin = this.processFrameData(rawData);
      }
      // Handle hex string format
      else if (typeof rawData === 'string') {
        decodedVin = this.hexToString(rawData);
      }

      // Validate and return the VIN
      return this.isValidVin(decodedVin) ? decodedVin : "";
    } catch (error) {
      console.error("Error decoding VIN:", error);
      return "";
    }
  }
}
