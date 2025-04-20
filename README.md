# React Native OBD Retriever

A React Native library for accessing raw OBD-II data from ELM327 adapters via Bluetooth Low Energy (BLE) connections. This library provides direct access to the raw data received from the ELM327 device without interpretation or conversion, giving you complete control over how to display or process the information.

## Features

- 🚗 Direct BLE communication with ELM327 OBD-II adapters
- 📊 Raw data access from various OBD-II protocols (CAN, ISO9141, KWP, J1850)
- 🔍 Raw DTC data retrieval (Mode 03, 07, 0A)
- 🧩 ECU protocol detection and adaptation
- 🔄 Command interface for ELM327 with proper timing and retry logic
- 📱 iOS and Android support via BLE
- ⚡ Complete TypeScript support

## Installation

```bash
npm install react-native-obd-retriver
# or
yarn add react-native-obd-retriver
```

### Dependencies

This library requires the following peer dependencies:

- `react-native-bluetooth-obd-manager`: For Bluetooth OBD communication
- `react-native-permissions`: For handling Bluetooth permissions

Install them using:

```bash
npm install react-native-bluetooth-obd-manager react-native-permissions
# or
yarn add react-native-bluetooth-obd-manager react-native-permissions
```

## Quick Start

### 1. Set up providers

Wrap your application with the required providers:

```jsx
import { BluetoothProvider } from 'react-native-bluetooth-obd-manager';
import { ECUProvider } from 'react-native-obd-retriver';

function App() {
  return (
    <BluetoothProvider>
      <ECUProvider>
        <YourApp />
      </ECUProvider>
    </BluetoothProvider>
  );
}
```

### 2. Connect to ECU

```typescript
import { useECU } from 'react-native-obd-retriver';

const ConnectionComponent = () => {
  const { state, connectWithECU, disconnectECU } = useECU();
  
  return (
    <View>
      <Text>Status: {state.status}</Text>
      <Button
        title={state.status === 'CONNECTED' ? 'Disconnect' : 'Connect'}
        onPress={state.status === 'CONNECTED' ? disconnectECU : connectWithECU}
      />
    </View>
  );
};
```

### 3. Retrieve Raw DTC Data

```typescript
import { useDTCRetriever } from 'react-native-obd-retriver';

const DTCComponent = () => {
  const { get03DTCObject, get07DTCObject, get0ADTCObject } = useDTCRetriever();
  const [currentDTCs, setCurrentDTCs] = useState(null);
  
  const fetchCurrentDTCs = async () => {
    try {
      // Raw DTC data from Mode 03 (Current DTCs)
      const rawDTCs = await get03DTCObject();
      setCurrentDTCs(rawDTCs);
    } catch (error) {
      console.error('Failed to retrieve raw DTC data:', error);
    }
  };
  
  return (
    <View>
      <Button title="Get Current DTCs" onPress={fetchCurrentDTCs} />
      {currentDTCs && (
        <Text>
          Raw DTC data: {currentDTCs.rawString}
        </Text>
      )}
    </View>
  );
};
```

## Core Concepts

### ECU Connection

The library manages the connection to the vehicle's ECU through the ELM327 adapter:

- **Connection State**: Tracks the current connection status (`DISCONNECTED`, `CONNECTING`, `CONNECTED`, `CONNECTION_FAILED`)
- **Protocol Detection**: Automatically detects and configures the appropriate OBD protocol
- **ECU Information**: Provides protocol details, voltage information, and detected ECU addresses

### Raw Data Access

All data from the vehicle is provided in raw format with no interpretation:

- **Raw DTC Data**: Access to complete raw data from the three DTC modes (03, 07, 0A)
- **VIN Retrieval**: Get the raw VIN string from the vehicle
- **Direct Commands**: Send any command directly to the ELM327 adapter

## API Reference

### Hooks

#### `useECU()`

Core hook for ECU connection management with the following functionality:

```typescript
const {
  state,                  // Current ECU state
  connectWithECU,         // Connect to ECU
  disconnectECU,          // Disconnect from ECU
  getECUInformation,      // Update ECU information (voltage, etc.)
  getActiveProtocol,      // Get active protocol information
  getVIN,                 // Get raw VIN string
  clearDTCs,              // Clear DTCs (Mode 04)
  getRawCurrentDTCs,      // Get raw current DTCs
  getRawPendingDTCs,      // Get raw pending DTCs
  getRawPermanentDTCs,    // Get raw permanent DTCs
  sendCommand,            // Send raw command to adapter
} = useECU();
```

#### `useDTCRetriever()`

Specialized hook for retrieving raw DTC data:

```typescript
const {
  get03DTCObject,         // Get raw current DTCs (Mode 03)
  get07DTCObject,         // Get raw pending DTCs (Mode 07)
  get0ADTCObject,         // Get raw permanent DTCs (Mode 0A)
} = useDTCRetriever();
```

### Raw DTC Response Format

The `RawDTCResponse` object contains:

```typescript
{
  rawString: string | null,                  // Raw string response
  rawResponse: number[] | null,              // Response as number array
  response: string[][] | null,               // Parsed response structure
  rawBytesResponseFromSendCommand: string[], // Raw bytes from adapter
  isCan: boolean,                            // Whether CAN protocol is used
  protocolNumber: number,                    // Protocol number
  ecuAddress: string | undefined,            // ECU address if available
}
```

## Examples

See the `src/examples` directory for complete working examples:

- **DTCManagerExample**: Display raw DTC data from all modes
- **ClearDTCExample**: Clear DTCs and verify they're gone
- **VINRetrievalExample**: Get and display VIN information
- **LiveDataExample**: Monitor real-time vehicle data
- **CustomCommandExample**: Send custom commands to the adapter

## Troubleshooting

### Common Issues

1. **Bluetooth Connection Problems**
   - Ensure Bluetooth is enabled and permissions are granted
   - Verify the adapter is powered and in range
   - Check that the adapter is ELM327 compatible

2. **Protocol Detection Issues**
   - Some vehicles require the engine to be running
   - Try connecting with the ignition on but engine off first
   - Some older vehicles may need specific protocols selected manually

3. **Data Retrieval Problems**
   - Some vehicles don't support all OBD modes
   - Command timing may need adjustment for certain vehicles
   - Verify the ELM327 firmware version is compatible

## License

MIT
