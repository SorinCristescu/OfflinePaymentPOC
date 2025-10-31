/**
 * BiometricService Tests
 *
 * Tests for biometric authentication capabilities and operations
 */

import {BiometricService} from '../../../src/services/security/BiometricService';
import {BiometryTypes} from 'react-native-biometrics';
import {BiometricType} from '../../../src/types';

// Get the global mock instance from jest.setup.js
const mockBiometrics = (global as any).mockBiometricsInstance;

describe('BiometricService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    BiometricService.clearCache();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('checkCapabilities', () => {
    it('should return available biometric capabilities for Face ID', async () => {
      mockBiometrics.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      const capabilities = await BiometricService.checkCapabilities();
      expect(capabilities.isAvailable).toBe(true);
      expect(capabilities.biometricType).toBe(BiometricType.FACE_ID);
      expect(capabilities.hasEnrolledCredentials).toBe(true);
      expect(capabilities.errorMessage).toBeUndefined();
    });

    it('should return available biometric capabilities for Touch ID', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.TouchID,
      });

      const capabilities = await BiometricService.checkCapabilities();
      expect(capabilities.isAvailable).toBe(true);
      expect(capabilities.biometricType).toBe(BiometricType.FINGERPRINT);
      expect(capabilities.hasEnrolledCredentials).toBe(true);
    });

    it('should return available biometric capabilities for Android Biometrics', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.Biometrics,
      });

      const capabilities = await BiometricService.checkCapabilities();
      expect(capabilities.isAvailable).toBe(true);
      expect(capabilities.biometricType).toBe(BiometricType.FINGERPRINT);
    });

    it('should return unavailable when no biometric sensor', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: false,
        error: 'No biometric sensor',
      });

      const capabilities = await BiometricService.checkCapabilities();
      expect(capabilities.isAvailable).toBe(false);
      expect(capabilities.biometricType).toBe(BiometricType.NONE);
      expect(capabilities.hasEnrolledCredentials).toBe(false);
      expect(capabilities.errorMessage).toBe('No biometric sensor');
    });

    it('should cache capabilities after first check', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      // First call
      await BiometricService.checkCapabilities();
      expect(mockBiometrics.isSensorAvailable).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await BiometricService.checkCapabilities();
      expect(mockBiometrics.isSensorAvailable).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockRejectedValue(
        new Error('Biometric check failed')
      );

      const capabilities = await BiometricService.checkCapabilities();
      expect(capabilities.isAvailable).toBe(false);
      expect(capabilities.errorMessage).toBe('Failed to check biometric capabilities');
    });
  });

  describe('getBiometricTypeName', () => {
    it('should return correct name for Face ID', () => {
      const name = BiometricService.getBiometricTypeName(BiometricType.FACE_ID);
      expect(name).toBe('Face ID');
    });

    it('should return correct name for Fingerprint', () => {
      const name = BiometricService.getBiometricTypeName(BiometricType.FINGERPRINT);
      expect(name).toBeTruthy(); // Touch ID or Fingerprint depending on platform
    });

    it('should return correct name for None', () => {
      const name = BiometricService.getBiometricTypeName(BiometricType.NONE);
      expect(name).toBe('None');
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate with biometrics', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      mockBiometrics.simplePrompt = jest.fn().mockResolvedValue({
        success: true,
      });

      const result = await BiometricService.authenticate('Test authentication');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockBiometrics.simplePrompt).toHaveBeenCalledWith({
        promptMessage: 'Test authentication',
        cancelButtonText: 'Cancel',
      });
    });

    it('should fail when biometrics are not available', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: false,
        error: 'Biometrics not available',
      });

      const result = await BiometricService.authenticate();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometrics not available');
    });

    it('should handle authentication failure', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      mockBiometrics.simplePrompt = jest.fn().mockResolvedValue({
        success: false,
        error: 'Authentication failed',
      });

      const result = await BiometricService.authenticate();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
      expect(result.cancelled).toBeFalsy();
    });

    it('should detect user cancellation', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      mockBiometrics.simplePrompt = jest.fn().mockResolvedValue({
        success: false,
        error: 'User cancelled authentication',
      });

      const result = await BiometricService.authenticate();
      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it('should handle errors during authentication', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      mockBiometrics.simplePrompt = jest.fn().mockRejectedValue(
        new Error('Biometric sensor error')
      );

      const result = await BiometricService.authenticate();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric sensor error');
    });
  });

  describe('createKeys', () => {
    it('should create biometric keys when available', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      mockBiometrics.createKeys = jest.fn().mockResolvedValue({
        publicKey: 'test-public-key',
      });

      const result = await BiometricService.createKeys();
      expect(result).not.toBeNull();
      expect(result?.publicKey).toBe('test-public-key');
    });

    it('should return null when biometrics not available', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: false,
      });

      const result = await BiometricService.createKeys();
      expect(result).toBeNull();
    });

    it('should handle errors during key creation', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      mockBiometrics.createKeys = jest.fn().mockRejectedValue(
        new Error('Key creation failed')
      );

      const result = await BiometricService.createKeys();
      expect(result).toBeNull();
    });
  });

  describe('deleteKeys', () => {
    it('should delete biometric keys', async () => {
      mockBiometrics.deleteKeys = jest.fn().mockResolvedValue({
        keysDeleted: true,
      });

      const result = await BiometricService.deleteKeys();
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      mockBiometrics.deleteKeys = jest.fn().mockResolvedValue({
        keysDeleted: false,
      });

      const result = await BiometricService.deleteKeys();
      expect(result).toBe(false);
    });

    it('should handle errors during deletion', async () => {
      mockBiometrics.deleteKeys = jest.fn().mockRejectedValue(
        new Error('Deletion failed')
      );

      const result = await BiometricService.deleteKeys();
      expect(result).toBe(false);
    });
  });

  describe('keysExist', () => {
    it('should return true when keys exist', async () => {
      mockBiometrics.biometricKeysExist = jest.fn().mockResolvedValue({
        keysExist: true,
      });

      const result = await BiometricService.keysExist();
      expect(result).toBe(true);
    });

    it('should return false when keys do not exist', async () => {
      mockBiometrics.biometricKeysExist = jest.fn().mockResolvedValue({
        keysExist: false,
      });

      const result = await BiometricService.keysExist();
      expect(result).toBe(false);
    });
  });

  describe('getBiometricSettings', () => {
    it('should return complete biometric settings', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      mockBiometrics.biometricKeysExist = jest.fn().mockResolvedValue({
        keysExist: true,
      });

      const settings = await BiometricService.getBiometricSettings();
      expect(settings.available).toBe(true);
      expect(settings.type).toBe(BiometricType.FACE_ID);
      expect(settings.typeName).toBe('Face ID');
      expect(settings.enrolled).toBe(true);
      expect(settings.keysExist).toBe(true);
    });
  });

  describe('getUserFriendlyError', () => {
    it('should return friendly message for cancellation', () => {
      const message = BiometricService.getUserFriendlyError('User cancelled authentication');
      expect(message).toBe('Authentication cancelled.');
    });

    it('should return friendly message for lockout', () => {
      const message = BiometricService.getUserFriendlyError('Too many attempts, locked out');
      expect(message).toBe('Too many failed attempts. Please try again later.');
    });

    it('should return friendly message for not enrolled', () => {
      const message = BiometricService.getUserFriendlyError('No biometric enrolled');
      expect(message).toContain('biometrics enrolled');
    });

    it('should return friendly message for not available', () => {
      const message = BiometricService.getUserFriendlyError('Biometric not available');
      expect(message).toContain('not available');
    });

    it('should return default message for unknown errors', () => {
      const message = BiometricService.getUserFriendlyError('Unknown error');
      expect(message).toContain('error occurred');
    });
  });

  describe('clearCache', () => {
    it('should clear cached capabilities', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
        biometryType: BiometryTypes.FaceID,
      });

      // First call
      await BiometricService.checkCapabilities();
      expect(mockBiometrics.isSensorAvailable).toHaveBeenCalledTimes(1);

      // Clear cache
      BiometricService.clearCache();

      // Next call should check again
      await BiometricService.checkCapabilities();
      expect(mockBiometrics.isSensorAvailable).toHaveBeenCalledTimes(2);
    });
  });

  describe('isSupported', () => {
    it('should return true when biometrics are supported', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: true,
      });

      const supported = await BiometricService.isSupported();
      expect(supported).toBe(true);
    });

    it('should return false when biometrics are not supported', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockResolvedValue({
        available: false,
      });

      const supported = await BiometricService.isSupported();
      expect(supported).toBe(false);
    });

    it('should return false on error', async () => {
      mockBiometrics.isSensorAvailable = jest.fn().mockRejectedValue(
        new Error('Check failed')
      );

      const supported = await BiometricService.isSupported();
      expect(supported).toBe(false);
    });
  });
});
