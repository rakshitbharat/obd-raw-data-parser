Please understand that even get VIN, get DTC, get DTC raw, get live data, or clear DTC are non-ECU functions because they work after proper ECU connection.
Real ECU functions involve connection, setting up first handshake connection with ECU to set correct protocol, getting ECU status,
setting slow control and so on.
We need to convert all JavaScript files Logic to TypeScript New Package.
However, we should only focus on ECU connection changes and not modify anything else.
Please provide all changes in the template format I shared, focusing on the src folder to make ECU connection working properly.

You are currently not modifying areas like DTC, VIN, Clear DTC, live data etc.
We should only touch ECU connection components.

Important: 

Note that we have Yarn, TypeScript, and lint properly implemented.

We only need to focus on the src folder, so don't perform operations anywhere else.

so just handle ECU connection. Don't touch anything else.

Don't remove any placeholder functions from hooks, retrievers, services, or utils.
We can resolve functions like we do in mock tests by returning fake desired values.
Don't comment any constants or remove any types - I repeat this point.

Do not modify anything that is not directly related to ECU communication. This is a strict requirement.

also i can see you are understanding that the non-ECU tree is mock or pending to implement but that is wrong
the non ecu things are working and properly implemented but we are going to make the ecu part now

I have attached a template file in which you should provide the changes or response format.
I have also attached a non-ECU file which shows a tree view for understanding the non-ECU components.

dont touch anything non ecu check the non ecu tree file i shared and give me all changes again be careful even we dont have to change its comments also

dont miss any typescript errors or lint errors to be fixed

3rd party library
'react-native-bluetooth-obd-manager'
 usage example is below

import {
  useBluetooth,
  type PeripheralWithPrediction,
  type BleError // Optional: for more specific error type checking
} from 'react-native-bluetooth-obd-manager';
  const {
    isBluetoothOn,
    hasPermissions,
    isInitializing,
    isScanning,
    discoveredDevices,
    connectedDevice,
    isConnecting,
    isDisconnecting,
    error,
    isAwaitingResponse,
    isStreaming,
    lastSuccessfulCommandTimestamp,
    checkPermissions,
    requestBluetoothPermissions,
    promptEnableBluetooth,
    scanDevices,
    connectToDevice,
    disconnect,
    sendCommand,
    sendCommandRawChunked,
    sendCommandRaw,
    setStreaming,
  } = useBluetooth();

import { debug, info, warn, error } from 'react-native-beautiful-logs';

// Simple logging
await info('User logged in successfully');
await warn('API rate limit reached');
await error('Connection failed');

// With context
await info('[Auth]', { userId: 123, role: 'admin' });
🎨 Custom Configuration
import { initLogger } from 'react-native-beautiful-logs';

const logger = initLogger({
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

all logic yo have to take from the ecu-common-files.md
for ecu things its javascript code

and we have all our new typescript code in src folder in one in one file called src-documentation.md