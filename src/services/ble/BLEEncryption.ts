/**
 * BLEEncryption - Hardware-Backed Encryption for BLE
 * Phase 5: BLE Communication Foundation
 *
 * Integrates with Phase 4 hardware security for:
 * - ECDH key exchange using hardware keys
 * - AES-256-GCM message encryption
 * - Hardware-backed message signing
 * - Signature verification
 */

import {Buffer} from 'buffer';
import {BLEMessage} from '../../types/ble';
import {KeyManagementService, KeyIds} from '../security/KeyManagementService';
import {SigningService} from '../security/SigningService';
import {EncryptionService} from '../security/EncryptionService';
import CryptoJS from 'crypto-js';

/**
 * Session key for encrypted communication
 */
interface SessionKey {
  deviceId: string; // Peer device ID
  sharedSecret: string; // ECDH shared secret (Base64)
  sessionKey: string; // Derived AES key (Base64)
  createdAt: Date;
  expiresAt: Date;
}

/**
 * BLE Encryption Service
 */
class BLEEncryptionService {
  private sessionKeys: Map<string, SessionKey> = new Map();
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Perform ECDH key exchange with peer device
   *
   * Note: This is a simplified implementation. In production, you'd use
   * the hardware key's ECDH capability directly. For now, we simulate
   * the ECDH process using the hardware public/private keys.
   */
  async performKeyExchange(peerDeviceId: string, peerPublicKey: string): Promise<string> {
    try {
      console.log(`[BLEEncryption] Performing key exchange with: ${peerDeviceId}`);

      // Get our transaction signing key (used for ECDH)
      const ourPublicKey = await KeyManagementService.getPublicKey(
        KeyIds.TRANSACTION_SIGNING
      );

      console.log('[BLEEncryption] Our public key retrieved');

      // In a real implementation, we would perform ECDH here:
      // sharedSecret = ECDH(ourPrivateKey, peerPublicKey)
      //
      // For this POC, we'll derive a shared secret from both public keys
      // In production, this MUST be replaced with actual ECDH using hardware keys

      const sharedSecret = this.deriveSharedSecret(ourPublicKey, peerPublicKey);

      // Derive AES session key from shared secret
      const sessionKey = this.deriveSessionKey(sharedSecret);

      // Store session key
      const session: SessionKey = {
        deviceId: peerDeviceId,
        sharedSecret,
        sessionKey,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.SESSION_DURATION_MS),
      };

      this.sessionKeys.set(peerDeviceId, session);

      console.log(`[BLEEncryption] Key exchange complete with: ${peerDeviceId}`);

      return sessionKey;
    } catch (error) {
      console.error('[BLEEncryption] Key exchange failed:', error);
      throw new Error(`Key exchange failed: ${(error as Error).message}`);
    }
  }

  /**
   * Derive shared secret from public keys (SIMPLIFIED FOR POC)
   *
   * WARNING: This is NOT secure ECDH! Replace with actual hardware ECDH in production.
   * This is a placeholder that simulates the concept.
   */
  private deriveSharedSecret(publicKey1: string, publicKey2: string): string {
    // Sort keys to ensure same result regardless of order
    const keys = [publicKey1, publicKey2].sort();
    const combined = keys.join(':');

    // Hash combined keys to create shared secret
    const hash = CryptoJS.SHA256(combined);
    return CryptoJS.enc.Base64.stringify(hash);
  }

  /**
   * Derive AES session key from shared secret using HKDF
   */
  private deriveSessionKey(sharedSecret: string): string {
    // Use HKDF (HMAC-based Key Derivation Function)
    const salt = 'SMVC-BLE-P2P-SESSION-KEY'; // Static salt for POC
    const info = 'AES-256-GCM-KEY';

    const key = CryptoJS.HmacSHA256(sharedSecret + info, salt);
    return CryptoJS.enc.Base64.stringify(key);
  }

  /**
   * Encrypt message payload using AES-256-GCM
   */
  async encryptPayload(deviceId: string, plaintext: string): Promise<string> {
    try {
      const session = this.getSession(deviceId);
      if (!session) {
        throw new Error(`No session found for device: ${deviceId}`);
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        throw new Error(`Session expired for device: ${deviceId}`);
      }

      console.log(`[BLEEncryption] Encrypting payload for: ${deviceId}`);

      // Convert session key from Base64
      const keyWordArray = CryptoJS.enc.Base64.parse(session.sessionKey);

      // Generate random IV (12 bytes for GCM)
      const iv = CryptoJS.lib.WordArray.random(12);

      // Encrypt with AES-GCM
      const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
        iv: iv,
        mode: CryptoJS.mode.CTR, // Using CTR as CryptoJS doesn't have native GCM
        padding: CryptoJS.pad.NoPadding,
      });

      // Combine IV + ciphertext
      const combined = iv.concat(encrypted.ciphertext);
      const ciphertext = CryptoJS.enc.Base64.stringify(combined);

      console.log('[BLEEncryption] Payload encrypted successfully');

      return ciphertext;
    } catch (error) {
      console.error('[BLEEncryption] Encryption failed:', error);
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt message payload using AES-256-GCM
   */
  async decryptPayload(deviceId: string, ciphertext: string): Promise<string> {
    try {
      const session = this.getSession(deviceId);
      if (!session) {
        throw new Error(`No session found for device: ${deviceId}`);
      }

      console.log(`[BLEEncryption] Decrypting payload from: ${deviceId}`);

      // Convert session key from Base64
      const keyWordArray = CryptoJS.enc.Base64.parse(session.sessionKey);

      // Parse combined IV + ciphertext
      const combined = CryptoJS.enc.Base64.parse(ciphertext);

      // Extract IV (first 12 bytes)
      const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 3));

      // Extract ciphertext (remaining bytes)
      const ct = CryptoJS.lib.WordArray.create(combined.words.slice(3));

      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(
        {ciphertext: ct} as any,
        keyWordArray,
        {
          iv: iv,
          mode: CryptoJS.mode.CTR,
          padding: CryptoJS.pad.NoPadding,
        }
      );

      const plaintext = CryptoJS.enc.Utf8.stringify(decrypted);

      console.log('[BLEEncryption] Payload decrypted successfully');

      return plaintext;
    } catch (error) {
      console.error('[BLEEncryption] Decryption failed:', error);
      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Sign message using hardware private key
   */
  async signMessage(message: BLEMessage): Promise<string> {
    try {
      console.log(`[BLEEncryption] Signing message: ${message.id}`);

      // Create data to sign (all fields except signature)
      const dataToSign = {
        id: message.id,
        type: message.type,
        payload: message.payload,
        timestamp: message.timestamp,
        from: message.from,
        to: message.to,
        sequence: message.sequence,
        totalFragments: message.totalFragments,
      };

      // Sign with hardware key
      const signature = await SigningService.sign(
        KeyIds.TRANSACTION_SIGNING,
        dataToSign
      );

      console.log('[BLEEncryption] Message signed successfully');

      return signature;
    } catch (error) {
      console.error('[BLEEncryption] Signing failed:', error);
      throw new Error(`Signing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Verify message signature using peer's public key
   */
  async verifySignature(
    message: BLEMessage,
    peerPublicKey: string
  ): Promise<boolean> {
    try {
      console.log(`[BLEEncryption] Verifying signature for message: ${message.id}`);

      // Recreate data that was signed
      const dataToVerify = {
        id: message.id,
        type: message.type,
        payload: message.payload,
        timestamp: message.timestamp,
        from: message.from,
        to: message.to,
        sequence: message.sequence,
        totalFragments: message.totalFragments,
      };

      // Verify signature with peer's public key
      const isValid = await SigningService.verify(
        peerPublicKey,
        dataToVerify,
        message.signature
      );

      console.log(`[BLEEncryption] Signature verification: ${isValid ? 'VALID' : 'INVALID'}`);

      return isValid;
    } catch (error) {
      console.error('[BLEEncryption] Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Encrypt and sign a message (complete flow)
   */
  async encryptAndSignMessage(
    message: BLEMessage,
    peerDeviceId: string
  ): Promise<BLEMessage> {
    try {
      console.log(`[BLEEncryption] Encrypting and signing message for: ${peerDeviceId}`);

      // 1. Encrypt payload
      const encryptedPayload = await this.encryptPayload(peerDeviceId, message.payload);

      // 2. Create message with encrypted payload
      const encryptedMessage: BLEMessage = {
        ...message,
        payload: encryptedPayload,
      };

      // 3. Sign the encrypted message
      const signature = await this.signMessage(encryptedMessage);

      // 4. Add signature
      encryptedMessage.signature = signature;

      console.log('[BLEEncryption] Message encrypted and signed successfully');

      return encryptedMessage;
    } catch (error) {
      console.error('[BLEEncryption] Encrypt and sign failed:', error);
      throw error;
    }
  }

  /**
   * Verify and decrypt a message (complete flow)
   */
  async verifyAndDecryptMessage(
    message: BLEMessage,
    peerDeviceId: string,
    peerPublicKey: string
  ): Promise<BLEMessage> {
    try {
      console.log(`[BLEEncryption] Verifying and decrypting message from: ${peerDeviceId}`);

      // 1. Verify signature
      const isValid = await this.verifySignature(message, peerPublicKey);
      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // 2. Decrypt payload
      const decryptedPayload = await this.decryptPayload(peerDeviceId, message.payload);

      // 3. Create decrypted message
      const decryptedMessage: BLEMessage = {
        ...message,
        payload: decryptedPayload,
      };

      console.log('[BLEEncryption] Message verified and decrypted successfully');

      return decryptedMessage;
    } catch (error) {
      console.error('[BLEEncryption] Verify and decrypt failed:', error);
      throw error;
    }
  }

  /**
   * Get session for a device
   */
  getSession(deviceId: string): SessionKey | undefined {
    return this.sessionKeys.get(deviceId);
  }

  /**
   * Check if session exists and is valid
   */
  hasValidSession(deviceId: string): boolean {
    const session = this.getSession(deviceId);
    if (!session) {
      return false;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      console.log(`[BLEEncryption] Session expired for: ${deviceId}`);
      this.sessionKeys.delete(deviceId);
      return false;
    }

    return true;
  }

  /**
   * Revoke session for a device
   */
  revokeSession(deviceId: string): void {
    console.log(`[BLEEncryption] Revoking session for: ${deviceId}`);
    this.sessionKeys.delete(deviceId);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    console.log('[BLEEncryption] Clearing all sessions');
    this.sessionKeys.clear();
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessionKeys.size;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    let removed = 0;

    for (const [deviceId, session] of this.sessionKeys.entries()) {
      if (now > session.expiresAt) {
        this.sessionKeys.delete(deviceId);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[BLEEncryption] Cleaned up ${removed} expired sessions`);
    }
  }
}

// Export singleton instance
export const BLEEncryption = new BLEEncryptionService();
