/**
 * DeviceIdentityService Tests
 *
 * Tests for device identity generation, persistence, and management
 */

import {DeviceIdentityService} from '../../../src/services/security/DeviceIdentityService';
import DeviceInfo from 'react-native-device-info';
import * as Keychain from 'react-native-keychain';
import {Platform} from 'react-native';

// Mock dependencies
jest.mock('react-native-device-info');
jest.mock('react-native-keychain');
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

describe('DeviceIdentityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    DeviceIdentityService.clearCache();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getDeviceIdentity', () => {
    it('should return cached identity if available', async () => {
      // Mock device info
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('unique-device-id');
      (DeviceInfo.getBrand as jest.Mock).mockResolvedValue('Apple');
      (DeviceInfo.getDeviceId as jest.Mock).mockResolvedValue('iPhone14,2');
      (DeviceInfo.getModel as jest.Mock).mockResolvedValue('iPhone 13 Pro');
      (DeviceInfo.getSystemName as jest.Mock).mockResolvedValue('iOS');
      (DeviceInfo.getSystemVersion as jest.Mock).mockResolvedValue('16.0');
      (DeviceInfo.getBuildNumber as jest.Mock).mockResolvedValue('1');
      (DeviceInfo.getBundleId as jest.Mock).mockResolvedValue('com.offlinepayment');

      // Mock keychain - no existing identity
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      // First call - should create and cache
      const identity1 = await DeviceIdentityService.getDeviceIdentity();
      expect(identity1).toBeDefined();
      expect(identity1.deviceId).toBe('unique-device-id');
      expect(identity1.deviceFingerprint).toBeDefined();

      // Second call - should return cached (no keychain call)
      jest.clearAllMocks();
      const identity2 = await DeviceIdentityService.getDeviceIdentity();
      expect(identity2).toEqual(identity1);
      expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
    });

    it('should load existing identity from keychain', async () => {
      const existingIdentity = {
        deviceId: 'existing-device-id',
        deviceFingerprint: 'existing-fingerprint',
        createdAt: new Date('2024-01-01').toISOString(),
        lastUsedAt: new Date('2024-01-02').toISOString(),
      };

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'device_identity',
        password: JSON.stringify(existingIdentity),
      });

      const identity = await DeviceIdentityService.getDeviceIdentity();
      expect(identity.deviceId).toBe('existing-device-id');
      expect(identity.deviceFingerprint).toBe('existing-fingerprint');
      expect(identity.createdAt).toBeInstanceOf(Date);
    });

    it('should create new identity if none exists', async () => {
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('new-device-id');
      (DeviceInfo.getBrand as jest.Mock).mockResolvedValue('Apple');
      (DeviceInfo.getDeviceId as jest.Mock).mockResolvedValue('iPhone14,2');
      (DeviceInfo.getModel as jest.Mock).mockResolvedValue('iPhone 13 Pro');
      (DeviceInfo.getSystemName as jest.Mock).mockResolvedValue('iOS');
      (DeviceInfo.getSystemVersion as jest.Mock).mockResolvedValue('16.0');
      (DeviceInfo.getBuildNumber as jest.Mock).mockResolvedValue('1');
      (DeviceInfo.getBundleId as jest.Mock).mockResolvedValue('com.offlinepayment');

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      const identity = await DeviceIdentityService.getDeviceIdentity();
      expect(identity).toBeDefined();
      expect(identity.deviceId).toBe('new-device-id');
      expect(identity.createdAt).toBeInstanceOf(Date);
      expect(identity.lastUsedAt).toBeInstanceOf(Date);
      expect(Keychain.setGenericPassword).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      await expect(DeviceIdentityService.getDeviceIdentity()).rejects.toThrow(
        'Failed to get device identity'
      );
    });
  });

  describe('updateLastUsed', () => {
    it('should update last used timestamp', async () => {
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('test-device-id');
      (DeviceInfo.getBrand as jest.Mock).mockResolvedValue('Apple');
      (DeviceInfo.getDeviceId as jest.Mock).mockResolvedValue('iPhone14,2');
      (DeviceInfo.getModel as jest.Mock).mockResolvedValue('iPhone 13 Pro');
      (DeviceInfo.getSystemName as jest.Mock).mockResolvedValue('iOS');
      (DeviceInfo.getSystemVersion as jest.Mock).mockResolvedValue('16.0');
      (DeviceInfo.getBuildNumber as jest.Mock).mockResolvedValue('1');
      (DeviceInfo.getBundleId as jest.Mock).mockResolvedValue('com.offlinepayment');

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      const initialIdentity = await DeviceIdentityService.getDeviceIdentity();
      const initialTime = initialIdentity.lastUsedAt.getTime();

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await DeviceIdentityService.updateLastUsed();
      const updatedIdentity = await DeviceIdentityService.getDeviceIdentity();

      expect(updatedIdentity.lastUsedAt.getTime()).toBeGreaterThan(initialTime);
    });
  });

  describe('getDeviceInfo', () => {
    it('should return device information', async () => {
      (DeviceInfo.getBrand as jest.Mock).mockResolvedValue('Apple');
      (DeviceInfo.getModel as jest.Mock).mockResolvedValue('iPhone 13 Pro');
      (DeviceInfo.getSystemName as jest.Mock).mockResolvedValue('iOS');
      (DeviceInfo.getSystemVersion as jest.Mock).mockResolvedValue('16.0');
      (DeviceInfo.getVersion as jest.Mock).mockResolvedValue('1.0.0');
      (DeviceInfo.getBuildNumber as jest.Mock).mockResolvedValue('1');

      const info = await DeviceIdentityService.getDeviceInfo();
      expect(info).toEqual({
        brand: 'Apple',
        model: 'iPhone 13 Pro',
        systemName: 'iOS',
        systemVersion: '16.0',
        appVersion: '1.0.0',
        buildNumber: '1',
      });
    });
  });

  describe('resetDeviceIdentity', () => {
    it('should reset device identity and create new one', async () => {
      // Setup initial identity
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('old-device-id');
      (DeviceInfo.getBrand as jest.Mock).mockResolvedValue('Apple');
      (DeviceInfo.getDeviceId as jest.Mock).mockResolvedValue('iPhone14,2');
      (DeviceInfo.getModel as jest.Mock).mockResolvedValue('iPhone 13 Pro');
      (DeviceInfo.getSystemName as jest.Mock).mockResolvedValue('iOS');
      (DeviceInfo.getSystemVersion as jest.Mock).mockResolvedValue('16.0');
      (DeviceInfo.getBuildNumber as jest.Mock).mockResolvedValue('1');
      (DeviceInfo.getBundleId as jest.Mock).mockResolvedValue('com.offlinepayment');

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

      const oldIdentity = await DeviceIdentityService.getDeviceIdentity();
      expect(oldIdentity.deviceId).toBe('old-device-id');

      // Change device ID for new identity
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('new-device-id');

      const newIdentity = await DeviceIdentityService.resetDeviceIdentity();
      expect(newIdentity.deviceId).toBe('new-device-id');
      expect(newIdentity.deviceId).not.toBe(oldIdentity.deviceId);
      expect(Keychain.resetGenericPassword).toHaveBeenCalled();
    });
  });

  describe('hasDeviceIdentity', () => {
    it('should return true if identity exists', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'device_identity',
        password: 'some-data',
      });

      const hasIdentity = await DeviceIdentityService.hasDeviceIdentity();
      expect(hasIdentity).toBe(true);
    });

    it('should return false if identity does not exist', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const hasIdentity = await DeviceIdentityService.hasDeviceIdentity();
      expect(hasIdentity).toBe(false);
    });
  });

  describe('verifyDeviceFingerprint', () => {
    it('should return true if fingerprint matches', async () => {
      const mockFingerprint = 'test-fingerprint';

      // Mock device info to produce consistent fingerprint
      (DeviceInfo.getBrand as jest.Mock).mockResolvedValue('Apple');
      (DeviceInfo.getDeviceId as jest.Mock).mockResolvedValue('iPhone14,2');
      (DeviceInfo.getModel as jest.Mock).mockResolvedValue('iPhone 13 Pro');
      (DeviceInfo.getSystemName as jest.Mock).mockResolvedValue('iOS');
      (DeviceInfo.getSystemVersion as jest.Mock).mockResolvedValue('16.0');
      (DeviceInfo.getBuildNumber as jest.Mock).mockResolvedValue('1');
      (DeviceInfo.getBundleId as jest.Mock).mockResolvedValue('com.offlinepayment');
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('test-id');

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      // Create identity first
      const identity = await DeviceIdentityService.getDeviceIdentity();

      // Verify should match since device info hasn't changed
      const isValid = await DeviceIdentityService.verifyDeviceFingerprint();
      expect(isValid).toBe(true);
    });

    it('should return false if verification fails', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      const isValid = await DeviceIdentityService.verifyDeviceFingerprint();
      expect(isValid).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cached identity', async () => {
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('test-device-id');
      (DeviceInfo.getBrand as jest.Mock).mockResolvedValue('Apple');
      (DeviceInfo.getDeviceId as jest.Mock).mockResolvedValue('iPhone14,2');
      (DeviceInfo.getModel as jest.Mock).mockResolvedValue('iPhone 13 Pro');
      (DeviceInfo.getSystemName as jest.Mock).mockResolvedValue('iOS');
      (DeviceInfo.getSystemVersion as jest.Mock).mockResolvedValue('16.0');
      (DeviceInfo.getBuildNumber as jest.Mock).mockResolvedValue('1');
      (DeviceInfo.getBundleId as jest.Mock).mockResolvedValue('com.offlinepayment');

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      // Get identity (caches it)
      await DeviceIdentityService.getDeviceIdentity();

      // Clear cache
      DeviceIdentityService.clearCache();

      // Next call should reload from keychain
      jest.clearAllMocks();
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'device_identity',
        password: JSON.stringify({
          deviceId: 'test-device-id',
          deviceFingerprint: 'test-fingerprint',
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
        }),
      });

      await DeviceIdentityService.getDeviceIdentity();
      expect(Keychain.getGenericPassword).toHaveBeenCalled();
    });
  });
});
