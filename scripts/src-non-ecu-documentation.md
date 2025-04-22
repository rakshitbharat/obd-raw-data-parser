# Source Code Documentation

Generated documentation of all source files in the project.

## Directory: src

### File: index.ts

**Path:** `src/index.ts`

```typescript
// filepath: src/index.ts
export * from './ecu';

```

### Directory: src/types

### File: global.d.ts

**Path:** `src/types/global.d.ts`

```typescript
// filepath: src/types/global.d.ts

```

### Directory: src/ecu

### File: index.ts

**Path:** `src/ecu/index.ts`

```typescript
// filepath: src/ecu/index.ts
export { useECU } from './hooks/useECU';
export { useDTCRetriever } from './hooks/useDTCRetriever';
export { ECUContext, ECUProvider } from './context/ECUContext';
export type { RawDTCResponse } from './retrievers';
export type { ECUState, ECUContextValue } from './utils/types';

```

### File: types.ts

**Path:** `src/ecu/types.ts`

```typescript
// filepath: src/ecu/types.ts
/**
 * Re-export all types from utils/types.ts for backward compatibility
 */
export * from './utils/types';
export * from './utils/constants';

```

#### Directory: src/ecu/utils

### File: bluetooth-types.ts

**Path:** `src/ecu/utils/bluetooth-types.ts`

```typescript
// filepath: src/ecu/utils/bluetooth-types.ts
export interface BlePeripheral {
  id: string;
  name?: string;
  rssi?: number;
}

export interface Device extends BlePeripheral {
  advertising?: {
    isConnectable?: boolean;
    serviceUUIDs?: string[];
    manufacturerData?: Buffer;
    serviceData?: Record<string, Buffer>;
    txPowerLevel?: number;
  };
}

export interface UseBluetoothResult {
  // These parameters are part of the interface contract
  // eslint-disable-next-line no-unused-vars
  sendCommand: (command: string, timeout?: number) => Promise<string>;
  error: Error | null;
  isAwaitingResponse: boolean;
  isScanning: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isStreaming: boolean;
  lastSuccessfulCommandTimestamp: number | null;
  device: Device | null;
  discoveredDevices: Device[];
  disconnect: () => Promise<void>;
}

export interface BluetoothHookResult {
  // These parameters are part of the interface contract
  // eslint-disable-next-line no-unused-vars
  sendCommand: (command: string, timeout?: number) => Promise<string | null>;
  isConnected: boolean;
  device: Device | null;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  isConnected: boolean;
}

export type BluetoothDeviceInfo = {
  id: string;
  name: string;
};

export type BluetoothDeviceResponse = {
  id: string;
  name: string;
};

```

### File: constants.ts

**Path:** `src/ecu/utils/constants.ts`

```typescript
// filepath: src/ecu/utils/constants.ts
// Enums for clarity and type safety
/* eslint-disable no-unused-vars */
export enum ECUConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
}

export enum OBD_MODE {
  CURRENT_DTC = '03',
  PENDING_DTC = '07',
  PERMANENT_DTC = '0A',
  CLEAR_DTC = '04',
}
/* eslint-enable no-unused-vars */

export const DELAYS_MS = {
  RESET: 1000,
  COMMAND_SHORT: 50,
  COMMAND_MEDIUM: 200,
  PROTOCOL_SWITCH: 1000,
} as const;

// Update RESPONSE_KEYWORDS
export const RESPONSE_KEYWORDS = {
  NO_DATA: 'NO DATA',
  ERROR: 'ERROR',
  OK: 'OK',
  UNABLE_TO_CONNECT: 'UNABLE TO CONNECT',
  BUS_INIT: 'BUS INIT',
  CAN_ERROR: 'CAN ERROR',
} as const;

// Keep ALL protocol entries but mark those that are unused
/* eslint-disable no-unused-vars */
export enum PROTOCOL {
  AUTO,
  SAE_J1850_PWM,
  SAE_J1850_VPW,
  ISO_9141_2,
  ISO_14230_4_KWP,
  ISO_14230_4_KWP_FAST,
  ISO_15765_4_CAN_11BIT_500K,
  ISO_15765_4_CAN_29BIT_500K,
  ISO_15765_4_CAN_11BIT_250K,
  ISO_15765_4_CAN_29BIT_250K,
  // Add A, B, C if specifically needed, map J1939 to A (10)
  SAE_J1939_CAN_29BIT_250K = 10, // A
}
/* eslint-enable no-unused-vars */

export const PROTOCOL_DESCRIPTIONS: Record<number, string> = {
  [PROTOCOL.AUTO]: 'Automatic',
  [PROTOCOL.SAE_J1850_PWM]: 'SAE J1850 PWM (41.6 KBaud)',
  [PROTOCOL.SAE_J1850_VPW]: 'SAE J1850 VPW (10.4 KBaud)',
  [PROTOCOL.ISO_9141_2]: 'ISO 9141-2',
  [PROTOCOL.ISO_14230_4_KWP]: 'ISO 14230-4 KWP',
  [PROTOCOL.ISO_14230_4_KWP_FAST]: 'ISO 14230-4 KWP Fast',
  [PROTOCOL.ISO_15765_4_CAN_11BIT_500K]: 'ISO 15765-4 CAN 11/500',
  [PROTOCOL.ISO_15765_4_CAN_29BIT_500K]: 'ISO 15765-4 CAN 29/500',
  [PROTOCOL.ISO_15765_4_CAN_11BIT_250K]: 'ISO 15765-4 CAN 11/250',
  [PROTOCOL.ISO_15765_4_CAN_29BIT_250K]: 'ISO 15765-4 CAN 29/250',
  [PROTOCOL.SAE_J1939_CAN_29BIT_250K]: 'SAE J1939 CAN 29/250',
  // Add descriptions for USER1/USER2 if used
};

export const PROTOCOL_TRY_ORDER = [
  PROTOCOL.ISO_15765_4_CAN_11BIT_500K,
  PROTOCOL.ISO_15765_4_CAN_29BIT_500K,
  PROTOCOL.ISO_14230_4_KWP,
  PROTOCOL.ISO_9141_2,
] as const;

// Update ELM commands with missing commands
export const ELM_COMMANDS = {
  // System commands
  RESET: 'ATZ',
  READ_VOLTAGE: 'ATRV',

  // Protocol commands
  PROTOCOL_CLOSE: 'ATPC',
  GET_PROTOCOL: 'ATDPN',
  GET_PROTOCOL_NUM: 'ATDPN', // Added explicit alias for clarity
  AUTO_PROTOCOL: 'ATSP0',
  TRY_PROTOCOL_PREFIX: 'ATTP',
  SET_PROTOCOL_PREFIX: 'ATSP',

  // Communication settings
  LINEFEEDS_OFF: 'ATL0',
  SPACES_OFF: 'ATS0',
  HEADERS_OFF: 'ATH0',
  HEADERS_ON: 'ATH1',
  ECHO_OFF: 'ATE0',
  ADAPTIVE_TIMING_2: 'ATAT2',

  // For supported PIDs and other common commands
  GET_SUPPORTED_PIDS: '0100',

  // Additional commands added for compatibility
  GET_VOLTAGE: 'ATRV', // Explicit alias for READ_VOLTAGE
};

// Standard PIDs for common parameters
export const STANDARD_PIDS = {
  // Mode 01 (current data)
  SUPPORTED_PIDS_1: '0100',
  MONITOR_STATUS: '0101',
  ENGINE_COOLANT_TEMP: '0105',
  SHORT_TERM_FUEL_TRIM_1: '0106',
  LONG_TERM_FUEL_TRIM_1: '0107',
  INTAKE_MAP: '010B',
  ENGINE_RPM: '010C',
  VEHICLE_SPEED: '010D',
  TIMING_ADVANCE: '010E',
  INTAKE_TEMP: '010F',
  MAF_RATE: '0110',
  THROTTLE_POS: '0111',
  OBD_STANDARD: '011C',

  // Mode 09 (vehicle info)
  VIN: '0902',
  CALIBRATION_ID: '0904',
  ECU_NAME: '090A',
};

```

### File: ecuUtils.ts

**Path:** `src/ecu/utils/ecuUtils.ts`

```typescript
// filepath: src/ecu/utils/ecuUtils.ts
import { TextDecoder, TextEncoder } from 'text-encoding'; // Polyfill might be needed

/**
 * Convert hex string to byte array (Uint8Array).
 */
export const hexToBytes = (hex: string): Uint8Array => {
  const cleanedHex = hex.replace(/[^0-9a-fA-F]/g, ''); // Remove non-hex chars

  if (cleanedHex.length % 2 !== 0) {
    console.warn(
      `[ecuUtils] hexToBytes received hex string with odd length: ${hex}`,
    );
    // Optionally pad with leading zero? Or throw error? For now, proceed.
  }

  const bytes = new Uint8Array(Math.floor(cleanedHex.length / 2));

  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2;

    bytes[i] = parseInt(cleanedHex.substring(start, start + 2), 16);
  }

  return bytes;
};

/**
 * Convert byte array (Uint8Array or number[]) to hex string.
 */
export const bytesToHex = (bytes: Uint8Array | number[]): string => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

/**
 * Convert byte array (Uint8Array) to string using UTF-8.
 * Handles potential errors during decoding.
 */
export const bytesToString = (bytes: Uint8Array): string => {
  if (!bytes || bytes.length === 0) {
    return '';
  }

  try {
    const decoder = new TextDecoder('utf-8');

    return decoder.decode(bytes);
  } catch (error) {
    console.error('[ecuUtils] Error decoding bytes to string:', error);

    // Fallback: Try to interpret as ASCII printable chars
    return String.fromCharCode(...bytes.filter(b => b >= 32 && b <= 126));
  }
};

/**
 * Convert string to byte array (Uint8Array) using UTF-8.
 */
export const stringToBytes = (str: string): Uint8Array => {
  if (!str) {
    return new Uint8Array(0);
  }

  try {
    const encoder = new TextEncoder(); // Always UTF-8

    return encoder.encode(str);
  } catch (error) {
    console.error('[ecuUtils] Error encoding string to bytes:', error);
    // Fallback: Basic ASCII conversion
    const bytes = new Uint8Array(str.length);

    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }

    return bytes;
  }
};

/**
 * Format number as hex string with padding.
 */
export const toHexString = (num: number, width: number = 2): string => {
  return num.toString(16).toUpperCase().padStart(width, '0');
};

```

### File: helpers.ts

**Path:** `src/ecu/utils/helpers.ts`

```typescript
// filepath: src/ecu/utils/helpers.ts
import { TextDecoder } from 'text-encoding'; // Ensure polyfill if needed

import { RESPONSE_KEYWORDS } from './constants';
import { hexToBytes } from './ecuUtils';

/**
 * Cleans ELM327 response string, removing prompt, whitespace, control chars.
 * Keeps potentially relevant prefixes like '41', '43', '49'.
 */
export const cleanResponse = (response: string | null | undefined): string => {
  if (!response) return '';

  // Remove prompt, carriage return, line feed, tabs, null bytes
  // Keep internal spaces which might be relevant in data fields
  return response
    .replace(/[>\r\n\t\0]/g, '')
    .trim()
    .toUpperCase();
};

/**
 * Basic check if response looks OK (contains "OK" or is just data after cleaning).
 * Note: Doesn't guarantee command success, just absence of obvious ELM errors.
 */
export const isResponseOk = (response: string | null | undefined): boolean => {
  if (!response) return false; // No response is not OK

  const cleaned = cleanResponse(response);

  // Check if it contains OK, or if it's just hex data (likely a valid response)
  return (
    cleaned.includes(RESPONSE_KEYWORDS.OK) || /^[0-9A-F\s]+$/.test(cleaned)
  );
};

/**
 * Basic check for common *ELM* error keywords.
 * Does not check for OBD "NO DATA".
 */
export const isResponseError = (
  response: string | null | undefined,
): boolean => {
  if (!response) return true; // Treat no response as an error

  // Check for specific ELM error strings after basic cleaning
  const errorKeywords = [
    RESPONSE_KEYWORDS.ERROR, // Generic ERROR
    RESPONSE_KEYWORDS.UNABLE_TO_CONNECT,
    RESPONSE_KEYWORDS.BUS_INIT, // Covers BUS INIT: ERROR etc.
    RESPONSE_KEYWORDS.CAN_ERROR,
    'FB ERROR', // Feedback error
    'DATA ERROR', // ELM data error
    'BUFFER FULL',
    'RX ERROR',
  ];
  const cleaned = cleanResponse(response);

  return errorKeywords.some(keyword => cleaned.includes(keyword));
};

/**
 * Extracts voltage if present in response (e.g., "12.3V").
 */
export const extractVoltage = (
  response: string | null | undefined,
): string | null => {
  if (!response) return null;

  // Clean less aggressively for voltage as format is specific
  const cleaned = response.replace(/[>\s\r\n\t\0]/g, '').toUpperCase();
  const match = cleaned.match(/(\d{1,2}(\.\d{1,2})?)V/);

  return match ? match[0] : null;
};

/**
 * Extracts protocol number from ATDPN response (e.g., "A6" -> 6, "3" -> 3).
 */
export const extractProtocolNumber = (
  response: string | null | undefined,
): number | null => {
  if (!response) return null;

  // Clean aggressively here
  const cleaned = cleanResponse(response);
  const match = cleaned.match(/^A?([0-9A-F])$/i); // Matches optional 'A' followed by single hex digit

  if (match && match[1]) {
    const protocolNum = parseInt(match[1], 16);

    // Validate against known range (adjust if needed)
    if (protocolNum >= 0 && protocolNum <= 12) {
      // Adjust max if more protocols added
      return protocolNum;
    }
  }

  return null;
};

/**
 * Extracts potential ECU addresses (CAN headers) from a cleaned response string.
 */
export function extractEcuAddresses(cleanedResponse: string): string[] {
  if (!cleanedResponse) return [];

  const addresses = new Set<string>();
  const lines = cleanedResponse.split('\r');

  for (const line of lines) {
    // Match CAN headers (both 11-bit and 29-bit)
    const match = line.match(/^([0-9A-F]{2,3}|[0-9A-F]{8}):/i);
    if (match?.[1]) {
      addresses.add(match[1]);
    }

    // Match ECU addresses at start of line
    const ecuMatch = line.match(/^([0-9A-F]{2})/i);
    if (ecuMatch?.[1]) {
      addresses.add(ecuMatch[1]);
    }
  }

  return Array.from(addresses);
}

/**
 * Checks if a cleaned response line looks like a VIN multi-frame indicator.
 */
export const isVinResponseFrame = (cleanedResponse: string): boolean => {
  // Check for standard ISO 15765-4 multi-frame indicators
  // 10 xx -> First Frame, xx = remaining byte count (hex)
  // 21..2F -> Consecutive Frame
  return (
    cleanedResponse.startsWith('10') || /^[2][0-9A-F]/.test(cleanedResponse)
  );
};

/**
 * Assembles data from a potentially multi-line/multi-frame ELM response.
 * Removes frame counters (like '0:', '1:'), ISO-TP indicators (like '10xx', '2x'), prompts, whitespace.
 * Assumes the input `rawResponse` contains all frames concatenated by newlines/CRs.
 */
export const assembleMultiFrameResponse = (rawResponse: string): string => {
  if (!rawResponse) return '';

  console.debug(`[Helper:assemble] Input: ${rawResponse}`);
  // Split by newline or carriage return, filter empty lines
  const lines = rawResponse
    .split(/[\r\n]+/)
    .filter(line => line.trim().length > 0);

  let assembledData = '';

  for (const line of lines) {
    // 1. Remove ELM's optional line/frame numbering (e.g., "0:", "1:")
    let processedLine = line.trim().replace(/^\s*[0-9A-F]{1,2}:\s*/, '');

    // 2. Remove prompt and trailing whitespace/nulls
    processedLine = processedLine.replace(/[>\s\0]+$/, '');

    // 3. Check for and remove standard ISO-TP frame indicators if present
    if (isIsoTpFrameIndicator(processedLine)) {
      if (processedLine.startsWith('10')) {
        // First Frame: 10 LL <data> (LL = length, skip 4 hex chars: 10LL)
        if (processedLine.length >= 4) {
          processedLine = processedLine.substring(4);
        } else {
          processedLine = ''; // Invalid FF
          console.warn('[Helper:assemble] Invalid First Frame detected:', line);
        }
      } else {
        // Consecutive Frame: 2N <data> (skip 2 hex chars: 2N)
        if (processedLine.length >= 2) {
          processedLine = processedLine.substring(2);
        } else {
          processedLine = ''; // Invalid CF
          console.warn(
            '[Helper:assemble] Invalid Consecutive Frame detected:',
            line,
          );
        }
      }
    }
    // else: Treat as single frame or continuation data - keep the whole line (after cleaning)

    // 4. Append the data part of the line
    assembledData += processedLine.replace(/\s/g, ''); // Remove internal spaces just in case
  }

  console.debug(`[Helper:assemble] Output: ${assembledData}`);

  return assembledData;
};

/**
 * Parses VIN string from fully assembled OBD response hex data.
 * Expects data *after* multi-frame assembly & cleaning.
 * @param assembledHexData - Concatenated hex string from all relevant frames.
 */
export const parseVinFromResponse = (
  assembledHexData: string,
): string | null => {
  if (!assembledHexData) return null;

  console.debug(`[Helper:parseVin] Input Hex: ${assembledHexData}`);

  // Find the VIN response signature: Mode 49, PID 02 -> "4902"
  const vinSignatureIndex = assembledHexData.indexOf('4902');

  if (vinSignatureIndex === -1) {
    console.warn(
      `[Helper:parseVin] VIN signature '4902' not found in assembled data.`,
    );
    // Sometimes the signature might be missing in very clean assembly,
    // but the payload *should* follow. Proceed with caution.
    // Let's assume the *entire* assembled data is the payload if signature missing.
    // This might be wrong if other data was included.
    // return null; // Stricter approach
  }

  // Assume the payload starts *after* the signature "4902"
  // The multi-frame assembly should have removed frame indicators (like 01, 02)
  const hexPayload =
    vinSignatureIndex !== -1
      ? assembledHexData.substring(vinSignatureIndex + 4)
      : assembledHexData; // Use all data if signature missing

  // Remove potential padding bytes (often 00 or FF at the end in CAN)
  const cleanPayload = hexPayload.replace(/(?:00|FF)+$/i, '');

  if (cleanPayload.length === 0) {
    console.warn('[Helper:parseVin] VIN payload is empty after cleaning.');

    return null;
  }

  try {
    const bytes = hexToBytes(cleanPayload);
    // VIN characters are a subset of ASCII, decodable by utf-8
    const decoder = new TextDecoder('utf-8');
    let vin = decoder.decode(bytes).trim();

    // Remove any lingering null characters
    vin = vin.replace(/\0/g, '');

    console.debug(
      `[Helper:parseVin] Decoded VIN string: "${vin}" (Length: ${vin.length})`,
    );

    // Basic VIN validation (17 chars, specific alphanumeric set)
    if (vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
      console.debug(`[Helper:parseVin] Parsed VIN is valid: ${vin}`);

      return vin;
    } else if (vin.length > 0) {
      // Return it even if invalid length/chars, maybe user wants to see partial data
      console.warn(
        `[Helper:parseVin] Parsed VIN "${vin}" has unexpected format/length (${vin.length}). Returning potentially incorrect value.`,
      );

      return vin;
    } else {
      console.warn(
        `[Helper:parseVin] Failed to decode VIN from payload hex: ${cleanPayload}`,
      );

      return null;
    }
  } catch (error) {
    console.error(
      `[Helper:parseVin] Error decoding VIN hex "${cleanPayload}":`,
      error,
    );

    return null;
  }
};

/** Parses DTC codes from assembled OBD response data */
export const parseDtcsFromResponse = (
  responseData: string,
  modePrefix: string,
): string[] | null => {
  if (!responseData) return null;

  // Format: <Prefix><Num DTCs><DTC1_Byte1><DTC1_Byte2>... (Num DTCs often unreliable/absent)
  // Mode Prefix: 43 (Current), 47 (Pending), 4A (Permanent)
  console.debug(
    `[Helper] Parsing DTC data starting with ${modePrefix}: ${responseData}`,
  );

  // Find the first occurrence of the response prefix
  const startIndex = responseData.indexOf(modePrefix);

  if (startIndex === -1) {
    // If response is *just* the prefix (e.g., "43" from Mode 03), it implies zero DTCs
    if (responseData === modePrefix) return [];

    console.warn(
      `[Helper] DTC response prefix ${modePrefix} not found in data: ${responseData}`,
    );

    return null; // Indicate parsing failure
  }

  // Extract relevant hex data starting *after* the prefix
  // The first byte *might* be count, but we parse pairs regardless
  let dtcHexData = responseData.substring(startIndex + modePrefix.length);

  // If the first byte seems like a count, skip it? Risky. Let's parse all pairs.
  // Example: 43 02 1234 5678 -> dtcHexData = "0212345678"
  // We should parse starting from "12"

  // Let's refine: Find prefix, take rest, *if* first byte looks like a small number (count), skip it.
  if (dtcHexData.length >= 2) {
    const potentialCount = parseInt(dtcHexData.substring(0, 2), 16);

    // If it's a small number (e.g., < 10), assume it's a count and skip. Heuristic!
    if (
      !isNaN(potentialCount) &&
      potentialCount < 10 &&
      dtcHexData.length > 2
    ) {
      dtcHexData = dtcHexData.substring(2);
    }
  }

  // Each DTC is 2 bytes (4 hex chars).
  const dtcs: string[] = [];

  for (let i = 0; i + 4 <= dtcHexData.length; i += 4) {
    // Ensure we have 4 chars
    const dtcPair = dtcHexData.substring(i, i + 4);

    // Skip padding bytes (often 0000 at the end of data)
    if (dtcPair === '0000') continue;

    const byte1 = parseInt(dtcPair.substring(0, 2), 16);
    const byte2 = parseInt(dtcPair.substring(2, 4), 16);

    // Decode according to SAE J2012 / ISO 15031-6
    let firstChar: string;
    const firstTwoBits = byte1 >> 6;

    switch (firstTwoBits) {
      case 0:
        firstChar = 'P';
        break; // Powertrain
      case 1:
        firstChar = 'C';
        break; // Chassis
      case 2:
        firstChar = 'B';
        break; // Body
      case 3:
        firstChar = 'U';
        break; // Network
      default:
        firstChar = '?';
    }

    const remainingCode = ((byte1 & 0x3f) << 8) | byte2;
    const dtcCode = `${firstChar}${remainingCode.toString(16).toUpperCase().padStart(4, '0')}`;

    dtcs.push(dtcCode);
  }

  console.debug(
    `[Helper] Parsed DTCs (Mode ${modePrefix}): ${dtcs.length > 0 ? dtcs.join(', ') : 'None'}`,
  );

  return dtcs;
};

/**
 * Checks if a cleaned response line looks like a standard ISO-TP multi-frame indicator.
 * Used by assembleMultiFrameResponse.
 */
export const isIsoTpFrameIndicator = (cleanedLine: string): boolean => {
  // 10 xx -> First Frame
  // 21..2F -> Consecutive Frame
  // 3x xx xx -> Flow Control (should generally not be part of data assembly)
  return cleanedLine.startsWith('10') || /^[2][0-9A-F]/.test(cleanedLine);
};

```

### File: retriever.ts

**Path:** `src/ecu/utils/retriever.ts`

```typescript
// filepath: src/ecu/utils/retriever.ts
import { PROTOCOL_DESCRIPTIONS } from './constants';

import type { SendCommandFunction } from './types';

/**
 * Utility class with helper methods from the original ECUDataRetriever and OBDUtils
 */
class ECURetrieverUtils {
  /**
   * Map between protocol number and protocol description
   */
  static getProtocolDescription(protocolNum: number): string {
    return PROTOCOL_DESCRIPTIONS[protocolNum] || 'Unknown Protocol';
  }

  /**
   * Determine if protocol is CAN based on protocol number
   */
  static isCanProtocol(protocolNum: number): boolean {
    // Protocols 6-20 are CAN-based
    return protocolNum >= 6 && protocolNum <= 20;
  }

  /**
   * Get the appropriate flow control header for a protocol
   */
  static getFlowControlHeader(
    _headerFormat: string,
    protocolNum: number,
  ): string {
    if (protocolNum >= 6 && protocolNum <= 20) {
      // CAN protocols
      if (protocolNum % 2 === 0) {
        // 11-bit CAN
        return '7E0';
      } else {
        // 29-bit CAN
        return '18DA10F1';
      }
    }

    return '';
  }

  /**
   * Try to recover from communication errors
   * @param sendCommand - Function to send commands to the adapter
   */
  static async recoverFromErrors(
    sendCommand: SendCommandFunction,
  ): Promise<boolean> {
    try {
      // Reset the adapter
      await sendCommand('ATZ');
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 1000);
      });

      // Try auto protocol
      await sendCommand('ATSP0');
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 300);
      });

      // Configure adapter with basic settings
      const setupCommands = ['ATE0', 'ATL0', 'ATS0', 'ATH1'];

      for (const cmd of setupCommands) {
        await sendCommand(cmd);
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), 100);
        });
      }

      // Try to wake up ECU
      await sendCommand('0100');

      return true;
    } catch (error) {
      console.error('Error during recovery attempt:', error);

      return false;
    }
  }
}

export { ECURetrieverUtils };

```

### File: types.ts

**Path:** `src/ecu/utils/types.ts`

```typescript
// filepath: src/ecu/utils/types.ts
import type { PROTOCOL } from './constants';
import type { RawDTCResponse } from '../retrievers/BaseDTCRetriever';

export { RawDTCResponse };

// Remove connection-related action types
export const ECUActionType = {
  // CONNECT_START: 'CONNECT_START', // Removed
  // CONNECT_SUCCESS: 'CONNECT_SUCCESS', // Removed
  // CONNECT_FAILURE: 'CONNECT_FAILURE', // Removed
  // DISCONNECT: 'DISCONNECT', // Removed
  SET_ECU_INFO: 'SET_ECU_INFO', // Keep
  RESET: 'RESET', // Keep
  FETCH_DTCS_START: 'FETCH_DTCS_START', // Keep
  FETCH_DTCS_SUCCESS: 'FETCH_DTCS_SUCCESS', // Keep
  FETCH_DTCS_FAILURE: 'FETCH_DTCS_FAILURE', // Keep
  CLEAR_DTCS_START: 'CLEAR_DTCS_START', // Keep
  CLEAR_DTCS_SUCCESS: 'CLEAR_DTCS_SUCCESS', // Keep
  CLEAR_DTCS_FAILURE: 'CLEAR_DTCS_FAILURE', // Keep
  FETCH_RAW_DTCS_START: 'FETCH_RAW_DTCS_START', // Keep
  FETCH_RAW_CURRENT_DTCS_SUCCESS: 'FETCH_RAW_CURRENT_DTCS_SUCCESS', // Keep
  FETCH_RAW_PENDING_DTCS_SUCCESS: 'FETCH_RAW_PENDING_DTCS_SUCCESS', // Keep
  FETCH_RAW_PERMANENT_DTCS_SUCCESS: 'FETCH_RAW_PERMANENT_DTCS_SUCCESS', // Keep
  FETCH_RAW_DTCS_FAILURE: 'FETCH_RAW_DTCS_FAILURE', // Keep
} as const;

export type ECUAction = {
  type: keyof typeof ECUActionType;
  payload?: ECUActionPayload;
};

// Remove connection-related fields from payload
export interface ECUActionPayload {
  // protocol?: PROTOCOL; // Removed
  // protocolName?: string; // Removed
  // detectedEcuAddresses?: string[]; // Removed (now handled within DTC success actions)
  error?: string; // Keep for failures
  voltage?: string; // Keep for SET_ECU_INFO
  data?: RawDTCResponse | null; // Keep for raw DTCs
}

// Remove ECUConnectionOptions
// export interface ECUConnectionOptions { ... }

export interface ECUContextValue {
  state: ECUState;
  /**
   * Connect to the ECU (Dummy Implementation)
   * @param options - Optional connection configuration options (REMOVED)
   */
  connectWithECU(): Promise<boolean>; // Keep signature, remove options
  getECUInformation: () => Promise<void>; // Keep
  getActiveProtocol: () => { protocol: PROTOCOL | null; name: string | null }; // Keep (Dummy Impl)
  disconnectECU: () => Promise<void>; // Keep (Dummy Impl)
  getVIN: () => Promise<string | null>; // Keep
  /**
   * Clear Diagnostic Trouble Codes
   * @param skipVerification - Optional flag to skip verification of cleared DTCs
   */
  clearDTCs: (
    // eslint-disable-next-line no-unused-vars
    skipVerification?: boolean,
  ) => Promise<boolean>; // Keep
  getRawCurrentDTCs: () => Promise<RawDTCResponse | null>; // Keep
  getRawPendingDTCs: () => Promise<RawDTCResponse | null>; // Keep
  getRawPermanentDTCs: () => Promise<RawDTCResponse | null>; // Keep
  sendCommand: SendCommandFunction; // Keep
}

// Remove connection-related fields from state
export interface ECUState {
  // status: ECUConnectionStatus; // Removed
  // activeProtocol: PROTOCOL | null; // Removed
  // protocolName: string | null; // Removed
  // lastError: string | null; // Removed (or keep only for non-connection errors)
  deviceVoltage: string | null; // Keep
  detectedEcuAddresses: string[]; // Keep
  selectedEcuAddress: string | null; // Keep
  currentDTCs: string[] | null; // Keep
  pendingDTCs: string[] | null; // Keep
  permanentDTCs: string[] | null; // Keep
  dtcLoading: boolean; // Keep
  dtcClearing: boolean; // Keep
  rawCurrentDTCs: RawDTCResponse | null; // Keep
  rawPendingDTCs: RawDTCResponse | null; // Keep
  rawPermanentDTCs: RawDTCResponse | null; // Keep
  rawDTCLoading: boolean; // Keep
  // isReady?: boolean; // Removed (tied to connection status)
}

export type SendCommandFunction = (
  // eslint-disable-next-line no-unused-vars
  command: string,
  // eslint-disable-next-line no-unused-vars
  timeout?: number,
) => Promise<string | null>; // Keep

// Keep SendCommandOptions if sendCommand might use it
export interface SendCommandOptions {
  timeoutMs?: number;
}

```

#### Directory: src/ecu/hooks

### File: index.ts

**Path:** `src/ecu/hooks/index.ts`

```typescript
// filepath: src/ecu/hooks/index.ts
// Add this export to the existing exports
export { useDTCRetriever } from './useDTCRetriever';

```

### File: useDTCRetriever.ts

**Path:** `src/ecu/hooks/useDTCRetriever.ts`

```typescript
// filepath: src/ecu/hooks/useDTCRetriever.ts
import { useCallback } from 'react';

import {
  CurrentDTCRetriever,
  PendingDTCRetriever,
  PermanentDTCRetriever,
  type RawDTCResponse,
} from '../retrievers';

import { useECU } from './useECU';

/**
 * Hook for retrieving DTCs from the ECU
 */
export const useDTCRetriever = (): {
  get03DTCObject: () => Promise<RawDTCResponse | null>;
  get07DTCObject: () => Promise<RawDTCResponse | null>;
  get0ADTCObject: () => Promise<RawDTCResponse | null>;
} => {
  const { sendCommand } = useECU();

  const get03DTCObject = useCallback(async () => {
    const retriever = new CurrentDTCRetriever(sendCommand);
    return await retriever.retrieveRawDTCs();
  }, [sendCommand]);

  const get07DTCObject = useCallback(async () => {
    const retriever = new PendingDTCRetriever(sendCommand);
    return await retriever.retrieveRawDTCs();
  }, [sendCommand]);

  const get0ADTCObject = useCallback(async () => {
    const retriever = new PermanentDTCRetriever(sendCommand);
    return await retriever.retrieveRawDTCs();
  }, [sendCommand]);

  return {
    get03DTCObject,
    get07DTCObject,
    get0ADTCObject,
  };
};

```

### File: useECU.ts

**Path:** `src/ecu/hooks/useECU.ts`

```typescript
// filepath: src/ecu/hooks/useECU.ts
import { useContext } from 'react';

import { ECUContext } from '../context/ECUContext';

import type { ECUContextValue } from '../utils/types';

export const useECU = (): ECUContextValue => {
  const context = useContext(ECUContext);

  if (!context) {
    throw new Error('useECU must be used within an ECUProvider');
  }

  return context;
};

```

#### Directory: src/ecu/services

### File: connectionService.ts

**Path:** `src/ecu/services/connectionService.ts`

```typescript
// filepath: src/ecu/services/connectionService.ts
import { log } from '../../utils/logger';
import {
  ELM_COMMANDS,
  OBD_MODE,
  RESPONSE_KEYWORDS,
  STANDARD_PIDS,
} from '../utils/constants';
import {
  cleanResponse,
  isResponseOk,
  isResponseError,
  extractProtocolNumber, // Keep for getRawDTCs
  extractVoltage,
  extractEcuAddresses, // Keep for getRawDTCs
  assembleMultiFrameResponse, // Make sure it's imported
  parseVinFromResponse, // Make sure it's imported
  parseDtcsFromResponse, // Make sure it's imported
} from '../utils/helpers';

import type { SendCommandFunction, RawDTCResponse } from '../utils/types';

// Result type for connection attempt - Removed
// type ConnectionResult = { ... };

// Result type for basic adapter info
type AdapterInfo = {
  voltage: string | null;
  // Add other fields like ELM ID if needed
};

// Store detected ECUs during the connection process (module scope) - Removed
// const currentDetectedEcus: Set<string> = new Set();

/**
 * Attempts to connect and detect the OBD-II protocol, including ECU detection.
 * @param sendCommand - Function to send commands to the ELM adapter.
 */
// export const connectAndDetectProtocol = async (...) => { ... }; // Function removed


/**
 * Gets a flow control header for CAN protocols based on ECU address
 * @param {string} ecuAddress - The detected ECU address
 * @param {number} protocol - The current protocol number
 * @returns {string | null} Flow control header
 */
// const getFlowControlHeader = (...) => { ... }; // Function removed


/**
 * Verifies if the currently set protocol can communicate with the ECU.
 * Sends a series of test commands and checks for valid responses.
 * @param sendCommand - Function to send commands.
 * @param protocol - The protocol being tested.
 * @param requireEcuDetection - If true, requires ECU headers to be found for success.
 */
// const verifyProtocol = async (...) => { ... }; // Function removed


/**
 * Fetches basic adapter information like voltage.
 */
export const getAdapterInfo = async (
  sendCommand: SendCommandFunction,
): Promise<AdapterInfo> => {
  console.debug('[connectionService] Getting adapter info...');
  const voltageResponse = await sendCommand(ELM_COMMANDS.READ_VOLTAGE);
  const voltage = extractVoltage(voltageResponse);

  console.debug(`[connectionService] Adapter Voltage: ${voltage ?? 'N/A'}`);

  // Potentially add 'ATI' for ELM ID/Version here too
  return { voltage };
};

/**
 * Retrieves the Vehicle Identification Number (VIN).
 * Enhanced with retry mechanism and improved validation.
 * @param sendCommand - Function to send commands.
 */
export const getVehicleVIN = async (
  sendCommand: SendCommandFunction,
): Promise<string | null> => {
  const vinCommand = STANDARD_PIDS.VIN; // 0902
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds between retries

  console.debug(
    `[connectionService] Attempting to retrieve VIN (${vinCommand}) with ${maxRetries} retries...`,
  );

  // Retry loop implementation based on VINRetriever.js
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.debug(
      `[connectionService] VIN retrieval attempt ${attempt}/${maxRetries}`,
    );

    // Headers should be OFF for clean data (assuming set elsewhere or default)
    const response = await sendCommand(vinCommand, 8000); // Longer timeout for potential multi-frame

    if (response === null) {
      console.warn(
        `[connectionService] No response for VIN request (attempt ${attempt})`,
      );

      if (attempt < maxRetries) {
        console.debug(
          `[connectionService] Waiting ${retryDelay}ms before retry...`,
        );
        await delay(retryDelay);
      }

      continue;
    }

    if (isResponseError(response)) {
      console.error(
        `[connectionService] Error response for VIN request: ${response}`,
      );

      if (attempt < maxRetries) {
        console.debug(
          `[connectionService] Waiting ${retryDelay}ms before retry...`,
        );
        await delay(retryDelay);
      }

      continue;
    }

    if (response.includes(RESPONSE_KEYWORDS.NO_DATA)) {
      console.debug(
        `[connectionService] NO DATA response for VIN request (attempt ${attempt})`,
      );

      if (attempt < maxRetries) {
        console.debug(
          `[connectionService] Waiting ${retryDelay}ms before retry...`,
        );
        await delay(retryDelay);
      }

      continue;
    }

    // Process successful response
    console.debug(`[connectionService] Raw VIN response: ${response}`);
    const assembledResponse = assembleMultiFrameResponse(response);

    console.debug(
      `[connectionService] Assembled VIN response data: ${assembledResponse}`,
    );

    // Parse the assembled data
    const vin = parseVinFromResponse(assembledResponse);

    // Additional VIN validation (from VINRetriever.js)
    if (vin) {
      const isValidVin = vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);

      if (isValidVin) {
        console.debug(`[connectionService] Valid VIN found: ${vin}`);

        return vin;
      } else {
        console.warn(`[connectionService] Invalid VIN format: ${vin}`);

        // Try next attempt if not valid and we have more retries
        if (attempt < maxRetries) {
          console.debug(
            `[connectionService] Waiting ${retryDelay}ms before retry...`,
          );
          await delay(retryDelay);
        }

        continue;
      }
    }
  }

  console.error(
    '[connectionService] Failed to retrieve valid VIN after all attempts',
  );

  return null;
};

/**
 * Retrieves Diagnostic Trouble Codes (DTCs).
 * @param sendCommand - Function to send commands.
 * @param mode - The OBD mode ('03', '07', '0A').
 */
export const getVehicleDTCs = async (
  sendCommand: SendCommandFunction,
  mode: OBD_MODE,
): Promise<string[] | null> => {
  await log.debug('Requesting DTCs', { mode });

  const response = await sendCommand(mode, 8000); // Longer timeout

  if (response === null) {
    await log.warn('No response for DTC request', { mode });
    return null; // Indicate error/timeout
  }

  if (isResponseError(response)) {
    await log.error('Error response for DTC request', { mode, response });
    return null; // Indicate error
  }

  if (response.includes(RESPONSE_KEYWORDS.NO_DATA)) {
    console.debug(
      `[connectionService] NO DATA response for DTC request (Mode ${mode}).`,
    );

    // This means no DTCs for Mode 03/07/0A - return empty array
    return [];
  }

  // Assemble potentially multi-frame response
  const assembledResponse = assembleMultiFrameResponse(response);
  // Determine expected prefix (e.g., 43 for mode 03)
  const responsePrefix = (parseInt(mode, 10) + 0x40).toString(16).toUpperCase();

  return parseDtcsFromResponse(assembledResponse, responsePrefix);
};

/**
 * Clears Diagnostic Trouble Codes (DTCs) with verification.
 * Enhanced implementation based on DTCClearRetriever.
 * @param sendCommand - Function to send commands.
 * @param skipVerification - Optional flag to skip verification step (defaults to false)
 */
export const clearVehicleDTCs = async (
  sendCommand: SendCommandFunction,
  skipVerification: boolean = false,
): Promise<boolean> => {
  const clearCommand = OBD_MODE.CLEAR_DTC; // 04

  console.debug(
    `[connectionService] Starting enhanced DTC clearing sequence...`,
  );

  // Step 1: Configure adapter settings for optimal communication
  const setupCommands = [
    { cmd: 'ATH0', desc: 'Disable headers' },
    { cmd: 'ATE0', desc: 'Disable echo' },
    { cmd: 'ATL0', desc: 'Disable linefeeds' },
    { cmd: 'ATS0', desc: 'Disable spaces' },
  ];

  // Initial setup commands
  for (const { cmd } of setupCommands) {
    try {
      await sendCommand(cmd);
      await delay(100);
    } catch (error) {
      console.warn(
        `[ConnectionService] Setup command warning (${cmd}):`,
        error,
      );
    }
  }

  // Step 2: Send clear command
  console.debug(
    `[connectionService] Sending DTC clear command (${clearCommand})...`,
  );
  const response = await sendCommand(clearCommand, 10000); // 10s timeout

  if (!response) {
    console.error(
      '[connectionService] No response received for Clear DTC command.',
    );

    return false;
  }

  // Step 3: Analyze the response
  const cleanedResponse = cleanResponse(response);
  const isSuccessful =
    cleanedResponse.includes('44') || // Success response prefix
    isResponseOk(response); // Or general OK

  if (!isSuccessful) {
    console.error(
      `[connectionService] Clear command failed with response: ${response}`,
    );

    return false;
  }

  console.debug(
    `[connectionService] Clear command received successful response: ${cleanedResponse}`,
  );

  // Skip verification if requested
  if (skipVerification) {
    console.debug('[connectionService] Verification skipped as requested.');

    return true;
  }

  // Step 4: Verify DTCs are actually cleared
  console.debug(`[connectionService] Clear command successful. Verifying...`);
  await new Promise<void>(resolve => {
    setTimeout(resolve, 500);
  }); // Wait before verification

  // Try Mode 03 first to check if any DTCs remain
  const mode03Response = await sendCommand('03', 3000);
  const isMode03Clear = checkMode03Response(mode03Response);

  if (isMode03Clear) {
    console.debug(
      '[connectionService] Mode 03 verification successful: No DTCs present',
    );
  } else {
    console.debug(
      '[connectionService] Mode 03 verification indicates DTCs may still be present',
    );
  }

  // Also try Mode 01 PID 01 to check DTC indicator in status byte
  const mode0101Response = await sendCommand('0101', 3000);
  const isMode0101Clear = checkMode0101Response(mode0101Response);

  if (isMode0101Clear) {
    console.debug(
      '[connectionService] Mode 01 PID 01 verification successful: MIL off, no DTCs',
    );
  } else {
    console.debug(
      '[connectionService] Mode 01 PID 01 verification indicates DTCs or MIL may still be active',
    );
  }

  // Consider verification successful if either check passes? Or require both?
  // Let's be lenient: if Mode 03 shows no DTCs, it's likely clear.
  const allClear = isMode03Clear; // Changed logic to rely primarily on Mode 03

  if (allClear) {
    console.debug('[connectionService] Verification successful: DTCs cleared.');

    return true;
  } else {
    console.warn( // Changed to warn as Mode 01 check might be less reliable
      '[connectionService] Verification suggests DTCs may not be fully cleared (Mode 03 check failed).',
    );

    return false; // Return false if Mode 03 didn't confirm clear
  }
};

/**
 * Checks if Mode 03 response indicates no DTCs.
 */
function checkMode03Response(response: string | null): boolean {
  if (!response) return false;

  const cleanedResponse = cleanResponse(response);

  // Mode 03 response '43' followed by nothing, or 'NO DATA', or '430000' indicates no DTCs
  // Or just '43' if the ECU sends only that for no codes
  return (
    cleanedResponse === '43' || // Just the prefix
    cleanedResponse === '4300' || // Prefix + 00 (count)
    cleanedResponse === '430000' || // Prefix + 00 (count) + 0000 (padding/no data)
    cleanedResponse.includes('NODATA') || // Explicit NO DATA
    (cleanedResponse.startsWith('43') && // Starts with prefix
      cleanedResponse.substring(2).replace(/0/g, '') === '') // Rest is only zeros
  );
}

/**
 * Checks if Mode 01 PID 01 response indicates no DTCs.
 * Examines the DTC count and MIL status in the first status byte (Byte A).
 */
function checkMode0101Response(response: string | null): boolean {
  if (!response) return false;

  const cleanedResponse = cleanResponse(response);

  // Response format: 41 01 AA BB CC DD ...
  // AA = Bit-encoded status A (MIL status, DTC count)
  if (cleanedResponse.length >= 6 && cleanedResponse.startsWith('4101')) {
    const byteA = parseInt(cleanedResponse.substring(4, 6), 16);

    // Check MIL status (Bit 7 of Byte A) - should be 0 (off)
    const isMilOff = (byteA & 0x80) === 0;

    // Check DTC count (Bits 0-6 of Byte A) - should be 0
    const dtcCount = byteA & 0x7f;

    // Consider clear if MIL is off AND DTC count is 0
    return isMilOff && dtcCount === 0;
  }

  return false;
}

/**
 * Internal function to get raw DTC response
 */
export const getRawDTCs = async (
  sendCommand: SendCommandFunction,
  mode: OBD_MODE,
): Promise<RawDTCResponse | null> => {
  try {
    // Need protocol info for RawDTCResponse structure
    let protocolNum: number | null = null;
    let isCan: boolean = false;
    try {
      const protocolResponse = await sendCommand(ELM_COMMANDS.GET_PROTOCOL_NUM); // Use GET_PROTOCOL_NUM
      protocolNum = extractProtocolNumber(protocolResponse);
      isCan = (protocolNum ?? -1) >= 6 && (protocolNum ?? -1) <= 20; // Updated range check
    } catch (e) {
      console.warn('[connectionService] Could not get protocol number for raw DTCs', e);
    }


    const rawResponse = await sendCommand(mode);
    if (!rawResponse) return null;

    // Extract ECU address if present (can happen even without full connection)
    const ecuAddress = extractEcuAddresses(rawResponse)[0];

    // Simplify the response structure slightly, assuming single response string
    const rawBytes = Array.from(rawResponse).map(c => c.charCodeAt(0));
    const responseFrames = [rawResponse.split(' ')]; // Basic split, may need refinement

    return {
      rawString: rawResponse,
      rawResponse: rawBytes,
      response: responseFrames, // Placeholder frame parsing
      rawBytesResponseFromSendCommand: responseFrames, // Duplicate for now
      isCan,
      protocolNumber: protocolNum ?? 0,
      ecuAddress: ecuAddress ?? undefined,
    };
  } catch (error) {
    console.error(`[connectionService] Error getting raw DTCs: ${error}`);
    return null;
  }
};

/**
 * Add delay function
 */
const delay = (ms: number): Promise<void> =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

```

### Directory: src/utils

### File: delay.ts

**Path:** `src/utils/delay.ts`

```typescript
// filepath: src/utils/delay.ts
export const delay = (ms: number): Promise<void> => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
};

```

### File: logger.ts

**Path:** `src/utils/logger.ts`

```typescript
// filepath: src/utils/logger.ts
import {
  initLogger,
  debug,
  info,
  warn,
  error,
} from 'react-native-beautiful-logs';

// Initialize logger with config
export const logger = initLogger({
  maxLogFiles: 50,
  maxLogSizeMB: 10,
  logRetentionDays: 30,
  customSymbols: {
    debug: '🔍',
    info: '📱',
    warn: '⚠️',
    error: '❌',
  },
});

// Export wrapped logging functions
export const log = {
  debug: async (message: string, context?: object): Promise<void> => {
    await debug(`[ECU] ${message}`, context);
  },
  info: async (message: string, context?: object): Promise<void> => {
    await info(`[ECU] ${message}`, context);
  },
  warn: async (message: string, context?: object): Promise<void> => {
    await warn(`[ECU] ${message}`, context);
  },
  error: async (message: string, context?: object): Promise<void> => {
    await error(`[ECU] ${message}`, context);
  },
};

```

