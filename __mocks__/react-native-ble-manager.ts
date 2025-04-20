// __mocks__/react-native-ble-manager.ts

import { jest } from '@jest/globals'; // Use this import style with Jest >= 27

// Mock the NativeEventEmitter
const mockEmitter = new NativeEventEmitter();
const emitEvent = (eventName: string, data: any) => {
  const mockListener = mockEmitter.addListener.mock.calls.find(
    call => Array.isArray(call) && call.length > 0 && call[0] === eventName,
  );
  if (
    mockListener &&
    mockListener.length > 1 &&
    typeof mockListener[1] === 'function'
  ) {
    (mockListener[1] as Function)(data);
  }
};

// Type mockEmitter explicitly
const MockNativeEventEmitter = jest
  .fn()
  .mockImplementation(() => mockEmitter) as jest.MockedClass<any>;

// Mock BleManagerStatic interface methods
const BleManager = {
  start: jest.fn(() => Promise.resolve()), // Simulate successful start
  stop: jest.fn(() => Promise.resolve()),
  scan: jest.fn(() => Promise.resolve()), // Simulate scan initiation success
  stopScan: jest.fn(() => Promise.resolve()),
  connect: jest.fn(() => Promise.resolve()), // Simulate connection initiation success
  disconnect: jest.fn(() => Promise.resolve()), // Simulate disconnect initiation success
  checkState: jest.fn(), // Doesn't return promise, triggers event
  enableBluetooth: jest.fn(() => Promise.resolve()), // Simulate prompt success
  retrieveServices: jest.fn(
    (
      peripheralId: string, // Simulate service discovery
    ) =>
      Promise.resolve({
        id: peripheralId,
        name: 'MockDevice',
        rssi: -50,
        advertising: {},
        services: [
          // Provide mock services based on KNOWN_ELM327_TARGETS or test needs
          { uuid: '00001101-0000-1000-8000-00805F9B34FB' },
          { uuid: '0000FFE0-0000-1000-8000-00805F9B34FB' },
          { uuid: 'E7810A71-73AE-499D-8C15-FAA9AEF0C3F2' },
        ],
        characteristics: [
          // Provide mock characteristics based on KNOWN_ELM327_TARGETS or test needs
          {
            service: '00001101-0000-1000-8000-00805F9B34FB',
            characteristic: '0000FFE1-0000-1000-8000-00805F9B34FB',
            properties: {
              WriteWithoutResponse: 'WriteWithoutResponse',
              Notify: 'Notify',
            },
          },
          {
            service: '0000FFE0-0000-1000-8000-00805F9B34FB',
            characteristic: '0000FFE1-0000-1000-8000-00805F9B34FB',
            properties: {
              WriteWithoutResponse: 'WriteWithoutResponse',
              Notify: 'Notify',
            },
          },
          {
            service: 'E7810A71-73AE-499D-8C15-FAA9AEF0C3F2',
            characteristic: 'BE781A71-73AE-499D-8C15-FAA9AEF0C3F2',
            properties: { Write: 'Write', Notify: 'Notify' },
          }, // VLinker supports Write
        ],
      }),
  ),
  startNotification: jest.fn(() => Promise.resolve()),
  stopNotification: jest.fn(() => Promise.resolve()),
  write: jest.fn(() => Promise.resolve()), // Simulate write with response success
  writeWithoutResponse: jest.fn(() => Promise.resolve()), // Simulate write w/o response success

  // Add other BleManager methods if your library uses them
  // read: jest.fn(() => Promise.resolve()),
  // readRSSI: jest.fn(() => Promise.resolve()),
  // getConnectedPeripherals: jest.fn(() => Promise.resolve([])),
  // getBondedPeripherals: jest.fn(() => Promise.resolve([])),
  // etc.

  // Constants like BleManager.Events are usually accessed directly
  Events: {
    BleManagerDidUpdateState: 'BleManagerDidUpdateState',
    BleManagerStopScan: 'BleManagerStopScan',
    BleManagerDiscoverPeripheral: 'BleManagerDiscoverPeripheral',
    BleManagerDisconnectPeripheral: 'BleManagerDisconnectPeripheral',
    BleManagerDidUpdateValueForCharacteristic:
      'BleManagerDidUpdateValueForCharacteristic',
    BleManagerConnectPeripheral: 'BleManagerConnectPeripheral', // Add if listener used
  },
};

// Mock the NativeModules part if needed separately, though usually mocking BleManager is enough
// NativeModules.BleManager = BleManager; // This might interfere, be careful

// Export the mocked BleManager object and the mocked Emitter class separately if needed
export { MockNativeEventEmitter }; // Export the class mock
export default BleManager; // Default export is the mocked BleManager instance

// Helper function to simulate events easily in tests
// Note: Ensure MockNativeEventEmitter is correctly typed or use 'any'
export function emitBleManagerEvent(eventName: string, data: any): void {
  // Find the listener for the event name and call it
  const mockListener = mockEmitter.addListener.mock.calls.find(
    call => Array.isArray(call) && call.length > 0 && call[0] === eventName,
  );
  if (
    mockListener &&
    mockListener.length > 1 &&
    typeof mockListener[1] === 'function'
  ) {
    (mockListener[1] as Function)(data); // Call the callback function with data
  } else {
    // console.warn(`No mock listener found for event: ${eventName}`);
  }
}
