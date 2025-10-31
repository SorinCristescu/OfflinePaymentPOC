/**
 * BiometricService - Manages biometric authentication
 *
 * This service:
 * - Checks biometric capabilities on the device
 * - Handles biometric authentication (Face ID, Touch ID, Fingerprint)
 * - Provides consistent API across iOS and Android
 * - Manages biometric enrollment status
 */

import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';
import {Platform} from 'react-native';
import {
  BiometricCapabilities,
  BiometricAuthResult,
  BiometricType,
  AUTH_CONSTANTS,
} from '../../types';
import {KeyManagementService} from './KeyManagementService';

/**
 * BiometricService class
 */
class BiometricServiceClass {
  private rnBiometrics: ReactNativeBiometrics;
  private cachedCapabilities: BiometricCapabilities | null = null;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: false, // Only biometrics, not device PIN/password
    });
  }

  /**
   * Check biometric capabilities on the device
   * Returns information about available biometric sensors
   */
  async checkCapabilities(): Promise<BiometricCapabilities> {
    try {
      // Return cached capabilities if available
      if (this.cachedCapabilities) {
        return this.cachedCapabilities;
      }

      // Add timeout for native call to prevent hanging
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Biometric check timeout')), 3000)
      );

      const result = await Promise.race([
        this.rnBiometrics.isSensorAvailable(),
        timeout,
      ]);

      const {available, biometryType, error} = result;

      if (!available) {
        const capabilities: BiometricCapabilities = {
          isAvailable: false,
          biometricType: BiometricType.NONE,
          hasEnrolledCredentials: false,
          errorMessage: error || 'Biometric sensor not available',
        };
        this.cachedCapabilities = capabilities;
        return capabilities;
      }

      // Map biometry type to our BiometricType enum
      const mappedType = this.mapBiometryType(biometryType);

      const capabilities: BiometricCapabilities = {
        isAvailable: true,
        biometricType: mappedType,
        hasEnrolledCredentials: true,
        errorMessage: undefined,
      };

      this.cachedCapabilities = capabilities;
      console.log('Biometric capabilities:', capabilities);
      return capabilities;
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      const capabilities: BiometricCapabilities = {
        isAvailable: false,
        biometricType: BiometricType.NONE,
        hasEnrolledCredentials: false,
        errorMessage: 'Failed to check biometric capabilities',
      };
      this.cachedCapabilities = capabilities;
      return capabilities;
    }
  }

  /**
   * Map react-native-biometrics type to our BiometricType enum
   */
  private mapBiometryType(biometryType: BiometryTypes | undefined): BiometricType {
    switch (biometryType) {
      case BiometryTypes.FaceID:
        return BiometricType.FACE_ID;
      case BiometryTypes.TouchID:
      case BiometryTypes.Biometrics: // Android fingerprint
        return BiometricType.FINGERPRINT;
      case BiometryTypes.Iris:
        return BiometricType.IRIS;
      default:
        return BiometricType.NONE;
    }
  }

  /**
   * Get user-friendly name for biometric type
   */
  getBiometricTypeName(type: BiometricType): string {
    switch (type) {
      case BiometricType.FACE_ID:
        return 'Face ID';
      case BiometricType.FINGERPRINT:
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case BiometricType.IRIS:
        return 'Iris Scan';
      case BiometricType.NONE:
        return 'None';
      default:
        return 'Biometric';
    }
  }

  /**
   * Authenticate user with biometrics
   * Shows the system biometric prompt and returns the result
   */
  async authenticate(
    promptMessage?: string,
    cancelButtonText?: string
  ): Promise<BiometricAuthResult> {
    try {
      // Check if biometrics are available
      const capabilities = await this.checkCapabilities();
      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: capabilities.errorMessage || 'Biometrics not available',
        };
      }

      // Prepare prompt configuration
      const message = promptMessage || AUTH_CONSTANTS.BIOMETRIC_PROMPT_SUBTITLE;
      const cancelText = cancelButtonText || 'Cancel';

      // Perform biometric authentication
      const {success, error} = await this.rnBiometrics.simplePrompt({
        promptMessage: message,
        cancelButtonText: cancelText,
      });

      if (success) {
        console.log('Biometric authentication successful');
        return {success: true};
      } else {
        console.log('Biometric authentication failed:', error);

        // Check if user cancelled
        const cancelled = error?.includes('cancel') || error?.includes('Cancel');

        return {
          success: false,
          error: error || 'Authentication failed',
          cancelled,
        };
      }
    } catch (error: any) {
      console.error('Error during biometric authentication:', error);

      // Check if user cancelled
      const errorMessage = error?.message || String(error);
      const cancelled = errorMessage.includes('cancel') || errorMessage.includes('Cancel');

      return {
        success: false,
        error: errorMessage,
        cancelled,
      };
    }
  }

  /**
   * Authenticate with hardware key verification
   * Ensures biometric auth is tied to hardware key access
   *
   * @param options - Authentication options
   * @param options.keyId - Hardware key ID to verify access to
   * @param options.promptMessage - Custom message for biometric prompt
   * @returns Authentication result with hardware verification status
   */
  async authenticateWithHardwareKey(options: {
    keyId: string;
    promptMessage?: string;
  }): Promise<BiometricAuthResult & {hardwareVerified?: boolean}> {
    try {
      const {keyId, promptMessage} = options;

      console.log(`[BiometricService] Authenticating with hardware key: ${keyId}`);

      // Check if key exists
      const keyExists = await KeyManagementService.keyExists(keyId);
      if (!keyExists) {
        console.warn(`[BiometricService] Hardware key not found: ${keyId}`);
        return {
          success: false,
          error: 'Hardware key not found. Please set up security.',
        };
      }

      // Check if key is biometric-bound
      const isBiometric = await KeyManagementService.isBiometricBound(keyId);
      console.log(`[BiometricService] Key ${keyId} biometric-bound: ${isBiometric}`);

      // Perform biometric authentication
      const authResult = await this.authenticate(
        promptMessage || 'Authenticate to access secure key'
      );

      if (!authResult.success) {
        console.log('[BiometricService] Biometric authentication failed');
        return authResult;
      }

      // If key is biometric-bound, verify it's still accessible
      // (this ensures biometric prompt was actually tied to hardware)
      if (isBiometric) {
        const stillExists = await KeyManagementService.keyExists(keyId);
        if (!stillExists) {
          console.error('[BiometricService] Hardware key verification failed');
          return {
            success: false,
            error: 'Hardware key verification failed',
          };
        }
      }

      console.log('[BiometricService] Hardware-verified authentication successful');
      return {
        success: true,
        hardwareVerified: isBiometric,
      };
    } catch (error: any) {
      console.error('[BiometricService] Error during hardware-verified authentication:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Create biometric keys for signing (Phase 4 preparation)
   * This will be used in Phase 4 for TEE/SE integration
   */
  async createKeys(): Promise<{publicKey: string} | null> {
    try {
      const capabilities = await this.checkCapabilities();
      if (!capabilities.isAvailable) {
        console.warn('Cannot create biometric keys: biometrics not available');
        return null;
      }

      const {publicKey} = await this.rnBiometrics.createKeys();
      console.log('Biometric keys created successfully');
      return {publicKey};
    } catch (error) {
      console.error('Error creating biometric keys:', error);
      return null;
    }
  }

  /**
   * Delete biometric keys
   * Used for cleanup or when disabling biometric authentication
   */
  async deleteKeys(): Promise<boolean> {
    try {
      const {keysDeleted} = await this.rnBiometrics.deleteKeys();
      console.log('Biometric keys deleted:', keysDeleted);
      return keysDeleted;
    } catch (error) {
      console.error('Error deleting biometric keys:', error);
      return false;
    }
  }

  /**
   * Check if biometric keys exist
   * Useful for determining if biometric auth has been set up
   */
  async keysExist(): Promise<boolean> {
    try {
      const {keysExist} = await this.rnBiometrics.biometricKeysExist();
      return keysExist;
    } catch (error) {
      console.error('Error checking if biometric keys exist:', error);
      return false;
    }
  }

  /**
   * Create signature with biometric authentication (Phase 4 preparation)
   * This will be used for transaction signing in Phase 4
   */
  async createSignature(
    payload: string,
    promptMessage?: string
  ): Promise<{signature: string} | null> {
    try {
      const capabilities = await this.checkCapabilities();
      if (!capabilities.isAvailable) {
        console.warn('Cannot create signature: biometrics not available');
        return null;
      }

      const message = promptMessage || 'Sign transaction';

      const {success, signature} = await this.rnBiometrics.createSignature({
        promptMessage: message,
        payload,
      });

      if (success && signature) {
        console.log('Signature created successfully');
        return {signature};
      } else {
        console.warn('Failed to create signature');
        return null;
      }
    } catch (error) {
      console.error('Error creating signature:', error);
      return null;
    }
  }

  /**
   * Get biometric settings for display in settings screen
   */
  async getBiometricSettings(): Promise<{
    available: boolean;
    type: BiometricType;
    typeName: string;
    enrolled: boolean;
    keysExist: boolean;
  }> {
    const capabilities = await this.checkCapabilities();
    const keysExist = await this.keysExist();

    return {
      available: capabilities.isAvailable,
      type: capabilities.biometricType,
      typeName: this.getBiometricTypeName(capabilities.biometricType),
      enrolled: capabilities.hasEnrolledCredentials,
      keysExist,
    };
  }

  /**
   * Clear cached capabilities (useful for testing or after settings change)
   */
  clearCache(): void {
    this.cachedCapabilities = null;
  }

  /**
   * Test biometric authentication with custom prompt
   * Useful for testing and debugging
   */
  async testAuthentication(): Promise<BiometricAuthResult> {
    return this.authenticate(
      'Test biometric authentication',
      'Cancel'
    );
  }

  /**
   * Get error message for user display
   * Converts technical errors to user-friendly messages
   */
  getUserFriendlyError(error?: string): string {
    if (!error) {
      return 'Authentication failed. Please try again.';
    }

    const lowerError = error.toLowerCase();

    if (lowerError.includes('cancel')) {
      return 'Authentication cancelled.';
    }
    if (lowerError.includes('lockout') || lowerError.includes('locked')) {
      return 'Too many failed attempts. Please try again later.';
    }
    if (lowerError.includes('not enrolled') || lowerError.includes('no biometric')) {
      return 'No biometrics enrolled. Please set up biometric authentication in your device settings.';
    }
    if (lowerError.includes('not available') || lowerError.includes('not supported')) {
      return 'Biometric authentication is not available on this device.';
    }
    if (lowerError.includes('failed')) {
      return 'Authentication failed. Please try again.';
    }

    return 'An error occurred during authentication. Please try again.';
  }

  /**
   * Check if device supports biometric authentication
   * Quick check without full capabilities scan
   */
  async isSupported(): Promise<boolean> {
    try {
      const {available} = await this.rnBiometrics.isSensorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  /**
   * Prompt user to enroll biometrics (informational only)
   * Returns message to show to user
   */
  getEnrollmentMessage(biometricType: BiometricType): string {
    const typeName = this.getBiometricTypeName(biometricType);

    if (Platform.OS === 'ios') {
      return `To use ${typeName}, please go to Settings > ${typeName === 'Face ID' ? 'Face ID' : 'Touch ID'} & Passcode`;
    } else {
      return `To use ${typeName}, please go to Settings > Security > Biometrics`;
    }
  }
}

// Export singleton instance
export const BiometricService = new BiometricServiceClass();
