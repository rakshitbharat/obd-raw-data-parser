# ECU Component Tree Structure

## 1. Core ECU Module
└── src/ecu/
    ├── index.ts (Main exports)
    ├── types.ts (Re-exports of types)
    │
    ├── context/
    │   ├── ECUContext.tsx (Core ECU Provider and Context)
    │   │   ├── ECUProvider component
    │   │   ├── ECUContext creation
    │   │   └── Core ECU functionality
    │   └── ECUReducer.ts (State Management)
    │       ├── initialState
    │       └── ecuReducer
    │
    ├── hooks/
    │   ├── index.ts (Hook exports)
    │   ├── useECU.ts (Main ECU hook)
    │   └── useDTCRetriever.ts (DTC retrieval hook)
    │
    ├── protocols/ (Protocol Management)
    │   ├── index.ts (Protocol exports)
    │   ├── types.ts (Protocol type definitions)
    │   ├── ProtocolManager.ts (Protocol handling)
    │   │   ├── ProtocolManager class
    │   │   ├── ProtocolDetector class
    │   │   └── ProtocolValidator class
    │   ├── CAN.ts (CAN Protocol implementation)
    │   │   ├── ISO15765Protocol class
    │   │   ├── StandardCAN class (11-bit)
    │   │   └── ExtendedCAN class (29-bit)
    │   ├── ISO9141.ts (ISO Protocol)
    │   │   ├── ISO9141Protocol class
    │   │   └── ISO9141_2Protocol class
    │   └── KWP.ts (Keyword Protocol)
    │       ├── KWP2000Protocol class
    │       ├── FastInit class
    │       └── SlowInit class
    │
    ├── retrievers/ (DTC Related Classes)
    │   ├── index.ts (Retriever exports)
    │   ├── types.ts (Retriever type definitions)
    │   ├── BaseDTCRetriever.ts (Base DTC functionality)
    │   │   ├── RawDTCResponse interface
    │   │   └── BaseDTCRetriever class
    │   ├── CurrentDTCRetriever.ts (Mode 03)
    │   ├── PendingDTCRetriever.ts (Mode 07)
    │   └── PermanentDTCRetriever.ts (Mode 0A)
    │
    ├── services/
    │   └── connectionService.ts (ECU Communication)
    │       ├── getAdapterInfo
    │       ├── getVehicleVIN
    │       ├── getVehicleDTCs
    │       ├── clearVehicleDTCs
    │       └── getRawDTCs
    │
    └── utils/ (Utility Functions)
        ├── bluetooth-types.ts (Bluetooth Interfaces)
        │   ├── BlePeripheral
        │   ├── Device
        │   ├── BluetoothHookResult
        │   └── BluetoothDeviceInfo
        ├── constants.ts (ECU Constants)
        │   ├── ECUConnectionStatus
        │   ├── OBD_MODE
        │   ├── PROTOCOL enum
        │   ├── ELM_COMMANDS
        │   ├── PROTOCOL_CONFIGS 
        │   │   ├── CAN_11BIT_500K
        │   │   ├── CAN_29BIT_500K
        │   │   ├── ISO9141_2
        │   │   └── KWP2000_FAST
        │   ├── TIMING_CONFIGS
        │   │   ├── PROTOCOL_TIMING
        │   │   ├── ADAPTIVE_TIMING
        │   │   └── MESSAGE_TIMING
        │   └── ERROR_PATTERNS
        ├── ecuUtils.ts (Data Conversion)
        │   ├── hexToBytes
        │   ├── bytesToHex
        │   ├── bytesToString
        │   └── stringToBytes
        ├── helpers.ts (Response Processing)
        │   ├── cleanResponse
        │   ├── isResponseOk
        │   ├── isResponseError
        │   ├── parseVinFromResponse
        │   ├── extractProtocolInfo
        │   ├── extractHeaderFormat
        │   └── validateFlowControl
        ├── protocolUtils.ts (Protocol Utilities)
        │   ├── ProtocolValidator
        │   ├── HeaderFormatter
        │   ├── FlowControlManager
        │   └── MultiFrameHandler
        ├── retriever.ts (Protocol Utils)
        │   └── ECURetrieverUtils class
        └── types.ts (Core Type Definitions)
            ├── ECUAction types
            ├── ECUState interface
            ├── ECUContextValue interface
            ├── ProtocolConfig interface
            ├── TimingConfig interface
            ├── FlowControlConfig interface
            └── HeaderFormatConfig interface

## 2. Supporting JavaScript Implementations
└── docs/
    ├── common/
    │   ├── BleEmitterUtils.js
    │   ├── ECUDataRetriever.js
    │   └── OBDUtils.js
    ├── ecu/
    │   ├── ECUConnector.js
    │   ├── ElmProtocol.js
    │   ├── ElmProtocolHelper.js
    │   ├── ElmProtocolInit.js
    │   ├── ElmProtocolTelegramProtocol.js
    │   ├── Protocol.js
    │   └── ProtocolServiceBased.js
    └── retrievers/
        ├── BaseDTCRetriever.js
        ├── CurrentDTCRetriever.js
        ├── PendingDTCRetriever.js
        └── PermanentDTCRetriever.js

## 3. Protocol Communication Flow
1. Initialization:
   - ECUProvider initialization
   - Bluetooth connection establishment
   - ELM327 adapter configuration

2. Protocol Detection & Setup:
   - Auto protocol detection (ATDPN)
   - Protocol validation
   - Protocol-specific configuration:
     - CAN: Set headers, filters, flow control
     - ISO9141: 5-baud init, timing parameters
     - KWP2000: Fast/slow init, key bytes

3. ECU Communication:
   - Header format detection (11/29-bit)
   - Flow control management
   - Message frame assembly

4. Command Processing:
   - Command queuing and prioritization
   - Response validation and parsing
   - Multi-frame message handling
   - Error recovery and retries

5. Protocol-Specific Features:
   - CAN:
     - Standard (11-bit) headers
     - Extended (29-bit) headers
     - Flow control configuration
     - Multi-frame messages
   - ISO9141-2:
     - 5-baud initialization
     - Key byte exchange
     - Variable timing
   - KWP2000:
     - Fast initialization
     - Slow initialization
     - Key byte sequences

6. Timing Management:
   - Protocol-specific delays
   - Adaptive timing control
   - Message timing parameters
   - Inter-byte timing

7. Error Handling:
   - Communication timeouts
   - Bus initialization errors
   - Protocol detection failures
   - Message validation errors
   - Recovery mechanisms

## 4. Key Type Definitions
1. ECU State:
   ```typescript
   interface ECUState {
     deviceVoltage: string | null;
     detectedEcuAddresses: string[];
     selectedEcuAddress: string | null;
     currentDTCs: string[] | null;
     pendingDTCs: string[] | null;
     permanentDTCs: string[] | null;
     dtcLoading: boolean;
     dtcClearing: boolean;
     rawCurrentDTCs: RawDTCResponse | null;
     rawPendingDTCs: RawDTCResponse | null;
     rawPermanentDTCs: RawDTCResponse | null;
     rawDTCLoading: boolean;
     protocolConfig: ProtocolConfig | null;
     headerFormat: HeaderFormatConfig | null;
     flowControl: FlowControlConfig | null;
     timingParams: TimingConfig | null;
   }
   ```

2. Raw DTC Response:
   ```typescript
   interface RawDTCResponse {
     rawString: string | null;
     rawResponse: number[] | null;
     response: string[][] | null;
     rawBytesResponseFromSendCommand: string[][];
     isCan: boolean;
     protocolNumber: number;
     ecuAddress: string | undefined;
     headerFormat?: string;
     flowControlConfig?: FlowControlConfig;
   }
   ```

3. Protocol Configuration:
   ```typescript
   interface ProtocolConfig {
     protocolNumber: number;
     description: string;
     headerFormat: '11bit' | '29bit';
     baudRate: number;
     flowControlEnabled: boolean;
     flowControlConfig?: FlowControlConfig;
     timing: TimingConfig;
     initSequence: string[];
     supportedModes: string[];
     errorPatterns: RegExp[];
   }
   ```

4. Timing Configuration:
   ```typescript
   interface TimingConfig {
     p1Max: number;      // Inter-byte time for first byte
     p2Max: number;      // Time between request and response
     p3Min: number;      // Time between responses
     p4Min: number;      // Inter-frame gap
     adaptiveMode: 0 | 1 | 2;
     adaptiveStart: number;
     adaptiveMin: number;
     adaptiveMax: number;
   }
   ```

5. Flow Control Configuration:
   ```typescript
   interface FlowControlConfig {
     blockSize: number;
     separationTime: number;
     flowControlHeader: string;
     flowControlMode: number;
     maxWaitFrames: number;
   }
   ```

6. Service Mode:
   ```typescript
   interface ServiceMode {
     REQUEST: string;
     RESPONSE: number;
     NAME: string;
     DESCRIPTION: string;
     troubleCodeType: string;
     flowControl?: boolean;
     timing?: Partial<TimingConfig>;
   }
   ```
