/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  verbose: true,
  testTimeout: 10000,
  maxWorkers: 1,

  // Mock react-native-beautiful-logs
  moduleNameMapper: {
    'react-native-beautiful-logs': '<rootDir>/src/__mocks__/react-native-beautiful-logs.ts'
  },

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true
      },
    ],
  },

  // Transform everything except node_modules that aren't specifically included
  transformIgnorePatterns: [
    '/node_modules/(?!(react-native-beautiful-logs)/.*)'
  ],
};
