import { hexToBytes } from '../utils';

export class VinDecoder {
  private static readonly VALID_VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

  static isVinData(obdData: string): boolean {
    return typeof obdData === 'string' && 
           (obdData.includes('0902') || obdData.includes('490201'));
  }

  static validateVIN(vin: string): boolean {
    return this.VALID_VIN_PATTERN.test(vin);
  }

  private static cleanHexData(data: string): string {
    return data
      .replace(/>/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, '')
      .replace(/\s+/g, '')
      .replace(/490201/g, '')
      .replace(/4902/g, '')
      .replace(/014/g, '')
      .replace(/\d+:/g, '')
      .toUpperCase();
  }

  private static processHexData(hexString: string): string | null {
    try {
      // Validate hex string
      if (!/^[0-9A-F]+$/i.test(hexString)) {
        return null;
      }

      // Convert hex to ASCII
      const bytes = hexToBytes(hexString);
      const ascii = String.fromCharCode(...bytes);
      
      // Look for valid VIN pattern
      const vinMatches = ascii.match(/[A-HJ-NPR-Z0-9]{17}/g) || [];
      
      // Return the first valid VIN found
      for (const match of vinMatches) {
        if (this.validateVIN(match)) {
          return match;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  static processVINByteArray(byteArray: number[][]): string | null {
    if (!byteArray || !Array.isArray(byteArray)) return null;
    
    try {
      // Convert byte array to string
      const rawData = byteArray
        .map(arr => String.fromCharCode(...arr))
        .join('');

      // Extract hex data from segments
      const segments = rawData.match(/\d+:([0-9A-F]+)/gi);
      if (!segments) return null;

      // Join segments and process
      const hexData = segments
        .map(seg => seg.split(':')[1] || '')
        .join('');

      return this.processHexData(this.cleanHexData(hexData));
    } catch (error) {
      console.error('Error processing VIN byte array:', error);
      return null;
    }
  }

  static processVINResponse(response: string): string | null {
    if (!response) return null;

    try {
      // Handle segmented format
      if (response.includes(':')) {
        const segments = response.match(/\d+:([0-9A-F]+)/gi);
        if (segments) {
          const hexData = segments
            .map(seg => seg.split(':')[1] || '')
            .join('');
          return this.processHexData(this.cleanHexData(hexData));
        }
      }

      // Handle non-segmented format
      const cleaned = this.cleanHexData(response);

      // Check for direct VIN format first
      if (this.validateVIN(cleaned)) {
        return cleaned;
      }

      return this.processHexData(cleaned);
    } catch (error) {
      console.error('Error processing VIN response:', error);
      return null;
    }
  }

  static processVINSegments(rawData: string): string | null {
    if (!rawData || typeof rawData !== 'string') return null;

    try {
      const cleaned = this.cleanHexData(rawData);

      // Check for direct VIN format first
      if (this.validateVIN(cleaned)) {
        return cleaned;
      }

      return this.processHexData(cleaned);
    } catch (error) {
      console.error('Error processing VIN segments:', error);
      return null;
    }
  }
}