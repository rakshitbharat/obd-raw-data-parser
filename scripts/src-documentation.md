# Source Code Documentation

Generated documentation of all source files in the project.

## Directory: src

### File: App.tsx

**Path:** `src/App.tsx`

```tsx
// filepath: src/App.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Text,
  Button,
  ScrollView,
} from 'react-native';
import { BluetoothProvider } from 'react-native-bluetooth-obd-manager';

import { ECUProvider } from './ecu';
import {
  ClearDTCExample,
  CustomCommandExample,
  DTCManagerExample,
  LiveDataExample,
  VINRetrievalExample,
} from './examples';

import type { JSX } from 'react';

// App component with example selector
export const App = (): JSX.Element => {
  const [activeExample, setActiveExample] = useState<string | null>(null);

  const renderExample = () => {
    switch (activeExample) {
      case 'dtc':
        return <DTCManagerExample />;
      case 'vin':
        return <VINRetrievalExample />;
      case 'livedata':
        return <LiveDataExample />;
      case 'custom':
        return <CustomCommandExample />;
      case 'cleardtc':
        return <ClearDTCExample />;
      case null:
        return (
          <View style={styles.selectionContainer}>
            <Text style={styles.title}>OBD-II Examples</Text>
            <Text style={styles.subtitle}>Select an example to run:</Text>

            <View style={styles.buttonContainer}>
              <Button
                title="DTC Manager Example"
                onPress={() => setActiveExample('dtc')}
              />
              <Button
                title="Clear DTCs Example"
                onPress={() => setActiveExample('cleardtc')}
              />
              <Button
                title="VIN Retrieval Example"
                onPress={() => setActiveExample('vin')}
              />
              <Button
                title="Live Data Example"
                onPress={() => setActiveExample('livedata')}
              />
              <Button
                title="Custom Commands Example"
                onPress={() => setActiveExample('custom')}
              />
            </View>
          </View>
        );
    }
    return null; // Ensure all code paths return a value
  };

  return (
    <BluetoothProvider>
      <ECUProvider>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.scrollView}>
            {activeExample && (
              <View style={styles.backButtonContainer}>
                <Button
                  title="Back to Examples"
                  onPress={() => setActiveExample(null)}
                />
              </View>
            )}
            {renderExample()}
          </ScrollView>
        </SafeAreaView>
      </ECUProvider>
    </BluetoothProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  selectionContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  backButtonContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
});

```

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

#### Directory: src/ecu/retrievers

### File: BaseDTCRetriever.ts

**Path:** `src/ecu/retrievers/BaseDTCRetriever.ts`

```typescript
// filepath: src/ecu/retrievers/BaseDTCRetriever.ts
import { log } from '../../utils/logger';
import { ELM_COMMANDS, RESPONSE_KEYWORDS, DELAYS_MS } from '../utils/constants';
import {
  cleanResponse,
  isResponseError,
  extractEcuAddresses,
  isResponseOk,
} from '../utils/helpers';

import type { SendCommandFunction } from '../utils/types';

export interface RawDTCResponse {
  rawString: string | null;
  rawResponse: number[] | null;
  response: string[][] | null;
  rawBytesResponseFromSendCommand: string[][];
  isCan: boolean;
  protocolNumber: number;
  ecuAddress: string | undefined;
}

export class BaseDTCRetriever {
  // Protocol-related constants
  static PROTOCOL_TYPES = {
    CAN: 'CAN',
    KWP: 'KWP',
    ISO9141: 'ISO9141',
    J1850: 'J1850',
    UNKNOWN: 'UNKNOWN',
  };

  static HEADER_FORMATS = {
    CAN_11BIT: '11bit',
    CAN_29BIT: '29bit',
    KWP: 'kwp',
    ISO9141: 'iso9141',
    J1850: 'j1850',
    UNKNOWN: 'unknown',
  };

  static PROTOCOL_STATES = {
    INITIALIZED: 'INITIALIZED',
    CONFIGURING: 'CONFIGURING',
    READY: 'READY',
    ERROR: 'ERROR',
  };

  // Error patterns merged from OBDUtils.js and ElmProtocolInit.js
  static ERROR_RESPONSES = [
    RESPONSE_KEYWORDS.UNABLE_TO_CONNECT,
    RESPONSE_KEYWORDS.BUS_INIT, // Covers BUS INIT: ERROR
    RESPONSE_KEYWORDS.CAN_ERROR,
    RESPONSE_KEYWORDS.BUS_ERROR, // Covers BUS ERROR, BUSINIERR*
    RESPONSE_KEYWORDS.FB_ERROR,
    RESPONSE_KEYWORDS.DATA_ERROR, // Covers DATA ERROR, <DATA ERROR>
    RESPONSE_KEYWORDS.ERROR, // General ERROR
    RESPONSE_KEYWORDS.BUFFER_FULL,
    RESPONSE_KEYWORDS.BUS_BUSY,
    RESPONSE_KEYWORDS.NO_DATA, // Treat NO DATA as an error for general command validation
    RESPONSE_KEYWORDS.RX_ERROR, // Check if this is still needed?
    RESPONSE_KEYWORDS.STOPPED,
    'TIMEOUT', // Added TIMEOUT
    '7F', // Added 7F (Negative response)
    'UNABLE', // Part of UNABLE TO CONNECT
    'ACT ALERT', // From original JS
    'ERR', // From original JS
    '?', // ELM command error
  ].map(e => e.replace(/\s/g, '').toUpperCase()); // Pre-process for efficient matching

  // Header recognition patterns
  static CAN_11BIT_HEADER = /^7E[8-F]/i; // Use case-insensitive flag
  static CAN_29BIT_HEADER = /^18DAF1/i; // Use case-insensitive flag
  static KWP_HEADER = /^(48|68|81)/i; // Use case-insensitive flag, added 81 based on ISO/KWP formats
  static ISO9141_HEADER = /^(48|6B)/i; // Use case-insensitive flag
  static J1850_HEADER = /^(41|48|6B|A8|B8)/i; // Use case-insensitive flag

  static SERVICE_MODES = {
    MODE03: '03',
    MODE07: '07',
    MODE0A: '0A',
  };

  // Increased timeouts based on JS constants and testing
  protected static DATA_TIMEOUT = 10000; // For multi-frame reads
  protected static COMMAND_TIMEOUT = 5000; // Standard command timeout

  protected sendCommand: SendCommandFunction;
  protected mode: string;
  protected responsePrefix: string;

  // Protocol state
  protected isCan: boolean = false;
  protected protocolNumber: number = 0;
  protected protocolType: string = BaseDTCRetriever.PROTOCOL_TYPES.UNKNOWN;
  protected headerFormat: string = BaseDTCRetriever.HEADER_FORMATS.UNKNOWN;
  protected ecuAddress: string | null = null;
  protected protocolState: string =
    BaseDTCRetriever.PROTOCOL_STATES.INITIALIZED;

  // Communication state
  protected isHeaderEnabled: boolean = false;
  protected isEchoEnabled: boolean = false; // Assume echo off (ATE0)
  protected lineFeedsDisabled: boolean = false; // Assume linefeeds off (ATL0)
  protected spacesDisabled: boolean = false; // Assume spaces off (ATS0)

  /**
   * Creates a new DTC Retriever
   * @param sendCommand - Function to send commands to the adapter
   * @param mode - OBD service mode ('03', '07', '0A')
   */
  constructor(sendCommand: SendCommandFunction, mode: string) {
    this.sendCommand = sendCommand;
    this.mode = mode;

    // Calculate response prefix (e.g., mode 03 -> response prefix 43)
    this.responsePrefix = (parseInt(mode, 16) + 0x40)
      .toString(16)
      .toUpperCase();
  }

  /**
   * Helper method to create a delay.
   */
  protected delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Configure adapter for optimal communication
   * Implements settings initialization from original code (ElmProtocolInit.js, connectionService.ts)
   */
  protected async configureAdapter(): Promise<void> {
    await log.info(
      `[${this.constructor.name}] Configuring adapter for DTC retrieval (Mode ${this.mode})`,
    );

    // Step 1: Reset the adapter for a clean state
    try {
      // Use direct sendCommand for adapter reset - not sending to vehicle
      await this.sendCommand(ELM_COMMANDS.RESET);
      await this.delay(DELAYS_MS.RESET); // Longer delay after reset
    } catch (error) {
      await log.warn(`[${this.constructor.name}] Reset warning:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue even if reset fails
    }

    // Step 2: Configure communication parameters
    const setupCommands = [
      // Basic settings for clean communication (from ElmProtocolInit.js / connectionService.ts)
      { cmd: ELM_COMMANDS.ECHO_OFF, desc: 'Disable echo' },
      { cmd: ELM_COMMANDS.LINEFEEDS_OFF, desc: 'Disable linefeeds' },
      { cmd: ELM_COMMANDS.SPACES_OFF, desc: 'Disable spaces' },
      // Enable headers initially for protocol detection and ECU address extraction
      { cmd: ELM_COMMANDS.HEADERS_ON, desc: 'Enable headers' },
      // Set adaptive timing (ATAT1 is safer, ATAT2 more aggressive) - Use ATAT1 default
      {
        cmd: ELM_COMMANDS.ADAPTIVE_TIMING_1,
        desc: 'Set adaptive timing mode 1',
      },
      // Set a reasonable default timeout (e.g., 100ms = 64 hex)
      // const defaultTimeoutHex = DELAYS_MS.TIMEOUT_NORMAL_MS.toString(16).toUpperCase().padStart(2,'0');
      // { cmd: `${ELM_COMMANDS.SET_TIMEOUT}${defaultTimeoutHex}`, desc: `Set timeout to ${DELAYS_MS.TIMEOUT_NORMAL_MS}ms` },
    ];

    for (const { cmd, desc } of setupCommands) {
      await log.debug(`[${this.constructor.name}] Setup: ${desc}`);
      try {
        // Use direct sendCommand for adapter configuration - moderate timeout
        const response = await this.sendCommand(cmd, 2000);

        // Track communication settings
        if (cmd === ELM_COMMANDS.ECHO_OFF) this.isEchoEnabled = false;
        else if (cmd === ELM_COMMANDS.LINEFEEDS_OFF)
          this.lineFeedsDisabled = true;
        else if (cmd === ELM_COMMANDS.SPACES_OFF) this.spacesDisabled = true;
        else if (cmd === ELM_COMMANDS.HEADERS_ON) this.isHeaderEnabled = true; // Mark headers as ON

        // Quick validation - allow '?' response for unsupported commands
        if (
          response &&
          !isResponseOk(response) &&
          !this.isErrorResponse(response) &&
          response.trim() !== '?'
        ) {
          await log.warn(
            `[${this.constructor.name}] Unexpected response for ${cmd}: ${response}`,
          );
        } else if (response?.trim() === '?') {
          await log.warn(
            `[${this.constructor.name}] Command "${cmd}" returned '?', possibly unsupported but continuing.`,
          );
        }
      } catch (error) {
        await log.error(
          `[${this.constructor.name}] Error during setup command ${cmd}:`,
          { error: error instanceof Error ? error.message : String(error) },
        );
        // Continue if one setup command fails? Or stop? Let's continue for now.
      }
      await this.delay(DELAYS_MS.COMMAND_SHORT); // Short delay between commands
    }

    // Step 3: Detect protocol
    this.protocolState = BaseDTCRetriever.PROTOCOL_STATES.CONFIGURING;
    await this.detectProtocol(); // This updates this.isCan, this.protocolNumber, etc.

    // Step 4: Protocol-specific configuration (like flow control for CAN)
    await this.configureForProtocol();

    // Step 5: After detection and specific configuration, potentially disable headers
    // if not needed for the current protocol's response parsing.
    if (!this.shouldKeepHeadersEnabled()) {
      try {
        await log.debug(
          `[${this.constructor.name}] Disabling headers for cleaner responses (ATH0)`,
        );
        await this.sendCommand(ELM_COMMANDS.HEADERS_OFF, 2000);
        this.isHeaderEnabled = false;
      } catch (error) {
        await log.warn(
          `[${this.constructor.name}] Failed to disable headers (ATH0)`,
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
    }

    // Step 6: Set protocol state to ready
    this.protocolState = BaseDTCRetriever.PROTOCOL_STATES.READY;

    await log.info(
      `[${this.constructor.name}] Adapter configuration complete. Protocol: ${this.protocolType} (${this.protocolNumber}), isCAN: ${this.isCan}, Headers: ${this.isHeaderEnabled}`,
    );
  }

  /**
   * Applies protocol-specific configurations (e.g., CAN Flow Control).
   * Logic based on ElmProtocolHelper.js and BaseDTCRetriever previous implementation.
   */
  protected async configureForProtocol(): Promise<void> {
    await log.debug(
      `[${this.constructor.name}] Applying config for protocol: ${this.protocolType}`,
    );

    if (this.isCan) {
      // CAN-specific configuration
      // Enable CAN Auto Formatting for easier parsing (usually default)
      try {
        await log.debug(
          `[${this.constructor.name}] Enabling CAN Auto Formatting (ATCAF1)`,
        );
        await this.sendCommand(ELM_COMMANDS.CAN_AUTO_FORMAT_ON, 2000);
      } catch (error) {
        await log.warn(
          `[${this.constructor.name}] Failed to enable CAN Auto Formatting`,
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
      await this.delay(DELAYS_MS.COMMAND_SHORT);

      // Set default Flow Control settings (can be optimized later)
      // These settings are common for many ECUs.
      const flowControlHeader =
        this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT
          ? '7E0' // Default functional address for 11-bit request
          : '18DA10F1'; // Default physical address for 29-bit response from ECU F1
      const flowControlData = '300000'; // Block Size 0, Separation Time 0ms
      const flowControlMode = '1'; // Mode 1 (Auto Flow Control)

      await log.debug(
        `[${this.constructor.name}] Setting default CAN flow control: Header=${flowControlHeader}, Data=${flowControlData}, Mode=${flowControlMode}`,
      );
      try {
        // Use direct sendCommand for adapter configuration
        await this.sendCommand(`ATFCSH${flowControlHeader}`, 2000);
        await this.delay(DELAYS_MS.COMMAND_SHORT);
        await this.sendCommand(`ATFCSD${flowControlData}`, 2000);
        await this.delay(DELAYS_MS.COMMAND_SHORT);
        await this.sendCommand(`ATFCSM${flowControlMode}`, 2000);
        await this.delay(DELAYS_MS.COMMAND_SHORT);
      } catch (error) {
        await log.warn(
          `[${this.constructor.name}] Default CAN flow control setup warning:`,
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
    } else if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP) {
      // KWP-specific configuration (Use ATAT2 for potentially faster KWP)
      try {
        await log.debug(
          `[${this.constructor.name}] Setting KWP timing (ATAT2)`,
        );
        await this.sendCommand(ELM_COMMANDS.ADAPTIVE_TIMING_2, 2000);
        await this.delay(DELAYS_MS.COMMAND_SHORT);
      } catch (error) {
        await log.warn(
          `[${this.constructor.name}] KWP timing (ATAT2) warning:`,
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
    } else {
      await log.debug(
        `[${this.constructor.name}] No specific configuration needed for protocol ${this.protocolType}`,
      );
    }
  }

  /**
   * Determine if headers should remain enabled for this protocol.
   * Headers are generally useful for CAN to distinguish responses from different ECUs.
   * For non-CAN, they can sometimes be disabled for cleaner data if only one ECU responds.
   */
  protected shouldKeepHeadersEnabled(): boolean {
    // Keep headers ON for CAN protocols to identify ECU responses.
    // Also keep ON if protocol is unknown, just in case.
    if (
      this.isCan ||
      this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.UNKNOWN
    ) {
      return true;
    }
    // Disable headers for non-CAN protocols for potentially cleaner responses,
    // assuming single ECU communication is typical.
    return false;
  }

  /**
   * Check if a response string indicates an ELM or OBD error.
   * Uses the static ERROR_RESPONSES list.
   */
  protected isErrorResponse(response: string | null): boolean {
    return isResponseError(response); // Use the helper function
  }

  /**
   * Extract ECU address (header) from a response line.
   * Relies on static header patterns and current protocol info.
   */
  protected extractEcuAddress(line: string): string | null {
    if (!line) return null;
    const trimmedLine = line.trim().toUpperCase();

    const addresses = extractEcuAddresses(trimmedLine);
    const firstAddress = addresses.length > 0 ? addresses[0] : null;

    return firstAddress !== undefined ? firstAddress : null;
  }

  /**
   * Creates a default empty RawDTCResponse object.
   */
  protected createEmptyResponse(): RawDTCResponse {
    return {
      rawString: null,
      rawResponse: null,
      response: null, // Use null for empty data
      rawBytesResponseFromSendCommand: [], // Use empty array for empty data
      isCan: this.isCan,
      protocolNumber: this.protocolNumber,
      ecuAddress: this.ecuAddress ?? undefined, // Use undefined if null
    };
  }

  /**
   * Main method to retrieve raw DTCs for the configured mode.
   * Handles adapter configuration, command sending, retries, and basic response processing.
   */
  async retrieveRawDTCs(): Promise<RawDTCResponse | null> {
    const maxRetries = 3;
    let retryCount = 0;

    await log.debug(
      `[${this.constructor.name}] Starting Mode ${this.mode} retrieval...`,
    );

    // Ensure adapter is configured before first attempt
    await this.configureAdapter();

    // Check if configuration resulted in an error state
    if (this.protocolState === BaseDTCRetriever.PROTOCOL_STATES.ERROR) {
      await log.error(
        `[${this.constructor.name}] Adapter configuration failed. Aborting DTC retrieval.`,
      );
      return null;
    }

    while (retryCount < maxRetries) {
      try {
        await log.debug(
          `[${this.constructor.name}] Attempt ${retryCount + 1}/${maxRetries}`,
        );

        // verifyAndGetResponse handles sending the command (this.mode) and processing
        const result = await this.verifyAndGetResponse();

        // Handle null result (e.g., timeout, critical error during send/receive)
        if (result === null) {
          await log.warn(
            `[${this.constructor.name}] No valid response or critical error during attempt ${retryCount + 1}.`,
          );
          retryCount++;
          if (retryCount < maxRetries) {
            await log.debug(
              `[${this.constructor.name}] Retrying after delay...`,
            );
            // Optional: Attempt reconfiguration or reset before retry?
            // await this.configureAdapter(); // Reconfigure before retry
            await this.delay(DELAYS_MS.RETRY); // Wait before retry
          }
          continue; // Go to next retry attempt
        }

        // Handle NO DATA response (valid response, but means no DTCs)
        // Check both rawString and the potentially cleaned response in result.response
        const hasNoData = result.rawString
          ?.toUpperCase()
          .includes(RESPONSE_KEYWORDS.NO_DATA);
        const isEmptyResponse =
          result.response === null ||
          result.response.length === 0 ||
          (result.response?.length === 1 && result.response[0]?.length === 0);

        if (hasNoData || isEmptyResponse) {
          await log.debug(
            `[${this.constructor.name}] NO DATA response or empty data received - interpreting as no DTCs present.`,
          );
          // Create an empty response object, but mark as successful retrieval
          return this.createEmptyResponse();
        }

        // If we got here, we have a valid response with data.
        // Try to extract ECU address if not already set during configuration/detection
        if (!this.ecuAddress && result.rawString) {
          const addresses = extractEcuAddresses(result.rawString);
          if (addresses.length > 0) {
            this.ecuAddress = addresses[0] ?? null; // Use the first detected address or null
            await log.info(
              `[${this.constructor.name}] Extracted ECU address from response: ${this.ecuAddress}`,
            );
          }
        }

        // Return the processed response
        return {
          rawString: result.rawString,
          rawResponse: result.rawResponse,
          response: result.response,
          // Ensure rawBytesResponseFromSendCommand matches the structure of `response`
          rawBytesResponseFromSendCommand: result.response ?? [],
          isCan: this.isCan,
          protocolNumber: this.protocolNumber,
          ecuAddress: this.ecuAddress ?? undefined,
        };
      } catch (error: unknown) {
        // Catch errors specifically from verifyAndGetResponse or subsequent processing
        await log.error(
          `[${this.constructor.name}] Error during retrieval attempt ${retryCount + 1}:`,
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
        retryCount++;

        if (retryCount < maxRetries) {
          await log.debug(`[${this.constructor.name}] Retrying after error...`);
          await this.delay(DELAYS_MS.RETRY); // Wait before retry
        }
      }
    } // End retry loop

    // All retries failed
    await log.error(
      `[${this.constructor.name}] Failed to retrieve DTCs for Mode ${this.mode} after ${maxRetries} attempts`,
    );
    this.protocolState = BaseDTCRetriever.PROTOCOL_STATES.ERROR; // Mark state as error
    return null; // Return null after all retries fail
  }

  /**
   * Processes CAN multi-frame responses by grouping frames by header.
   * Used within handleCANResponse.
   */
  protected processFramesByHeader(
    framesByHeader: Record<string, string[]>,
    line: string,
  ): void {
    // Match 11-bit (7Ex) or 29-bit (18DAxxxx) headers at the start of the line
    // Allow optional frame number like '0:' or '1:' before the header
    const headerMatch = line.match(
      /^(?:[0-9A-F]{1,2}:)?(7E[8-F]|18DA[0-9A-F]{4})/i,
    );
    if (headerMatch?.[1]) {
      const headerKey = headerMatch[1].toUpperCase();
      if (!framesByHeader[headerKey]) {
        framesByHeader[headerKey] = [];
      }
      // Extract content *after* the full match (including optional frame number and the header)
      const lineContent = line.substring(headerMatch[0].length).trim();
      if (lineContent) {
        // Only add if there's actual data after the header
        framesByHeader[headerKey].push(lineContent);
      }
    } else {
      // If no specific CAN header is found, add to 'unknown' for potential later processing
      // But only if the line isn't an ELM status message
      const cleanedLine = cleanResponse(line);
      if (
        cleanedLine &&
        !this.isErrorResponse(line) &&
        line !== '>' &&
        !line.includes('SEARCHING')
      ) {
        if (!framesByHeader['unknown']) {
          framesByHeader['unknown'] = [];
        }
        framesByHeader['unknown'].push(line.trim()); // Add the original trimmed line
      }
    }
  }

  /**
   * Handles CAN responses, including potential multi-frame ISO-TP messages.
   */
  protected async handleCANResponse(response: string): Promise<string[][]> {
    if (!response) return [];

    const lines = response.split(/[\r\n]+/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    // Check if this *looks* like a multi-frame response (multiple lines, potential ISO-TP indicators)
    const mightBeMultiFrame =
      lines.length > 1 &&
      lines.some(
        line =>
          /^\s*[0-9A-F]{1,2}:/.test(line) || /^[123]/.test(cleanResponse(line)),
      );

    if (this.isCan && mightBeMultiFrame) {
      // Use the more sophisticated multi-frame handling logic
      return await this.handleCANMultiFrame(lines);
    }

    // Otherwise, handle as simple frames (each line is a frame or part of one)
    // Process each line to extract hex bytes
    const processedFrames = lines.map(line =>
      this.extractBytesFromSingleFrame(line),
    );
    // Filter out any empty arrays resulting from processing status lines etc.
    return processedFrames.filter(frame => frame.length > 0);
  }

  /**
   * Parses raw response string into structured byte arrays (string[][]).
   * Determines parsing strategy based on the detected protocol.
   */
  protected async processRawResponse(response: string): Promise<string[][]> {
    if (!response) return [];

    // Use the appropriate handler based on protocol
    if (this.isCan) {
      return await this.handleCANResponse(response);
    } else if (this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP) {
      return this.handleKWPResponse(response);
    } else {
      // Default handling for ISO9141, J1850, or UNKNOWN (treat as single frame mostly)
      const cleanedResponse = cleanResponse(response);
      // Assume non-CAN responses are single logical messages, possibly split by lines
      // Extract bytes from the entire cleaned response first
      const allBytes = this.extractBytesFromSingleFrame(cleanedResponse);
      // Only return if bytes were actually extracted
      return allBytes.length > 0 ? [allBytes] : [];
    }
  }

  /**
   * Extract hex byte pairs from a single frame or line of response data.
   * Removes known prefixes (response code, headers if enabled) before extracting bytes.
   */
  protected extractBytesFromSingleFrame(line: string): string[] {
    if (!line) return [];

    let dataPart = line.trim().toUpperCase();

    // 1. Remove ELM frame numbering if present (e.g., "0:", "1:")
    dataPart = dataPart.replace(/^\s*[0-9A-F]{1,2}:\s*/, '');

    // 2. Remove Mode response prefix (e.g., "43" for Mode 03)
    if (dataPart.startsWith(this.responsePrefix)) {
      dataPart = dataPart.substring(this.responsePrefix.length);
    }

    // 3. Remove protocol headers if they are enabled AND present
    if (this.isHeaderEnabled) {
      if (this.isCan) {
        if (
          this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT &&
          BaseDTCRetriever.CAN_11BIT_HEADER.test(dataPart)
        ) {
          dataPart = dataPart.substring(3); // Remove 7Ex
        } else if (
          this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT &&
          BaseDTCRetriever.CAN_29BIT_HEADER.test(dataPart)
        ) {
          dataPart = dataPart.substring(6); // Remove 18DAF1
        }
        // Handle 29bit physical addressing header more specifically if needed
        // else if (this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT && /^18DA[0-9A-F]{4}/i.test(dataPart)) {
        //    dataPart = dataPart.substring(8); // Remove 18DAxxxx
        // }
      } else if (
        this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.KWP &&
        BaseDTCRetriever.KWP_HEADER.test(dataPart)
      ) {
        // KWP header format (e.g., 81 F1 11 43...) - Remove first 3 bytes (Format, Target, Source)
        if (dataPart.length >= 6) dataPart = dataPart.substring(6);
      } else if (
        this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.ISO9141 &&
        BaseDTCRetriever.ISO9141_HEADER.test(dataPart)
      ) {
        // ISO header format (e.g., 48 6B 11 43...) - Remove first 3 bytes
        if (dataPart.length >= 6) dataPart = dataPart.substring(6);
      } else if (
        this.protocolType === BaseDTCRetriever.PROTOCOL_TYPES.J1850 &&
        BaseDTCRetriever.J1850_HEADER.test(dataPart)
      ) {
        // J1850 header format (varies) - Try removing first 3 bytes as a guess
        if (dataPart.length >= 6) dataPart = dataPart.substring(6);
      }
    }

    // 4. Remove any remaining spaces and non-hex characters
    dataPart = dataPart.replace(/[^0-9A-F]/g, '');

    // 5. Split into pairs of characters (bytes)
    const bytes: string[] = [];
    for (let i = 0; i + 1 < dataPart.length; i += 2) {
      bytes.push(dataPart.substring(i, i + 2));
    }

    // Filter out potential "00" padding bytes often seen at the end?
    // This might be too aggressive, as "00" can be valid data.
    // Let's keep them for now and let the DTC parser handle "0000".
    // const filteredBytes = bytes.filter((byte, index, arr) => {
    //     // Keep byte if it's not "00" OR if it's not the last byte in a sequence of "00"s
    //     return byte !== '00' || (index + 1 < arr.length && arr[index + 1] !== '00');
    // });

    return bytes;
  }

  /**
   * Specifically handles CAN multi-frame messages (ISO-TP).
   * Reassembles segmented messages based on frame indicators (10, 21, 22...).
   */
  protected async handleCANMultiFrame(lines: string[]): Promise<string[][]> {
    await log.debug(
      `[${this.constructor.name}] Detected multi-frame CAN response with ${lines.length} lines. Processing...`,
    );

    // Group frames by header using the helper function
    const framesByHeader: { [header: string]: string[] } = {};
    for (const line of lines) {
      this.processFramesByHeader(framesByHeader, line);
    }

    const result: string[][] = [];

    // Process each group of frames associated with a header
    for (const [header, frames] of Object.entries(framesByHeader)) {
      await log.debug(
        `[${this.constructor.name}] Processing ${frames.length} frame(s) for header ${header}`,
      );

      if (header === 'unknown') {
        // For frames without a recognized CAN header, process each line individually
        for (const frame of frames) {
          const bytes = this.extractBytesFromSingleFrame(frame);
          if (bytes.length > 0) {
            result.push(bytes);
          }
        }
        continue; // Move to the next header group
      }

      // --- ISO-TP Reconstruction Logic ---
      let combinedData = '';
      let expectedFrameIndex = 1; // ISO-TP sequence number starts at 1 for CF
      let isMultiFrameSequenceActive = false;
      let totalLengthExpected = 0;

      for (const frame of frames) {
        // Clean the frame data part (remove potential spaces)
        const dataPart = frame.replace(/\s/g, '');
        if (!dataPart) continue;

        // Check for ISO-TP frame type indicator (first hex digit)
        const frameTypeNibble = dataPart.substring(0, 1);

        if (frameTypeNibble === '0') {
          // Single Frame (SF) - PCI: 0L LL...
          const length = parseInt(dataPart.substring(1, 2), 16);
          if (!isNaN(length) && length > 0 && length <= 7) {
            combinedData = dataPart.substring(2, 2 + length * 2); // Extract data bytes
            await log.debug(
              `[${this.constructor.name}] Header ${header}: Found Single Frame (SF), length=${length}, data=${combinedData}`,
            );
            // Single frame message is complete, break inner loop for this header
            break;
          } else {
            await log.warn(
              `[${this.constructor.name}] Header ${header}: Invalid Single Frame PCI: ${dataPart}`,
            );
            // Treat as unknown data? For now, skip.
          }
        } else if (frameTypeNibble === '1') {
          // First Frame (FF) - PCI: 1L LL LL...
          if (isMultiFrameSequenceActive) {
            await log.warn(
              `[${this.constructor.name}] Header ${header}: Received First Frame while already in a multi-frame sequence. Resetting sequence.`,
            );
          }
          const lengthHex = dataPart.substring(1, 4); // Get 12 bits for length
          totalLengthExpected = parseInt(lengthHex, 16);
          if (!isNaN(totalLengthExpected) && totalLengthExpected > 7) {
            combinedData = dataPart.substring(4); // Extract initial data bytes
            isMultiFrameSequenceActive = true;
            expectedFrameIndex = 1; // Expect Consecutive Frame with index 1 next
            await log.debug(
              `[${this.constructor.name}] Header ${header}: Found First Frame (FF), totalLength=${totalLengthExpected}, initialData=${combinedData}`,
            );
          } else {
            await log.warn(
              `[${this.constructor.name}] Header ${header}: Invalid First Frame PCI or length: ${dataPart}`,
            );
            // Reset sequence state
            isMultiFrameSequenceActive = false;
            combinedData = '';
          }
        } else if (frameTypeNibble === '2' && isMultiFrameSequenceActive) {
          // Consecutive Frame (CF) - PCI: 2N ...
          const sequenceNibble = dataPart.substring(1, 2);
          const sequenceNumber = parseInt(sequenceNibble, 16);
          if (!isNaN(sequenceNumber)) {
            if (sequenceNumber === expectedFrameIndex % 16) {
              // Check sequence number (0-F wrap around)
              combinedData += dataPart.substring(2); // Append data bytes
              expectedFrameIndex++;
              await log.debug(
                `[${this.constructor.name}] Header ${header}: Found Consecutive Frame (CF), sequence=${sequenceNumber}, appendedData=${dataPart.substring(2)}`,
              );
            } else {
              await log.warn(
                `[${this.constructor.name}] Header ${header}: Unexpected CF sequence. Expected ${expectedFrameIndex % 16}, got ${sequenceNumber}. Frame: ${dataPart}. Resetting sequence.`,
              );
              // Sequence error, discard this message for this header
              isMultiFrameSequenceActive = false;
              combinedData = '';
              break; // Stop processing frames for this header due to error
            }
          } else {
            await log.warn(
              `[${this.constructor.name}] Header ${header}: Invalid Consecutive Frame PCI: ${dataPart}`,
            );
          }
        } else if (frameTypeNibble === '3') {
          // Flow Control (FC) - PCI: 3S BS ST
          // Ignore flow control frames sent by the ECU (we only care about data)
          await log.debug(
            `[${this.constructor.name}] Header ${header}: Ignoring Flow Control Frame (FC): ${dataPart}`,
          );
        } else {
          // Not a recognized ISO-TP frame or not part of an active sequence
          await log.debug(
            `[${this.constructor.name}] Header ${header}: Treating as single/unknown frame data: ${frame}`,
          );
          // If we weren't in a sequence, treat this as a single frame's data
          if (!isMultiFrameSequenceActive) {
            combinedData = dataPart; // Replace any previous data for this header
            break; // Assume single frame complete
          }
          // If we *were* in a sequence, this might be an error or end of data? Ignore for now.
        }

        // Check if we have received the expected total length for multi-frame
        if (
          isMultiFrameSequenceActive &&
          combinedData.length >= totalLengthExpected * 2
        ) {
          await log.debug(
            `[${this.constructor.name}] Header ${header}: Multi-frame message complete. Expected ${totalLengthExpected} bytes, received ${combinedData.length / 2}.`,
          );
          // Trim excess data if any (shouldn't happen with correct length)
          combinedData = combinedData.substring(0, totalLengthExpected * 2);
          break; // Message complete for this header
        }
      } // End of loop through frames for one header

      // Convert the final combined data string (hex) into byte array
      if (combinedData) {
        const bytes: string[] = [];
        for (let i = 0; i + 1 < combinedData.length; i += 2) {
          bytes.push(combinedData.substring(i, i + 2));
        }
        if (bytes.length > 0) {
          result.push(bytes);
        }
      } else if (header !== 'unknown') {
        await log.warn(
          `[${this.constructor.name}] No valid data assembled for header ${header}.`,
        );
      }
    } // End of loop through headers

    return result;
  }

  /**
   * Enhanced method to send commands with timing appropriate for the detected protocol.
   */
  protected async sendCommandWithTiming(
    command: string,
    timeout?: number,
  ): Promise<string | null> {
    // Determine timeout based on protocol type and command
    let effectiveTimeout = timeout ?? BaseDTCRetriever.COMMAND_TIMEOUT; // Default timeout

    // Use longer timeouts for non-CAN protocols, especially for data retrieval commands
    if (!this.isCan) {
      effectiveTimeout = timeout ?? BaseDTCRetriever.DATA_TIMEOUT; // Longer default for non-CAN data reads
      await log.debug(
        `[${this.constructor.name}] Using longer timeout (${effectiveTimeout}ms) for non-CAN protocol.`,
      );
    } else {
      // For CAN, use standard command timeout unless data timeout is explicitly requested
      effectiveTimeout = timeout ?? BaseDTCRetriever.COMMAND_TIMEOUT;
    }

    await log.debug(
      `[${this.constructor.name}] Sending command "${command}" with timeout ${effectiveTimeout}ms`,
    );
    return await this.sendCommand(command, effectiveTimeout);
  }

  /**
   * Tries different CAN flow control configurations to optimize communication.
   * Based on ElmProtocolHelper.tryFlowControlConfigs.
   */
  protected async tryOptimizeFlowControl(canID?: string): Promise<boolean> {
    if (!this.isCan) {
      await log.debug(
        `[${this.constructor.name}] Skipping flow control optimization for non-CAN protocol.`,
      );
      return false; // Optimization only applies to CAN
    }

    // Determine the base flow control header to use
    let flowControlHeader = canID; // Use provided ID if available
    if (!flowControlHeader) {
      // Determine default based on protocol format
      flowControlHeader =
        this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT
          ? '7E0' // ECU address that receives the request (tester is often F1)
          : '18DA10F1'; // Physical address for ECU F1 responding to tester 10
    }
    // Note: ATFCSH should be set to the *ECU's response header* (e.g., 7E8, 18DAF110)
    // Let's correct the logic - we need the ECU's expected response header.
    // This might require a successful 0100 response first to extract the ECU address.
    // Let's use the *typical* ECU response headers as defaults for now.
    const ecuResponseHeader =
      this.headerFormat === BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT
        ? '7E8' // Typical ECU response header
        : '18DAF110'; // Typical ECU response header (Tester F1)

    await log.debug(
      `[${this.constructor.name}] Optimizing CAN flow control. Target ECU Response Header: ${ecuResponseHeader}`,
    );

    // Configurations to try (based on ElmProtocolHelper)
    const flowControlConfigs = [
      // Standard configuration
      {
        fcsh: ecuResponseHeader,
        fcsd: '300000',
        fcsm: '1',
        desc: 'Standard (BS=0, ST=0, Mode=1)',
      },
      // No wait mode
      {
        fcsh: ecuResponseHeader,
        fcsd: '300000',
        fcsm: '0',
        desc: 'No Wait (BS=0, ST=0, Mode=0)',
      },
      // Extended wait time (8ms)
      {
        fcsh: ecuResponseHeader,
        fcsd: '300008',
        fcsm: '1',
        desc: 'Extended Wait (BS=0, ST=8ms, Mode=1)',
      },
      // Different block size (e.g., 4 frames) - less common
      // { fcsh: ecuResponseHeader, fcsd: '300400', fcsm: '1', desc: 'Block Size 4 (BS=4, ST=0, Mode=1)' },
    ];

    for (const config of flowControlConfigs) {
      await log.debug(
        `[${this.constructor.name}] Trying Flow Control: ${config.desc}`,
      );
      try {
        // Set flow control parameters - use direct sendCommand (short timeout ok)
        await this.sendCommand(`ATFCSH${config.fcsh}`, 2000);
        await this.delay(DELAYS_MS.COMMAND_SHORT);
        await this.sendCommand(`ATFCSD${config.fcsd}`, 2000);
        await this.delay(DELAYS_MS.COMMAND_SHORT);
        await this.sendCommand(`ATFCSM${config.fcsm}`, 2000);
        await this.delay(DELAYS_MS.COMMAND_SHORT);

        // Test with the actual DTC command again - use timing
        const testResponse = await this.sendCommandWithTiming(this.mode);

        if (
          testResponse &&
          !this.isErrorResponse(testResponse) &&
          !testResponse.includes(RESPONSE_KEYWORDS.BUFFER_FULL)
        ) {
          await log.info(
            `[${this.constructor.name}] Flow control optimization successful with: ${config.desc}`,
          );
          return true; // Found working configuration
        } else {
          await log.debug(
            `[${this.constructor.name}] Flow control config (${config.desc}) did not yield valid response: ${testResponse ?? 'null'}`,
          );
        }
      } catch (error) {
        await log.warn(
          `[${this.constructor.name}] Flow control config failed (${config.desc}):`,
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
      await this.delay(DELAYS_MS.COMMAND_SHORT); // Wait before trying next config
    }

    await log.warn(
      `[${this.constructor.name}] Could not optimize flow control after trying all configurations.`,
    );
    return false; // None of the configurations worked reliably
  }

  /**
   * Sends the DTC request command and verifies/processes the response.
   * Handles potential flow control issues for CAN.
   * Based on logic flow from BaseDTCRetriever previous implementation and ElmProtocolHelper.
   */
  protected async verifyAndGetResponse(): Promise<{
    rawString: string | null;
    rawResponse: number[] | null; // Byte values of rawString
    response: string[][] | null; // Parsed hex byte arrays
  } | null> {
    try {
      // Ensure protocol state is ready before sending command
      if (this.protocolState !== BaseDTCRetriever.PROTOCOL_STATES.READY) {
        await log.warn(
          `[${this.constructor.name}] Protocol not ready (State: ${this.protocolState}). Aborting command ${this.mode}.`,
        );
        // Attempt reconfiguration? Or just fail? Let's fail for now.
        this.protocolState = BaseDTCRetriever.PROTOCOL_STATES.ERROR;
        return null;
      }

      // Send the command to retrieve DTCs for the specific mode
      const result = await this.sendCommandWithTiming(this.mode);

      // --- Response Validation ---
      if (result === null) {
        await log.warn(
          `[${this.constructor.name}] No response received for command ${this.mode}.`,
        );
        // Consider this an error state? Maybe transient timeout.
        // Let the retry loop in retrieveRawDTCs handle this. Return null for now.
        return null;
      }
      if (this.isErrorResponse(result)) {
        await log.warn(
          `[${this.constructor.name}] Error response received for command ${this.mode}: ${result}`,
        );
        // If specific errors occur, change state
        if (
          result.includes('UNABLE') ||
          result.includes('BUS ERROR') ||
          result.includes('TIMEOUT')
        ) {
          this.protocolState = BaseDTCRetriever.PROTOCOL_STATES.ERROR;
        }
        // Let the retry loop handle retrying. Return null for now.
        return null;
      }

      // --- Flow Control Check (CAN only) ---
      // Check for indicators of flow control issues specifically for CAN protocols
      const needsFlowControlCheck =
        this.isCan &&
        (result.includes(RESPONSE_KEYWORDS.BUFFER_FULL) ||
          result.includes(RESPONSE_KEYWORDS.FB_ERROR) ||
          // Very short responses might also indicate incomplete messages due to FC
          (result.length > 0 &&
            result.length < 10 &&
            !result.includes(RESPONSE_KEYWORDS.NO_DATA)));

      if (needsFlowControlCheck) {
        await log.debug(
          `[${this.constructor.name}] Detected potential CAN flow control issue or incomplete response. Response: ${result}. Attempting optimization...`,
        );

        // Try to optimize flow control based on current protocol/header info
        // Extract potential ECU address from this potentially problematic response
        const potentialEcuAddress = this.extractEcuAddress(result);
        const flowControlSuccess = await this.tryOptimizeFlowControl(
          potentialEcuAddress ?? undefined,
        );

        if (flowControlSuccess) {
          // Retry the command *once* after successful FC optimization
          await log.debug(
            `[${this.constructor.name}] Retrying command ${this.mode} after flow control optimization...`,
          );
          const retryResult = await this.sendCommandWithTiming(this.mode);

          if (retryResult && !this.isErrorResponse(retryResult)) {
            await log.info(
              `[${this.constructor.name}] Successfully received response after flow control optimization.`,
            );
            // Process the successful retry response
            const processedData = await this.processRawResponse(retryResult);
            const rawBytes = Array.from(retryResult).map(c => c.charCodeAt(0));
            return {
              rawString: retryResult,
              rawResponse: rawBytes,
              response: processedData,
            };
          } else {
            await log.warn(
              `[${this.constructor.name}] Command ${this.mode} still failed or gave error after flow control optimization. Response: ${retryResult ?? 'null'}`,
            );
            // Fall through to process the original problematic response
          }
        } else {
          await log.warn(
            `[${this.constructor.name}] Flow control optimization failed. Proceeding with original response.`,
          );
          // Fall through to process the original problematic response
        }
      }

      // --- Process Original Response ---
      // If no flow control issue detected, or if optimization failed, process the original response
      await log.debug(
        `[${this.constructor.name}] Processing response for command ${this.mode}: ${result}`,
      );
      const processedData = await this.processRawResponse(result);
      const rawBytes = Array.from(result).map(c => c.charCodeAt(0));

      return {
        rawString: result,
        rawResponse: rawBytes,
        response: processedData,
      };
    } catch (error) {
      // Catch errors during the sendCommandWithTiming or subsequent processing
      await log.error(
        `[${this.constructor.name}] Error during command execution or response processing for ${this.mode}:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      this.protocolState = BaseDTCRetriever.PROTOCOL_STATES.ERROR; // Set error state
      return null; // Return null to indicate failure at this stage
    }
  }

  /**
   * Handles responses specifically for KWP protocols.
   * KWP can return data in hex strings or sometimes raw byte arrays (if spaces are off).
   */
  protected handleKWPResponse(response: string): string[][] {
    if (!response) return [];

    const lines = response.split(/[\r\n]+/).filter(line => line.trim() !== '');
    const result: string[][] = [];

    for (const line of lines) {
      const processedLine = line.trim();

      // Check for raw byte format (comma-separated numbers) - unlikely with ATS0
      // if (/^[\d,\s]+$/.test(processedLine)) {
      //    // Handle comma-separated byte values if needed
      // }

      // Assume hex format, extract bytes
      const bytes = this.extractBytesFromSingleFrame(processedLine);
      if (bytes.length > 0) {
        result.push(bytes);
      }
    }

    // For KWP, multiple lines usually represent a single logical message.
    // Combine all extracted bytes into one frame? Or keep separate?
    // Let's keep them separate for now, similar to CAN, in case headers distinguish ECUs.
    return result.filter(frame => frame.length > 0);
  }

  /**
   * Resets the internal state of the retriever.
   */
  public resetState(): void {
    // Reset protocol state
    this.isCan = false;
    this.protocolNumber = 0;
    this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.UNKNOWN;
    this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.UNKNOWN;
    this.ecuAddress = null;
    this.protocolState = BaseDTCRetriever.PROTOCOL_STATES.INITIALIZED;

    // Reset communication state tracking
    this.isHeaderEnabled = false; // Re-evaluated during configureAdapter
    this.isEchoEnabled = false; // Assumed off
    this.lineFeedsDisabled = false; // Assumed off
    this.spacesDisabled = false; // Assumed off

    void log.debug(`[${this.constructor.name}] State reset.`);
  }

  /**
   * Determine the active protocol by querying the adapter (ATDPN).
   * Updates internal state variables (isCan, protocolNumber, protocolType, headerFormat).
   */
  protected async detectProtocol(): Promise<boolean> {
    await log.debug(`[${this.constructor.name}] Detecting protocol (ATDPN)...`);
    try {
      // Get current protocol number - use direct sendCommand, short timeout
      const protocolResponse = await this.sendCommand(
        ELM_COMMANDS.GET_PROTOCOL_NUM,
        2000,
      );

      if (!protocolResponse || this.isErrorResponse(protocolResponse)) {
        await log.warn(
          `[${this.constructor.name}] Failed to get protocol number. Response: ${protocolResponse ?? 'null'}`,
        );
        this.updateProtocolInfo(-1); // Set to UNKNOWN
        return false;
      }

      // Clean the response
      const cleanedResponse = cleanResponse(protocolResponse);

      // Parse protocol number (expecting hex like 'A6' or '3')
      let protocolNum = -1;
      if (cleanedResponse && /^[A-F0-9]{1,2}$/i.test(cleanedResponse)) {
        protocolNum = parseInt(cleanedResponse, 16);
      } else {
        await log.warn(
          `[${this.constructor.name}] Unexpected format for protocol number response: ${cleanedResponse}`,
        );
      }

      // Update internal state based on the detected number
      this.updateProtocolInfo(protocolNum);

      await log.debug(
        `[${this.constructor.name}] Protocol detection complete. Number: ${this.protocolNumber}, Type: ${this.protocolType}, isCAN: ${this.isCan}, Header Format: ${this.headerFormat}`,
      );

      // Return true if a valid (non-UNKNOWN) protocol was identified
      return this.protocolType !== BaseDTCRetriever.PROTOCOL_TYPES.UNKNOWN;
    } catch (error) {
      await log.error(`[${this.constructor.name}] Error detecting protocol:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      this.updateProtocolInfo(-1); // Set to UNKNOWN on error
      return false;
    }
  }

  /**
   * Updates internal protocol state based on the ELM protocol number.
   * Maps protocol number to type (CAN, KWP, etc.) and header format.
   */
  protected updateProtocolInfo(protocolNum: number): void {
    this.protocolNumber = protocolNum; // Store the raw number

    // Mapping based on ELM327 protocol numbers (from OBDUtils.js PROT enum and descriptions)
    // Protocol numbers 6-20 are CAN variants in OBDUtils definition
    if (protocolNum >= 6 && protocolNum <= 20) {
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.CAN;
      // Determine header format based on conventions (even=11bit, odd=29bit for 6-9, J1939 is 29bit)
      if (protocolNum === 10) {
        // SAE J1939 specific case
        this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT;
      } else if (protocolNum >= 6 && protocolNum <= 9) {
        // Standard CAN: 6, 8 are 11-bit; 7, 9 are 29-bit
        this.headerFormat =
          protocolNum % 2 === 0
            ? BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT
            : BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT;
      } else {
        // Extended CAN protocols (11-20) - Assume standard applies (even=11, odd=29)
        // User1/2 CAN (B/C hex -> 11/12 dec) often 11-bit
        // ISO variants (D-F, 10-14 hex -> 13-20 dec) follow even/odd
        this.headerFormat =
          protocolNum % 2 === 0
            ? BaseDTCRetriever.HEADER_FORMATS.CAN_11BIT
            : BaseDTCRetriever.HEADER_FORMATS.CAN_29BIT;
      }
      this.isCan = true;
    } else if (protocolNum === 3) {
      // ISO 9141-2
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.ISO9141;
      this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.ISO9141;
      this.isCan = false;
    } else if (protocolNum === 4 || protocolNum === 5) {
      // ISO 14230-4 KWP (5-baud or Fast init)
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.KWP;
      this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.KWP;
      this.isCan = false;
    } else if (protocolNum === 1 || protocolNum === 2) {
      // SAE J1850 PWM or VPW
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.J1850;
      this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.J1850;
      this.isCan = false;
    } else {
      // Protocol 0 (Auto) or invalid/unknown number
      this.protocolType = BaseDTCRetriever.PROTOCOL_TYPES.UNKNOWN;
      this.headerFormat = BaseDTCRetriever.HEADER_FORMATS.UNKNOWN;
      this.isCan = false; // Assume not CAN if unknown
      // Keep protocolNumber as 0 or the invalid number for reference
    }
  }
}

```

### File: CurrentDTCRetriever.ts

**Path:** `src/ecu/retrievers/CurrentDTCRetriever.ts`

```typescript
// filepath: src/ecu/retrievers/CurrentDTCRetriever.ts
import { log } from '../../utils/logger'; // Import logger

import { BaseDTCRetriever, type RawDTCResponse } from './BaseDTCRetriever';

import type { ServiceMode } from './types';
import type { SendCommandFunction } from '../utils/types';

export class CurrentDTCRetriever extends BaseDTCRetriever {
  // Add detailed service mode constant to match JavaScript implementation
  static SERVICE_MODE: ServiceMode = {
    REQUEST: '03',
    RESPONSE: 0x43,
    NAME: 'CURRENT_DTC',
    DESCRIPTION: 'Current DTCs',
    troubleCodeType: 'TROUBLE_CODES',
  };

  constructor(sendCommand: SendCommandFunction) {
    super(sendCommand, CurrentDTCRetriever.SERVICE_MODE.REQUEST);
  }

  /**
   * Overrides retrieveRawDTCs to use the base class logic directly.
   * The base class now handles configuration, command sending, retries,
   * and response processing including NO DATA checks.
   */
  public override async retrieveRawDTCs(): Promise<RawDTCResponse | null> {
    await log.debug(
      `[${this.constructor.name}] Retrieving raw DTCs using base class method...`,
    );
    try {
      // Call the base class method which handles the full retrieval process
      const result = await super.retrieveRawDTCs();

      if (result) {
        await log.debug(
          `[${this.constructor.name}] Successfully retrieved raw DTCs.`,
        );
      } else {
        await log.warn(
          `[${this.constructor.name}] Failed to retrieve raw DTCs.`,
        );
      }
      return result;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.error(`[${this.constructor.name}] Error retrieving raw DTCs:`, {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  // No need to override sendCommandWithTiming anymore, base class handles it.

  // Add return type annotation to fix lint error
  public getServiceMode(): ServiceMode {
    return CurrentDTCRetriever.SERVICE_MODE;
  }
}

```

### File: PendingDTCRetriever.ts

**Path:** `src/ecu/retrievers/PendingDTCRetriever.ts`

```typescript
// filepath: src/ecu/retrievers/PendingDTCRetriever.ts
import { log } from '../../utils/logger'; // Import logger

import { BaseDTCRetriever, type RawDTCResponse } from './BaseDTCRetriever';

import type { ServiceMode } from './types';
import type { SendCommandFunction } from '../utils/types';

export class PendingDTCRetriever extends BaseDTCRetriever {
  // Add detailed service mode constant to match JavaScript implementation
  static SERVICE_MODE: ServiceMode = {
    REQUEST: '07',
    RESPONSE: 0x47,
    NAME: 'PENDING_DTC',
    DESCRIPTION: 'Pending DTCs',
    troubleCodeType: 'U_TROUBLE_CODES',
  };

  constructor(sendCommand: SendCommandFunction) {
    super(sendCommand, PendingDTCRetriever.SERVICE_MODE.REQUEST);
  }

  /**
   * Overrides retrieveRawDTCs to use the base class logic directly.
   * The base class now handles configuration, command sending, retries,
   * and response processing including NO DATA checks.
   */
  public override async retrieveRawDTCs(): Promise<RawDTCResponse | null> {
    await log.debug(
      `[${this.constructor.name}] Retrieving raw DTCs using base class method...`,
    );
    try {
      // Call the base class method which handles the full retrieval process
      const result = await super.retrieveRawDTCs();

      if (result) {
        await log.debug(
          `[${this.constructor.name}] Successfully retrieved raw DTCs.`,
        );
      } else {
        await log.warn(
          `[${this.constructor.name}] Failed to retrieve raw DTCs.`,
        );
      }
      return result;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.error(`[${this.constructor.name}] Error retrieving raw DTCs:`, {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  // No need to override sendCommandWithTiming anymore, base class handles it.

  // Add return type annotation to fix lint error
  public getServiceMode(): ServiceMode {
    return PendingDTCRetriever.SERVICE_MODE;
  }
}

```

### File: PermanentDTCRetriever.ts

**Path:** `src/ecu/retrievers/PermanentDTCRetriever.ts`

```typescript
// filepath: src/ecu/retrievers/PermanentDTCRetriever.ts
import { log } from '../../utils/logger'; // Import logger

import { BaseDTCRetriever, type RawDTCResponse } from './BaseDTCRetriever';

import type { ServiceMode } from './types';
import type { SendCommandFunction } from '../utils/types';

export class PermanentDTCRetriever extends BaseDTCRetriever {
  // Add detailed service mode constant to match JavaScript implementation
  static SERVICE_MODE: ServiceMode = {
    REQUEST: '0A',
    RESPONSE: 0x4a, // Corrected response code (0x4A = 74 decimal)
    NAME: 'PERMANENT_DTC',
    DESCRIPTION: 'Permanent DTCs',
    troubleCodeType: 'P_TROUBLE_CODES',
  };

  constructor(sendCommand: SendCommandFunction) {
    super(sendCommand, PermanentDTCRetriever.SERVICE_MODE.REQUEST);
  }

  /**
   * Overrides retrieveRawDTCs to use the base class logic directly.
   * The base class now handles configuration, command sending, retries,
   * and response processing including NO DATA checks.
   */
  public override async retrieveRawDTCs(): Promise<RawDTCResponse | null> {
    await log.debug(
      `[${this.constructor.name}] Retrieving raw DTCs using base class method...`,
    );
    try {
      // Call the base class method which handles the full retrieval process
      const result = await super.retrieveRawDTCs();

      if (result) {
        await log.debug(
          `[${this.constructor.name}] Successfully retrieved raw DTCs.`,
        );
      } else {
        await log.warn(
          `[${this.constructor.name}] Failed to retrieve raw DTCs.`,
        );
      }
      return result;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.error(`[${this.constructor.name}] Error retrieving raw DTCs:`, {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  // No need to override sendCommandWithTiming anymore, base class handles it.

  // Add return type annotation to fix lint error
  public getServiceMode(): ServiceMode {
    return PermanentDTCRetriever.SERVICE_MODE;
  }
}

```

### File: VINRetriever.ts

**Path:** `src/ecu/retrievers/VINRetriever.ts`

```typescript
// filepath: src/ecu/retrievers/VINRetriever.ts
import { log } from '../../utils/logger';
import { STANDARD_PIDS } from '../utils/constants';
import {
  assembleMultiFrameResponse,
  parseVinFromResponse,
} from '../utils/helpers';

import { BaseDTCRetriever } from './BaseDTCRetriever';

import type { ServiceMode } from './types';
import type { SendCommandFunction } from '../utils/types';

/**
 * Retrieves the Vehicle Identification Number (VIN) using Mode 09 PID 02.
 * Extends BaseDTCRetriever to leverage its adapter configuration,
 * command sending, flow control optimization, and retry logic.
 */
export class VINRetriever extends BaseDTCRetriever {
  // Define service mode details for VIN retrieval
  static SERVICE_MODE: ServiceMode = {
    REQUEST: STANDARD_PIDS.VIN, // '0902'
    RESPONSE: 0x49, // Mode 09 response prefix (49)
    NAME: 'VEHICLE_VIN',
    DESCRIPTION: 'Vehicle Identification Number',
    troubleCodeType: 'INFO', // Not strictly a DTC, but categorizes the data type
  };

  constructor(sendCommand: SendCommandFunction) {
    // Initialize BaseDTCRetriever with the '0902' command
    super(sendCommand, VINRetriever.SERVICE_MODE.REQUEST);
    // VIN response prefix check needs special handling since it's '4902', not just '49'
    // Override the responsePrefix calculated in the base class
    this.responsePrefix = '4902';
  }

  /**
   * Retrieves and parses the VIN.
   * Uses direct command sending with flow control handling specific to VIN retrieval.
   */
  public async retrieveVIN(): Promise<string | null> {
    await log.debug(`[${this.constructor.name}] Attempting to retrieve VIN...`);

    try {
      // Configure adapter specifically for VIN retrieval
      await this.configureAdapter();

      // Send VIN request and handle the response
      const result = await this.verifyAndGetResponse();

      if (!result || !result.rawString) {
        await log.warn(
          `[${this.constructor.name}] Failed to retrieve raw response for VIN.`,
        );
        return null;
      }

      // We have a raw string response, now parse it using the existing helpers
      await log.debug(
        `[${this.constructor.name}] Raw VIN response received: ${result.rawString}`,
      );

      // Assemble potentially multi-frame response from the raw string
      const assembledResponse = assembleMultiFrameResponse(result.rawString);
      await log.debug(
        `[${this.constructor.name}] Assembled VIN response data: ${assembledResponse}`,
      );

      // Parse the VIN from the assembled hex data
      const vin = parseVinFromResponse(assembledResponse);

      if (vin) {
        // Basic validation check
        const isValidVin = vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
        if (isValidVin) {
          await log.debug(`[${this.constructor.name}] Valid VIN found: ${vin}`);
          return vin;
        } else {
          await log.warn(
            `[${this.constructor.name}] Invalid VIN format received: ${vin}`,
          );
          return vin; // Or return null for strict validation
        }
      }
      
      await log.warn(
        `[${this.constructor.name}] Failed to parse VIN from response.`,
      );
      return null;

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.error(`[${this.constructor.name}] Error retrieving VIN:`, {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  // Method for consistency with other retrievers
  public getServiceMode(): ServiceMode {
    return VINRetriever.SERVICE_MODE;
  }

  // Override shouldKeepHeadersEnabled specifically for VIN (Mode 09)
  // Headers are generally useful for multi-frame responses like VIN, regardless of protocol
  protected override shouldKeepHeadersEnabled(): boolean {
    // Keep headers ON for VIN retrieval to help with multi-frame responses
    // and potentially distinguish ECUs if multiple respond to Mode 09.
    return true;
  }

  // Override response processing slightly if needed for VIN format specifically
  // The base class processRawResponse and helpers might be sufficient if '4902' isn't stripped incorrectly.
  // Let's rely on parseVinFromResponse working on the raw assembled string for now.
}

```

### File: index.ts

**Path:** `src/ecu/retrievers/index.ts`

```typescript
// filepath: src/ecu/retrievers/index.ts
export * from './BaseDTCRetriever';
export * from './CurrentDTCRetriever';
export * from './PendingDTCRetriever';
export * from './PermanentDTCRetriever';
export * from './VINRetriever';

```

### File: types.ts

**Path:** `src/ecu/retrievers/types.ts`

```typescript
// filepath: src/ecu/retrievers/types.ts
export interface ServiceMode {
  /** OBD-II service mode request code (e.g., '03', '07', '0A') */
  REQUEST: string;

  /** Expected response code value (e.g., 0x43, 0x47, 0x4A) */
  RESPONSE: number;

  /** Service mode name identifier */
  NAME: string;

  /** Human-readable description of the service mode */
  DESCRIPTION: string;

  /** Type identifier used for DTC classification */
  troubleCodeType: string;
}

```

#### Directory: src/ecu/context

### File: ECUContext.tsx

**Path:** `src/ecu/context/ECUContext.tsx`

```tsx
// filepath: src/ecu/context/ECUContext.tsx
import React, {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
  type FC,
} from 'react';
import { useBluetooth } from 'react-native-bluetooth-obd-manager';

import { log } from '../../utils/logger';
// Import connectionService functions
import {
  connectToECU,
  getAdapterInfo,
  disconnectFromECU,
  // Non-ECU functions (keep imports for existing calls, implementations unchanged)
  getVehicleVIN,
  clearVehicleDTCs,
  getRawDTCs, // Used by Raw DTC wrappers below
} from '../services/connectionService';
import {
  OBD_MODE,
  ECUConnectionStatus,
  type PROTOCOL,
} from '../utils/constants';
import { ECUActionType } from '../utils/types';

import { initialState, ecuReducer } from './ECUReducer';

import type {
  ECUContextValue,
  RawDTCResponse,
  SendCommandFunction,
  ECUActionPayload,
} from '../utils/types';

export const ECUContext = createContext<ECUContextValue | null>(null);

interface ECUProviderProps {
  children: ReactNode;
}

export const ECUProvider: FC<ECUProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(ecuReducer, initialState);
  const {
    sendCommand: bluetoothSendCommand, // Rename to avoid conflict
    connectedDevice,
    // error: bluetoothError, // Get BT level error if needed
    // isConnecting: isBluetoothConnecting, // Get BT level connecting status
  } = useBluetooth();

  // Determine connection status based on connectedDevice (Bluetooth level)
  const isBluetoothConnected = !!connectedDevice;

  // --- Core Send Command Wrapper ---
  // This function is passed down to services and hooks
  const sendCommand = useCallback<SendCommandFunction>(
    async (
      command: string,
      timeout?: number | { timeout?: number },
    ): Promise<string | null> => {
      // Check Bluetooth connection status before sending
      if (!isBluetoothConnected || !bluetoothSendCommand) {
        await log.warn(
          '[ECUContext] Attempted to send command while Bluetooth disconnected or command function unavailable:',
          { command },
        );
        // Return null to indicate failure as per SendCommandFunction type
        return null;
      }
      try {
        await log.debug(
          `[ECUContext] Sending command via BT hook: ${command}`,
          { timeout },
        );
        // Pass timeout if provided
        // react-native-bluetooth-obd-manager sendCommand might need an options object
        const response = await bluetoothSendCommand(
          command,
          // Adapt timeout format for the library
          typeof timeout === 'number' ? { timeout } : timeout,
        );
        await log.debug(
          `[ECUContext] Received response for "${command}": ${response ?? 'null'}`,
        );
        // Ensure return type matches SendCommandFunction (Promise<string | null>)
        // The hook likely returns string | null already.
        return response;
      } catch (error: unknown) {
        // Log and handle errors, return null on failure
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await log.error(
          `[ECUContext] Error sending command "${command}" via BT hook:`,
          {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
        // Consider specific error types if needed (e.g., BleError from the hook)
        // Return null to indicate failure according to SendCommandFunction type
        return null;
      }
    },
    [isBluetoothConnected, bluetoothSendCommand], // Dependencies: BT connection status and the BT send function
  );

  // --- Core ECU Connection Logic ---
  const connectWithECU = useCallback(async (): Promise<boolean> => {
    dispatch({ type: ECUActionType.CONNECT_START });
    await log.info('[ECUContext] connectWithECU called');

    // Ensure Bluetooth is connected first
    if (!isBluetoothConnected) {
      const errorMsg =
        'Bluetooth device not connected. Please connect via Bluetooth first.';
      await log.error(`[ECUContext] Connection failed: ${errorMsg}`);
      dispatch({
        type: ECUActionType.CONNECT_FAILURE,
        payload: { error: errorMsg },
      });
      return false;
    }

    try {
      // Call the connection service function which handles init, protocol detect, etc.
      const result = await connectToECU(sendCommand); // Pass the wrapped sendCommand

      if (result.success) {
        // Create payload for successful connection
        const payload: ECUActionPayload = {
          protocol: result.protocol ?? null,
          protocolName: result.protocolName ?? null,
          voltage: result.voltage ?? null,
          detectedEcuAddresses: result.detectedEcus ?? [],
        };
        dispatch({ type: ECUActionType.CONNECT_SUCCESS, payload });
        await log.info(
          `[ECUContext] ECU Connection successful. Protocol: ${result.protocolName ?? 'Unknown'} (${result.protocol ?? 'N/A'})`,
        );
        return true;
      } else {
        // Handle connection failure from the service
        const errorMsg = result.error ?? 'ECU connection process failed.';
        dispatch({
          type: ECUActionType.CONNECT_FAILURE,
          payload: { error: errorMsg },
        });
        await log.error(`[ECUContext] ECU Connection failed: ${errorMsg}`);
        // Do NOT trigger Bluetooth disconnect here. Let the consumer handle BT lifecycle.
        return false;
      }
    } catch (error: unknown) {
      // Catch errors from the connection service itself
      let errorMsg: string;
      if (error instanceof Error) {
        errorMsg = `ECU Connection exception: ${error.message}`;
        await log.error('[ECUContext] Connection exception details:', {
          message: error.message,
          stack: error.stack,
        });
      } else {
        errorMsg = `ECU Connection exception: ${String(error)}`;
        await log.error('[ECUContext] Connection exception (non-Error):', {
          error,
        });
      }
      dispatch({
        type: ECUActionType.CONNECT_FAILURE,
        payload: { error: errorMsg },
      });
      // Do NOT trigger Bluetooth disconnect here.
      return false;
    }
  }, [sendCommand, isBluetoothConnected]); // Depends on our sendCommand wrapper -> which depends on BT status

  // --- Core ECU Disconnect Logic ---
  const disconnectECU = useCallback(async (): Promise<void> => {
    await log.info('[ECUContext] disconnectECU called');
    // Check internal ECU connection status first
    if (
      state.status === ECUConnectionStatus.CONNECTED ||
      state.status === ECUConnectionStatus.CONNECTING
    ) {
      try {
        // Send ECU protocol close command via the service
        await disconnectFromECU(sendCommand);
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        await log.warn(
          '[ECUContext] Error during ECU service disconnect (ATPC):',
          { error: errorMsg },
        );
        // Continue with disconnect flow even if ATPC fails
      } finally {
        // Reset internal ECU state regardless of ATPC success
        dispatch({ type: ECUActionType.DISCONNECT });
        await log.info(
          '[ECUContext] Internal ECU state reset to DISCONNECTED.',
        );
        // Important: Let the calling component handle Bluetooth disconnect if necessary.
        // This hook manages ECU state, not the underlying BT connection.
      }
    } else {
      await log.debug(
        '[ECUContext] Already disconnected (ECU state). No action needed.',
      );
    }
  }, [sendCommand, state.status]); // Depends on sendCommand and ECU state

  // --- Information Retrieval ---
  const getECUInformation = useCallback(async (): Promise<void> => {
    // Check ECU connection status from our state
    if (state.status !== ECUConnectionStatus.CONNECTED) {
      await log.warn('[ECUContext] Cannot get ECU info: Not connected to ECU.');
      return;
    }
    try {
      // Call the service function to get adapter info
      const info = await getAdapterInfo(sendCommand);
      // Dispatch action to update state with retrieved info (voltage)
      // Ensure payload properties match ECUActionPayload interface
      const payload: ECUActionPayload = { voltage: info.voltage ?? null }; // Ensure voltage is string | null
      dispatch({ type: ECUActionType.SET_ECU_INFO, payload });
      await log.debug('[ECUContext] ECU information updated.', {
        voltage: info.voltage,
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.error('[ECUContext] Failed to get ECU information:', {
        error: errorMsg,
      });
    }
  }, [sendCommand, state.status]); // Depends on sendCommand and ECU state

  // --- Get Active Protocol ---
  const getActiveProtocol = useCallback((): {
    protocol: PROTOCOL | null;
    name: string | null;
  } => {
    // Directly return from state
    return {
      protocol: state.activeProtocol,
      name: state.protocolName,
    };
  }, [state.activeProtocol, state.protocolName]); // Depends only on state

  // --- Non-ECU Function Wrappers (Keep as is, ensure they use sendCommand) ---
  // --- These call the unchanged functions in connectionService ---

  const getVIN = useCallback(async (): Promise<string | null> => {
    if (state.status !== ECUConnectionStatus.CONNECTED) {
      await log.warn('[ECUContext] Cannot get VIN: Not connected to ECU.');
      return null;
    }
    try {
      // Call the unmodified service function
      return await getVehicleVIN(sendCommand);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.error('[ECUContext] Failed to get VIN:', { error: errorMsg });
      return null;
    }
  }, [sendCommand, state.status]);

  const clearDTCs = useCallback(
    async (skipVerification: boolean = false): Promise<boolean> => {
      if (state.status !== ECUConnectionStatus.CONNECTED) {
        await log.warn('[ECUContext] Cannot clear DTCs: Not connected to ECU.');
        return false;
      }
      dispatch({ type: ECUActionType.CLEAR_DTCS_START });
      try {
        // Call the unmodified service function
        const success = await clearVehicleDTCs(sendCommand, skipVerification);
        if (success) {
          dispatch({ type: ECUActionType.CLEAR_DTCS_SUCCESS });
        } else {
          // Service function handles logging failure, just update state
          dispatch({
            type: ECUActionType.CLEAR_DTCS_FAILURE,
            payload: { error: 'Failed to clear DTCs (reported by service)' },
          });
        }
        return success;
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        dispatch({
          type: ECUActionType.CLEAR_DTCS_FAILURE,
          payload: { error: `Clear DTCs exception: ${errorMsg}` },
        });
        await log.error('[ECUContext] Clear DTCs exception:', {
          error: errorMsg,
        });
        return false;
      }
    },
    [sendCommand, state.status],
  );

  // Wrappers for Raw DTC retrieval using the unmodified service function getRawDTCs
  const getRawCurrentDTCs =
    useCallback(async (): Promise<RawDTCResponse | null> => {
      if (state.status !== ECUConnectionStatus.CONNECTED) {
        await log.warn(
          '[ECUContext] Cannot get raw current DTCs: Not connected to ECU.',
        );
        return null;
      }
      dispatch({ type: ECUActionType.FETCH_RAW_DTCS_START });
      try {
        const data = await getRawDTCs(sendCommand, OBD_MODE.CURRENT_DTC);
        const payload: ECUActionPayload = { data };
        dispatch({
          type: ECUActionType.FETCH_RAW_CURRENT_DTCS_SUCCESS,
          payload,
        });
        return data;
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        dispatch({
          type: ECUActionType.FETCH_RAW_DTCS_FAILURE,
          payload: { error: `Failed to get raw current DTCs: ${errorMsg}` },
        });
        await log.error('[ECUContext] Get raw current DTCs exception:', {
          error: errorMsg,
        });
        return null;
      }
    }, [sendCommand, state.status]);

  const getRawPendingDTCs =
    useCallback(async (): Promise<RawDTCResponse | null> => {
      if (state.status !== ECUConnectionStatus.CONNECTED) {
        await log.warn(
          '[ECUContext] Cannot get raw pending DTCs: Not connected to ECU.',
        );
        return null;
      }
      dispatch({ type: ECUActionType.FETCH_RAW_DTCS_START });
      try {
        const data = await getRawDTCs(sendCommand, OBD_MODE.PENDING_DTC);
        const payload: ECUActionPayload = { data };
        dispatch({
          type: ECUActionType.FETCH_RAW_PENDING_DTCS_SUCCESS,
          payload,
        });
        return data;
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        dispatch({
          type: ECUActionType.FETCH_RAW_DTCS_FAILURE,
          payload: { error: `Failed to get raw pending DTCs: ${errorMsg}` },
        });
        await log.error('[ECUContext] Get raw pending DTCs exception:', {
          error: errorMsg,
        });
        return null;
      }
    }, [sendCommand, state.status]);

  const getRawPermanentDTCs =
    useCallback(async (): Promise<RawDTCResponse | null> => {
      if (state.status !== ECUConnectionStatus.CONNECTED) {
        await log.warn(
          '[ECUContext] Cannot get raw permanent DTCs: Not connected to ECU.',
        );
        return null;
      }
      dispatch({ type: ECUActionType.FETCH_RAW_DTCS_START });
      try {
        const data = await getRawDTCs(sendCommand, OBD_MODE.PERMANENT_DTC);
        const payload: ECUActionPayload = { data };
        dispatch({
          type: ECUActionType.FETCH_RAW_PERMANENT_DTCS_SUCCESS,
          payload,
        });
        return data;
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        dispatch({
          type: ECUActionType.FETCH_RAW_DTCS_FAILURE,
          payload: { error: `Failed to get raw permanent DTCs: ${errorMsg}` },
        });
        await log.error('[ECUContext] Get raw permanent DTCs exception:', {
          error: errorMsg,
        });
        return null;
      }
    }, [sendCommand, state.status]);

  // Memoize the context value
  const contextValue = useMemo<ECUContextValue>(
    () => ({
      state,
      connectWithECU, // Updated function
      disconnectECU, // Updated function
      getECUInformation, // Updated function
      getActiveProtocol, // Updated function
      // Keep non-ECU functions pointing to their wrappers
      getVIN,
      clearDTCs,
      getRawCurrentDTCs,
      getRawPendingDTCs,
      getRawPermanentDTCs,
      sendCommand, // Provide the wrapped sendCommand
    }),
    [
      // Ensure all dependencies are listed correctly
      state,
      connectWithECU,
      disconnectECU,
      getECUInformation,
      getActiveProtocol,
      getVIN,
      clearDTCs,
      getRawCurrentDTCs,
      getRawPendingDTCs,
      getRawPermanentDTCs,
      sendCommand, // Include sendCommand in dependency array
    ],
  );

  return (
    <ECUContext.Provider value={contextValue}>{children}</ECUContext.Provider>
  );
};

```

### File: ECUReducer.ts

**Path:** `src/ecu/context/ECUReducer.ts`

```typescript
// filepath: src/ecu/context/ECUReducer.ts
import { log } from '../../utils/logger';
import { ECUConnectionStatus } from '../utils/constants';
import { ECUActionType } from '../utils/types';

import type { ECUAction, ECUState } from '../utils/types';

// Initial state reflects the properties defined in ECUState
export const initialState: ECUState = {
  status: ECUConnectionStatus.DISCONNECTED,
  activeProtocol: null,
  protocolName: null, // Added
  lastError: null,
  deviceVoltage: null,
  detectedEcuAddresses: [], // Added
  selectedEcuAddress: null, // Added
  // DTC related state remains unchanged
  currentDTCs: null,
  pendingDTCs: null,
  permanentDTCs: null,
  dtcLoading: false,
  dtcClearing: false,
  rawCurrentDTCs: null,
  rawPendingDTCs: null,
  rawPermanentDTCs: null,
  rawDTCLoading: false,
};

export const ecuReducer = (state: ECUState, action: ECUAction): ECUState => {
  // Use void operator to mark promise as intentionally not awaited
  void log.debug(`[ECUReducer] Action: ${action.type}`, {
    payload: action.payload,
  });

  switch (action.type) {
    case ECUActionType.CONNECT_START:
      return {
        ...initialState, // Reset state on new connection attempt
        status: ECUConnectionStatus.CONNECTING,
        // Keep previous voltage if available? Or reset fully? Resetting is safer for consistency.
        // deviceVoltage: state.deviceVoltage, // Let's reset voltage too
      };
    case ECUActionType.CONNECT_SUCCESS: {
      // Extract data from payload provided by ECUContext upon successful connection
      const protocol = action.payload?.protocol ?? null; // Default to null if undefined
      const protocolName = action.payload?.protocolName ?? null; // Default to null
      const detectedEcus = action.payload?.detectedEcuAddresses ?? [];
      const voltage = action.payload?.voltage ?? null; // Use new voltage or null

      return {
        ...state, // Keep existing DTC/rawDTC state if any
        status: ECUConnectionStatus.CONNECTED,
        activeProtocol: protocol,
        protocolName: protocolName,
        // Select the first detected ECU as default, or null if none detected
        selectedEcuAddress: detectedEcus[0] ?? null,
        detectedEcuAddresses: detectedEcus,
        lastError: null, // Clear last error on success
        deviceVoltage: voltage, // Update voltage
      };
    }
    case ECUActionType.CONNECT_FAILURE:
      return {
        ...initialState, // Reset fully on failure
        status: ECUConnectionStatus.CONNECTION_FAILED,
        // Keep last error message
        lastError: action.payload?.error ?? 'Unknown connection error',
      };
    case ECUActionType.DISCONNECT:
      // Reset to initial state, perhaps keeping voltage for informational purposes?
      return {
        ...initialState,
        deviceVoltage: state.deviceVoltage, // Option: Keep last known voltage on disconnect
      };
    case ECUActionType.SET_ECU_INFO:
      // Update specific info like voltage without changing connection status
      return {
        ...state,
        // Use nullish coalescing for voltage update
        deviceVoltage: action.payload?.voltage ?? state.deviceVoltage,
        // Can add other info updates here if needed
      };
    case ECUActionType.RESET:
      // Full reset to initial state
      return initialState;

    // --- DTC related actions remain unchanged (as per requirement) ---
    case ECUActionType.FETCH_DTCS_START:
      // Assuming this action is still needed for non-raw DTCs handled elsewhere
      return {
        ...state,
        dtcLoading: true,
        currentDTCs: null,
        pendingDTCs: null,
        permanentDTCs: null,
      };
    case ECUActionType.FETCH_DTCS_SUCCESS:
      // Assuming this action is still needed
      return {
        ...state,
        dtcLoading: false,
        // Payload might contain parsed DTCs, handled by specific logic using this action
        currentDTCs: action.payload?.dtcs ?? state.currentDTCs, // Example update
      };
    case ECUActionType.FETCH_DTCS_FAILURE:
      // Assuming this action is still needed
      return {
        ...state,
        dtcLoading: false,
        lastError: action.payload?.error ?? 'Failed to fetch DTCs',
      };

    case ECUActionType.CLEAR_DTCS_START:
      return { ...state, dtcClearing: true };
    case ECUActionType.CLEAR_DTCS_SUCCESS:
      // Clear all DTC related states upon successful clear
      return {
        ...state,
        dtcClearing: false,
        currentDTCs: [], // Reset parsed DTCs
        pendingDTCs: [],
        permanentDTCs: [], // Clear permanent as well? Assuming Mode 04 might clear some types
        rawCurrentDTCs: null, // Reset raw DTC data
        rawPendingDTCs: null,
        rawPermanentDTCs: null,
        lastError: null, // Clear error on success
      };
    case ECUActionType.CLEAR_DTCS_FAILURE:
      return {
        ...state,
        dtcClearing: false,
        lastError: action.payload?.error ?? 'Failed to clear DTCs',
      };

    // --- Raw DTC actions remain unchanged (as per requirement) ---
    case ECUActionType.FETCH_RAW_DTCS_START:
      return { ...state, rawDTCLoading: true };
    case ECUActionType.FETCH_RAW_CURRENT_DTCS_SUCCESS:
      return {
        ...state,
        rawDTCLoading: false,
        rawCurrentDTCs: action.payload?.data ?? null,
      };
    case ECUActionType.FETCH_RAW_PENDING_DTCS_SUCCESS:
      return {
        ...state,
        rawDTCLoading: false,
        rawPendingDTCs: action.payload?.data ?? null,
      };
    case ECUActionType.FETCH_RAW_PERMANENT_DTCS_SUCCESS:
      return {
        ...state,
        rawDTCLoading: false,
        rawPermanentDTCs: action.payload?.data ?? null,
      };
    case ECUActionType.FETCH_RAW_DTCS_FAILURE:
      return {
        ...state,
        rawDTCLoading: false,
        lastError: action.payload?.error ?? 'Failed to fetch raw DTCs',
      };

    default:
      // Optional: Add exhaustive check for unhandled action types
      // const exhaustiveCheck: never = action; // Uncomment for exhaustive checks
      // If an unknown action type is received, log a warning and return current state
      void log.warn(
        `[ECUReducer] Received unknown action type: ${(action as ECUAction).type}`,
      );
      return state;
  }
};

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
  VEHICLE_INFO = '09', // For VIN, etc.
  CURRENT_DATA = '01', // For Live Data, PIDs
}
/* eslint-enable no-unused-vars */

// Merge delays from OBDUtils.js DELAYS/STANDARD_DELAYS
// Using values from DELAYS in OBDUtils.js where applicable
export const DELAYS_MS = {
  RESET: 1000, // Delay after ATZ (from STANDARD_DELAYS)
  COMMAND_SHORT: 100, // Standard delay between commands (from DELAYS.STANDARD)
  COMMAND_MEDIUM: 200, // General purpose medium delay
  COMMAND_LONG: 500, // Longer delay for certain operations
  PROTOCOL_SWITCH: 1000, // Delay after ATPC or changing protocol (from STANDARD_DELAYS.PROTOCOL_CLOSE_DELAY)
  RETRY: 1000, // Base retry delay (from RETRY_CONFIG)
  ECU_RESPONSE: 300, // General wait time
  INIT: 100, // Delay during init sequence (from DELAYS.INIT)
  ADAPTIVE_START: 20, // from DELAYS.ADAPTIVE_START
  ADAPTIVE_MIN: 20, // from DELAYS.ADAPTIVE_MIN
  ADAPTIVE_MAX: 500, // from DELAYS.ADAPTIVE_MAX
  ADAPTIVE_INC: 20, // from DELAYS.ADAPTIVE_INC
  ADAPTIVE_DEC: 10, // from DELAYS.ADAPTIVE_DEC
  TIMEOUT_NORMAL_MS: 100, // From DELAYS.TIMEOUT_NORMAL='64' hex -> 100 decimal
  TIMEOUT_EXTENDED_MS: 200, // From DELAYS.TIMEOUT_EXTENDED='C8' hex -> 200 decimal
  // Add other DELAYS constants from OBDUtils.js if needed
  PROTOCOL: 100, // from DELAYS.PROTOCOL
  COMMAND: 100, // from DELAYS.COMMAND
  ADAPTIVE: 100, // from DELAYS.ADAPTIVE
  RETRY_BASE: 100, // from DELAYS.RETRY_BASE
  CAN_INIT: 100, // from DELAYS.CAN_INIT
  ECU_QUERY: 100, // from DELAYS.ECU_QUERY
  HEADER_CHANGE: 100, // from DELAYS.HEADER_CHANGE
} as const;

// Merge from OBDUtils.js RSP_ID and OBD_RESPONSES
export const RESPONSE_KEYWORDS = {
  PROMPT: '>',
  OK: 'OK',
  ELM_MODEL: 'ELM327', // From RSP_ID.MODEL
  NO_DATA: 'NO DATA', // From RSP_ID.NODATA / OBD_RESPONSES
  ERROR: 'ERROR', // From RSP_ID.ERROR / OBD_RESPONSES
  UNABLE_TO_CONNECT: 'UNABLE TO CONNECT', // Matches RSP_ID.NOCONN / NOCONN2 and OBD_RESPONSES
  CAN_ERROR: 'CAN ERROR', // From RSP_ID.CANERROR
  BUS_ERROR: 'BUS ERROR', // Covers BUSERROR, BUSINIERR*, from RSP_ID.BUSERROR
  BUS_INIT: 'BUS INIT', // Specific keyword for clarity, from RSP_ID.BUSINIERR
  BUS_BUSY: 'BUS BUSY', // From RSP_ID.BUSBUSY
  FB_ERROR: 'FB ERROR', // From RSP_ID.FBERROR
  DATA_ERROR: 'DATA ERROR', // From RSP_ID.DATAERROR
  BUFFER_FULL: 'BUFFER FULL', // From RSP_ID.BUFFERFULL
  RX_ERROR: 'RX ERROR', // Explicit name for '<' if needed, From RSP_ID.RXERROR='<'
  STOPPED: 'STOPPED', // From RSP_ID.STOPPED / OBD_RESPONSES
  SEARCHING: 'SEARCHING...', // From RSP_ID.SEARCHING
  UNKNOWN: 'UNKNOWN', // From RSP_ID.UNKNOWN
  VOLTAGE_SUFFIX: 'V', // From OBD_RESPONSES
  TIMEOUT: 'TIMEOUT', // Added for clarity, often indicated by null response
  QUESTION_MARK: '?', // From RSP_ID.QMARK
} as const;

// Merge from OBDUtils.js PROT enum
/* eslint-disable no-unused-vars */
export enum PROTOCOL {
  AUTO = 0,
  SAE_J1850_PWM = 1, // J1850PWM
  SAE_J1850_VPW = 2, // J1850VPW
  ISO_9141_2 = 3, // ISO9141
  ISO_14230_4_KWP = 4, // ISO14230_4KW (5 baud)
  ISO_14230_4_KWP_FAST = 5, // ISO14230_4ST (fast)
  ISO_15765_4_CAN_11BIT_500K = 6, // ISO15765_11_500
  ISO_15765_4_CAN_29BIT_500K = 7, // ISO15765_29_500
  ISO_15765_4_CAN_11BIT_250K = 8, // ISO15765_11_250
  ISO_15765_4_CAN_29BIT_250K = 9, // ISO15765_29_250
  SAE_J1939_CAN_29BIT_250K = 10, // SAE_J1939 (A in JS)
  USER1_CAN_11BIT_125K = 11, // USER1_CAN (B in JS)
  USER2_CAN_11BIT_50K = 12, // USER2_CAN (C in JS)
  ISO_15765_4_CAN_11BIT_500K_4 = 13, // (D in JS)
  ISO_15765_4_CAN_29BIT_500K_4 = 14, // (E in JS)
  ISO_15765_4_CAN_11BIT_250K_4 = 15, // (F in JS)
  ISO_15765_4_CAN_29BIT_250K_4 = 16, // (10 in JS)
  ISO_15765_4_CAN_11BIT_500K_8 = 17, // (11 in JS)
  ISO_15765_4_CAN_29BIT_500K_8 = 18, // (12 in JS)
  ISO_15765_4_CAN_11BIT_250K_8 = 19, // (13 in JS)
  ISO_15765_4_CAN_29BIT_250K_8 = 20, // (14 in JS)
}
/* eslint-enable no-unused-vars */

// Merge from OBDUtils.js PROT_DESCRIPTIONS
export const PROTOCOL_DESCRIPTIONS: Record<number, string> = {
  [PROTOCOL.AUTO]: 'Automatic',
  [PROTOCOL.SAE_J1850_PWM]: 'SAE J1850 PWM (41.6 KBaud)',
  [PROTOCOL.SAE_J1850_VPW]: 'SAE J1850 VPW (10.4 KBaud)',
  [PROTOCOL.ISO_9141_2]: 'ISO 9141-2 (5 Baud Init)',
  [PROTOCOL.ISO_14230_4_KWP]: 'ISO 14230-4 KWP (5 Baud Init)',
  [PROTOCOL.ISO_14230_4_KWP_FAST]: 'ISO 14230-4 KWP (Fast Init)',
  [PROTOCOL.ISO_15765_4_CAN_11BIT_500K]:
    'ISO 15765-4 CAN (11 Bit ID, 500 KBit)',
  [PROTOCOL.ISO_15765_4_CAN_29BIT_500K]:
    'ISO 15765-4 CAN (29 Bit ID, 500 KBit)',
  [PROTOCOL.ISO_15765_4_CAN_11BIT_250K]:
    'ISO 15765-4 CAN (11 Bit ID, 250 KBit)',
  [PROTOCOL.ISO_15765_4_CAN_29BIT_250K]:
    'ISO 15765-4 CAN (29 Bit ID, 250 KBit)',
  [PROTOCOL.SAE_J1939_CAN_29BIT_250K]: 'SAE J1939 CAN (29 bit ID, 250* kbaud)',
  [PROTOCOL.USER1_CAN_11BIT_125K]: 'User1 CAN (11* bit ID, 125* kbaud)',
  [PROTOCOL.USER2_CAN_11BIT_50K]: 'User2 CAN (11* bit ID, 50* kbaud)',
  [PROTOCOL.ISO_15765_4_CAN_11BIT_500K_4]:
    'ISO 15765-4 CAN (11 bit ID, 500 kbps, 4 byte)',
  [PROTOCOL.ISO_15765_4_CAN_29BIT_500K_4]:
    'ISO 15765-4 CAN (29 bit ID, 500 kbps, 4 byte)',
  [PROTOCOL.ISO_15765_4_CAN_11BIT_250K_4]:
    'ISO 15765-4 CAN (11 bit ID, 250 kbps, 4 byte)',
  [PROTOCOL.ISO_15765_4_CAN_29BIT_250K_4]:
    'ISO 15765-4 CAN (29 bit ID, 250 kbps, 4 byte)',
  [PROTOCOL.ISO_15765_4_CAN_11BIT_500K_8]:
    'ISO 15765-4 CAN (11 bit ID, 500 kbps, 8 byte)',
  [PROTOCOL.ISO_15765_4_CAN_29BIT_500K_8]:
    'ISO 15765-4 CAN (29 bit ID, 500 kbps, 8 byte)',
  [PROTOCOL.ISO_15765_4_CAN_11BIT_250K_8]:
    'ISO 15765-4 CAN (11 bit ID, 250 kbps, 8 byte)',
  [PROTOCOL.ISO_15765_4_CAN_29BIT_250K_8]:
    'ISO 15765-4 CAN (29 bit ID, 250 kbps, 8 byte)',
};

// Define the order to try protocols during detection based on OBDUtils.PROTOCOL_TRY_ORDER and PROTOCOL_PRIORITIES
// Using the exact order from OBDUtils.PROTOCOL_TRY_ORDER
export const PROTOCOL_TRY_ORDER = [
  PROTOCOL.ISO_15765_4_CAN_11BIT_500K, // 6
  PROTOCOL.ISO_15765_4_CAN_11BIT_250K, // 8
  PROTOCOL.ISO_15765_4_CAN_29BIT_250K, // 9
  PROTOCOL.ISO_15765_4_CAN_29BIT_500K, // 7
  PROTOCOL.ISO_15765_4_CAN_11BIT_500K_4, // D (13)
  PROTOCOL.ISO_15765_4_CAN_29BIT_500K_4, // E (14)
  PROTOCOL.ISO_15765_4_CAN_11BIT_250K_4, // F (15)
  PROTOCOL.ISO_15765_4_CAN_29BIT_250K_4, // 10 (16)
  PROTOCOL.ISO_15765_4_CAN_11BIT_500K_8, // 11 (17)
  PROTOCOL.ISO_15765_4_CAN_29BIT_500K_8, // 12 (18)
  PROTOCOL.ISO_15765_4_CAN_11BIT_250K_8, // 13 (19)
  PROTOCOL.ISO_15765_4_CAN_29BIT_250K_8, // 14 (20)
  PROTOCOL.SAE_J1939_CAN_29BIT_250K, // A (10)
  PROTOCOL.USER1_CAN_11BIT_125K, // B (11)
  PROTOCOL.USER2_CAN_11BIT_50K, // C (12)
  PROTOCOL.SAE_J1850_PWM, // 1
  PROTOCOL.SAE_J1850_VPW, // 2
  PROTOCOL.ISO_9141_2, // 3
  PROTOCOL.ISO_14230_4_KWP, // 4
  PROTOCOL.ISO_14230_4_KWP_FAST, // 5
] as const;

// Merge from OBDUtils.js ELM_COMMANDS and CMD
// Uses explicit names where possible, includes necessary AT commands from init sequences
export const ELM_COMMANDS = {
  // System commands
  RESET: 'ATZ', // From CMD.RESET / ELM_COMMANDS.RESET
  WARM_START: 'ATWS', // From CMD.WARMSTART
  DEFAULTS: 'ATD', // From CMD.DEFAULTS
  READ_INFO: 'ATI', // From CMD.INFO
  LOW_POWER: 'ATLP', // From CMD.LOWPOWER
  READ_VOLTAGE: 'ATRV', // Explicitly use RV / ELM_COMMANDS.READ_VOLTAGE

  // Protocol commands
  PROTOCOL_CLOSE: 'ATPC', // From CMD.PROTOCLOSE / ELM_COMMANDS.PROTOCOL_CLOSE
  GET_PROTOCOL: 'ATDP', // From CMD.GETPROT
  GET_PROTOCOL_NUM: 'ATDPN', // Explicit alias from ELM_COMMANDS / ELM_COMMANDS.GET_PROTOCOL
  SET_PROTOCOL_PREFIX: 'ATSP', // From CMD.SETPROT / ELM_COMMANDS.SET_PROTOCOL_PREFIX (takes parameter)
  AUTO_PROTOCOL: 'ATSP0', // Specific case of ATSP, From ELM_COMMANDS.AUTO_PROTOCOL
  TRY_PROTOCOL_PREFIX: 'ATTP', // From ELM_COMMANDS.TRY_PROTOCOL_PREFIX (takes parameter)
  MONITOR_ALL: 'ATMA', // From CMD.CANMONITOR

  // Communication settings
  ECHO_OFF: 'ATE0', // From CMD.ECHO=0 / ELM_COMMANDS.ECHO_OFF
  ECHO_ON: 'ATE1', // From CMD.ECHO=1
  LINEFEEDS_OFF: 'ATL0', // From CMD.SETLINEFEED=0 / ELM_COMMANDS.LINEFEEDS_OFF
  LINEFEEDS_ON: 'ATL1', // From CMD.SETLINEFEED=1
  SPACES_OFF: 'ATS0', // From CMD.SETSPACES=0 / ELM_COMMANDS.SPACES_OFF
  SPACES_ON: 'ATS1', // From CMD.SETSPACES=1
  HEADERS_OFF: 'ATH0', // From CMD.SETHEADER=0 / ELM_COMMANDS.HEADERS_OFF
  HEADERS_ON: 'ATH1', // From CMD.SETHEADER=1
  ADAPTIVE_TIMING_OFF: 'ATAT0', // From CMD.ADAPTTIMING=0
  ADAPTIVE_TIMING_1: 'ATAT1', // From CMD.ADAPTTIMING=1 (used in some init)
  ADAPTIVE_TIMING_2: 'ATAT2', // From CMD.ADAPTTIMING=2 / ELM_COMMANDS.ADAPTIVE_TIMING_2
  SET_TIMEOUT: 'ATST', // From CMD.SETTIMEOUT (param needed)
  SET_HEADER: 'ATSH', // From CMD.SETTXHDR (param needed)

  // CAN Specific (from JS CMD and direct usage)
  CAN_AUTO_FORMAT_OFF: 'ATCAF0',
  CAN_AUTO_FORMAT_ON: 'ATCAF1',
  CAN_RX_FILTER_CLEAR: 'ATCRA', // From CMD.CLRCANRXFLT (no param)
  CAN_RX_FILTER_SET: 'ATCF', // CMD.SETCANRXFLT uses ATCF <filter>
  CAN_RX_MASK_SET: 'ATCM', // CMD.SETCANRXFLT uses ATCM <mask>
  CAN_FLOW_CONTROL_HEADER: 'ATFCSH', // (param needed) - from ElmProtocolHelper
  CAN_FLOW_CONTROL_DATA: 'ATFCSD', // (param needed) - from ElmProtocolHelper
  CAN_FLOW_CONTROL_MODE: 'ATFCSM', // (param needed) - from ElmProtocolHelper

  // Common OBD commands (used in connection checks etc.)
  GET_SUPPORTED_PIDS_01_20: '0100', // Mode 01 PID 00 (STANDARD_PIDS.BASIC_INFO)
} as const;

// Standard PIDs for common parameters (Merge from OBDUtils STANDARD_PIDS if needed)
// Includes PIDs used in protocol testing or basic info checks
export const STANDARD_PIDS = {
  // Mode 01 (current data)
  SUPPORTED_PIDS_1: '0100', // PIDs supported [01 - 20] (BASIC_INFO)
  MONITOR_STATUS: '0101', // Monitor status since DTCs cleared
  ENGINE_COOLANT_TEMP: '0105',
  SHORT_TERM_FUEL_TRIM_1: '0106',
  LONG_TERM_FUEL_TRIM_1: '0107',
  FUEL_PRESSURE: '010A', // From PID_MAP_FOR_DELAY_IN_SENT_COMMAND
  INTAKE_MAP: '010B', // Intake manifold absolute pressure
  ENGINE_RPM: '010C',
  VEHICLE_SPEED: '010D',
  TIMING_ADVANCE: '010E',
  INTAKE_TEMP: '010F', // Intake air temperature
  MAF_RATE: '0110', // Mass air flow rate
  THROTTLE_POS: '0111',
  OXYGEN_SENSORS_PRESENT_1: '0113', // From OBDUtils TEST_COMMANDS (placeholder)
  OXYGEN_SENSOR_1_VOLTAGE: '0114', // O2 Sensor 1, Bank 1 Voltage (from TEST_COMMANDS / PID_MAP)
  OBD_STANDARD: '011C', // OBD standards this vehicle conforms to
  SUPPORTED_PIDS_2: '0120', // PIDs supported [21 - 40]
  COMMANDED_EGR: '012C', // From PID_MAP_FOR_DELAY_IN_SENT_COMMAND (Commanded EGR)
  EGR_ERROR: '012D', // From PID_MAP_FOR_DELAY_IN_SENT_COMMAND (EGR Error)
  CATALYST_TEMP_B1S1: '013C', // From PID_MAP_FOR_DELAY_IN_SENT_COMMAND (Catalyst Temp Bank 1, Sensor 1)
  CATALYST_TEMP_B1S2: '013E', // From PID_MAP (Catalyst Temp Bank 1, Sensor 2)

  // Mode 09 (vehicle info)
  SUPPORTED_PIDS_9: '0900', // PIDs supported [01 - 20] for Mode 09
  VIN: '0902', // VIN Request
  VIN_MSG_COUNT: '0901', // From ElmProtocolHelper (VIN Message Count/VIN Data) - less common
  CALIBRATION_ID: '0904',
  ECU_NAME: '090A',
} as const;

// Common test command used during protocol validation
export const PROTOCOL_TEST_COMMAND = STANDARD_PIDS.SUPPORTED_PIDS_1; // '0100'

```

### File: ecuUtils.ts

**Path:** `src/ecu/utils/ecuUtils.ts`

```typescript
// filepath: src/ecu/utils/ecuUtils.ts
import { TextDecoder, TextEncoder } from 'text-encoding'; // Polyfill might be needed

import { log } from '../../utils/logger'; // Use project logger

/**
 * Convert hex string to byte array (Uint8Array).
 * Based on hexToBytes from docs/ecu-utils.js
 */
export const hexToBytes = (hex: string): Uint8Array => {
  const cleanedHex = hex.replace(/[^0-9a-fA-F]/g, ''); // Remove non-hex chars and spaces

  if (cleanedHex.length % 2 !== 0) {
    void log.warn(
      // Use void for fire-and-forget async log
      `[ecuUtils] hexToBytes received hex string with odd length: ${hex}`,
    );
    // Do not pad - caller should handle odd length if necessary
  }

  const bytes = new Uint8Array(Math.floor(cleanedHex.length / 2));

  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2;
    const byteHex = cleanedHex.substring(start, start + 2);
    // Handle potential parsing errors
    const byteVal = parseInt(byteHex, 16);
    if (isNaN(byteVal)) {
      void log.error(
        `[ecuUtils] Invalid hex byte detected: ${byteHex} in ${hex}`,
      );
      // Return partially converted array or throw? For now, set to 0.
      bytes[i] = 0;
    } else {
      bytes[i] = byteVal;
    }
  }

  return bytes;
};

/**
 * Convert byte array (Uint8Array or number[]) to hex string.
 * Based on bytesToHex from docs/ecu-utils.js
 */
export const bytesToHex = (bytes: Uint8Array | number[]): string => {
  // Handle null/undefined input gracefully
  if (!bytes) return '';
  // Ensure input is an array-like structure
  if (!Array.isArray(bytes) && !(bytes instanceof Uint8Array)) {
    void log.warn(
      `[ecuUtils] bytesToHex received non-array input: ${typeof bytes}`,
    );
    return '';
  }
  return Array.from(bytes)
    .map(b => {
      // Ensure 'b' is a number before conversion
      const num = Number(b);
      if (isNaN(num)) {
        void log.warn(
          `[ecuUtils] bytesToHex encountered non-numeric value: ${b}`,
        );
        return '00'; // Or throw error? Default to '00'
      }
      // Ensure byte value is within range 0-255
      const validByte = Math.max(0, Math.min(255, Math.floor(num)));
      return validByte.toString(16).padStart(2, '0');
    })
    .join('')
    .toUpperCase();
};

/**
 * Convert byte array (Uint8Array or number[]) to string using UTF-8 or ISO-8859-1.
 * Handles potential errors during decoding.
 * Tries UTF-8 first, falls back to ISO-8859-1 (Latin1) which covers more byte values than ASCII.
 * Based on decodeValue and byteArrayToString from docs/ecu-utils.js / OBDUtils.js
 */
export const bytesToString = (
  bytes: Uint8Array | number[] | null | undefined,
): string => {
  if (!bytes || bytes.length === 0) {
    return '';
  }

  try {
    // Ensure we have a Uint8Array of numbers
    // Flatten nested arrays if necessary (from JS byteArrayToString)
    const flatten = (arr: (number | number[])[]): number[] => {
      return arr.reduce<number[]>((flat, item) => {
        return flat.concat(
          Array.isArray(item) ? flatten(item) : [Number(item)],
        );
      }, []);
    };

    const numericArray = Array.isArray(bytes)
      ? flatten(bytes as (number | number[])[])
      : Array.from(bytes).map(Number);
    const uint8Array = new Uint8Array(numericArray.filter(n => !isNaN(n)));

    // Try UTF-8 first
    const decoderUtf8 = new TextDecoder('utf-8', { fatal: false }); // fatal: false allows partial decoding
    let decodedString = decoderUtf8.decode(uint8Array);

    // Check if UTF-8 decoding resulted in replacement characters (often indicates wrong encoding)
    // If it contains replacement characters, try Latin1 instead.
    if (decodedString.includes('\uFFFD')) {
      // Fallback to ISO-8859-1 (Latin1)
      const decoderLatin1 = new TextDecoder('iso-8859-1');
      decodedString = decoderLatin1.decode(uint8Array);
    }

    // Filter out null bytes (\0) and potentially other non-printables AFTER decoding
    // Also trim leading/trailing whitespace and control chars that might remain
    return decodedString
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable chars (keep only printable ASCII)
      .trim();
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    void log.error('[ecuUtils] Error decoding bytes to string:', {
      error: errorMsg,
    });
    // Final fallback: manual ASCII conversion for printable chars only
    try {
      const printableBytes = Array.from(bytes).filter(
        b => typeof b === 'number' && b >= 32 && b < 127,
      ) as number[];
      return String.fromCharCode(...printableBytes);
    } catch (fallbackError: unknown) {
      const fallbackErrorMsg =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);
      void log.error('[ecuUtils] Final fallback decoding error:', {
        error: fallbackErrorMsg,
      });
      return ''; // Return empty if all decoding fails
    }
  }
};

/**
 * Convert string to byte array (Uint8Array) using UTF-8.
 * Based on stringToBytes from docs/common/BleEmitterUtils.js
 */
export const stringToBytes = (str: string | null | undefined): Uint8Array => {
  if (!str) {
    return new Uint8Array(0);
  }

  try {
    const encoder = new TextEncoder(); // Always UTF-8

    return encoder.encode(str);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    void log.error('[ecuUtils] Error encoding string to bytes:', {
      error: errorMsg,
    });
    // Fallback: Basic ASCII conversion
    try {
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        // Get char code, ensure it's within byte range
        bytes[i] = str.charCodeAt(i) & 0xff;
      }
      return bytes;
    } catch (fallbackError: unknown) {
      const fallbackErrorMsg =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);
      void log.error('[ecuUtils] Final fallback encoding error:', {
        error: fallbackErrorMsg,
      });
      return new Uint8Array(0); // Return empty if all encoding fails
    }
  }
};

/**
 * Format number as hex string with padding.
 * Based on toHexString from docs/ecu-utils.js
 */
export const toHexString = (
  num: number | null | undefined,
  width: number = 2,
): string => {
  if (typeof num !== 'number' || isNaN(num)) {
    // Allow null/undefined to return empty string? Or padded zeros? Let's stick to padded zeros.
    // void log.warn(`[ecuUtils] toHexString received non-numeric input: ${num}`);
    return ''.padStart(width, '0'); // Return padded zeros
  }
  // Ensure number is non-negative before conversion
  const nonNegativeNum = Math.max(0, num);
  return Math.floor(nonNegativeNum)
    .toString(16)
    .toUpperCase()
    .padStart(width, '0');
};

```

### File: helpers.ts

**Path:** `src/ecu/utils/helpers.ts`

```typescript
// filepath: src/ecu/utils/helpers.ts
import { log } from '../../utils/logger'; // Use project logger

import { RESPONSE_KEYWORDS, PROTOCOL } from './constants';
import { hexToBytes, bytesToString } from './ecuUtils';

/**
 * Cleans ELM327 response string more aggressively.
 * Removes prompt (>), ELM ID (ELM327), OK, SEARCHING..., whitespace, control chars.
 * Keeps data-related parts like hex values and potentially meaningful keywords (NO DATA, ERROR).
 * Based on ElmProtocolInit.getResponseId and cleaning logic in JS files.
 */
export const cleanResponse = (response: string | null | undefined): string => {
  if (!response) return '';

  // Remove common ELM status messages, prompt, control chars, trim aggressively
  // Keep ELM ID for now? Some logic might depend on it.
  // Don't remove OK yet, isResponseOk uses it.
  return (
    response
      .replace(/>/g, '') // Prompt
      .replace(/SEARCHING\.\.\./i, '') // Searching...
      // Remove specific command echos if present and echo wasn't disabled properly
      .replace(/^ATZ[\r\n]*/i, '')
      .replace(/^ATE0[\r\n]*/i, '')
      .replace(/^ATL0[\r\n]*/i, '')
      .replace(/^ATS0[\r\n]*/i, '')
      .replace(/^ATH[01][\r\n]*/i, '')
      .replace(/^ATSP[0-9A-F][\r\n]*/i, '')
      .replace(/^ATTP[0-9A-F][\r\n]*/i, '')
      .replace(/^ATRV[\r\n]*/i, '')
      // Remove control characters AFTER potentially useful keywords are checked
      .replace(/[\r\n\t\0]/g, ' ') // Replace control chars with space to avoid merging hex
      .replace(/\s+/g, ' ') // Normalize whitespace to single space
      .trim() // Leading/trailing whitespace
      .toUpperCase()
  ); // Standardize to uppercase
};

/**
 * Checks if the response from the OBD device indicates a successful command execution
 * @param response The response string from the OBD device
 * @returns true if the response contains 'OK' or valid data
 */
export const isResponseOk = (response: string): boolean => {
  if (!response) return false;
  const cleanedResponse = response.trim().toUpperCase();
  return cleanedResponse === 'OK' || /^[0-9A-F\s]+$/.test(cleanedResponse);
};

/**
 * Checks for common *ELM* error keywords in the response using constants.
 * Does *not* check for OBD "NO DATA" as an error by default here.
 * Based on ElmProtocolInit.isErrorResponse and ERROR_RESPONSES list in BaseDTCRetriever.
 */
export const isResponseError = (
  response: string | null | undefined,
): boolean => {
  if (response === null) return true; // Treat null (timeout/no comms) as an error
  if (!response) return false; // Treat empty string as non-error

  // Standardize response for matching: remove spaces, uppercase
  const cleanedUpper = response.replace(/\s/g, '').toUpperCase();
  if (cleanedUpper.length === 0) return false; // Empty after cleaning is not error

  // Check against known error patterns defined in BaseDTCRetriever
  // Intentionally exclude NO_DATA from this check, as it's a valid response type
  const errorKeywords = [
    RESPONSE_KEYWORDS.ERROR,
    RESPONSE_KEYWORDS.UNABLE_TO_CONNECT.replace(/\s/g, ''),
    RESPONSE_KEYWORDS.BUS_INIT.replace(/\s/g, ''),
    RESPONSE_KEYWORDS.CAN_ERROR.replace(/\s/g, ''),
    RESPONSE_KEYWORDS.BUS_ERROR.replace(/\s/g, ''),
    RESPONSE_KEYWORDS.FB_ERROR.replace(/\s/g, ''),
    RESPONSE_KEYWORDS.DATA_ERROR.replace(/\s/g, ''),
    RESPONSE_KEYWORDS.BUFFER_FULL.replace(/\s/g, ''),
    RESPONSE_KEYWORDS.RX_ERROR.replace(/\s/g, ''), // '<'
    RESPONSE_KEYWORDS.STOPPED,
    RESPONSE_KEYWORDS.TIMEOUT, // Explicit TIMEOUT check
    '7F', // Negative response code
    'UNABLE', // Partial match
    'ACT ALERT', // From JS
    'ERR', // From JS
    // Removed 'NO DATA' from error check here
  ].map(e => e.replace(/\s/g, '').toUpperCase());

  // Specific check for "?" response which indicates ELM command error
  if (response.trim() === RESPONSE_KEYWORDS.QUESTION_MARK) {
    return true;
  }

  // Check if the cleaned response contains any error keyword
  if (errorKeywords.some(keyword => cleanedUpper.includes(keyword))) {
    return true;
  }

  return false;
};

/**
 * Extracts voltage if present in response (e.g., "12.3V").
 * Based on logic in connectionService.
 */
export const extractVoltage = (
  response: string | null | undefined,
): string | null => {
  if (!response) return null;

  // Clean less aggressively for voltage as format is specific "ATRV -> 12.3V"
  const cleaned = response.replace(/[>\r\n\t\0]/g, ''); // Remove prompt/control chars, keep spaces initially
  // Match pattern like "12.3V" or "12V", possibly surrounded by spaces or other chars
  // Ensure it captures the full number and 'V'
  const match = cleaned.match(/(\d{1,2}(?:\.\d{1,2})?V)/i);

  return match?.[1] ? match[1].toUpperCase() : null; // Return the first captured group (the voltage string)
};

/**
 * Extracts protocol number from ATDPN response (e.g., "A6" -> 6, "3" -> 3).
 * Based on logic in ProtocolManager.
 */
export const extractProtocolNumber = (
  response: string | null | undefined,
): number | null => {
  if (!response) return null;

  // Clean response: remove prompt, whitespace, control characters
  // Handle potential "USER1", "USER2", "SAE J1939" text responses? ELM usually gives number.
  const cleaned = response.replace(/[>\r\n\t\0\s]/g, '').toUpperCase();

  // Match optional 'A' followed by one or two hex digits (for protocols A,B,C which are 10,11,12)
  // Allow protocols up to 20 (14 hex)
  const match = cleaned.match(/^(A?)([0-9A-F]{1,2})$/i);

  if (match) {
    const isAuto = match[1] === 'A'; // Check if it was auto-detected ('A' prefix)
    const protocolHex = match[2];
    try {
      const parsedProtocol = protocolHex ? parseInt(protocolHex, 16) : null;
      // Validate against known range (0 to 20)
      if (
        parsedProtocol !== null &&
        parsedProtocol >= PROTOCOL.AUTO &&
        parsedProtocol <= PROTOCOL.ISO_15765_4_CAN_29BIT_250K_8
      ) {
        // Log if it was auto-detected
        if (isAuto) {
          void log.debug(
            `[Helper] Auto-detected protocol number: ${parsedProtocol} (from ${response})`,
          );
        }
        return parsedProtocol;
      } else {
        void log.warn(
          `[Helper] Extracted protocol number out of expected range: ${parsedProtocol} from ${response}`,
        );
      }
    } catch (error: unknown) {
      // Catch parsing errors
      const errorMsg = error instanceof Error ? error.message : String(error);
      void log.error(
        `[Helper] Failed to parse protocol number from ${protocolHex} in ${response}`,
        { error: errorMsg },
      );
    }
  } else {
    // Check for text responses (less common for ATDPN)
    if (cleaned.includes('J1850PWM')) return PROTOCOL.SAE_J1850_PWM;
    if (cleaned.includes('J1850VPW')) return PROTOCOL.SAE_J1850_VPW;
    if (cleaned.includes('ISO9141')) return PROTOCOL.ISO_9141_2;
    if (cleaned.includes('KWP')) return PROTOCOL.ISO_14230_4_KWP_FAST; // Assume fast KWP
    if (cleaned.includes('CAN')) {
      // Default to common CAN if specific type not identifiable
      return PROTOCOL.ISO_15765_4_CAN_11BIT_500K;
    }
  }
  // No valid protocol found
  return null;
};

/**
 * Extracts potential ECU addresses (CAN/ISO/KWP headers) from a response string.
 * Can handle multi-line responses. Returns a unique list of found addresses.
 * Combines logic from ElmProtocolHelper.extractEcuAddress and connectionService.extractEcuAddresses.
 * Prioritizes headers appearing at the start of a line or after a frame number (e.g., 0:, 1:).
 */
export function extractEcuAddresses(
  rawResponse: string | null | undefined,
): string[] {
  if (!rawResponse) return [];

  const addresses = new Set<string>();
  // Split by newline or carriage return, filter empty lines
  const lines = rawResponse
    .split(/[\r\n]+/)
    .filter(line => line.trim().length > 0);

  for (const line of lines) {
    let dataPart = line.trim().toUpperCase(); // Work with uppercase hex

    // Remove ELM's optional line/frame numbering (e.g., "0:", "1:") if present
    dataPart = dataPart.replace(/^\s*[0-9A-F]{1,2}:\s*/, '');

    // Check if the remaining part is just hex data or known non-header keywords
    if (
      !/^[0-9A-F\s]+$/.test(dataPart) ||
      dataPart === RESPONSE_KEYWORDS.OK ||
      dataPart === RESPONSE_KEYWORDS.NO_DATA ||
      isResponseError(dataPart)
    ) {
      continue; // Skip lines that are not hex data or are known status messages
    }

    // Remove potential response codes like 41, 43, 49 etc. before header checks? Risky.
    // Let's try matching headers directly.

    // --- CAN Header Detection ---
    // Match 11-bit CAN header (7E8-7EF) at the start, must be followed by data
    let match = dataPart.match(/^(7E[89ABCDEF])([0-9A-F]{2})/i); // Ensure data follows header
    if (match?.[1] && match[2]) {
      addresses.add(match[1]); // Add the full 7Ex header
      continue; // Prioritize this match for the line
    }

    // Match 29-bit CAN header (18DA F1 xx or 18DB 33 F1) at the start
    // Look for 18DA followed by F1 (tester) and xx (ECU) -> 18DAF1xx
    match = dataPart.match(/^(18DAF1[0-9A-F]{2})/i); // Physical response
    if (match?.[1] && dataPart.length > match[1].length) {
      addresses.add(match[1]); // Add the full 18DAF1xx header
      continue;
    }
    // Look for 18DA followed by xx (ECU) and F1 (tester) -> 18DAxxF1 (less common but possible)
    match = dataPart.match(/^(18DA[0-9A-F]{2}F1)/i);
    if (match?.[1] && dataPart.length > match[1].length) {
      addresses.add(match[1]); // Add the full 18DAxxF1 header
      continue;
    }
    // Look for functional addressing response 18DB33F1 (often used for requests, less for responses)
    match = dataPart.match(/^(18DB33F1)/i); // Functional addressing
    if (match?.[1] && dataPart.length > match[1].length) {
      // Don't typically add functional address as ECU address unless no physical found
      // addresses.add(match[1]);
      continue;
    }

    // --- ISO/KWP Header Detection (typically 3 bytes: Format/Target, Target/Source, Source/Length or Data) ---
    // Examples: 48 6B 11 (ISO), 81 F1 11 (KWP Addr), 68 6A F1 (KWP Fmt)
    // We usually want the Source address (ECU address, often F1 for tester, 10/11/etc for ECU)
    match = dataPart.match(/^([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})/i);
    if (match?.[1] && match[2] && match[3]) {
      const formatTarget = match[1];
      const targetSource = match[2];
      const sourceLengthOrData = match[3];

      // ISO 9141-2 (e.g., 48 6B 11): Source is often the 3rd byte
      if (formatTarget === '48' && targetSource === '6B') {
        addresses.add(sourceLengthOrData);
        continue;
      }
      // KWP (e.g., 68 6A F1 or 81 F1 11): Source is often F1 (tester), Target is 2nd byte
      // So the ECU address might be in the 2nd byte (targetSource) if format indicates addressing (e.g., 8x)
      // Or the 3rd byte (sourceLengthOrData) if format indicates target/source/length (e.g., 6x)
      if (formatTarget.startsWith('8')) {
        // Addressing format
        addresses.add(targetSource); // ECU is likely Target
        continue;
      }
      if (formatTarget.startsWith('4') || formatTarget.startsWith('6')) {
        // Message format
        if (targetSource !== 'F1') {
          // If target is not the tester, it might be the ECU
          addresses.add(targetSource);
        } else if (sourceLengthOrData !== 'F1') {
          // If source is not the tester, it might be the ECU
          addresses.add(sourceLengthOrData);
        }
        continue;
      }
    }

    // --- Fallback for Headers Off ---
    // If headers are off (ATH0), the response might start directly with the service byte (e.g., 41, 43, 49)
    // In this case, we cannot reliably determine the ECU address from the response itself.
    // Do not add anything in this case.
  }

  // Convert Set to Array before returning
  return Array.from(addresses);
}

// --- Functions below are related to VIN/DTC parsing ---
// --- Keep implementation as-is per instructions, focus only on ensuring types/logging ---

/**
 * Checks if a cleaned response line looks like a VIN multi-frame indicator.
 * (Unchanged from connectionService - keep as is)
 */
export const isVinResponseFrame = (cleanedResponse: string): boolean => {
  // Check for standard ISO 15765-4 multi-frame indicators
  // 10 LL ... -> First Frame (xx = length, L = first nibble of length)
  // 2N ...    -> Consecutive Frame (N = sequence number 0-F)
  // These indicators appear *after* the service/PID (e.g., 49 02 01 ...)
  // So we look for them *after* the initial part of the response
  const dataPart = cleanedResponse.replace(/^(4902|0902)/, '').trim(); // Remove service/PID prefix
  return (
    dataPart.startsWith('10') || // First Frame (type 1, length follows)
    /^[2][0-9A-F]/.test(dataPart) // Consecutive Frame (type 2, sequence follows)
  );
};

/**
 * Assembles data from a potentially multi-line/multi-frame ELM response.
 * Removes frame counters (like '0:', '1:'), ISO-TP indicators (like '10xx', '2x'), prompts, whitespace.
 * Assumes the input `rawResponse` contains all frames concatenated by newlines/CRs.
 * (Unchanged from connectionService - keep as is, added logging)
 */
export const assembleMultiFrameResponse = (
  rawResponse: string | null | undefined,
): string => {
  if (!rawResponse) return '';

  void log.debug(`[Helper:assemble] Input: ${rawResponse}`); // Use logger
  // Split by newline or carriage return, filter empty lines
  const lines = rawResponse
    .split(/[\r\n]+/)
    .map(line => line.trim()) // Trim each line first
    .filter(
      line =>
        line.length > 0 &&
        !line.startsWith(RESPONSE_KEYWORDS.PROMPT) &&
        !isResponseError(line) &&
        line !== RESPONSE_KEYWORDS.OK,
    ); // Remove prompts, errors, OK, and empty lines

  let assembledData = '';
  let isMultiFrameSequence = false;
  let expectedFrameIndex = 1; // For consecutive frames (21, 22, ...)
  let totalExpectedLength = 0; // For tracking total expected bytes in multi-frame

  for (const line of lines) {
    // 1. Remove ELM's optional line/frame numbering (e.g., "0:", "1:")
    let processedLine = line.replace(/^\s*[0-9A-F]{1,2}:\s*/, '');

    // 2. Remove internal spaces for easier processing of hex data
    processedLine = processedLine.replace(/\s/g, '');

    // 3. Check for and remove standard ISO-TP frame indicators if present
    if (isIsoTpFrameIndicator(processedLine)) {
      const frameType = parseInt(processedLine.substring(0, 1), 16); // 1 for FF, 2 for CF, 3 for FC

      if (frameType === 1) {
        // First Frame (1 LLL ...) LLL = 12 bits length
        if (isMultiFrameSequence) {
          void log.warn(
            '[Helper:assemble] Received First Frame while already in sequence. Resetting.',
            { line },
          );
          assembledData = ''; // Reset data for this message
        }
        isMultiFrameSequence = true;
        expectedFrameIndex = 1; // Reset expected index for CF
        const lengthHex = processedLine.substring(1, 4); // Next 3 nibbles (12 bits) are length
        totalExpectedLength = parseInt(lengthHex, 16);
        if (isNaN(totalExpectedLength)) {
          void log.warn('[Helper:assemble] Invalid First Frame length.', {
            line,
          });
          isMultiFrameSequence = false; // Abort sequence
          processedLine = '';
        } else {
          processedLine = processedLine.substring(4); // Data starts after 1LLL
          void log.debug('[Helper:assemble] First Frame found.', {
            line,
            length: totalExpectedLength,
            initialData: processedLine,
          });
        }
      } else if (frameType === 2 && isMultiFrameSequence) {
        // Consecutive Frame (2N ...) N = sequence number
        const sequenceNumber = parseInt(processedLine.substring(1, 2), 16); // Sequence nibble
        if (isNaN(sequenceNumber)) {
          void log.warn(
            '[Helper:assemble] Invalid Consecutive Frame sequence number.',
            { line },
          );
          processedLine = ''; // Skip this frame's data
        } else if (sequenceNumber !== expectedFrameIndex % 16) {
          void log.warn(
            `[Helper:assemble] Unexpected Consecutive Frame sequence. Expected ${expectedFrameIndex % 16}, got ${sequenceNumber}`,
            { line },
          );
          // Attempt to continue anyway? Or discard? For now, discard sequence.
          isMultiFrameSequence = false;
          assembledData = ''; // Discard previous data for this message
          processedLine = '';
        } else {
          expectedFrameIndex++;
          processedLine = processedLine.substring(2); // Data starts after 2N
          void log.debug('[Helper:assemble] Consecutive Frame found.', {
            line,
            sequence: sequenceNumber,
            data: processedLine,
          });
        }
      } else if (frameType === 3) {
        // Flow Control Frame (3S BS STm)
        // Discard flow control frames from the assembled data
        void log.debug('[Helper:assemble] Discarding Flow Control frame:', {
          line,
        });
        processedLine = '';
      } else {
        // Frame type is 0 (Single Frame) or other unexpected type, or sequence error
        if (frameType === 0) {
          // Single Frame (0L DD...) L = length (1 nibble)
          const length = parseInt(processedLine.substring(1, 2), 16);
          if (!isNaN(length) && length > 0 && length <= 7) {
            processedLine = processedLine.substring(2, 2 + length * 2); // Extract data
            void log.debug('[Helper:assemble] Single Frame found.', {
              line,
              length,
              data: processedLine,
            });
          } else {
            void log.warn(
              '[Helper:assemble] Invalid Single Frame length/format.',
              { line },
            );
            processedLine = '';
          }
        } else {
          // Not part of an expected multi-frame sequence, or invalid frame type
          void log.debug(
            '[Helper:assemble] Treating as non-ISO-TP data or end of sequence.',
            { line },
          );
        }
        isMultiFrameSequence = false; // End sequence tracking
      }
    } else {
      // Not an ISO-TP indicator, treat as single frame or continuation data
      void log.debug('[Helper:assemble] Line does not have ISO-TP indicator.', {
        line,
      });
      isMultiFrameSequence = false; // End sequence tracking
    }

    // 4. Append the processed data part of the line
    assembledData += processedLine;

    // 5. Check if multi-frame message is complete based on length
    if (
      isMultiFrameSequence &&
      totalExpectedLength > 0 &&
      assembledData.length >= totalExpectedLength * 2
    ) {
      void log.debug(
        `[Helper:assemble] Multi-frame message complete. Expected ${totalExpectedLength}, got ${assembledData.length / 2} bytes.`,
      );
      assembledData = assembledData.substring(0, totalExpectedLength * 2); // Trim any excess
      isMultiFrameSequence = false; // Reset sequence for next potential message
      // Don't break here, process remaining lines in case of multiple messages in one response
    }
  }

  void log.debug(`[Helper:assemble] Output: ${assembledData}`); // Use logger

  return assembledData;
};

/**
 * Parses VIN string from fully assembled OBD response hex data.
 * Expects data *after* multi-frame assembly & cleaning.
 * @param assembledHexData - Concatenated hex string from all relevant frames.
 * (Unchanged from connectionService - keep as is, added logging)
 */
export const parseVinFromResponse = (
  assembledHexData: string | null | undefined,
): string | null => {
  if (!assembledHexData) return null;

  void log.debug(`[Helper:parseVin] Input Hex: ${assembledHexData}`); // Use logger

  // Find the VIN response signature: Mode 49, PID 02 -> "4902"
  // Also handle Mode 09 PID 02 -> "0902" (request echo or incorrect header setting)
  // VIN data should follow this, often prefixed by a count byte (01 for VIN)
  let vinSignatureIndex = assembledHexData.indexOf('4902');
  let payloadStartIndex = -1;

  if (vinSignatureIndex !== -1) {
    // Check for the count byte '01' right after '4902'
    if (
      assembledHexData.substring(
        vinSignatureIndex + 4,
        vinSignatureIndex + 6,
      ) === '01'
    ) {
      payloadStartIndex = vinSignatureIndex + 6; // Start after '490201'
    } else {
      // Fallback: Assume data starts right after '4902' if count byte is missing/different
      payloadStartIndex = vinSignatureIndex + 4;
      void log.warn(
        `[Helper:parseVin] VIN response '4902' found, but not followed by expected count '01'. Assuming payload starts immediately after.`,
      );
    }
  } else {
    // Try Mode 09 signature
    vinSignatureIndex = assembledHexData.indexOf('0902');
    if (vinSignatureIndex !== -1) {
      // Check for count byte '01'
      if (
        assembledHexData.substring(
          vinSignatureIndex + 4,
          vinSignatureIndex + 6,
        ) === '01'
      ) {
        payloadStartIndex = vinSignatureIndex + 6; // Start after '090201'
      } else {
        payloadStartIndex = vinSignatureIndex + 4;
        void log.warn(
          `[Helper:parseVin] VIN response '0902' found, but not followed by expected count '01'. Assuming payload starts immediately after.`,
        );
      }
    }
  }

  if (payloadStartIndex === -1) {
    void log.warn(
      `[Helper:parseVin] VIN signature '4902' or '0902' not found. Cannot reliably parse VIN.`,
      { data: assembledHexData },
    );
    // Check if the *entire* response might be the VIN hex (unlikely but possible)
    if (assembledHexData.length === 34) {
      void log.warn(
        `[Helper:parseVin] No signature found, but data length is 34 hex chars. Attempting to parse as VIN.`,
      );
      payloadStartIndex = 0; // Try parsing the whole string
    } else {
      return null; // No signature and wrong length
    }
  }

  const hexPayload = assembledHexData.substring(payloadStartIndex);

  // Remove potential padding bytes (often 00 or FF at the end in CAN)
  // Be less aggressive: only remove trailing 00s. FF might be valid in some contexts.
  const cleanPayload = hexPayload.replace(/00+$/i, '');

  if (cleanPayload.length === 0) {
    void log.warn('[Helper:parseVin] VIN payload is empty after cleaning.'); // Use logger
    return null;
  }

  // VIN should be 17 chars = 34 hex digits. If much longer, trim?
  const expectedHexLength = 17 * 2;
  // Only trim if significantly longer (e.g., > 40 hex chars), otherwise keep potentially partial VIN
  const trimmedPayload =
    cleanPayload.length > expectedHexLength + 6 // Allow some slack
      ? cleanPayload.substring(0, expectedHexLength)
      : cleanPayload;

  try {
    const bytes = hexToBytes(trimmedPayload);
    const vin = bytesToString(bytes); // Use updated bytesToString

    // Final check for VIN validity after decoding
    // Remove any remaining non-alphanumeric chars just in case
    const finalVin = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '');

    void log.debug(
      `[Helper:parseVin] Decoded VIN attempt: "${finalVin}" (Length: ${finalVin.length})`,
    ); // Use logger

    // Basic VIN validation (17 chars, specific alphanumeric set, no I, O, Q)
    if (finalVin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/i.test(finalVin)) {
      void log.debug(`[Helper:parseVin] Parsed VIN appears valid: ${finalVin}`); // Use logger
      return finalVin;
    } else if (finalVin.length > 5) {
      // Return if reasonably long, even if not perfect 17
      void log.warn(
        `[Helper:parseVin] Parsed VIN "${finalVin}" has unexpected format/length (${finalVin.length}). Returning potentially incorrect value.`,
      ); // Use logger
      return finalVin; // Return potentially partial/incorrect VIN
    } else {
      void log.warn(
        `[Helper:parseVin] Failed to decode a valid VIN from payload hex: ${trimmedPayload}`,
      ); // Use logger
      return null;
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    void log.error(
      `[Helper:parseVin] Error decoding VIN hex "${trimmedPayload}":`,
      { error: errorMsg },
    ); // Use logger
    return null;
  }
};

/** Parses DTC codes from assembled OBD response data */
// (Unchanged from connectionService - keep as is, added logging)
export const parseDtcsFromResponse = (
  responseData: string | null | undefined,
  modePrefix: string, // e.g., "43", "47", "4A"
): string[] | null => {
  if (!responseData) return null;

  // Response format: [<Header>] <Mode+0x40> [<Num DTCs>] <DTC1_Byte1><DTC1_Byte2>...
  // Example: 7E8 06 43 01 12 34 00 00 -> Mode 03, 1 DTC, P1234
  // Example: 43 01 12 34 -> No header, Mode 03, 1 DTC, P1234
  void log.debug(
    `[Helper] Parsing DTC data starting with mode ${modePrefix}: ${responseData}`,
  ); // Use logger

  // Find the mode prefix (e.g., "43")
  const startIndex = responseData.indexOf(modePrefix);

  if (startIndex === -1) {
    // If response is *just* the prefix (e.g., "43"), it implies zero DTCs
    if (responseData === modePrefix) {
      void log.debug(
        `[Helper] DTC response is just prefix ${modePrefix}, indicating zero DTCs.`,
      );
      return [];
    }
    // If prefix not found at all
    void log.warn(
      `[Helper] DTC response prefix ${modePrefix} not found in data: ${responseData}`,
    ); // Use logger
    return null; // Indicate parsing failure
  }

  // Extract relevant hex data starting *after* the prefix
  let dtcHexData = responseData.substring(startIndex + modePrefix.length);

  // The first byte *after* the prefix *might* be the number of DTCs encoded in the frame.
  // Example: 43 02 1234 5678 -> dtcHexData starts with "0212345678"
  // It's safer *not* to rely on this count byte for parsing, but we can log it.
  if (dtcHexData.length >= 2) {
    const potentialCountHex = dtcHexData.substring(0, 2);
    if (/^[0-9A-F]{2}$/.test(potentialCountHex)) {
      const potentialCount = parseInt(potentialCountHex, 16);
      // Heuristic check: If it's a plausible count (<50) and length roughly matches count * 4 hex chars
      const expectedLength = potentialCount * 4;
      // Check if remaining length is multiple of 4 (2 bytes per DTC)
      const remainingDataLength = dtcHexData.length - 2;
      if (
        !isNaN(potentialCount) &&
        potentialCount < 50 &&
        remainingDataLength % 4 === 0 &&
        remainingDataLength === expectedLength
      ) {
        void log.debug(
          `[Helper] Assuming first byte ${potentialCountHex} is DTC count (${potentialCount}), skipping.`,
        );
        dtcHexData = dtcHexData.substring(2); // Skip the count byte
      } else {
        void log.debug(
          `[Helper] First byte ${potentialCountHex} after prefix doesn't look like a reliable DTC count. Parsing all subsequent data.`,
        );
      }
    }
  }

  // Each DTC is 2 bytes (4 hex chars).
  const dtcs: string[] = [];
  // Remove trailing padding bytes (often 00) before iterating - be careful not to remove valid 00 data within DTCs
  // Only remove 00s if they form complete pairs at the end
  const cleanDtcHexData = dtcHexData.replace(/(0000)+$/, '');

  // Ensure remaining data has a length multiple of 4
  if (cleanDtcHexData.length % 4 !== 0) {
    void log.warn(
      `[Helper] DTC data length (${cleanDtcHexData.length}) is not a multiple of 4 after removing trailing 0000s. Data: ${cleanDtcHexData}`,
    );
    // Proceed cautiously, parse as much as possible
  }

  for (let i = 0; i + 4 <= cleanDtcHexData.length; i += 4) {
    const dtcPair = cleanDtcHexData.substring(i, i + 4);

    // Skip padding bytes "0000" which might still exist if not perfectly removed
    if (dtcPair === '0000') continue;

    // Check if the pair is valid hex
    if (!/^[0-9A-F]{4}$/i.test(dtcPair)) {
      void log.warn(
        `[Helper] Skipping invalid hex sequence in DTC data: ${dtcPair}`,
      );
      continue; // Skip this invalid pair
    }

    const byte1 = parseInt(dtcPair.substring(0, 2), 16);
    const byte2 = parseInt(dtcPair.substring(2, 4), 16);

    // Decode according to SAE J2012 / ISO 15031-6
    let firstChar: string;
    const firstTwoBits = byte1 >> 6; // Get the first two bits

    switch (firstTwoBits) {
      case 0:
        firstChar = 'P';
        break; // Powertrain (00xx xxxx)
      case 1:
        firstChar = 'C';
        break; // Chassis    (01xx xxxx)
      case 2:
        firstChar = 'B';
        break; // Body       (10xx xxxx)
      case 3:
        firstChar = 'U';
        break; // Network    (11xx xxxx)
      default:
        firstChar = '?'; // Should not happen
    }

    // The remaining 14 bits form the DTC number
    // Bits 5 & 4 of byte 1 determine the second character (0-3)
    const secondCharDigit = (byte1 >> 4) & 0x03; // Get bits 5 and 4

    // The last 4 bits of byte 1 and all 8 bits of byte 2 form the last 3 hex digits
    const lastThreeDigits = (((byte1 & 0x0f) << 8) | byte2)
      .toString(16)
      .toUpperCase()
      .padStart(3, '0');

    const dtcCode = `${firstChar}${secondCharDigit}${lastThreeDigits}`;
    dtcs.push(dtcCode);
  }

  void log.debug(
    `[Helper] Parsed DTCs (Mode ${modePrefix}): ${dtcs.length > 0 ? dtcs.join(', ') : 'None'}`,
  ); // Use logger

  return dtcs; // Return the array of parsed DTC strings
};

/**
 * Checks if a cleaned response line looks like a standard ISO-TP multi-frame indicator.
 * Used by assembleMultiFrameResponse.
 * (Unchanged from connectionService - keep as is)
 */
export const isIsoTpFrameIndicator = (cleanedLine: string): boolean => {
  // 1 LLL ... -> First Frame (Frame Type 1, LLL = 12 bits length)
  // 2 N ...   -> Consecutive Frame (Frame Type 2, N = sequence 0-F)
  // 3 S BS STm-> Flow Control (Frame Type 3, S=Status, BS=BlockSize, STm=SeparationTime)
  // 0 L DD... -> Single Frame (Frame Type 0, L = length 1 nibble)
  return (
    cleanedLine.startsWith('0') || // Single Frame
    cleanedLine.startsWith('1') || // First Frame
    /^[2][0-9A-F]/.test(cleanedLine) || // Consecutive Frame
    cleanedLine.startsWith('3') // Flow Control Frame
  );
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
import type { PROTOCOL, ECUConnectionStatus } from './constants';
import type { RawDTCResponse } from '../retrievers/BaseDTCRetriever';

export { RawDTCResponse }; // Re-export for convenience

// Define Action Types using 'as const' for better type inference
export const ECUActionType = {
  CONNECT_START: 'CONNECT_START',
  CONNECT_SUCCESS: 'CONNECT_SUCCESS',
  CONNECT_FAILURE: 'CONNECT_FAILURE',
  DISCONNECT: 'DISCONNECT',
  SET_ECU_INFO: 'SET_ECU_INFO', // Used for updating info like voltage
  RESET: 'RESET', // Action to reset the ECU state completely

  // DTC related actions (kept for potential use, no changes needed)
  FETCH_DTCS_START: 'FETCH_DTCS_START',
  FETCH_DTCS_SUCCESS: 'FETCH_DTCS_SUCCESS',
  FETCH_DTCS_FAILURE: 'FETCH_DTCS_FAILURE',
  CLEAR_DTCS_START: 'CLEAR_DTCS_START',
  CLEAR_DTCS_SUCCESS: 'CLEAR_DTCS_SUCCESS',
  CLEAR_DTCS_FAILURE: 'CLEAR_DTCS_FAILURE',

  // Raw DTC actions (kept for potential use, no changes needed)
  FETCH_RAW_DTCS_START: 'FETCH_RAW_DTCS_START',
  FETCH_RAW_CURRENT_DTCS_SUCCESS: 'FETCH_RAW_CURRENT_DTCS_SUCCESS',
  FETCH_RAW_PENDING_DTCS_SUCCESS: 'FETCH_RAW_PENDING_DTCS_SUCCESS',
  FETCH_RAW_PERMANENT_DTCS_SUCCESS: 'FETCH_RAW_PERMANENT_DTCS_SUCCESS',
  FETCH_RAW_DTCS_FAILURE: 'FETCH_RAW_DTCS_FAILURE',
} as const;

// Type for the action object used in the reducer
export type ECUAction = {
  type: keyof typeof ECUActionType; // Use keys of the const object
  payload?: ECUActionPayload; // Payload is optional
};

// Interface for the payload of ECU actions
export interface ECUActionPayload {
  protocol?: PROTOCOL | null; // Protocol number (enum or null)
  protocolName?: string | null; // Descriptive name of the protocol
  detectedEcuAddresses?: string[]; // Array of detected ECU addresses (headers)
  error?: string; // Error message string
  voltage?: string | undefined | null; // Voltage string (e.g., "12.3V") or null/undefined
  data?: RawDTCResponse | null; // Payload for raw DTC data actions
  // Add other potential payload fields if needed
  dtcs?: string[] | null; // For FETCH_DTCS_SUCCESS potentially
}

// Interface for the value provided by the ECUContext
export interface ECUContextValue {
  state: ECUState; // The current state of the ECU connection and data
  connectWithECU: () => Promise<boolean>; // Function to initiate ECU connection sequence
  disconnectECU: () => Promise<void>; // Function to disconnect from ECU (protocol close, reset state)
  getECUInformation: () => Promise<void>; // Function to fetch adapter/ECU info (e.g., voltage)
  getActiveProtocol: () => { protocol: PROTOCOL | null; name: string | null }; // Get current protocol info
  // Non-ECU related functions (signatures remain the same)
  getVIN: () => Promise<string | null>;
  // eslint-disable-next-line no-unused-vars
  clearDTCs: (skipVerification?: boolean) => Promise<boolean>;
  getRawCurrentDTCs: () => Promise<RawDTCResponse | null>;
  getRawPendingDTCs: () => Promise<RawDTCResponse | null>;
  getRawPermanentDTCs: () => Promise<RawDTCResponse | null>;
  // The core function for sending commands via Bluetooth
  sendCommand: SendCommandFunction;
}

// Interface describing the state managed by the ECU reducer
export interface ECUState {
  status: ECUConnectionStatus; // Current connection status enum
  activeProtocol: PROTOCOL | null; // Active protocol number (enum or null)
  protocolName: string | null; // Descriptive name of the active protocol
  lastError: string | null; // Last recorded error message
  deviceVoltage: string | null; // Last read device voltage (e.g., "12.3V")
  detectedEcuAddresses: string[]; // List of ECU addresses found during connection
  selectedEcuAddress: string | null; // Currently targeted ECU address (header)
  // DTC related state (remains unchanged from initial definition)
  currentDTCs: string[] | null;
  pendingDTCs: string[] | null;
  permanentDTCs: string[] | null;
  dtcLoading: boolean;
  dtcClearing: boolean;
  rawCurrentDTCs: RawDTCResponse | null;
  rawPendingDTCs: RawDTCResponse | null;
  rawPermanentDTCs: RawDTCResponse | null;
  rawDTCLoading: boolean;
}

// Type definition for the sendCommand function used throughout the ECU module
// Aligns with react-native-bluetooth-obd-manager hook's sendCommand signature
export type SendCommandFunction = (
  // eslint-disable-next-line no-unused-vars
  command: string,
  // eslint-disable-next-line no-unused-vars
  options?: number | { timeout?: number }, // Allow number (legacy) or options object for timeout
) => Promise<string | null>; // Returns the response string or null on failure/timeout

// --- Types below define configuration structures - derived from JS ElmProtocolInit/Helper ---
// --- Kept for potential future protocol detail implementation ---

/** Configuration for adaptive timing */
export interface AdaptiveTimingConfig {
  mode: 0 | 1 | 2; // ATAT mode
  timeout: number; // ATST timeout value (in hex-time units, e.g., 64 for 100ms)
  startDelay: number; // Initial delay (ms)
  minDelay: number; // Minimum delay (ms)
  maxDelay: number; // Maximum delay (ms)
  increment: number; // Increment step (ms)
  decrement: number; // Decrement step (ms)
}

/** Basic protocol configuration including timing */
export interface ProtocolTimingConfig {
  protocol: PROTOCOL;
  description: string;
  timing: AdaptiveTimingConfig;
}

/** Configuration specific to CAN protocols */
export interface CanProtocolConfig extends ProtocolTimingConfig {
  header: string; // Default functional header (e.g., 7DF, 18DB33F1)
  receiveFilter: string; // Default ECU response header (e.g., 7E8, 18DAF110)
  flowControlHeader: string; // Header used for flow control (e.g., 7E0, 18DA10F1)
  isExtended: boolean; // 29-bit ID flag
  formatCommands?: string[]; // e.g., ['ATCAF1']
  /** Function that generates flow control setup commands based on a header value */
  // disable eslint here
  // eslint-disable-next-line no-unused-vars
  flowControlCommands: (fcHeader: string) => string[]; // Returns commands like ['ATFCSH header']
}

// Configuration for non-CAN protocols (example for KWP)
export interface KwpProtocolConfig extends ProtocolTimingConfig {
  initType: 'fast' | 'slow';
  formatCommands?: string[]; // e.g., ['ATCAF0']
  // KWP specific params if needed
}

// --- Types below were in the original types.ts, kept for reference ---
// --- Might overlap or be superseded by the above ---

export interface SendCommandOptions {
  timeoutMs?: number;
}

// Combining HeaderFormatConfig and FlowControlConfig into Protocol details if needed later
export interface ProtocolConfig {
  protocolNumber: number;
  description: string;
  headerFormatConfig?: HeaderFormatConfig; // Optional: Refined header details
  baudRate?: number; // Informational, might not be readily available
  flowControlEnabled?: boolean; // Does protocol use ISO-TP Flow Control?
  flowControlConfig?: FlowControlConfig; // Optional: Refined FC details
  timing?: TimingConfig; // Refined timing details
  initSequence?: string[]; // Initial setup commands
  supportedModes?: string[]; // Informational
  errorPatterns?: RegExp[]; // Informational
}

export interface TimingConfig {
  p1Max?: number; // Informational: Max ECU inter-byte time (ms)
  p2Max?: number; // Informational: Max Request->Response time (ms)
  p3Min?: number; // Informational: Min Response->Request time (ms)
  p4Min?: number; // Informational: Min Request inter-byte time (ms)
  adaptiveMode: 0 | 1 | 2; // ELM ATAT mode
  // Merge adaptive timing config here from AdaptiveTimingConfig?
  adaptiveStart?: number;
  adaptiveMin?: number;
  adaptiveMax?: number;
  increment?: number;
  decrement?: number;
  responseTimeoutMs: number; // Target response timeout (ms) for ATST
}

// Ensure all properties are optional if they aren't always present
export interface FlowControlConfig {
  blockSize?: number; // FC Block Size (BS) for ATFC SD
  separationTime?: number; // FC Separation Time (ST) in ms for ATFC SD
  flowControlHeader?: string; // Header for outgoing FC frames (ATFC SH)
  flowControlMode?: 0 | 1 | 2; // FC Mode (ATFC SM)
  maxWaitFrames?: number; // Informational
}

// Ensure all properties are optional if they aren't always present
export interface HeaderFormatConfig {
  type?: '11bit' | '29bit';
  format?: 'CAN' | 'ISO' | 'KWP' | 'J1850' | 'OTHER'; // Informational
  addressingMode?: 'physical' | 'functional'; // Informational
  defaultTxHeader?: string; // e.g., 7DF, 18DB33F1
  defaultRxHeader?: string; // e.g., 7E8, 18DAF110
  defaultFilter?: string; // For ATCF
  defaultMask?: string; // For ATCM
}

// Type for Service Modes used by DTC Retrievers (remains unchanged)
export interface ServiceMode {
  REQUEST: string;
  RESPONSE: number;
  NAME: string;
  DESCRIPTION: string;
  troubleCodeType: string;
  flowControl?: boolean;
  timing?: Partial<TimingConfig>;
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

#### Directory: src/ecu/protocols

### File: ProtocolManager.ts

**Path:** `src/ecu/protocols/ProtocolManager.ts`

```typescript
// filepath: src/ecu/protocols/ProtocolManager.ts
import { log } from '../../utils/logger';
import {
  ELM_COMMANDS,
  DELAYS_MS,
  PROTOCOL,
  PROTOCOL_DESCRIPTIONS,
  PROTOCOL_TRY_ORDER,
  RESPONSE_KEYWORDS,
  STANDARD_PIDS, // Import standard PIDs
} from '../utils/constants';
import {
  cleanResponse,
  extractProtocolNumber,
  isResponseError,
  isResponseOk,
} from '../utils/helpers';

import type { SendCommandFunction } from '../utils/types';

// Use the standard PID 0100 (Supported PIDs [01-20]) for protocol testing
const PROTOCOL_TEST_COMMAND = STANDARD_PIDS.SUPPORTED_PIDS_1;

/**
 * Manages OBD protocol detection and setup.
 * Based on logic from ElmProtocol, ElmProtocolHelper, ElmProtocolInit.
 */
export class ProtocolManager {
  private readonly sendCommand: SendCommandFunction;

  constructor(sendCommand: SendCommandFunction) {
    this.sendCommand = sendCommand;
  }

  /**
   * Helper method to create a delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Gets the currently active protocol number from the ELM327 adapter using ATDPN.
   */
  async getCurrentProtocolNumber(): Promise<PROTOCOL | null> {
    await log.debug(
      '[ProtocolManager] Querying current protocol number (ATDPN)...',
    );
    try {
      // Use a moderate timeout for protocol query
      const response = await this.sendCommand(
        ELM_COMMANDS.GET_PROTOCOL_NUM,
        2000,
      );
      const protocolNum = extractProtocolNumber(response);
      if (protocolNum !== null) {
        await log.debug(
          `[ProtocolManager] Current protocol number: ${protocolNum}`,
        );
      } else {
        await log.warn(
          `[ProtocolManager] Could not determine current protocol number from response: ${response ?? 'null'}`,
        );
      }
      // Cast to PROTOCOL enum type
      return protocolNum as PROTOCOL | null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.error(
        '[ProtocolManager] Error getting current protocol number:',
        { error: errorMsg },
      );
      return null;
    }
  }

  /**
   * Attempts to automatically detect and set the correct OBD protocol.
   * Iterates through PROTOCOL_TRY_ORDER.
   * Based on ElmProtocolHelper.tryAllProtocols and related methods.
   */
  async detectAndSetProtocol(): Promise<{
    protocol: PROTOCOL;
    name: string;
  } | null> {
    await log.debug(
      '[ProtocolManager] Starting protocol detection sequence...',
    );

    // Step 1: Try Auto Protocol (ATSP0) first, includes verification
    try {
      await log.debug('[ProtocolManager] Trying ATSP0 (Auto)...');
      const autoSetResponse = await this.sendCommand(
        ELM_COMMANDS.AUTO_PROTOCOL,
        5000,
      ); // Timeout for ATSP0
      await this.delay(DELAYS_MS.COMMAND_MEDIUM);

      if (autoSetResponse && isResponseOk(autoSetResponse)) {
        // Verify connection with a standard command
        const verifyResponse = await this.sendCommand(
          PROTOCOL_TEST_COMMAND,
          5000,
        ); // Timeout for 0100
        await this.delay(DELAYS_MS.COMMAND_MEDIUM);

        // Check if response is valid and not NO DATA (NO DATA is acceptable here if protocol set)
        if (verifyResponse && !isResponseError(verifyResponse)) {
          // Auto detect *might* have succeeded, now find out which protocol was chosen
          const protocolNum = await this.getCurrentProtocolNumber();
          if (protocolNum !== null && protocolNum !== PROTOCOL.AUTO) {
            // Ensure it's not still 0
            const protocolName =
              PROTOCOL_DESCRIPTIONS[protocolNum] ?? `Protocol ${protocolNum}`;
            await log.info(
              `[ProtocolManager] Auto-detection successful. Protocol: ${protocolName} (${protocolNum})`,
            );
            // No need to set it again, ATSP0 already did.
            return { protocol: protocolNum, name: protocolName };
          } else {
            await log.warn(
              `[ProtocolManager] ATSP0 succeeded but failed to read back a specific protocol number or still reports AUTO. Response: ${verifyResponse}`,
            );
          }
        } else {
          await log.debug(
            `[ProtocolManager] ATSP0 verification failed or returned error/NO DATA. Response: ${verifyResponse ?? 'null'}`,
          );
        }
      } else {
        await log.debug(
          `[ProtocolManager] ATSP0 command failed or returned error. Response: ${autoSetResponse ?? 'null'}`,
        );
      }
      // Close protocol if auto failed, before trying manual
      try {
        await log.debug(
          '[ProtocolManager] Closing protocol after failed auto-attempt (ATPC)...',
        );
        await this.sendCommand(ELM_COMMANDS.PROTOCOL_CLOSE, 1000);
        await this.delay(DELAYS_MS.PROTOCOL_SWITCH);
      } catch {
        /* Ignore cleanup error */
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.error('[ProtocolManager] Error during Auto protocol attempt:', {
        error: errorMsg,
      });
      try {
        await log.debug(
          '[ProtocolManager] Closing protocol after error during auto-attempt (ATPC)...',
        );
        await this.sendCommand(ELM_COMMANDS.PROTOCOL_CLOSE, 1000);
        await this.delay(DELAYS_MS.PROTOCOL_SWITCH);
      } catch {
        /* Ignore cleanup error */
      }
    }

    // Step 2: Manual Protocol Detection if Auto failed
    await log.debug(
      '[ProtocolManager] Auto-detect failed or inconclusive. Starting manual protocol testing...',
    );
    for (const protocol of PROTOCOL_TRY_ORDER) {
      // Skip AUTO protocol in manual check
      if (Number(protocol) === PROTOCOL.AUTO) continue;

      const protocolNumHex = protocol.toString(16).toUpperCase();
      const protocolName =
        PROTOCOL_DESCRIPTIONS[protocol] ?? `Protocol ${protocolNumHex}`;
      await log.debug(
        `[ProtocolManager] Trying protocol: ${protocolName} (${protocolNumHex})...`,
      );

      try {
        // Try Protocol command (ATTP) - checks if protocol is usable
        const tryCmd = `${ELM_COMMANDS.TRY_PROTOCOL_PREFIX}${protocolNumHex}`;
        const tryResponse = await this.sendCommand(tryCmd, 10000); // Long timeout for ATTP
        await this.delay(DELAYS_MS.COMMAND_MEDIUM); // Short delay after ATTP

        // Check if ATTP response is OK or Searching... (indicates protocol might work)
        // Allow empty response after ATTP as potentially successful initiation
        if (
          tryResponse &&
          (isResponseOk(tryResponse) ||
            cleanResponse(tryResponse).includes(RESPONSE_KEYWORDS.SEARCHING) ||
            tryResponse.trim() === '')
        ) {
          await log.debug(
            `[ProtocolManager] ATTP${protocolNumHex} response suggests potential compatibility: ${tryResponse}`,
          );

          // Send a standard command to confirm communication with ECU
          const testResponse = await this.sendCommand(
            PROTOCOL_TEST_COMMAND,
            5000,
          ); // Standard timeout for 0100
          await this.delay(DELAYS_MS.COMMAND_MEDIUM); // Short delay after test command

          // Check if the test command was successful (valid response, not error, not NO DATA)
          if (
            testResponse &&
            !isResponseError(testResponse) &&
            !cleanResponse(testResponse).includes(RESPONSE_KEYWORDS.NO_DATA)
          ) {
            // Protocol test succeeded! Now permanently set it using ATSP
            await log.info(
              `[ProtocolManager] Protocol ${protocolName} test successful! Setting permanently...`,
            );
            const setCommand = `${ELM_COMMANDS.SET_PROTOCOL_PREFIX}${protocolNumHex}`;
            const setResponse = await this.sendCommand(setCommand, 2000); // Timeout for ATSP
            await this.delay(DELAYS_MS.COMMAND_MEDIUM); // Short delay after ATSP

            if (setResponse && isResponseOk(setResponse)) {
              // Final check: Verify the protocol number was actually set
              const finalProtocolNum = await this.getCurrentProtocolNumber();
              if (finalProtocolNum === protocol) {
                await log.info(
                  `[ProtocolManager] Successfully set and verified protocol: ${protocolName} (${protocol})`,
                );
                return { protocol, name: protocolName };
              } else {
                await log.warn(
                  `[ProtocolManager] ATSP${protocolNumHex} reported OK, but ATDPN returned ${finalProtocolNum ?? 'null'}.`,
                );
                // Still consider it a success if ATSP said OK? Maybe. Let's return for now.
                return { protocol, name: protocolName };
              }
            } else {
              await log.warn(
                `[ProtocolManager] Failed to set protocol ${protocolName} with ATSP. Response: ${setResponse ?? 'null'}`,
              );
              // Consider test successful even if ATSP fails, if ATTP + 0100 worked? Risky.
              // Let's treat ATSP failure as protocol failure for robustness.
            }
          } else {
            await log.debug(
              `[ProtocolManager] Protocol ${protocolName} test (${PROTOCOL_TEST_COMMAND}) failed or returned NO DATA. Response: ${testResponse ?? 'null'}`,
            );
          }
        } else {
          await log.debug(
            `[ProtocolManager] Protocol ${protocolName} not supported by adapter or vehicle (ATTP failed). Response: ${tryResponse ?? 'null'}`,
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await log.error(
          `[ProtocolManager] Error testing protocol ${protocolName}:`,
          { error: errorMsg },
        );
        // Ensure protocol is closed even if error occurred during test
      } finally {
        // Close the protocol before trying the next one
        try {
          await log.debug(
            `[ProtocolManager] Closing protocol ${protocolName} attempt (ATPC)...`,
          );
          await this.sendCommand(ELM_COMMANDS.PROTOCOL_CLOSE, 1000);
          await this.delay(DELAYS_MS.PROTOCOL_SWITCH); // Wait after closing
        } catch {
          /* Ignore cleanup error */
        }
      }
    } // End of protocol loop

    await log.error(
      '[ProtocolManager] Protocol detection failed - No working protocol found after all attempts.',
    );
    return null; // No protocol found
  }

  /**
   * Applies basic configuration settings after a protocol is established.
   * Based on ElmProtocol.initializeDevice and configureForProtocol logic.
   * Assumes basic init (ATE0, ATL0, ATS0) was done earlier.
   */
  async configureProtocolSettings(protocol: PROTOCOL | null): Promise<void> {
    if (protocol === null) {
      await log.warn(
        '[ProtocolManager] Cannot configure settings: No active protocol.',
      );
      return;
    }
    await log.debug(
      `[ProtocolManager] Configuring settings for protocol: ${protocol}`,
    );
    try {
      // Set Adaptive Timing (ATAT1 is generally safe, ATAT2 more aggressive for KWP)
      // Use ATAT1 as default from ElmProtocolInit basicInit
      const adaptTimingCmd =
        protocol === PROTOCOL.ISO_14230_4_KWP ||
        protocol === PROTOCOL.ISO_14230_4_KWP_FAST
          ? ELM_COMMANDS.ADAPTIVE_TIMING_2 // Use ATAT2 for KWP
          : ELM_COMMANDS.ADAPTIVE_TIMING_1; // Use ATAT1 for others
      await log.debug(
        `[ProtocolManager] Setting adaptive timing (${adaptTimingCmd})`,
      );
      await this.sendCommand(adaptTimingCmd, 1000);
      await this.delay(DELAYS_MS.COMMAND_SHORT);

      // Set Headers (ON for CAN, OFF otherwise generally)
      // Protocols 6 through 20 are CAN based
      const isCan =
        protocol >= PROTOCOL.ISO_15765_4_CAN_11BIT_500K &&
        protocol <= PROTOCOL.ISO_15765_4_CAN_29BIT_250K_8;
      if (isCan) {
        await log.debug(
          '[ProtocolManager] Ensuring headers are ON for CAN protocol (ATH1).',
        );
        await this.sendCommand(ELM_COMMANDS.HEADERS_ON, 1000);
      } else {
        await log.debug(
          '[ProtocolManager] Ensuring headers are OFF for non-CAN protocol (ATH0).',
        );
        await this.sendCommand(ELM_COMMANDS.HEADERS_OFF, 1000);
      }
      await this.delay(DELAYS_MS.COMMAND_SHORT);

      // Set Timeout (ATST) - Use a default moderate value, can be overridden later
      // Example: ATST64 (100ms in hex)
      // const timeoutHex = DELAYS_MS.TIMEOUT_NORMAL_MS.toString(16).toUpperCase().padStart(2, '0');
      // await this.sendCommand(`${ELM_COMMANDS.SET_TIMEOUT}${timeoutHex}`, 1000);
      // await this.delay(DELAYS_MS.COMMAND_SHORT);
      // Note: Timeout setting might be protocol specific, complex to generalize here. Let adapter manage with ATAT.

      // CAN Specific configurations (Flow Control, Formatting) - Add if needed
      if (isCan) {
        await log.debug(
          '[ProtocolManager] Ensuring CAN Auto-Formatting is ON (ATCAF1)',
        );
        await this.sendCommand(ELM_COMMANDS.CAN_AUTO_FORMAT_ON, 1000); // Enable CAN formatting
        await this.delay(DELAYS_MS.COMMAND_SHORT);
        // Set default flow control? Done in BaseDTCRetriever configureForProtocol now.
      } else {
        // Ensure CAN Auto-Formatting is OFF for non-CAN
        await log.debug(
          '[ProtocolManager] Ensuring CAN Auto-Formatting is OFF (ATCAF0)',
        );
        await this.sendCommand(ELM_COMMANDS.CAN_AUTO_FORMAT_OFF, 1000);
        await this.delay(DELAYS_MS.COMMAND_SHORT);
      }

      await log.debug(
        `[ProtocolManager] Basic settings configured for protocol ${protocol}.`,
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.warn(
        '[ProtocolManager] Error during protocol settings configuration:',
        { error: errorMsg },
      );
      // Continue even if some settings fail?
    }
  }
}

```

### File: index.ts

**Path:** `src/ecu/protocols/index.ts`

```typescript
// filepath: src/ecu/protocols/index.ts
// Export necessary components for connection logic
export { ProtocolManager } from './ProtocolManager';
export { PROTOCOL } from '../utils/constants'; // Re-export for convenience if needed
export type {
  ProtocolConfig,
  TimingConfig,
  FlowControlConfig,
} from '../utils/types'; // Re-export types

// Can export specific protocol classes later if needed directly
// export * from './CAN';
// export * from './ISO9141';
// export * from './KWP';

```

### File: types.ts

**Path:** `src/ecu/protocols/types.ts`

```typescript
// filepath: src/ecu/protocols/types.ts
/**
 * Defines the structure for configuring CAN protocol headers and filters.
 */
export interface HeaderFormatConfig {
  format: 'CAN' | 'ISO' | 'KWP' | 'J1850' | 'OTHER'; // Protocol type
  addressingMode?: 'physical' | 'functional'; // CAN/UDS addressing
  defaultTxHeader?: string; // Default ELM ATSH value
  defaultRxHeader?: string; // Expected incoming header (for filtering)
  defaultFilter?: string; // Default ELM ATCF value
  defaultMask?: string; // Default ELM ATCM value
}

/**
 * Defines the structure for configuring message timing parameters.
 */
export interface TimingConfig {
  p1Max: number; // Informational: Max ECU inter-byte time (ms)
  p2Max: number; // Informational: Max Request->Response time (ms)
  p3Min: number; // Informational: Min Response->Request time (ms)
  p4Min: number; // Informational: Min Request inter-byte time (ms)
  adaptiveMode: 0 | 1 | 2; // ELM ATAT mode
  responseTimeoutMs: number; // Target response timeout (ms) for ATAT/ATST
  // ISO/KWP specific timings (Informational, ELM handles internally)
  isoW1?: number;
  isoW2?: number;
  isoW3?: number;
  isoW4?: number;
  isoW5?: number;
}

/**
 * Defines the structure for configuring ISO-TP (CAN) flow control.
 */
export interface FlowControlConfig {
  blockSize: number; // FC Block Size (BS) for ATFC SD
  separationTime: number; // FC Separation Time (ST) in ms for ATFC SD
  flowControlHeader?: string; // Header for outgoing FC frames (ATFC SH)
  flowControlMode: 0 | 1 | 2; // FC Mode (ATFC SM)
}

/**
 * Defines the overall configuration for a specific OBD-II protocol.
 */
export interface ProtocolConfig {
  protocolNumber: number; // ELM protocol number (e.g., PROTOCOL.ISO_15765_4_CAN_11BIT_500K)
  description: string; // Human-readable name
  baudRate: number; // Communication speed (bps)
  headerFormatConfig?: HeaderFormatConfig; // Header/filter settings
  flowControlEnabled: boolean; // Does protocol use ISO-TP Flow Control?
  flowControlConfig?: FlowControlConfig; // FC parameters if enabled
  timing: TimingConfig; // Timing parameters
  initSequence?: string[]; // Optional AT commands after ATSP/ATTP
  supportedModes: string[]; // Typical OBD-II modes supported
  errorPatterns: RegExp[]; // Regex for protocol-specific errors
}

```

#### Directory: src/ecu/services

### File: connectionService.ts

**Path:** `src/ecu/services/connectionService.ts`

```typescript
// filepath: src/ecu/services/connectionService.ts
import { log } from '../../utils/logger';
import { ProtocolManager } from '../protocols/ProtocolManager';
import { VINRetriever } from '../retrievers/VINRetriever'; // Import the new VINRetriever
import {
  DELAYS_MS,
  ELM_COMMANDS,
  OBD_MODE,
  RESPONSE_KEYWORDS,
  STANDARD_PIDS,
  PROTOCOL, // Import PROTOCOL enum
} from '../utils/constants';
import {
  cleanResponse,
  isResponseOk,
  isResponseError,
  extractProtocolNumber, // Keep for potential use elsewhere if needed
  extractVoltage,
  extractEcuAddresses,
  assembleMultiFrameResponse, // Keep helper, might be used elsewhere
  parseDtcsFromResponse,
} from '../utils/helpers';

import type { SendCommandFunction, RawDTCResponse } from '../utils/types';

/**
 * Result type for connection attempt
 */
type ConnectionResult = {
  success: boolean;
  protocol?: PROTOCOL | null; // Use PROTOCOL enum
  protocolName?: string | null; // Added protocolName
  voltage?: string | null;
  error?: string;
  detectedEcus?: string[]; // Store detected ECU addresses
};

/**
 * Result type for basic adapter info
 */
type AdapterInfo = {
  voltage: string | null;
  // Add other adapter info if needed in the future
};

/**
 * Delay function.
 */
const delay = (ms: number): Promise<void> =>
  new Promise<void>(resolve => {
    setTimeout(() => resolve(), ms);
  });

/**
 * Initializes the ELM327 adapter with standard settings.
 * Sends ATZ, ATE0, ATL0, ATS0. Checks voltage as final step.
 * Note: Headers are typically set *after* protocol detection.
 * Based on logic in ElmProtocolInit.initializeProtocol and initializeDevice.
 * @param sendCommand Function to send commands to the adapter.
 * @returns True if initialization seems successful, false otherwise.
 */
export const initializeAdapter = async (
  sendCommand: SendCommandFunction,
): Promise<boolean> => {
  await log.debug('[connectionService] Initializing adapter...');
  // Basic sequence: Reset -> Echo Off -> Linefeeds Off -> Spaces Off
  // Headers and Timing are usually set *after* protocol detection.
  const initCommands = [
    // Reset device fully
    {
      cmd: ELM_COMMANDS.RESET,
      delay: DELAYS_MS.RESET,
      ignoreError: true,
      checkOk: false,
    },
    // Basic ELM settings for clean communication
    {
      cmd: ELM_COMMANDS.ECHO_OFF,
      delay: DELAYS_MS.INIT,
      ignoreError: false,
      checkOk: true,
    },
    {
      cmd: ELM_COMMANDS.LINEFEEDS_OFF,
      delay: DELAYS_MS.INIT,
      ignoreError: false,
      checkOk: true,
    },
    {
      cmd: ELM_COMMANDS.SPACES_OFF,
      delay: DELAYS_MS.INIT,
      ignoreError: false,
      checkOk: true,
    },
    // Headers OFF initially, will be turned ON by ProtocolManager if needed (e.g., for CAN)
    {
      cmd: ELM_COMMANDS.HEADERS_OFF,
      delay: DELAYS_MS.INIT,
      ignoreError: false,
      checkOk: true,
    },
    // Adaptive Timing OFF initially, ProtocolManager will set ATAT1/2 later
    {
      cmd: ELM_COMMANDS.ADAPTIVE_TIMING_OFF,
      delay: DELAYS_MS.INIT,
      ignoreError: false,
      checkOk: true,
    },
    // Set a default timeout (e.g., 100ms = 64 hex) - ProtocolManager might adjust later
    // const defaultTimeoutHex = DELAYS_MS.TIMEOUT_NORMAL_MS.toString(16).toUpperCase().padStart(2,'0');
    // { cmd: `${ELM_COMMANDS.SET_TIMEOUT}${defaultTimeoutHex}`, delay: DELAYS_MS.INIT, ignoreError: false, checkOk: true },
  ];

  try {
    for (const { cmd, delay: cmdDelay, ignoreError, checkOk } of initCommands) {
      await log.debug(`[connectionService] Sending init command: ${cmd}`);
      // Use moderate timeout for init commands
      const response = await sendCommand(cmd, 2000);
      await delay(cmdDelay); // Wait after command

      if (!ignoreError) {
        // Allow '?' response for some commands if ELM doesn't support them fully but continues
        if (
          response === null ||
          isResponseError(response) ||
          (checkOk && !isResponseOk(response) && response?.trim() !== '?')
        ) {
          await log.error(
            `[connectionService] Init command "${cmd}" failed or returned error/unexpected response. Response: ${response ?? 'null'}`,
          );
          return false; // Fail initialization if any essential command fails
        } else if (response?.trim() === '?') {
          await log.warn(
            `[connectionService] Init command "${cmd}" returned '?', possibly unsupported but continuing.`,
          );
        }
      } else {
        await log.debug(
          `[connectionService] Init command "${cmd}" response (errors ignored): ${response ?? 'null'}`,
        );
      }
    }

    // Final check: Read voltage to ensure adapter is responsive after init
    const voltageResponse = await sendCommand(ELM_COMMANDS.READ_VOLTAGE, 2000);
    const voltage = extractVoltage(voltageResponse);
    if (
      !voltageResponse ||
      isResponseError(voltageResponse) ||
      voltage === null
    ) {
      await log.error(
        `[connectionService] Adapter unresponsive after initialization (ATRV failed or returned invalid voltage). Response: ${voltageResponse ?? 'null'}`,
      );
      return false;
    }

    await log.info(
      `[connectionService] Adapter initialized successfully. Voltage: ${voltage}`,
    );
    return true;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await log.error(
      '[connectionService] Critical error during adapter initialization:',
      { error: errorMsg },
    );
    return false;
  }
};

/**
 * Attempts to connect to the ECU: Initializes adapter, detects protocol, gets basic info.
 * Uses ProtocolManager for detection and configuration.
 * Based on ECUConnector.connectToECU and ProtocolServiceBased.connectToECU flow.
 * @param sendCommand Function to send commands to the adapter.
 * @returns ConnectionResult object indicating success/failure and connection details.
 */
export const connectToECU = async (
  sendCommand: SendCommandFunction,
): Promise<ConnectionResult> => {
  await log.info('[connectionService] Attempting to connect to ECU...');

  // 1. Initialize Adapter
  const initSuccess = await initializeAdapter(sendCommand);
  if (!initSuccess) {
    return { success: false, error: 'Adapter initialization failed' };
  }

  // 2. Detect and Set Protocol using ProtocolManager
  const protocolManager = new ProtocolManager(sendCommand);
  const protocolResult = await protocolManager.detectAndSetProtocol();

  if (!protocolResult || protocolResult.protocol === null) {
    // Attempt recovery if protocol detection fails? From ECUConnector retry logic
    // await log.warn('[connectionService] Protocol detection failed. Attempting recovery (ATPC, ATZ)...');
    // try {
    //     await sendCommand(ELM_COMMANDS.PROTOCOL_CLOSE, 1000);
    //     await delay(DELAYS_MS.PROTOCOL_SWITCH);
    //     await sendCommand(ELM_COMMANDS.RESET, 1000); // Should be handled by next init attempt?
    // } catch { /* ignore recovery error */ }
    return { success: false, error: 'Protocol detection failed' };
  }

  const { protocol, name: protocolName } = protocolResult;

  // 3. Apply Protocol Specific Settings (e.g., Headers ON for CAN, ATAT1)
  await protocolManager.configureProtocolSettings(protocol);

  // 4. Get Adapter Info (Voltage) - confirms adapter is still responsive after protocol setup
  const adapterInfo = await getAdapterInfo(sendCommand);
  if (adapterInfo.voltage === null) {
    // Voltage read failed after protocol setup, consider this a connection failure
    await log.error(
      '[connectionService] Failed to read voltage after protocol setup. Connection unstable.',
    );
    return {
      success: false,
      error: 'Adapter unresponsive after protocol setup',
      protocol,
      protocolName,
    };
  }

  // 5. Final check / ECU discovery using a standard command (e.g., 0100)
  let detectedEcus: string[] = [];
  try {
    // Use the standard test command defined in constants
    const testCmd = STANDARD_PIDS.SUPPORTED_PIDS_1; // Usually 0100
    await log.debug(
      `[connectionService] Sending final test command: ${testCmd}`,
    );
    // Use a reasonable timeout for ECU response
    const testResponse = await sendCommand(testCmd, 5000);

    if (testResponse && !isResponseError(testResponse)) {
      // If the response is NO DATA, connection is likely still OK, just no PIDs supported
      if (cleanResponse(testResponse).includes(RESPONSE_KEYWORDS.NO_DATA)) {
        await log.info(
          `[connectionService] Test command (${testCmd}) returned NO DATA. Connection likely OK, but no specific ECU response data.`,
        );
      } else {
        // Extract ECU addresses from the response (might be single or multi-line)
        detectedEcus = extractEcuAddresses(testResponse);
        if (detectedEcus.length > 0) {
          await log.info(
            `[connectionService] Detected ECU addresses: ${detectedEcus.join(', ')}`,
          );
        } else {
          await log.warn(
            `[connectionService] Test command (${testCmd}) successful, but no specific ECU addresses extracted from response: ${testResponse}`,
          );
          // Connection is likely okay, but we couldn't identify specific ECUs
        }
      }
    } else {
      await log.warn(
        `[connectionService] Test command (${testCmd}) failed or returned error after protocol set. Response: ${testResponse ?? 'null'}`,
      );
      // Consider this potentially problematic, but proceed if voltage was read okay.
      // Maybe return success but with a warning? For now, proceed.
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await log.warn(
      '[connectionService] Error during final ECU check command:',
      { error: errorMsg },
    );
  }

  await log.info(
    `[connectionService] Connection established. Protocol: ${protocolName} (${protocol}), Voltage: ${adapterInfo.voltage}`,
  );

  // Connection successful
  return {
    success: true,
    protocol: protocol,
    protocolName: protocolName,
    voltage: adapterInfo.voltage,
    detectedEcus: detectedEcus, // Include detected ECU addresses
  };
};

/**
 * Fetches basic adapter information like voltage using ATRV.
 * Based on logic in ElmProtocol.getVoltage and connectionService.
 * @param sendCommand Function to send commands to the adapter.
 * @returns AdapterInfo object containing retrieved information.
 */
export const getAdapterInfo = async (
  sendCommand: SendCommandFunction,
): Promise<AdapterInfo> => {
  await log.debug('[connectionService] Getting adapter info (ATRV)...');
  try {
    // Use a specific timeout for voltage read
    const voltageResponse = await sendCommand(ELM_COMMANDS.READ_VOLTAGE, 2000);
    const voltage = extractVoltage(voltageResponse);
    if (voltage === null) {
      await log.warn(
        `[connectionService] Failed to extract voltage from ATRV response: ${voltageResponse ?? 'null'}`,
      );
    }
    await log.debug(`[connectionService] Adapter Voltage: ${voltage ?? 'N/A'}`);
    return { voltage };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await log.error(
      '[connectionService] Failed to get adapter voltage (ATRV):',
      { error: errorMsg },
    );
    return { voltage: null };
  }
};

/**
 * Disconnects from the ECU by sending the Protocol Close command (ATPC).
 * Based on logic in ECUConnector.resetDevice (partial).
 * @param sendCommand Function to send commands to the adapter.
 */
export const disconnectFromECU = async (
  sendCommand: SendCommandFunction,
): Promise<void> => {
  await log.info(
    '[connectionService] Disconnecting from ECU (sending ATPC)...',
  );
  try {
    // Send ATPC with a short timeout, response isn't critical
    await sendCommand(ELM_COMMANDS.PROTOCOL_CLOSE, 1000);
    await log.debug('[connectionService] Protocol close command (ATPC) sent.');
    // Optional: Send ATZ for a full reset after closing?
    // From ECUConnector.resetDevice - it also sends ATD and ATZ
    // await sendCommand(ELM_COMMANDS.DEFAULTS, 1000);
    // await sendCommand(ELM_COMMANDS.RESET, 1000);
    // Just sending ATPC is usually sufficient for session cleanup.
  } catch (error: unknown) {
    // Log warning, but don't throw, as disconnect should proceed regardless
    const errorMsg = error instanceof Error ? error.message : String(error);
    await log.warn(
      '[connectionService] Error sending protocol close command (ATPC) during disconnect:',
      { error: errorMsg },
    );
  }
};

// ==========================================================================
// --- NON-ECU FUNCTIONS (VIN, DTC, CLEAR, RAW DTC) ---
// --- These functions remain UNCHANGED as per the requirements.            ---
// --- Only logging and type annotations are updated for consistency.     ---
// --- VIN Retrieval is now updated to use VINRetriever                 ---
// ==========================================================================

/**
 * Retrieves the Vehicle Identification Number (VIN) using VINRetriever.
 * This function now delegates the command sending, flow control, retries,
 * and parsing logic to the VINRetriever class.
 * (Function implementation changed - marked as Non-ECU for context hook)
 */
export const getVehicleVIN = async (
  sendCommand: SendCommandFunction,
): Promise<string | null> => {
  await log.debug(
    '[connectionService] Attempting to retrieve VIN using VINRetriever...',
  );

  try {
    // Create an instance of the VINRetriever
    const vinRetriever = new VINRetriever(sendCommand);

    // Call the retriever's method to get the VIN
    // This method handles configuration, sending '0902', flow control, retries, and parsing
    const vin = await vinRetriever.retrieveVIN();

    if (vin) {
      await log.info(`[connectionService] VIN Retrieved successfully: ${vin}`);
    } else {
      await log.warn('[connectionService] Failed to retrieve VIN.');
    }
    return vin;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await log.error(
      '[connectionService] Error during VIN retrieval via VINRetriever:',
      { error: errorMsg },
    );
    return null;
  }
};

/**
 * Retrieves Diagnostic Trouble Codes (DTCs).
 * (Function remains unchanged internally - marked as Non-ECU)
 */
export const getVehicleDTCs = async (
  sendCommand: SendCommandFunction,
  mode: OBD_MODE.CURRENT_DTC | OBD_MODE.PENDING_DTC | OBD_MODE.PERMANENT_DTC, // Ensure correct modes
): Promise<string[] | null> => {
  await log.debug('[connectionService] Requesting DTCs', { mode }); // Use logger

  const response = await sendCommand(mode, 8000); // Use appropriate timeout

  if (response === null) {
    await log.warn('[connectionService] No response for DTC request', { mode }); // Use logger
    return null;
  }

  if (isResponseError(response)) {
    await log.error('[connectionService] Error response for DTC request', {
      mode,
      response,
    }); // Use logger
    return null;
  }

  if (cleanResponse(response).includes(RESPONSE_KEYWORDS.NO_DATA)) {
    await log.debug(
      // Use logger
      `[connectionService] NO DATA response for DTC request (Mode ${mode}). Vehicle reports no DTCs.`,
    );
    return []; // Return empty array for NO DATA
  }

  // Need to assemble multi-frame responses correctly
  const assembledResponse = assembleMultiFrameResponse(response);
  await log.debug(
    `[connectionService] Assembled DTC response (Mode ${mode}): ${assembledResponse}`,
  );

  // Calculate expected response prefix (e.g., 03 -> 43)
  // Ensure mode is treated as hex for calculation
  const responsePrefix = (parseInt(mode, 16) + 0x40).toString(16).toUpperCase();
  const dtcs = parseDtcsFromResponse(assembledResponse, responsePrefix);

  if (dtcs === null) {
    await log.error(
      `[connectionService] Failed to parse DTCs from response (Mode ${mode})`,
      { assembledResponse },
    );
  }

  return dtcs; // Return parsed DTCs or null if parsing failed
};

/**
 * Clears Diagnostic Trouble Codes (DTCs) with verification.
 * (Function remains unchanged internally - marked as Non-ECU)
 */
export const clearVehicleDTCs = async (
  sendCommand: SendCommandFunction,
  skipVerification: boolean = false,
): Promise<boolean> => {
  const clearCommand = OBD_MODE.CLEAR_DTC; // Mode 04

  await log.debug(
    // Use logger
    `[connectionService] Starting DTC clearing sequence (Mode ${clearCommand})...`,
  );

  // Minimal setup: Ensure headers/spaces/etc. are off for clean response check? Maybe not necessary.
  // Let's try sending 04 directly first.

  await log.debug(
    // Use logger
    `[connectionService] Sending DTC clear command (${clearCommand})...`,
  );
  // Mode 04 can take longer
  const response = await sendCommand(clearCommand, 10000);

  if (response === null) {
    await log.error(
      // Use logger
      '[connectionService] No response received for Clear DTC command.',
    );
    return false;
  }

  // Successful response for Mode 04 is just "44" (or "OK" from ELM)
  const cleanedResponse = cleanResponse(response);
  // Need to handle multi-line responses which might contain "44" and other data/headers
  const isSuccessful = cleanedResponse.includes('44') || isResponseOk(response); // Check for 44 or OK

  if (!isSuccessful || isResponseError(response)) {
    await log.error(
      // Use logger
      `[connectionService] Clear command failed or returned error. Response: ${response}`,
    );
    return false;
  }

  await log.debug(
    // Use logger
    `[connectionService] Clear command received successful-looking response: ${cleanedResponse}`,
  );

  if (skipVerification) {
    await log.debug('[connectionService] Verification skipped as requested.'); // Use logger
    return true;
  }

  // Verification Steps
  await log.debug(`[connectionService] Clear command successful. Verifying...`);
  await delay(DELAYS_MS.COMMAND_LONG); // Wait a bit before verification

  // Verify using Mode 03 (Current DTCs)
  const mode03Response = await sendCommand(OBD_MODE.CURRENT_DTC, 5000);
  const isMode03Clear = checkMode03Response(mode03Response);
  if (isMode03Clear) {
    await log.debug(
      // Use logger
      '[connectionService] Mode 03 verification successful: Response indicates no current DTCs.',
    );
  } else {
    await log.warn(
      // Use logger
      '[connectionService] Mode 03 verification indicates DTCs might still be present.',
      { response: mode03Response },
    );
    // Consider returning false here if strict verification is needed
    // return false;
  }

  // Optional: Verify using Mode 01 PID 01 (Monitor Status)
  const mode0101Response = await sendCommand(
    STANDARD_PIDS.MONITOR_STATUS,
    5000,
  );
  const isMode0101Clear = checkMode0101Response(mode0101Response);
  if (isMode0101Clear) {
    await log.debug(
      // Use logger
      '[connectionService] Mode 01 PID 01 verification successful: MIL off, DTC count 0.',
    );
  } else {
    await log.warn(
      // Use logger
      '[connectionService] Mode 01 PID 01 verification indicates DTCs or MIL may still be active.',
      { response: mode0101Response },
    );
  }

  // Primarily rely on Mode 03 check for successful clear confirmation
  const allClear = isMode03Clear;
  if (allClear) {
    await log.info(
      '[connectionService] Verification successful: DTCs appear cleared.',
    ); // Use logger
    return true;
  } else {
    await log.warn(
      // Use logger
      '[connectionService] Verification suggests DTCs may not be fully cleared (Mode 03 check failed).',
    );
    return false; // Return false if Mode 03 verification fails
  }
};

/**
 * Checks if Mode 03 response indicates no DTCs.
 * Response should be "43" or "4300" or "430000..." or "NO DATA".
 * (Helper for clearVehicleDTCs - unchanged internally)
 */
function checkMode03Response(response: string | null): boolean {
  if (response === null) return false; // No response means failure

  // Assemble first in case it's multi-frame
  const assembledResponse = assembleMultiFrameResponse(response);
  const cleanedResponse = cleanResponse(assembledResponse);

  // Check for NO DATA first
  if (cleanedResponse.includes(RESPONSE_KEYWORDS.NO_DATA)) {
    return true;
  }

  // Check for "43" possibly followed only by zeros
  if (cleanedResponse.startsWith('43')) {
    const dataPart = cleanedResponse.substring(2);
    // Check if data part is empty or consists only of '0'
    if (dataPart.length === 0 || /^[0]+$/.test(dataPart)) {
      return true;
    }
  }

  // If none of the above, assume DTCs are present or response is invalid
  return false;
}

/**
 * Checks if Mode 01 PID 01 response indicates no DTCs and MIL is off.
 * Response format: 41 01 AA B1 B2 C1 D1
 * Byte A (AA): Bit 7 = MIL status (0=off, 1=on), Bits 0-6 = DTC count
 * (Helper for clearVehicleDTCs - unchanged internally)
 */
function checkMode0101Response(response: string | null): boolean {
  if (response === null) return false; // No response means failure

  // Assemble first in case it's multi-frame
  const assembledResponse = assembleMultiFrameResponse(response);
  const cleanedResponse = cleanResponse(assembledResponse).replace(/\s/g, ''); // Remove spaces

  // Expecting 4101 followed by at least 2 hex chars (Byte A)
  if (cleanedResponse.length >= 6 && cleanedResponse.startsWith('4101')) {
    try {
      const byteA = parseInt(cleanedResponse.substring(4, 6), 16);
      if (isNaN(byteA)) return false; // Invalid hex

      const isMilOff = (byteA & 0x80) === 0; // Check bit 7 (most significant bit)
      const dtcCount = byteA & 0x7f; // Mask out the MIL bit to get count
      return isMilOff && dtcCount === 0;
    } catch (error: unknown) {
      void log.error('[Helper] Error parsing Mode 0101 response byte A', {
        error: error instanceof Error ? error.message : String(error),
        response,
      });
      return false;
    }
  }
  return false; // Invalid format
}

/**
 * Internal function to get raw DTC response object.
 * (Function remains unchanged internally - marked as Non-ECU)
 */
export const getRawDTCs = async (
  sendCommand: SendCommandFunction,
  mode: OBD_MODE.CURRENT_DTC | OBD_MODE.PENDING_DTC | OBD_MODE.PERMANENT_DTC,
): Promise<RawDTCResponse | null> => {
  await log.debug(`[connectionService] Getting raw DTCs (Mode ${mode})...`);
  try {
    let protocolNum: number | null = null;
    let isCan: boolean = false;
    try {
      const protocolResponse = await sendCommand(
        ELM_COMMANDS.GET_PROTOCOL_NUM,
        1000,
      );
      const extractedNum = extractProtocolNumber(protocolResponse);
      if (extractedNum !== null) {
        protocolNum = extractedNum;
        // Use PROTOCOL enum for check
        isCan =
          extractedNum >= PROTOCOL.ISO_15765_4_CAN_11BIT_500K &&
          extractedNum <= PROTOCOL.ISO_15765_4_CAN_29BIT_250K_8;
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await log.warn(
        '[connectionService] Could not get protocol number for raw DTCs',
        { error: errorMsg },
      );
    }

    const rawResponse = await sendCommand(mode, 8000); // Send the actual DTC request
    if (rawResponse === null) {
      await log.warn(
        `[connectionService] No response for raw DTC request (Mode ${mode})`,
      );
      return null;
    }

    if (isResponseError(rawResponse)) {
      await log.error(
        `[connectionService] Error response for raw DTC request (Mode ${mode}): ${rawResponse}`,
      );
      // Still return a structure indicating error? Or just null? Let's return null.
      return null;
    }

    // Process the raw response
    const ecuAddress = extractEcuAddresses(rawResponse)[0]; // Get first detected ECU address
    const rawBytes = Array.from(rawResponse).map(c => c.charCodeAt(0)); // Convert string to byte values

    // Split into potential frames based on newlines/CRs
    // Filter out prompts and empty lines
    // Keep spaces within lines as they might be part of data
    const responseFramesAsStrings = rawResponse
      .split(/[\r\n]+/)
      .map(line => line.trim())
      .filter(
        line => line.length > 0 && !line.startsWith(RESPONSE_KEYWORDS.PROMPT),
      );

    // Further split each line into hex bytes/words (assuming space separation)
    // This interpretation might be basic; assemblMultiFrameResponse is better for actual data
    const responseFramesAsHexArrays = responseFramesAsStrings
      .map(line => line.split(/\s+/).filter(hex => /^[0-9A-F]+$/i.test(hex))) // Split by space, keep only hex parts
      .filter(frame => frame.length > 0); // Filter out empty frames

    // Return the structured raw response
    return {
      rawString: rawResponse,
      rawResponse: rawBytes, // Raw byte values of the string
      response: responseFramesAsHexArrays, // Parsed into lines->hex parts (basic)
      rawBytesResponseFromSendCommand: responseFramesAsHexArrays, // Duplicate for compatibility? Review BaseDTCRetriever usage.
      isCan: isCan,
      protocolNumber: protocolNum ?? 0, // Default to 0 if unknown
      ecuAddress: ecuAddress ?? undefined, // Use undefined if not found
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await log.error(
      `[connectionService] Error getting raw DTCs (Mode ${mode}):`,
      { error: errorMsg },
    );
    return null;
  }
};

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
    info: 'ℹ️', // Changed symbol for info
    warn: '⚠️',
    error: '❌',
  },
});

// Export wrapped logging functions
export const log = {
  // Make context optional in the signature
  debug: async (
    message: string,
    context?: Record<string, unknown>,
  ): Promise<void> => {
    await debug(`[ECU] ${message}`, context);
  },
  info: async (
    message: string,
    context?: Record<string, unknown>,
  ): Promise<void> => {
    await info(`[ECU] ${message}`, context);
  },
  warn: async (
    message: string,
    context?: Record<string, unknown>,
  ): Promise<void> => {
    await warn(`[ECU] ${message}`, context);
  },
  error: async (
    message: string,
    context?: Record<string, unknown>,
  ): Promise<void> => {
    await error(`[ECU] ${message}`, context);
  },
};

```

### Directory: src/components

### File: DTCManager.tsx

**Path:** `src/components/DTCManager.tsx`

```tsx
// filepath: src/components/DTCManager.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useECU } from '../ecu/hooks/useECU';
// ECUConnectionStatus is part of state, no longer directly used for conditional rendering here
import { ECUConnectionStatus } from '../ecu/utils/constants'; // Keep import if using status value

export const DTCManager: React.FC = () => {
  const { state } = useECU();

  // Component rendering based on state
  // Removed explicit check for state.status === ECUConnectionStatus.CONNECTED
  // The component will render regardless of ECU connection status,
  // but might display different info based on available state data.

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diagnostic Trouble Codes</Text>
      {/* Display available info from ECU state */}
      <Text>Status: {state.status}</Text>
      {state.status === ECUConnectionStatus.CONNECTED && (
        <>
          {state.activeProtocol && (
            <Text>Protocol: {state.protocolName ?? state.activeProtocol}</Text>
          )}
          {state.deviceVoltage && <Text>Voltage: {state.deviceVoltage}</Text>}
        </>
      )}
      {state.lastError && (
        <Text style={styles.errorText}>Last Error: {state.lastError}</Text>
      )}

      {/* Display DTC loading/clearing status */}
      {state.dtcLoading && <Text>Loading DTCs...</Text>}
      {state.dtcClearing && <Text>Clearing DTCs...</Text>}
      {state.rawDTCLoading && <Text>Loading Raw DTCs...</Text>}

      {/* Example: Display Current DTCs if available and connected */}
      {state.status === ECUConnectionStatus.CONNECTED && state.currentDTCs && (
        <View>
          <Text style={styles.subTitle}>Current DTCs:</Text>
          {state.currentDTCs.length === 0 ? (
            <Text>None</Text>
          ) : (
            state.currentDTCs.map(dtc => <Text key={dtc}>{dtc}</Text>)
          )}
        </View>
      )}

      {/* Add buttons or displays for other DTC types (Pending, Permanent) */}
      {/* ... */}

      {state.status !== ECUConnectionStatus.CONNECTED &&
        state.status !== ECUConnectionStatus.CONNECTING && (
          <Text style={styles.notConnectedText}>
            Please connect to Bluetooth and ECU first.
          </Text>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    margin: 16,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
  },
  notConnectedText: {
    color: '#888',
    fontStyle: 'italic',
    marginTop: 16,
  },
});

```

### File: DTCRawDataViewer.tsx

**Path:** `src/components/DTCRawDataViewer.tsx`

```tsx
// filepath: src/components/DTCRawDataViewer.tsx
import React from 'react';
import { View } from 'react-native';

export const DTCRawDataViewer: React.FC = () => {
  return <View />;
};

```

### Directory: src/examples

### File: ClearDTCExample.tsx

**Path:** `src/examples/ClearDTCExample.tsx`

```tsx
// filepath: src/examples/ClearDTCExample.tsx
import React from 'react';
import { View } from 'react-native';

import type { JSX } from 'react';

export const ClearDTCExample: React.FC = (): JSX.Element => {
  return <View testID="clear-dtc-example" />;
};

```

### File: CurrentDTCExample.tsx

**Path:** `src/examples/CurrentDTCExample.tsx`

```tsx
// filepath: src/examples/CurrentDTCExample.tsx
import React from 'react';
import { View } from 'react-native';

import type { JSX } from 'react';

export const CurrentDTCExample: React.FC = (): JSX.Element => {
  return <View testID="live-data-example" />;
};

```

### File: CustomCommandExample.tsx

**Path:** `src/examples/CustomCommandExample.tsx`

```tsx
// filepath: src/examples/CustomCommandExample.tsx
import React from 'react';
import { View } from 'react-native';

import type { JSX } from 'react';

export const CustomCommandExample: React.FC = (): JSX.Element => {
  return <View testID="custom-command-example" />;
};

```

### File: DTCManagerExample.tsx

**Path:** `src/examples/DTCManagerExample.tsx`

```tsx
// filepath: src/examples/DTCManagerExample.tsx
import React from 'react';
import { View } from 'react-native';

import type { JSX } from 'react';

export const DTCManagerExample: React.FC = (): JSX.Element => {
  return <View testID="dtc-manager-example" />;
};

```

### File: LiveDataExample.tsx

**Path:** `src/examples/LiveDataExample.tsx`

```tsx
// filepath: src/examples/LiveDataExample.tsx
import React from 'react';
import { View } from 'react-native';

import type { JSX } from 'react';

export const LiveDataExample: React.FC = (): JSX.Element => {
  return <View testID="live-data-example" />;
};

```

### File: README.md

**Path:** `src/examples/README.md`

```markdown
// filepath: src/examples/README.md
# React Native OBD Retriever Examples

This folder contains working examples that demonstrate how to use the various hooks and functionality provided by the React Native OBD Retriever library.

## Available Examples

### 1. DTC Manager Example (`DTCManagerExample.tsx`)

Demonstrates how to:

- Retrieve DTCs (Diagnostic Trouble Codes) using standard ECU hooks
- Use raw data retrieval with the useDTCRetriever hook
- Display both parsed and raw DTC data

### 2. Clear DTC Example (`ClearDTCExample.tsx`)

Demonstrates the complete workflow for clearing DTCs:

- Fetching current DTCs
- Clearing DTCs using the clearDTCs hook
- Verifying that DTCs were successfully cleared

### 3. VIN Retrieval Example (`VINRetrievalExample.tsx`)

Demonstrates how to:

- Retrieve the Vehicle Identification Number (VIN)
- Display ECU information like protocol, voltage, etc.

### 4. Live Data Example (`LiveDataExample.tsx`)

Demonstrates how to:

- Poll real-time data from the vehicle (RPM, Speed, etc.)
- Format and display the data in a dashboard-like interface

### 5. Custom Commands Example (`CustomCommandExample.tsx`)

Demonstrates how to:

- Use all available ECU hooks in one interface
- Execute various commands and see their responses
- Track command history

## Available Hooks

The library provides several custom hooks for interacting with a vehicle's ECU:

### `useECU()`

The main hook that provides access to:

- ECU connection state
- Connection methods: `connectWithECU()`, `disconnectECU()`
- Information retrieval: `getECUInformation()`, `getVIN()`, `getActiveProtocol()`
- DTC management: `getCurrentDTCs()`, `getPendingDTCs()`, `getPermanentDTCs()`, `clearDTCs()`
- Low-level communication: `sendCommand()`

### `useDTCRetriever()`

A specialized hook for retrieving raw DTC data:

- `get03DTCObject()` - For current DTCs (Mode 03)
- `get07DTCObject()` - For pending DTCs (Mode 07)
- `get0ADTCObject()` - For permanent DTCs (Mode 0A)

## Integration Example

To use these examples in your application:

1. Wrap your app with the required providers:

```jsx
<BluetoothProvider>
  <ECUProvider>
    <YourApp />
  </ECUProvider>
</BluetoothProvider>
```

2. Import and use the hooks in your components:

```jsx
const YourComponent = () => {
  const { state, connectWithECU, getCurrentDTCs } = useECU();

  // Use the hooks to interact with the vehicle's ECU
  // ...
};
```

## Best Practices

1. Always check connection status before sending commands
2. Handle errors appropriately
3. Clean up resources when components unmount
4. Use the high-level hooks instead of direct command sending when possible
5. Be mindful of battery drain when polling data continuously

```

### File: VINRetrievalExample.tsx

**Path:** `src/examples/VINRetrievalExample.tsx`

```tsx
// filepath: src/examples/VINRetrievalExample.tsx
import React from 'react';
import { View } from 'react-native';

import type { JSX } from 'react';

export const VINRetrievalExample: React.FC = (): JSX.Element => {
  return <View testID="vin-retrieval-example" />;
};

```

### File: index.ts

**Path:** `src/examples/index.ts`

```typescript
// filepath: src/examples/index.ts
export { DTCManagerExample } from './DTCManagerExample';
export { VINRetrievalExample } from './VINRetrievalExample';
export { LiveDataExample } from './LiveDataExample';
export { CustomCommandExample } from './CustomCommandExample';
export { ClearDTCExample } from './ClearDTCExample';

```

