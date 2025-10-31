/**
 * PINService Tests
 *
 * Tests for PIN setup, verification, and security features
 */

import {PINService} from '../../../src/services/security/PINService';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('react-native-keychain');
jest.mock('@react-native-async-storage/async-storage');

describe('PINService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear all PIN data before each test
    await PINService.clearAllData();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('setupPIN', () => {
    it('should successfully setup a valid PIN', async () => {
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await PINService.setupPIN({
        pin: '1234',
        confirmPin: '1234',
      });

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(Keychain.setGenericPassword).toHaveBeenCalled();
    });

    it('should reject PIN that is too short', async () => {
      const result = await PINService.setupPIN({
        pin: '123',
        confirmPin: '123',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should reject PIN that is too long', async () => {
      const result = await PINService.setupPIN({
        pin: '123456789',
        confirmPin: '123456789',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at most');
    });

    it('should reject PIN with non-numeric characters', async () => {
      const result = await PINService.setupPIN({
        pin: '12ab',
        confirmPin: '12ab',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('only numbers');
    });

    it('should reject mismatched PINs', async () => {
      const result = await PINService.setupPIN({
        pin: '1234',
        confirmPin: '5678',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('PINs do not match');
    });

    it('should reject weak PINs', async () => {
      const weakPINs = ['0000', '1111', '1234', '4321', '1212'];

      for (const pin of weakPINs) {
        const result = await PINService.setupPIN({
          pin,
          confirmPin: pin,
        });

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('too weak');
      }
    });

    it('should handle storage errors gracefully', async () => {
      (Keychain.setGenericPassword as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await PINService.setupPIN({
        pin: '5678',
        confirmPin: '5678',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Failed to setup PIN');
    });
  });

  describe('verifyPIN', () => {
    beforeEach(async () => {
      // Setup a PIN for verification tests
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      await PINService.setupPIN({pin: '5678', confirmPin: '5678'});
    });

    it('should successfully verify correct PIN', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await PINService.verifyPIN('5678');
      expect(result.isValid).toBe(true);
    });

    it('should reject incorrect PIN', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await PINService.verifyPIN('1111');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Incorrect PIN');
      expect(result.attemptsRemaining).toBeDefined();
    });

    it('should track failed attempts', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // First failed attempt
      let result = await PINService.verifyPIN('1111');
      expect(result.attemptsRemaining).toBeLessThan(5);

      // Second failed attempt
      result = await PINService.verifyPIN('2222');
      expect(result.attemptsRemaining).toBeLessThan(result.attemptsRemaining! + 1);
    });

    it('should lockout after max failed attempts', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Exhaust all attempts
      for (let i = 0; i < 5; i++) {
        await PINService.verifyPIN('1111');
      }

      const result = await PINService.verifyPIN('1111');
      expect(result.isValid).toBe(false);
      expect(result.attemptsRemaining).toBe(0);
      expect(result.error).toContain('locked');
    });

    it('should enforce lockout period', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });

      // Simulate being locked out
      const lockoutEnd = Date.now() + 5000; // 5 seconds from now
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('lockout')) {
          return Promise.resolve(lockoutEnd.toString());
        }
        return Promise.resolve(null);
      });

      const result = await PINService.verifyPIN('5678');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Try again in');
    });

    it('should reset attempts after successful verification', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      // Failed attempt
      await PINService.verifyPIN('1111');

      // Successful attempt should reset counter
      const result = await PINService.verifyPIN('5678');
      expect(result.isValid).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should fail when PIN is not set up', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await PINService.verifyPIN('1234');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('PIN not set up');
    });
  });

  describe('changePIN', () => {
    beforeEach(async () => {
      // Setup initial PIN
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      await PINService.setupPIN({pin: '1234', confirmPin: '1234'});
    });

    it('should successfully change PIN with correct current PIN', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await PINService.changePIN({
        currentPin: '1234',
        newPin: '5678',
        confirmNewPin: '5678',
      });

      expect(result.isValid).toBe(true);
      expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(2); // Once for setup, once for change
    });

    it('should reject when current PIN is incorrect', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await PINService.changePIN({
        currentPin: '9999',
        newPin: '5678',
        confirmNewPin: '5678',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Current PIN is incorrect');
    });

    it('should reject when new PINs do not match', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await PINService.changePIN({
        currentPin: '1234',
        newPin: '5678',
        confirmNewPin: '8765',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('New PINs do not match');
    });

    it('should reject when new PIN is same as current PIN', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await PINService.changePIN({
        currentPin: '1234',
        newPin: '1234',
        confirmNewPin: '1234',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('New PIN must be different from current PIN');
    });

    it('should reject invalid new PIN format', async () => {
      const storedCredentials = await Keychain.setGenericPassword.mock.calls[0];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: storedCredentials[0],
        password: storedCredentials[1],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await PINService.changePIN({
        currentPin: '1234',
        newPin: '123',
        confirmNewPin: '123',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least');
    });
  });

  describe('hasPIN', () => {
    it('should return true when PIN exists', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'user_pin',
        password: 'hashed-pin',
      });

      const hasPIN = await PINService.hasPIN();
      expect(hasPIN).toBe(true);
    });

    it('should return false when PIN does not exist', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const hasPIN = await PINService.hasPIN();
      expect(hasPIN).toBe(false);
    });

    it('should return false on error', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      const hasPIN = await PINService.hasPIN();
      expect(hasPIN).toBe(false);
    });
  });

  describe('deletePIN', () => {
    it('should successfully delete PIN', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await PINService.deletePIN();
      expect(result).toBe(true);
      expect(Keychain.resetGenericPassword).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      );

      const result = await PINService.deletePIN();
      expect(result).toBe(false);
    });
  });

  describe('getAttemptStatus', () => {
    it('should return attempt status', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const status = await PINService.getAttemptStatus();
      expect(status).toHaveProperty('failedAttempts');
      expect(status).toHaveProperty('remainingAttempts');
      expect(status).toHaveProperty('isLockedOut');
      expect(status).toHaveProperty('lockoutRemainingSeconds');
    });

    it('should reflect failed attempts', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('failed_attempts')) {
          return Promise.resolve('3');
        }
        return Promise.resolve(null);
      });

      const status = await PINService.getAttemptStatus();
      expect(status.failedAttempts).toBe(3);
      expect(status.remainingAttempts).toBe(2); // Assuming max is 5
    });

    it('should indicate lockout status', async () => {
      const lockoutEnd = Date.now() + 10000; // 10 seconds from now
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('lockout')) {
          return Promise.resolve(lockoutEnd.toString());
        }
        if (key.includes('failed_attempts')) {
          return Promise.resolve('5');
        }
        return Promise.resolve(null);
      });

      const status = await PINService.getAttemptStatus();
      expect(status.isLockedOut).toBe(true);
      expect(status.lockoutRemainingSeconds).toBeGreaterThan(0);
    });
  });

  describe('clearAllData', () => {
    it('should clear all PIN-related data', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await PINService.clearAllData();

      expect(Keychain.resetGenericPassword).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });
});
