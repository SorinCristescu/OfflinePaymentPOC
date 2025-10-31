/**
 * PINService - Manages PIN-based authentication
 *
 * This service:
 * - Handles PIN setup with confirmation
 * - Verifies PIN with secure hash comparison
 * - Tracks failed authentication attempts
 * - Implements lockout mechanism after max attempts
 * - Stores PIN hash securely in keychain
 * - Manages PIN changes
 */

import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PINValidationResult,
  PINSetupData,
  PINChangeData,
  PIN_REQUIREMENTS,
} from '../../types';

/**
 * Keychain and storage keys
 */
const PIN_SERVICE = 'com.offlinepayment.pin';
const PIN_USERNAME = 'user_pin';
const FAILED_ATTEMPTS_KEY = '@offlinepayment:pin_failed_attempts';
const LOCKOUT_END_KEY = '@offlinepayment:pin_lockout_end';

/**
 * PIN attempt tracking
 */
interface PINAttemptData {
  failedAttempts: number;
  lockoutEndTime?: number;
}

/**
 * PINService class
 */
class PINServiceClass {
  private attemptData: PINAttemptData = {
    failedAttempts: 0,
    lockoutEndTime: undefined,
  };

  constructor() {
    // Load attempt data on initialization
    this.loadAttemptData();
  }

  /**
   * Setup a new PIN
   * Validates PIN requirements and stores hashed PIN
   */
  async setupPIN(setupData: PINSetupData): Promise<PINValidationResult> {
    try {
      const {pin, confirmPin} = setupData;

      // Validate PIN format
      const validation = this.validatePINFormat(pin);
      if (!validation.isValid) {
        return validation;
      }

      // Check if PINs match
      if (pin !== confirmPin) {
        return {
          isValid: false,
          error: 'PINs do not match',
        };
      }

      // Hash and store PIN
      const hashedPIN = this.hashPIN(pin);
      await this.storePIN(hashedPIN);

      // Reset failed attempts
      await this.resetAttempts();

      console.log('PIN setup successful');
      return {isValid: true};
    } catch (error) {
      console.error('Error setting up PIN:', error);
      return {
        isValid: false,
        error: 'Failed to setup PIN',
      };
    }
  }

  /**
   * Verify PIN
   * Checks if provided PIN matches stored hash
   */
  async verifyPIN(pin: string): Promise<PINValidationResult> {
    try {
      // Check if account is locked out
      if (await this.isLockedOut()) {
        const remainingTime = await this.getRemainingLockoutTime();
        return {
          isValid: false,
          error: `Too many failed attempts. Try again in ${remainingTime} seconds.`,
          attemptsRemaining: 0,
        };
      }

      // Check if PIN is set up
      const hasPIN = await this.hasPIN();
      if (!hasPIN) {
        return {
          isValid: false,
          error: 'PIN not set up',
        };
      }

      // Get stored PIN hash
      const storedHash = await this.retrievePIN();
      if (!storedHash) {
        return {
          isValid: false,
          error: 'Failed to retrieve PIN',
        };
      }

      // Hash provided PIN and compare
      const providedHash = this.hashPIN(pin);
      const isValid = providedHash === storedHash;

      if (isValid) {
        // Reset failed attempts on successful verification
        await this.resetAttempts();
        console.log('PIN verification successful');
        return {isValid: true};
      } else {
        // Increment failed attempts
        await this.incrementFailedAttempts();
        const remainingAttempts = PIN_REQUIREMENTS.MAX_ATTEMPTS - this.attemptData.failedAttempts;

        console.log(`PIN verification failed. Attempts remaining: ${remainingAttempts}`);

        if (remainingAttempts <= 0) {
          await this.lockout();
          return {
            isValid: false,
            error: `Too many failed attempts. Account locked for ${PIN_REQUIREMENTS.LOCKOUT_DURATION} seconds.`,
            attemptsRemaining: 0,
          };
        }

        return {
          isValid: false,
          error: 'Incorrect PIN',
          attemptsRemaining: remainingAttempts,
        };
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return {
        isValid: false,
        error: 'Failed to verify PIN',
      };
    }
  }

  /**
   * Change PIN
   * Verifies current PIN before setting new one
   */
  async changePIN(changeData: PINChangeData): Promise<PINValidationResult> {
    try {
      const {currentPin, newPin, confirmNewPin} = changeData;

      // Verify current PIN
      const currentVerification = await this.verifyPIN(currentPin);
      if (!currentVerification.isValid) {
        return {
          isValid: false,
          error: 'Current PIN is incorrect',
        };
      }

      // Validate new PIN format
      const validation = this.validatePINFormat(newPin);
      if (!validation.isValid) {
        return validation;
      }

      // Check if new PINs match
      if (newPin !== confirmNewPin) {
        return {
          isValid: false,
          error: 'New PINs do not match',
        };
      }

      // Check if new PIN is different from current
      if (currentPin === newPin) {
        return {
          isValid: false,
          error: 'New PIN must be different from current PIN',
        };
      }

      // Hash and store new PIN
      const hashedPIN = this.hashPIN(newPin);
      await this.storePIN(hashedPIN);

      console.log('PIN changed successfully');
      return {isValid: true};
    } catch (error) {
      console.error('Error changing PIN:', error);
      return {
        isValid: false,
        error: 'Failed to change PIN',
      };
    }
  }

  /**
   * Validate PIN format
   * Checks length and character requirements
   */
  private validatePINFormat(pin: string): PINValidationResult {
    if (!pin) {
      return {
        isValid: false,
        error: 'PIN is required',
      };
    }

    if (pin.length < PIN_REQUIREMENTS.MIN_LENGTH) {
      return {
        isValid: false,
        error: `PIN must be at least ${PIN_REQUIREMENTS.MIN_LENGTH} digits`,
      };
    }

    if (pin.length > PIN_REQUIREMENTS.MAX_LENGTH) {
      return {
        isValid: false,
        error: `PIN must be at most ${PIN_REQUIREMENTS.MAX_LENGTH} digits`,
      };
    }

    // Check if PIN contains only digits
    if (!/^\d+$/.test(pin)) {
      return {
        isValid: false,
        error: 'PIN must contain only numbers',
      };
    }

    // Check for weak PINs (e.g., 1234, 0000)
    if (this.isWeakPIN(pin)) {
      return {
        isValid: false,
        error: 'PIN is too weak. Please choose a more secure PIN',
      };
    }

    return {isValid: true};
  }

  /**
   * Check for weak/common PINs
   */
  private isWeakPIN(pin: string): boolean {
    const weakPINs = [
      '0000', '1111', '2222', '3333', '4444',
      '5555', '6666', '7777', '8888', '9999',
      '1234', '4321', '1212', '0123', '9876',
    ];

    return weakPINs.includes(pin);
  }

  /**
   * Hash PIN using SHA-256
   * Adds salt for additional security
   */
  private hashPIN(pin: string): string {
    const salt = 'offlinepayment_pin_salt'; // In production, use a per-user salt
    const combined = `${salt}${pin}`;
    return CryptoJS.SHA256(combined).toString();
  }

  /**
   * Store PIN hash in secure keychain
   */
  private async storePIN(hashedPIN: string): Promise<void> {
    try {
      await Keychain.setGenericPassword(PIN_USERNAME, hashedPIN, {
        service: PIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      });
      console.log('PIN stored securely');
    } catch (error) {
      console.error('Error storing PIN:', error);
      throw new Error('Failed to store PIN');
    }
  }

  /**
   * Retrieve PIN hash from keychain
   */
  private async retrievePIN(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: PIN_SERVICE,
      });

      if (!credentials) {
        console.log('No PIN found in keychain');
        return null;
      }

      return credentials.password;
    } catch (error) {
      console.error('Error retrieving PIN:', error);
      return null;
    }
  }

  /**
   * Check if PIN is set up
   */
  async hasPIN(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: PIN_SERVICE,
      });
      return credentials !== false;
    } catch (error) {
      console.error('Error checking PIN existence:', error);
      return false;
    }
  }

  /**
   * Delete PIN (for reset or disable)
   */
  async deletePIN(): Promise<boolean> {
    try {
      const result = await Keychain.resetGenericPassword({
        service: PIN_SERVICE,
      });
      await this.resetAttempts();
      console.log('PIN deleted successfully');
      return result;
    } catch (error) {
      console.error('Error deleting PIN:', error);
      return false;
    }
  }

  /**
   * Load failed attempt data from storage
   */
  private async loadAttemptData(): Promise<void> {
    try {
      const [attemptsStr, lockoutStr] = await Promise.all([
        AsyncStorage.getItem(FAILED_ATTEMPTS_KEY),
        AsyncStorage.getItem(LOCKOUT_END_KEY),
      ]);

      this.attemptData = {
        failedAttempts: attemptsStr ? parseInt(attemptsStr, 10) : 0,
        lockoutEndTime: lockoutStr ? parseInt(lockoutStr, 10) : undefined,
      };
    } catch (error) {
      console.error('Error loading attempt data:', error);
    }
  }

  /**
   * Increment failed attempts counter
   */
  private async incrementFailedAttempts(): Promise<void> {
    try {
      this.attemptData.failedAttempts += 1;
      await AsyncStorage.setItem(
        FAILED_ATTEMPTS_KEY,
        this.attemptData.failedAttempts.toString()
      );
    } catch (error) {
      console.error('Error incrementing failed attempts:', error);
    }
  }

  /**
   * Reset failed attempts counter
   */
  private async resetAttempts(): Promise<void> {
    try {
      this.attemptData = {
        failedAttempts: 0,
        lockoutEndTime: undefined,
      };
      await Promise.all([
        AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY),
        AsyncStorage.removeItem(LOCKOUT_END_KEY),
      ]);
      console.log('Failed attempts reset');
    } catch (error) {
      console.error('Error resetting attempts:', error);
    }
  }

  /**
   * Lockout account after max failed attempts
   */
  private async lockout(): Promise<void> {
    try {
      const lockoutEnd = Date.now() + (PIN_REQUIREMENTS.LOCKOUT_DURATION * 1000);
      this.attemptData.lockoutEndTime = lockoutEnd;
      await AsyncStorage.setItem(LOCKOUT_END_KEY, lockoutEnd.toString());
      console.log(`Account locked until ${new Date(lockoutEnd).toISOString()}`);
    } catch (error) {
      console.error('Error setting lockout:', error);
    }
  }

  /**
   * Check if account is currently locked out
   */
  private async isLockedOut(): Promise<boolean> {
    if (!this.attemptData.lockoutEndTime) {
      return false;
    }

    const now = Date.now();
    if (now >= this.attemptData.lockoutEndTime) {
      // Lockout period has expired, reset
      await this.resetAttempts();
      return false;
    }

    return true;
  }

  /**
   * Get remaining lockout time in seconds
   */
  private async getRemainingLockoutTime(): Promise<number> {
    if (!this.attemptData.lockoutEndTime) {
      return 0;
    }

    const now = Date.now();
    const remaining = Math.ceil((this.attemptData.lockoutEndTime - now) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Get current attempt status for display
   */
  async getAttemptStatus(): Promise<{
    failedAttempts: number;
    remainingAttempts: number;
    isLockedOut: boolean;
    lockoutRemainingSeconds: number;
  }> {
    await this.loadAttemptData();
    const isLockedOut = await this.isLockedOut();
    const lockoutRemainingSeconds = await this.getRemainingLockoutTime();

    return {
      failedAttempts: this.attemptData.failedAttempts,
      remainingAttempts: Math.max(
        0,
        PIN_REQUIREMENTS.MAX_ATTEMPTS - this.attemptData.failedAttempts
      ),
      isLockedOut,
      lockoutRemainingSeconds,
    };
  }

  /**
   * Clear all PIN data (for testing or account reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        this.deletePIN(),
        this.resetAttempts(),
      ]);
      console.log('All PIN data cleared');
    } catch (error) {
      console.error('Error clearing PIN data:', error);
    }
  }
}

// Export singleton instance
export const PINService = new PINServiceClass();
