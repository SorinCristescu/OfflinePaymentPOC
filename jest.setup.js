/**
 * Jest setup for React Native testing
 * Configures mocks for native modules and libraries
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock Keychain
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
  },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getUniqueId: jest.fn(),
    getBrand: jest.fn(),
    getDeviceId: jest.fn(),
    getModel: jest.fn(),
    getSystemName: jest.fn(),
    getSystemVersion: jest.fn(),
    getBuildNumber: jest.fn(),
    getBundleId: jest.fn(),
    getVersion: jest.fn(),
  },
}));

// Mock Biometrics
const mockBiometricsInstance = {
  isSensorAvailable: jest.fn().mockResolvedValue({available: false}),
  simplePrompt: jest.fn().mockResolvedValue({success: false}),
  createKeys: jest.fn().mockResolvedValue({publicKey: 'test-key'}),
  deleteKeys: jest.fn().mockResolvedValue({keysDeleted: false}),
  biometricKeysExist: jest.fn().mockResolvedValue({keysExist: false}),
  createSignature: jest.fn().mockResolvedValue({success: false}),
};

jest.mock('react-native-biometrics', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockBiometricsInstance),
    BiometryTypes: {
      FaceID: 'FaceID',
      TouchID: 'TouchID',
      Biometrics: 'Biometrics',
      Iris: 'Iris',
    },
  };
});

// Export for test access
global.mockBiometricsInstance = mockBiometricsInstance;

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

// Suppress console warnings/errors during tests
global.console = {
  ...console,
  // Suppress debug logs but keep errors for debugging test failures
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};
