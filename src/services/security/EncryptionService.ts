/**
 * EncryptionService
 *
 * High-level encryption/decryption using hardware-backed keys
 * Phase 4: Hardware Security Integration
 */

import {NativeModules} from 'react-native';
import {KeyIds} from './KeyManagementService';

const {SMVCSecurityModule} = NativeModules;

/**
 * EncryptionService
 *
 * Provides encryption/decryption using hardware-backed keys (Secure Enclave/TEE).
 * All encryption operations use ECIES (Elliptic Curve Integrated Encryption Scheme).
 */
class EncryptionServiceClass {
  private moduleAvailable: boolean;

  constructor() {
    this.moduleAvailable = !!SMVCSecurityModule;
  }

  /**
   * Encrypt data using a hardware-backed key
   *
   * @param keyId - Key identifier to use for encryption
   * @param plaintext - Data to encrypt
   * @returns Base64 encoded ciphertext
   */
  async encrypt(keyId: string, plaintext: string): Promise<string> {
    if (!this.moduleAvailable) {
      throw new Error('Encryption module not available');
    }

    try {
      console.log(`[EncryptionService] Encrypting data with key: ${keyId}`);

      const ciphertext = await SMVCSecurityModule.encrypt(keyId, plaintext);

      console.log(`[EncryptionService] Data encrypted successfully`);

      return ciphertext;
    } catch (error: any) {
      console.error(`[EncryptionService] Encryption error:`, error);
      throw new Error(`Failed to encrypt data: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using a hardware-backed private key
   *
   * Note: Decryption happens entirely in hardware. Private key never leaves SE/TEE.
   *
   * @param keyId - Key identifier to use for decryption
   * @param ciphertext - Base64 encoded ciphertext
   * @returns Decrypted plaintext
   */
  async decrypt(keyId: string, ciphertext: string): Promise<string> {
    if (!this.moduleAvailable) {
      throw new Error('Encryption module not available');
    }

    try {
      console.log(`[EncryptionService] Decrypting data with key: ${keyId}`);

      const plaintext = await SMVCSecurityModule.decrypt(keyId, ciphertext);

      console.log(`[EncryptionService] Data decrypted successfully`);

      return plaintext;
    } catch (error: any) {
      console.error(`[EncryptionService] Decryption error:`, error);
      throw new Error(`Failed to decrypt data: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Encrypt offline balance
   *
   * @param balance - Balance amount in cents
   * @returns Base64 encoded encrypted balance
   */
  async encryptBalance(balance: number): Promise<string> {
    const plaintext = JSON.stringify({
      balance,
      timestamp: Date.now(),
    });

    return await this.encrypt(KeyIds.DEVICE_MASTER, plaintext);
  }

  /**
   * Decrypt offline balance
   *
   * @param ciphertext - Base64 encoded encrypted balance
   * @returns Balance amount in cents
   */
  async decryptBalance(ciphertext: string): Promise<number> {
    const plaintext = await this.decrypt(KeyIds.DEVICE_MASTER, ciphertext);

    const data = JSON.parse(plaintext);

    return data.balance;
  }

  /**
   * Encrypt generic data with device master key
   *
   * @param data - Data to encrypt (will be stringified)
   * @returns Base64 encoded ciphertext
   */
  async encryptData(data: any): Promise<string> {
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    return await this.encrypt(KeyIds.DEVICE_MASTER, plaintext);
  }

  /**
   * Decrypt generic data with device master key
   *
   * @param ciphertext - Base64 encoded ciphertext
   * @param parseJson - Whether to parse result as JSON (default: true)
   * @returns Decrypted data
   */
  async decryptData<T = any>(ciphertext: string, parseJson: boolean = true): Promise<T> {
    const plaintext = await this.decrypt(KeyIds.DEVICE_MASTER, ciphertext);

    if (parseJson) {
      return JSON.parse(plaintext) as T;
    }

    return plaintext as T;
  }
}

// Export singleton instance
export const EncryptionService = new EncryptionServiceClass();
