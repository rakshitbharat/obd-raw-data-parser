import '@testing-library/jest-native/extend-expect';

// React Native specific globals
declare global {
  namespace NodeJS {
    interface Global {
      __DEV__: boolean;
    }
  }
}

(global as any).__DEV__ = true;

// Mock the BLE Manager
jest.mock('react-native-ble-manager', () => ({
  start: jest.fn(() => Promise.resolve()),
  scan: jest.fn(() => Promise.resolve()),
  stopScan: jest.fn(() => Promise.resolve()),
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  retrieveServices: jest.fn(() => Promise.resolve([])),
  write: jest.fn(() => Promise.resolve()),
  read: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
}));
