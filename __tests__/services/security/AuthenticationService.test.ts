/**
 * AuthenticationService Tests
 *
 * Tests for orchestration of authentication methods
 */

import {AuthenticationService} from '../../../src/services/security/AuthenticationService';
import {BiometricService} from '../../../src/services/security/BiometricService';
import {PINService} from '../../../src/services/security/PINService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthenticationMethod,
  AuthenticationStatus,
  BiometricType,
} from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/services/security/BiometricService');
jest.mock('../../../src/services/security/PINService');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('AuthenticationService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear all auth data before each test
    await AuthenticationService.clearAllData();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialize', () => {
    it('should initialize and detect available authentication methods', async () => {
      (BiometricService.checkCapabilities as jest.Mock).mockResolvedValue({
        isAvailable: true,
        biometricType: BiometricType.FACE_ID,
        hasEnrolledCredentials: true,
      });
      (PINService.hasPIN as jest.Mock).mockResolvedValue(true);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        AuthenticationMethod.PIN_AND_BIOMETRIC
      );

      const result = await AuthenticationService.initialize();
      expect(result.biometricAvailable).toBe(true);
      expect(result.pinConfigured).toBe(true);
      expect(result.currentMethod).toBe(AuthenticationMethod.PIN_AND_BIOMETRIC);
    });

    it('should handle initialization errors gracefully', async () => {
      (BiometricService.checkCapabilities as jest.Mock).mockRejectedValue(
        new Error('Biometric check failed')
      );
      (PINService.hasPIN as jest.Mock).mockResolvedValue(false);

      const result = await AuthenticationService.initialize();
      expect(result.biometricAvailable).toBe(false);
      expect(result.pinConfigured).toBe(false);
      expect(result.currentMethod).toBe(AuthenticationMethod.NONE);
    });
  });

  describe('authenticateWithPIN', () => {
    it('should successfully authenticate with correct PIN', async () => {
      (PINService.verifyPIN as jest.Mock).mockResolvedValue({
        isValid: true,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticationService.authenticateWithPIN('1234');
      expect(result.success).toBe(true);
      expect(result.method).toBe(AuthenticationMethod.PIN);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should fail authentication with incorrect PIN', async () => {
      (PINService.verifyPIN as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Incorrect PIN',
        attemptsRemaining: 4,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticationService.authenticateWithPIN('9999');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Incorrect PIN');
    });

    it('should handle PIN verification errors', async () => {
      (PINService.verifyPIN as jest.Mock).mockRejectedValue(
        new Error('PIN service error')
      );

      const result = await AuthenticationService.authenticateWithPIN('1234');
      expect(result.success).toBe(false);
      expect(result.error).toContain('PIN');
    });
  });

  describe('setupAuthentication', () => {
    it('should setup PIN authentication', async () => {
      (PINService.setupPIN as jest.Mock).mockResolvedValue({
        isValid: true,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticationService.setupAuthentication(
        AuthenticationMethod.PIN,
        {pin: '1234', confirmPin: '1234'}
      );

      expect(result.success).toBe(true);
      expect(PINService.setupPIN).toHaveBeenCalledWith({
        pin: '1234',
        confirmPin: '1234',
      });
    });

    it('should setup biometric authentication', async () => {
      (BiometricService.createKeys as jest.Mock).mockResolvedValue({
        publicKey: 'test-public-key',
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticationService.setupAuthentication(
        AuthenticationMethod.BIOMETRIC
      );

      expect(result.success).toBe(true);
      expect(BiometricService.createKeys).toHaveBeenCalled();
    });

    it('should setup both PIN and biometric', async () => {
      (PINService.setupPIN as jest.Mock).mockResolvedValue({
        isValid: true,
      });
      (BiometricService.createKeys as jest.Mock).mockResolvedValue({
        publicKey: 'test-public-key',
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticationService.setupAuthentication(
        AuthenticationMethod.PIN_AND_BIOMETRIC,
        {pin: '1234', confirmPin: '1234'}
      );

      expect(result.success).toBe(true);
      expect(PINService.setupPIN).toHaveBeenCalled();
      expect(BiometricService.createKeys).toHaveBeenCalled();
    });

    it('should fail when PIN setup fails', async () => {
      (PINService.setupPIN as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'PINs do not match',
      });

      const result = await AuthenticationService.setupAuthentication(
        AuthenticationMethod.PIN,
        {pin: '1234', confirmPin: '5678'}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('PINs do not match');
    });

    it('should fail when biometric keys cannot be created', async () => {
      (BiometricService.createKeys as jest.Mock).mockResolvedValue(null);

      const result = await AuthenticationService.setupAuthentication(
        AuthenticationMethod.BIOMETRIC
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('biometric');
    });

    it('should fallback to PIN only if biometric fails during combined setup', async () => {
      (PINService.setupPIN as jest.Mock).mockResolvedValue({
        isValid: true,
      });
      (BiometricService.createKeys as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticationService.setupAuthentication(
        AuthenticationMethod.PIN_AND_BIOMETRIC,
        {pin: '1234', confirmPin: '1234'}
      );

      expect(result.success).toBe(true);
      expect(result.error).toContain('Biometric setup failed, using PIN only');
    });

    it('should require PIN data for PIN methods', async () => {
      const result = await AuthenticationService.setupAuthentication(
        AuthenticationMethod.PIN
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('PIN data required');
    });
  });

  describe('disableAuthentication', () => {
    it('should disable biometric authentication', async () => {
      (BiometricService.deleteKeys as jest.Mock).mockResolvedValue(true);
      (PINService.hasPIN as jest.Mock).mockResolvedValue(false);
      (BiometricService.keysExist as jest.Mock).mockResolvedValue(false);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticationService.disableAuthentication(
        AuthenticationMethod.BIOMETRIC
      );

      expect(result.success).toBe(true);
      expect(BiometricService.deleteKeys).toHaveBeenCalled();
    });

    it('should disable PIN authentication', async () => {
      (PINService.deletePIN as jest.Mock).mockResolvedValue(true);
      (PINService.hasPIN as jest.Mock).mockResolvedValue(false);
      (BiometricService.keysExist as jest.Mock).mockResolvedValue(false);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticationService.disableAuthentication(
        AuthenticationMethod.PIN
      );

      expect(result.success).toBe(true);
      expect(PINService.deletePIN).toHaveBeenCalled();
    });

    it('should update configured method after disabling', async () => {
      (BiometricService.deleteKeys as jest.Mock).mockResolvedValue(true);
      (PINService.deletePIN as jest.Mock).mockResolvedValue(true);
      (PINService.hasPIN as jest.Mock).mockResolvedValue(true); // PIN still exists
      (BiometricService.keysExist as jest.Mock).mockResolvedValue(false);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await AuthenticationService.disableAuthentication(
        AuthenticationMethod.PIN_AND_BIOMETRIC
      );

      // Should update to PIN only since PIN still exists
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('auth_method'),
        AuthenticationMethod.PIN
      );
    });
  });

  describe('getState', () => {
    it('should return current authentication state', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const state = await AuthenticationService.getState();
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('method');
      expect(state).toHaveProperty('failedAttempts');
      expect(state).toHaveProperty('isLocked');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when session is valid', async () => {
      // Simulate successful authentication
      (PINService.verifyPIN as jest.Mock).mockResolvedValue({
        isValid: true,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          status: AuthenticationStatus.AUTHENTICATED,
          method: AuthenticationMethod.PIN,
          lastAuthenticationTime: new Date().toISOString(),
          failedAttempts: 0,
          isLocked: false,
        })
      );

      await AuthenticationService.authenticateWithPIN('1234');
      const isAuth = await AuthenticationService.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    it('should return false when not authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const isAuth = await AuthenticationService.isAuthenticated();
      expect(isAuth).toBe(false);
    });

    it('should return false when session has expired', async () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          status: AuthenticationStatus.AUTHENTICATED,
          method: AuthenticationMethod.PIN,
          lastAuthenticationTime: oldTime.toISOString(),
          failedAttempts: 0,
          isLocked: false,
        })
      );
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const isAuth = await AuthenticationService.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout and clear session', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await AuthenticationService.logout();

      const state = await AuthenticationService.getState();
      expect(state.status).toBe(AuthenticationStatus.UNAUTHENTICATED);
      expect(state.method).toBe(AuthenticationMethod.NONE);
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('getConfiguredMethod', () => {
    it('should return stored authentication method', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        AuthenticationMethod.PIN
      );

      const method = await AuthenticationService.getConfiguredMethod();
      expect(method).toBe(AuthenticationMethod.PIN);
    });

    it('should auto-detect when both PIN and biometric are configured', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (PINService.hasPIN as jest.Mock).mockResolvedValue(true);
      (BiometricService.keysExist as jest.Mock).mockResolvedValue(true);

      const method = await AuthenticationService.getConfiguredMethod();
      expect(method).toBe(AuthenticationMethod.PIN_AND_BIOMETRIC);
    });

    it('should auto-detect PIN only', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (PINService.hasPIN as jest.Mock).mockResolvedValue(true);
      (BiometricService.keysExist as jest.Mock).mockResolvedValue(false);

      const method = await AuthenticationService.getConfiguredMethod();
      expect(method).toBe(AuthenticationMethod.PIN);
    });

    it('should auto-detect biometric only', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (PINService.hasPIN as jest.Mock).mockResolvedValue(false);
      (BiometricService.keysExist as jest.Mock).mockResolvedValue(true);

      const method = await AuthenticationService.getConfiguredMethod();
      expect(method).toBe(AuthenticationMethod.BIOMETRIC);
    });

    it('should return NONE when nothing is configured', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (PINService.hasPIN as jest.Mock).mockResolvedValue(false);
      (BiometricService.keysExist as jest.Mock).mockResolvedValue(false);

      const method = await AuthenticationService.getConfiguredMethod();
      expect(method).toBe(AuthenticationMethod.NONE);
    });
  });

  describe('getSecurityEvents', () => {
    it('should return security events', async () => {
      const mockEvents = [
        {
          id: 'test-uuid-1',
          type: 'LOGIN_SUCCESS',
          timestamp: new Date().toISOString(),
          deviceId: 'test-device',
          success: true,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockEvents)
      );

      const events = await AuthenticationService.getSecurityEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('test-uuid-1');
    });

    it('should return empty array when no events exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const events = await AuthenticationService.getSecurityEvents();
      expect(events).toEqual([]);
    });

    it('should limit returned events to specified count', async () => {
      const mockEvents = Array.from({length: 50}, (_, i) => ({
        id: `test-uuid-${i}`,
        type: 'LOGIN_SUCCESS',
        timestamp: new Date().toISOString(),
        deviceId: 'test-device',
        success: true,
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockEvents)
      );

      const events = await AuthenticationService.getSecurityEvents(10);
      expect(events.length).toBeLessThanOrEqual(10);
    });
  });

  describe('clearAllData', () => {
    it('should clear all authentication data', async () => {
      (PINService.clearAllData as jest.Mock).mockResolvedValue(undefined);
      (BiometricService.deleteKeys as jest.Mock).mockResolvedValue(true);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await AuthenticationService.clearAllData();

      expect(PINService.clearAllData).toHaveBeenCalled();
      expect(BiometricService.deleteKeys).toHaveBeenCalled();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();

      const state = await AuthenticationService.getState();
      expect(state.status).toBe(AuthenticationStatus.UNAUTHENTICATED);
    });
  });
});
