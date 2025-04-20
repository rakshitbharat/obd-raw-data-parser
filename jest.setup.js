// jest.setup.js
import { jest } from '@jest/globals'; // Import ONLY jest for mocking API like jest.fn(), jest.mock()
import '@testing-library/jest-native/extend-expect';
require('@testing-library/jest-native/extend-expect');

/**
 * --- Mocking Core Dependencies ---
 */
jest.mock('react-native');
jest.mock('react-native-bluetooth-obd-manager');
jest.mock('react-native-ble-manager');
jest.mock('react-native-permissions');

// Add React test environment setup
const React = require('react');
global.React = React;

// Initialize test renderer
require('react-test-renderer');

/**
 * --- Mocking NativeEventEmitter ---
 */
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
    try {
        const { MockNativeEventEmitter } = require('./__mocks__/react-native-ble-manager');
        return MockNativeEventEmitter;
    } catch (error) {
        console.error("Error loading MockNativeEventEmitter from __mocks__/react-native-ble-manager:", error);
        return jest.fn().mockImplementation(() => ({ // Fallback basic mock
            addListener: jest.fn(() => ({ remove: jest.fn() })),
            removeListener: jest.fn(),
            removeAllListeners: jest.fn(),
        }));
    }
});

/**
 * --- Optional: Mock Platform ---
 */
// jest.mock('react-native/Libraries/Utilities/Platform', () => { /* ... */ });


/**
 * --- Optional: Silence Console Output During Tests ---
 */
// global.console = { /* ... */ };


/**
 * --- Global Test Setup ---
 */

// Fix for duplicate beforeEach hooks - combine them into one
beforeEach(() => {
    jest.clearAllMocks();
    
    // Use real timers for React hooks tests
    if (jest.isMockFunction(setTimeout)) {
        jest.useRealTimers();
    }

    // Reset specific mock implementations if needed
    /*
    const mockPermissions = require('react-native-permissions');
    // ... reset permission mocks ...
    const mockBleManager = require('react-native-ble-manager');
    // ... reset ble manager mocks ...
    */
});

afterEach(() => {
    jest.clearAllMocks();
    // Only clear timers if they are fake
    if (jest.isMockFunction(setTimeout)) {
        jest.clearAllTimers();
    }
});

// --- Other Global Hooks (Uncomment if needed) ---
// beforeAll(() => { });
// afterAll(() => { });