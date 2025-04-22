module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    '@babel/plugin-proposal-export-namespace-from',
    ['@babel/plugin-transform-runtime', { regenerator: true }]
  ],
  env: {
    production: {
      plugins: ['transform-remove-console']
    },
    test: {
      plugins: ['@babel/plugin-transform-runtime']
    }
  }
};
