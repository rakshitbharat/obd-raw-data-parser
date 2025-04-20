module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
  },
  testEnvironment: 'node',
  verbose: true,
  testTimeout: 10000,
  maxWorkers: 1,
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native)/)'
  ],
  testPathIgnorePatterns: ['<rootDir>/lib/'], // Exclude lib folder
};
