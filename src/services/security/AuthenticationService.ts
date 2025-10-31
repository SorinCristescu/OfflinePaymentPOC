/**
 * AuthenticationService - Orchestrates all authentication methods
 *
 * This service:
 * - Coordinates between BiometricService and PINService
 * - Provides unified authentication API
 * - Manages authentication state and sessions
 * - Handles authentication method selection and fallback
 * - Tracks authentication timestamps and timeouts
 * - Manages security event logging
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {BiometricService} from './BiometricService';
import {PINService} from './PINService';
import {
  AuthenticationMethod,
  AuthenticationStatus,
  AuthenticationResult,
  AuthenticationState,
  SecurityEvent,
  SecurityEventType,
  PINSetupData,
  AUTH_CONSTANTS,
} from '../../types';
import {v4 as uuidv4} from 'uuid';

/**
 * Storage keys
 */
const AUTH_STATE_KEY = '@offlinepayment:auth_state';
const LAST_AUTH_KEY = '@offlinepayment:last_auth_time';
const AUTH_METHOD_KEY = '@offlinepayment:auth_method';
const SECURITY_EVENTS_KEY = '@offlinepayment:security_events';

/**
 * AuthenticationService class
 */
class AuthenticationServiceClass {
  private currentState: AuthenticationState = {
    status: AuthenticationStatus.UNAUTHENTICATED,
    method: AuthenticationMethod.NONE,
    failedAttempts: 0,
    isLocked: false,
  };

  constructor() {
    // Load authentication state on initialization
    this.loadState();
  }

  /**
   * Initialize authentication service
   * Checks what authentication methods are available and configured
   */
  async initialize(): Promise<{
    biometricAvailable: boolean;
    pinConfigured: boolean;
    currentMethod: AuthenticationMethod;
  }> {
    try {
      const [biometricCaps, hasPIN, savedMethod] = await Promise.all([
        BiometricService.checkCapabilities(),
        PINService.hasPIN(),
        this.getConfiguredMethod(),
      ]);

      return {
        biometricAvailable: biometricCaps.isAvailable,
        pinConfigured: hasPIN,
        currentMethod: savedMethod,
      };
    } catch (error) {
      console.error('Error initializing authentication service:', error);
      return {
        biometricAvailable: false,
        pinConfigured: false,
        currentMethod: AuthenticationMethod.NONE,
      };
    }
  }

  /**
   * Authenticate user with preferred method
   * Automatically selects best available method
   */
  async authenticate(
    preferredMethod?: AuthenticationMethod,
    promptMessage?: string
  ): Promise<AuthenticationResult> {
    try {
      // Check if already authenticated and session is valid
      if (await this.isSessionValid()) {
        console.log('Using existing valid session');
        return {
          success: true,
          method: this.currentState.method,
          timestamp: new Date(),
        };
      }

      // Determine authentication method to use
      const method = preferredMethod || (await this.getConfiguredMethod());

      let result: AuthenticationResult;

      switch (method) {
        case AuthenticationMethod.BIOMETRIC:
          result = await this.authenticateWithBiometric(promptMessage);
          break;

        case AuthenticationMethod.PIN:
          // PIN auth requires UI input, return unauthenticated
          // The UI should handle PIN collection and call authenticateWithPIN
          result = {
            success: false,
            method: AuthenticationMethod.PIN,
            error: 'PIN input required',
            timestamp: new Date(),
          };
          break;

        case AuthenticationMethod.PIN_AND_BIOMETRIC:
          // Try biometric first, fall back to PIN if needed
          result = await this.authenticateWithBiometric(promptMessage);
          if (!result.success) {
            result = {
              success: false,
              method: AuthenticationMethod.PIN,
              error: 'Biometric failed, PIN required',
              timestamp: new Date(),
            };
          }
          break;

        default:
          result = {
            success: false,
            method: AuthenticationMethod.NONE,
            error: 'No authentication method configured',
            timestamp: new Date(),
          };
      }

      // Update state and log event
      if (result.success) {
        await this.handleSuccessfulAuth(result.method);
        await this.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, true);
      } else {
        await this.handleFailedAuth();
        await this.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, false);
      }

      return result;
    } catch (error: any) {
      console.error('Error during authentication:', error);
      return {
        success: false,
        method: AuthenticationMethod.NONE,
        error: error?.message || 'Authentication failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Authenticate with biometric
   */
  private async authenticateWithBiometric(
    promptMessage?: string
  ): Promise<AuthenticationResult> {
    const biometricResult = await BiometricService.authenticate(promptMessage);

    return {
      success: biometricResult.success,
      method: AuthenticationMethod.BIOMETRIC,
      error: biometricResult.error,
      timestamp: new Date(),
    };
  }

  /**
   * Authenticate with PIN
   * Should be called from UI after collecting PIN input
   */
  async authenticateWithPIN(pin: string): Promise<AuthenticationResult> {
    try {
      const pinResult = await PINService.verifyPIN(pin);

      const result: AuthenticationResult = {
        success: pinResult.isValid,
        method: AuthenticationMethod.PIN,
        error: pinResult.error,
        timestamp: new Date(),
      };

      if (result.success) {
        await this.handleSuccessfulAuth(AuthenticationMethod.PIN);
        await this.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, true);
      } else {
        await this.handleFailedAuth();
        await this.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, false);
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        method: AuthenticationMethod.PIN,
        error: error?.message || 'PIN verification failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Setup authentication method
   */
  async setupAuthentication(
    method: AuthenticationMethod,
    pinData?: PINSetupData
  ): Promise<{success: boolean; error?: string}> {
    try {
      switch (method) {
        case AuthenticationMethod.BIOMETRIC: {
          // Create biometric keys
          const keys = await BiometricService.createKeys();
          if (!keys) {
            return {success: false, error: 'Failed to create biometric keys'};
          }

          await this.setConfiguredMethod(AuthenticationMethod.BIOMETRIC);
          await this.logSecurityEvent(SecurityEventType.BIOMETRIC_ENROLLED, true);
          return {success: true};
        }

        case AuthenticationMethod.PIN: {
          if (!pinData) {
            return {success: false, error: 'PIN data required'};
          }

          const result = await PINService.setupPIN(pinData);
          if (!result.isValid) {
            return {success: false, error: result.error};
          }

          await this.setConfiguredMethod(AuthenticationMethod.PIN);
          await this.logSecurityEvent(SecurityEventType.PIN_SETUP, true);
          return {success: true};
        }

        case AuthenticationMethod.PIN_AND_BIOMETRIC: {
          // Setup both methods
          if (!pinData) {
            return {success: false, error: 'PIN data required'};
          }

          const pinResult = await PINService.setupPIN(pinData);
          if (!pinResult.isValid) {
            return {success: false, error: pinResult.error};
          }

          const keys = await BiometricService.createKeys();
          if (!keys) {
            // PIN is setup but biometric failed, revert to PIN only
            await this.setConfiguredMethod(AuthenticationMethod.PIN);
            return {
              success: true,
              error: 'Biometric setup failed, using PIN only',
            };
          }

          await this.setConfiguredMethod(AuthenticationMethod.PIN_AND_BIOMETRIC);
          await this.logSecurityEvent(SecurityEventType.PIN_SETUP, true);
          await this.logSecurityEvent(SecurityEventType.BIOMETRIC_ENROLLED, true);
          return {success: true};
        }

        default:
          return {success: false, error: 'Invalid authentication method'};
      }
    } catch (error: any) {
      console.error('Error setting up authentication:', error);
      return {success: false, error: error?.message || 'Setup failed'};
    }
  }

  /**
   * Disable authentication method
   */
  async disableAuthentication(
    method: AuthenticationMethod
  ): Promise<{success: boolean; error?: string}> {
    try {
      switch (method) {
        case AuthenticationMethod.BIOMETRIC:
          await BiometricService.deleteKeys();
          await this.logSecurityEvent(SecurityEventType.BIOMETRIC_DISABLED, true);
          break;

        case AuthenticationMethod.PIN:
          await PINService.deletePIN();
          break;

        case AuthenticationMethod.PIN_AND_BIOMETRIC:
          await BiometricService.deleteKeys();
          await PINService.deletePIN();
          await this.logSecurityEvent(SecurityEventType.BIOMETRIC_DISABLED, true);
          break;
      }

      // Check what's left and update configured method
      const [hasPIN, hasKeys] = await Promise.all([
        PINService.hasPIN(),
        BiometricService.keysExist(),
      ]);

      if (hasPIN && hasKeys) {
        await this.setConfiguredMethod(AuthenticationMethod.PIN_AND_BIOMETRIC);
      } else if (hasPIN) {
        await this.setConfiguredMethod(AuthenticationMethod.PIN);
      } else if (hasKeys) {
        await this.setConfiguredMethod(AuthenticationMethod.BIOMETRIC);
      } else {
        await this.setConfiguredMethod(AuthenticationMethod.NONE);
      }

      return {success: true};
    } catch (error: any) {
      console.error('Error disabling authentication:', error);
      return {success: false, error: error?.message || 'Failed to disable authentication'};
    }
  }

  /**
   * Get current authentication state
   */
  async getState(): Promise<AuthenticationState> {
    await this.loadState();
    return {...this.currentState};
  }

  /**
   * Check if user is authenticated and session is valid
   */
  async isAuthenticated(): Promise<boolean> {
    if (this.currentState.status !== AuthenticationStatus.AUTHENTICATED) {
      return false;
    }

    return await this.isSessionValid();
  }

  /**
   * Check if authentication session is still valid
   */
  private async isSessionValid(): Promise<boolean> {
    if (this.currentState.status !== AuthenticationStatus.AUTHENTICATED) {
      return false;
    }

    if (!this.currentState.lastAuthenticationTime) {
      return false;
    }

    const now = Date.now();
    const lastAuth = this.currentState.lastAuthenticationTime.getTime();
    const elapsed = (now - lastAuth) / 1000; // Convert to seconds

    if (elapsed > AUTH_CONSTANTS.SESSION_TIMEOUT) {
      console.log('Authentication session expired');
      await this.logout();
      return false;
    }

    return true;
  }

  /**
   * Logout / end session
   */
  async logout(): Promise<void> {
    this.currentState = {
      status: AuthenticationStatus.UNAUTHENTICATED,
      method: AuthenticationMethod.NONE,
      failedAttempts: 0,
      isLocked: false,
    };

    await this.saveState();
    await AsyncStorage.removeItem(LAST_AUTH_KEY);
    console.log('User logged out');
  }

  /**
   * Handle successful authentication
   */
  private async handleSuccessfulAuth(method: AuthenticationMethod): Promise<void> {
    this.currentState = {
      status: AuthenticationStatus.AUTHENTICATED,
      method,
      lastAuthenticationTime: new Date(),
      failedAttempts: 0,
      isLocked: false,
    };

    await this.saveState();
    await AsyncStorage.setItem(LAST_AUTH_KEY, Date.now().toString());
    console.log('Authentication successful');
  }

  /**
   * Handle failed authentication
   */
  private async handleFailedAuth(): Promise<void> {
    this.currentState.failedAttempts += 1;

    if (this.currentState.failedAttempts >= AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS) {
      this.currentState.isLocked = true;
      this.currentState.lockoutEndTime = new Date(
        Date.now() + 300000 // 5 minutes
      );
      console.log('Account locked due to failed attempts');
    }

    await this.saveState();
  }

  /**
   * Get configured authentication method
   */
  async getConfiguredMethod(): Promise<AuthenticationMethod> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_METHOD_KEY);
      if (stored) {
        return stored as AuthenticationMethod;
      }

      // Auto-detect if not configured
      const [hasPIN, hasKeys] = await Promise.all([
        PINService.hasPIN(),
        BiometricService.keysExist(),
      ]);

      if (hasPIN && hasKeys) {
        return AuthenticationMethod.PIN_AND_BIOMETRIC;
      } else if (hasPIN) {
        return AuthenticationMethod.PIN;
      } else if (hasKeys) {
        return AuthenticationMethod.BIOMETRIC;
      }

      return AuthenticationMethod.NONE;
    } catch (error) {
      console.error('Error getting configured method:', error);
      return AuthenticationMethod.NONE;
    }
  }

  /**
   * Set configured authentication method
   */
  private async setConfiguredMethod(method: AuthenticationMethod): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_METHOD_KEY, method);
      console.log('Authentication method configured:', method);
    } catch (error) {
      console.error('Error setting configured method:', error);
    }
  }

  /**
   * Load authentication state from storage
   */
  private async loadState(): Promise<void> {
    try {
      const stateJson = await AsyncStorage.getItem(AUTH_STATE_KEY);
      if (stateJson) {
        const state = JSON.parse(stateJson);
        this.currentState = {
          ...state,
          lastAuthenticationTime: state.lastAuthenticationTime
            ? new Date(state.lastAuthenticationTime)
            : undefined,
          lockoutEndTime: state.lockoutEndTime
            ? new Date(state.lockoutEndTime)
            : undefined,
        };
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
    }
  }

  /**
   * Save authentication state to storage
   */
  private async saveState(): Promise<void> {
    try {
      const stateJson = JSON.stringify({
        ...this.currentState,
        lastAuthenticationTime: this.currentState.lastAuthenticationTime?.toISOString(),
        lockoutEndTime: this.currentState.lockoutEndTime?.toISOString(),
      });
      await AsyncStorage.setItem(AUTH_STATE_KEY, stateJson);
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    type: SecurityEventType,
    success: boolean,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        id: uuidv4(),
        type,
        timestamp: new Date(),
        deviceId: 'device_id', // Will be populated from DeviceIdentityService
        success,
        metadata,
      };

      // Get existing events
      const eventsJson = await AsyncStorage.getItem(SECURITY_EVENTS_KEY);
      const events: SecurityEvent[] = eventsJson ? JSON.parse(eventsJson) : [];

      // Add new event
      events.push(event);

      // Keep only last 100 events
      const trimmedEvents = events.slice(-100);

      // Save back to storage
      await AsyncStorage.setItem(
        SECURITY_EVENTS_KEY,
        JSON.stringify(trimmedEvents)
      );

      console.log('Security event logged:', type);
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Get security events (for audit/debugging)
   */
  async getSecurityEvents(limit = 20): Promise<SecurityEvent[]> {
    try {
      const eventsJson = await AsyncStorage.getItem(SECURITY_EVENTS_KEY);
      if (!eventsJson) {
        return [];
      }

      const events: SecurityEvent[] = JSON.parse(eventsJson);
      return events
        .slice(-limit)
        .map(e => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }

  /**
   * Clear all authentication data (for testing or reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        PINService.clearAllData(),
        BiometricService.deleteKeys(),
        AsyncStorage.multiRemove([
          AUTH_STATE_KEY,
          LAST_AUTH_KEY,
          AUTH_METHOD_KEY,
          SECURITY_EVENTS_KEY,
        ]),
      ]);

      this.currentState = {
        status: AuthenticationStatus.UNAUTHENTICATED,
        method: AuthenticationMethod.NONE,
        failedAttempts: 0,
        isLocked: false,
      };

      console.log('All authentication data cleared');
    } catch (error) {
      console.error('Error clearing authentication data:', error);
    }
  }
}

// Export singleton instance
export const AuthenticationService = new AuthenticationServiceClass();
