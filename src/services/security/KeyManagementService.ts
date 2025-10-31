/**
 * KeyManagementService
 *
 * TypeScript wrapper for hardware-backed key management (Secure Enclave/TEE)
 * Phase 4: Hardware Security Integration
 */

import {NativeModules, Platform} from 'react-native';

const {SMVCSecurityModule} = NativeModules;

/**
 * Hardware types for key storage
 */
export enum HardwareType {
  SECURE_ENCLAVE = 'SecureEnclave', // iOS Secure Enclave
  STRONGBOX = 'StrongBox',           // Android StrongBox
  TEE = 'TEE',                       // Trusted Execution Environment
  NONE = 'None',                     // No hardware security available
}

/**
 * Hardware availability information
 */
export interface HardwareInfo {
  available: boolean;
  type: HardwareType;
}

/**
 * Key generation result
 */
export interface KeyPairResult {
  success: boolean;
  publicKey: string; // Base64 encoded
  keyId: string;
}

/**
 * Predefined key IDs for different purposes
 */
export const KeyIds = {
  DEVICE_MASTER: 'device_master_key',
  TRANSACTION_SIGNING: 'transaction_signing_key',
  BALANCE_ENCRYPTION: 'balance_encryption_key',
} as const;

/**
 * KeyManagementService
 *
 * Manages hardware-backed cryptographic keys in Secure Enclave (iOS) or
 * Android Keystore with TEE/StrongBox backing.
 */
class KeyManagementServiceClass {
  private moduleAvailable: boolean;

  constructor() {
    this.moduleAvailable = !!SMVCSecurityModule;

    if (!this.moduleAvailable) {
      console.warn(
        '[KeyManagementService] Native module SMVCSecurityModule not available. ' +
        'Hardware security features will be disabled.'
      );
    }
  }

  /**
   * Check if the native module is available
   */
  isModuleAvailable(): boolean {
    return this.moduleAvailable;
  }

  /**
   * Check if hardware security (Secure Enclave/TEE) is available on this device
   *
   * @returns Hardware availability information
   */
  async checkHardwareSupport(): Promise<HardwareInfo> {
    if (!this.moduleAvailable) {
      return {available: false, type: HardwareType.NONE};
    }

    try {
      const result = await SMVCSecurityModule.isHardwareAvailable();
      return {
        available: result.available,
        type: result.type as HardwareType,
      };
    } catch (error) {
      console.error('[KeyManagementService] Error checking hardware support:', error);
      return {available: false, type: HardwareType.NONE};
    }
  }

  /**
   * Generate a new EC key pair in hardware (Secure Enclave/TEE)
   *
   * @param keyId - Unique identifier for the key
   * @param requireBiometric - Whether key operations require biometric authentication
   * @returns Key generation result with public key
   */
  async generateKeyPair(
    keyId: string,
    requireBiometric: boolean = true
  ): Promise<KeyPairResult> {
    if (!this.moduleAvailable) {
      throw new Error('Native module not available');
    }

    try {
      console.log(`[KeyManagementService] Generating key pair: ${keyId}, biometric: ${requireBiometric}`);

      const result = await SMVCSecurityModule.generateKeyPair(keyId, requireBiometric);

      console.log(`[KeyManagementService] Key pair generated successfully: ${keyId}`);

      return result as KeyPairResult;
    } catch (error: any) {
      console.error(`[KeyManagementService] Error generating key pair ${keyId}:`, error);
      throw new Error(`Failed to generate key pair: ${error.message || error}`);
    }
  }

  /**
   * Check if a key exists in hardware storage
   *
   * @param keyId - Key identifier to check
   * @returns True if key exists
   */
  async keyExists(keyId: string): Promise<boolean> {
    if (!this.moduleAvailable) {
      return false;
    }

    try {
      const exists = await SMVCSecurityModule.keyExists(keyId);
      return exists;
    } catch (error) {
      console.error(`[KeyManagementService] Error checking key existence ${keyId}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from hardware storage
   *
   * @param keyId - Key identifier to delete
   */
  async deleteKey(keyId: string): Promise<{success: boolean}> {
    if (!this.moduleAvailable) {
      throw new Error('Native module not available');
    }

    try {
      console.log(`[KeyManagementService] Deleting key: ${keyId}`);

      const result = await SMVCSecurityModule.deleteKey(keyId);

      console.log(`[KeyManagementService] Key deleted successfully: ${keyId}`);

      return result;
    } catch (error: any) {
      console.error(`[KeyManagementService] Error deleting key ${keyId}:`, error);
      throw new Error(`Failed to delete key: ${error.message || error}`);
    }
  }

  /**
   * Get the public key for a given key ID
   *
   * Note: Private keys NEVER leave the hardware. Only public keys can be exported.
   *
   * @param keyId - Key identifier
   * @returns Base64 encoded public key
   */
  async getPublicKey(keyId: string): Promise<string> {
    if (!this.moduleAvailable) {
      throw new Error('Native module not available');
    }

    try {
      const publicKey = await SMVCSecurityModule.getPublicKey(keyId);
      return publicKey;
    } catch (error: any) {
      console.error(`[KeyManagementService] Error getting public key ${keyId}:`, error);
      throw new Error(`Failed to get public key: ${error.message || error}`);
    }
  }

  /**
   * Check if a key is bound to biometric authentication
   *
   * @param keyId - Key identifier
   * @returns True if key requires biometric authentication
   */
  async isBiometricBound(keyId: string): Promise<boolean> {
    if (!this.moduleAvailable) {
      return false;
    }

    try {
      const isBound = await SMVCSecurityModule.isBiometricBound(keyId);
      return isBound;
    } catch (error) {
      console.error(`[KeyManagementService] Error checking biometric binding ${keyId}:`, error);
      return false;
    }
  }

  /**
   * Initialize device master key (generate if doesn't exist)
   *
   * This key is used for device-level operations and data encryption.
   *
   * @returns Public key of the device master key
   */
  async initializeDeviceMasterKey(): Promise<string> {
    const keyId = KeyIds.DEVICE_MASTER;

    try {
      // Check if key already exists
      const exists = await this.keyExists(keyId);

      if (exists) {
        console.log('[KeyManagementService] Device master key already exists');
        return await this.getPublicKey(keyId);
      }

      // Generate new key with biometric requirement
      console.log('[KeyManagementService] Generating device master key...');
      const result = await this.generateKeyPair(keyId, true);

      return result.publicKey;
    } catch (error: any) {
      console.error('[KeyManagementService] Error initializing device master key:', error);
      throw new Error(`Failed to initialize device master key: ${error.message || error}`);
    }
  }

  /**
   * Initialize transaction signing key (generate if doesn't exist)
   *
   * This key is used for signing P2P payment transactions (Phase 6).
   *
   * @returns Public key of the transaction signing key
   */
  async initializeTransactionKey(): Promise<string> {
    const keyId = KeyIds.TRANSACTION_SIGNING;

    try {
      // Check if key already exists
      const exists = await this.keyExists(keyId);

      if (exists) {
        console.log('[KeyManagementService] Transaction signing key already exists');
        return await this.getPublicKey(keyId);
      }

      // Generate new key with biometric requirement
      console.log('[KeyManagementService] Generating transaction signing key...');
      const result = await this.generateKeyPair(keyId, true);

      return result.publicKey;
    } catch (error: any) {
      console.error('[KeyManagementService] Error initializing transaction key:', error);
      throw new Error(`Failed to initialize transaction key: ${error.message || error}`);
    }
  }

  /**
   * Initialize all required keys for the application
   *
   * Called during app setup or migration to Phase 4.
   *
   * @returns Object with all public keys
   */
  async initializeAllKeys(): Promise<{
    deviceMasterKey: string;
    transactionKey: string;
  }> {
    try {
      console.log('[KeyManagementService] Initializing all hardware keys...');

      // Check hardware availability first
      const hardwareInfo = await this.checkHardwareSupport();

      if (!hardwareInfo.available) {
        throw new Error('Hardware security not available on this device');
      }

      console.log(`[KeyManagementService] Hardware available: ${hardwareInfo.type}`);

      // Initialize keys
      const [deviceMasterKey, transactionKey] = await Promise.all([
        this.initializeDeviceMasterKey(),
        this.initializeTransactionKey(),
      ]);

      console.log('[KeyManagementService] All hardware keys initialized successfully');

      return {
        deviceMasterKey,
        transactionKey,
      };
    } catch (error: any) {
      console.error('[KeyManagementService] Error initializing keys:', error);
      throw new Error(`Failed to initialize keys: ${error.message || error}`);
    }
  }

  /**
   * Reset all keys (delete and regenerate)
   *
   * WARNING: This will delete all keys and make encrypted data unrecoverable!
   *
   * @returns Object with new public keys
   */
  async resetAllKeys(): Promise<{
    deviceMasterKey: string;
    transactionKey: string;
  }> {
    try {
      console.log('[KeyManagementService] Resetting all hardware keys...');

      // Delete all keys
      await Promise.all([
        this.deleteKey(KeyIds.DEVICE_MASTER).catch(() => {}),
        this.deleteKey(KeyIds.TRANSACTION_SIGNING).catch(() => {}),
        this.deleteKey(KeyIds.BALANCE_ENCRYPTION).catch(() => {}),
      ]);

      // Regenerate keys
      return await this.initializeAllKeys();
    } catch (error: any) {
      console.error('[KeyManagementService] Error resetting keys:', error);
      throw new Error(`Failed to reset keys: ${error.message || error}`);
    }
  }
}

// Export singleton instance
export const KeyManagementService = new KeyManagementServiceClass();
