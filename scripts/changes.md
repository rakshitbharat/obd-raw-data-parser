Okay, let's integrate the robust flow control handling from `BaseDTCRetriever` into the VIN retrieval process. We'll do this by creating a dedicated `VINRetriever` class that inherits from `BaseDTCRetriever`.

This approach reuses the existing adapter configuration, command execution, error handling, and flow control optimization logic for the `0902` command.

Here are the necessary changes:

1.  **Create a new file `src/ecu/retrievers/VINRetriever.ts`**.
2.  **Update `src/ecu/retrievers/index.ts`** to export the new retriever.
3.  **Modify `src/ecu/services/connectionService.ts`** to use the new `VINRetriever`.

---

```markdown
--- START OF MODIFIED FILE src/ecu/retrievers/VINRetriever.ts ---
```

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
   * Uses the base class's retrieveRawDTCs (which sends '0902') and then parses the result.
   */
  public async retrieveVIN(): Promise<string | null> {
    await log.debug(`[${this.constructor.name}] Attempting to retrieve VIN...`);

    try {
      // Call the base class method to handle sending '0902' with flow control, retries etc.
      // Although named retrieveRawDTCs, it sends the command specified in the constructor ('0902').
      const rawResult = await super.retrieveRawDTCs();

      if (!rawResult || !rawResult.rawString) {
        await log.warn(
          `[${this.constructor.name}] Failed to retrieve raw response for VIN.`,
        );
        return null;
      }

      // We have a raw string response, now parse it using the existing helpers
      await log.debug(
        `[${this.constructor.name}] Raw VIN response received: ${rawResult.rawString}`,
      );

      // Assemble potentially multi-frame response from the raw string
      const assembledResponse = assembleMultiFrameResponse(rawResult.rawString);
      await log.debug(
        `[${this.constructor.name}] Assembled VIN response data: ${assembledResponse}`,
      );

      // Parse the VIN from the assembled hex data
      const vin = parseVinFromResponse(assembledResponse);

      if (vin) {
        // Basic validation check
        const isValidVin =
          vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
        if (isValidVin) {
          await log.debug(`[${this.constructor.name}] Valid VIN found: ${vin}`);
          return vin;
        } else {
          await log.warn(
            `[${this.constructor.name}] Invalid VIN format received: ${vin}`,
          );
          // Return potentially partial/incorrect VIN if desired, or null
          return vin; // Or return null for strict validation
        }
      } else {
        await log.warn(
          `[${this.constructor.name}] Failed to parse VIN from response.`,
        );
        return null;
      }
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

```markdown
--- END OF MODIFIED FILE src/ecu/retrievers/VINRetriever.ts ---
```

---

```markdown
--- START OF MODIFIED FILE src/ecu/retrievers/index.ts ---
```

```typescript
// filepath: src/ecu/retrievers/index.ts
export * from './BaseDTCRetriever';
export * from './CurrentDTCRetriever';
export * from './PendingDTCRetriever';
export * from './PermanentDTCRetriever';
export * from './VINRetriever'; // Export the new VINRetriever

```

```markdown
--- END OF MODIFIED FILE src/ecu/retrievers/index.ts ---
```

---

```markdown
--- START OF MODIFIED FILE src/ecu/services/connectionService.ts ---
```

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
  parseVinFromResponse, // Keep helper, might be used elsewhere
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
  await log.debug('[connectionService] Attempting to retrieve VIN using VINRetriever...');

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

```markdown
--- END OF MODIFIED FILE src/ecu/services/connectionService.ts ---
```

With these changes:

1.  A new `VINRetriever` class exists, specifically designed for the `0902` command, inheriting all the necessary logic from `BaseDTCRetriever`.
2.  The `getVehicleVIN` function in `connectionService` now uses this retriever, ensuring that VIN retrieval benefits from the same robust adapter configuration, flow control handling, retries, and response processing as the DTC retrievers.
3.  The original helper functions for assembling and parsing VIN responses (`assembleMultiFrameResponse`, `parseVinFromResponse`) are still used, but now they operate on the reliable raw response string obtained by the retriever.