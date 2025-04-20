const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const path = require('path');
const reactNativePlugin = require('eslint-plugin-react-native');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const customGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  module: 'readonly',
  require: 'readonly',
  __DEV__: 'readonly',
  process: 'readonly',
  global: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setImmediate: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  NodeJS: 'readonly',
};

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/node_modules/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: customGlobals,
    },
    plugins: {
      'react-native': reactNativePlugin
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-native/no-inline-styles': 'warn',
      'react-native/no-unused-styles': 'warn',
      'react-native/split-platform-components': 'warn',
      'react-native/no-color-literals': 'warn',
      'react-native/no-raw-text': 'warn',
      'react-native/no-single-element-style-arrays': 'warn',
    },
    settings: {
      react: {
        version: 'detect'
      },
      'react-native/style-sheet-object-names': ['StyleSheet', 'ViewStyles', 'TextStyles']
    }
  },
  ...compat.config({
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
  }),
];
