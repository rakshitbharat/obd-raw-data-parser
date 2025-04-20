// Define __DEV__ first
global.__DEV__ = true;

import '@testing-library/jest-native';
import '@testing-library/react-native';

// Enable fake timers for all tests
jest.useFakeTimers();

// Mock the NativeModules we need
const mockBleManager = {
  start: jest.fn(() => Promise.resolve()),
  scan: jest.fn(() => Promise.resolve()),
  stopScan: jest.fn(() => Promise.resolve()),
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  checkState: jest.fn(),
  enableBluetooth: jest.fn(() => Promise.resolve()),
  retrieveServices: jest.fn(() => Promise.resolve()),
  startNotification: jest.fn(() => Promise.resolve()),
  stopNotification: jest.fn(() => Promise.resolve()),
  write: jest.fn(() => Promise.resolve()),
  writeWithoutResponse: jest.fn(() => Promise.resolve()),
};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeEventEmitter = jest.fn(() => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    removeAllListeners: jest.fn(),
  }));
  
  return {
    ...RN,
    NativeModules: {
      ...RN.NativeModules,
      BleManager: mockBleManager,
    },
    Platform: {
      ...RN.Platform,
      select: jest.fn(obj => obj.android),
      OS: 'android',
      Version: 31,
    },
  };
});

// Mock react-native-permissions with complete implementation
jest.mock('react-native-permissions', () => {
  const mockResults = {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  };

  return {
    PERMISSIONS: {
      ANDROID: {
        BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
        BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
        ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      },
      IOS: {
        LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
        BLUETOOTH_PERIPHERAL: 'ios.permission.BLUETOOTH_PERIPHERAL',
      },
    },
    RESULTS: mockResults,
    check: jest.fn().mockResolvedValue(mockResults.GRANTED),
    request: jest.fn().mockResolvedValue(mockResults.GRANTED),
    checkMultiple: jest.fn().mockImplementation(async (perms) => {
      const result = {};
      perms.forEach(p => {
        result[p] = mockResults.GRANTED;
      });
      return result;
    }),
    requestMultiple: jest.fn().mockImplementation(async (perms) => {
      const result = {};
      perms.forEach(p => {
        result[p] = mockResults.GRANTED;
      });
      return result;
    }),
  };
});

// Export mock for use in tests
export { mockBleManager };
