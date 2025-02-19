export class VinDecoder {
  /**
   * Converts hex string to ASCII characters
   */
  private static hexToAscii(hex: string): string {
    let ascii = "";
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substring(i, i + 2), 16);
      if (charCode >= 32 && charCode <= 126) {
        // Only printable ASCII
        ascii += String.fromCharCode(charCode);
      }
    }
    return ascii;
  }

  /**
   * Validates if a string is a valid VIN
   */
  private static isValidVin(vin: string): boolean {
    return vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
  }

  /**
   * Extracts VIN part from a frame by removing service and PID bytes
   */
  private static extractVinPart(frame: string): string {
    try {
      // Remove service and PID bytes (4902xx)
      const vinData = frame.substring(6);
      // Convert hex to ASCII
      return this.hexToAscii(vinData);
    } catch (error) {
      return "";
    }
  }

  /**
   * Decodes VIN from raw OBD data
   * @param rawData Raw OBD data containing VIN information
   * @returns Decoded VIN or empty string if invalid
   */
  public static decodeVin(rawData: string): string {
    if (!rawData || typeof rawData !== "string") {
      return "";
    }

    // Extract all 4902 segments from the concatenated string
    const vinSegments: string[] = [];
    let currentIndex = 0;
    while (currentIndex < rawData.length) {
      const segmentStart = rawData.indexOf("4902", currentIndex);
      if (segmentStart === -1) break;

      const nextSegmentStart = rawData.indexOf("4902", segmentStart + 4);
      const segmentEnd =
        nextSegmentStart === -1 ? rawData.length : nextSegmentStart;

      const segment = rawData.substring(segmentStart, segmentEnd);
      if (segment) {
        vinSegments.push(segment);
      }

      currentIndex = segmentEnd;
    }

    if (vinSegments.length > 0) {
      let completeVin = "";
      for (const segment of vinSegments) {
        const vinPart = this.extractVinPart(segment);
        if (vinPart) {
          completeVin += vinPart;
        }
      }

      if (this.isValidVin(completeVin)) {
        return completeVin;
      }
    }

    return "";
  }
}
