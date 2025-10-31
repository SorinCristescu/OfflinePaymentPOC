module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-biometrics|react-native-device-info|react-native-keychain|@react-native-async-storage)/)',
  ],
};
