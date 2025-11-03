/**
 * DeviceIdentityService - Manages device identity and fingerprinting
 *
 * This service:
 * - Generates unique device identifiers
 * - Creates device fingerprints for security
 * - Persists device identity to secure storage
 * - Manages device registration and retrieval
 */

import DeviceInfo from 'react-native-device-info';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';
import {Platform} from 'react-native';
import {DeviceIdentity} from '../../types';

/**
 * Keychain service identifier for device identity
 */
const DEVICE_IDENTITY_SERVICE = 'com.offlinepayment.device_identity';
const DEVICE_IDENTITY_KEY = 'device_identity';

/**
 * DeviceIdentityService class
 */
class DeviceIdentityServiceClass {
  private cachedIdentity: DeviceIdentity | null = null;

  /**
   * Get or create device identity
   * Returns cached identity if available, otherwise loads or creates new one
   */
  async getDeviceIdentity(): Promise<DeviceIdentity> {
    try {
      // Return cached identity if available
      if (this.cachedIdentity) {
        return this.cachedIdentity;
      }

      // Try to load existing identity from secure storage
      const existingIdentity = await this.loadDeviceIdentity();
      if (existingIdentity) {
        this.cachedIdentity = existingIdentity;
        return existingIdentity;
      }

      // Create new identity if none exists
      const newIdentity = await this.createDeviceIdentity();
      await this.persistDeviceIdentity(newIdentity);
      this.cachedIdentity = newIdentity;
      return newIdentity;
    } catch (error) {
      console.error('Error getting device identity:', error);
      throw new Error('Failed to get device identity');
    }
  }

  /**
   * Create a new device identity
   * Generates unique device ID and fingerprint
   */
  private async createDeviceIdentity(): Promise<DeviceIdentity> {
    const deviceId = await this.generateDeviceId();
    const deviceFingerprint = await this.generateDeviceFingerprint();
    const now = new Date();

    return {
      deviceId,
      deviceFingerprint,
      createdAt: now,
      lastUsedAt: now,
    };
  }

  /**
   * Generate unique device ID
   * Uses native device identifiers when available
   */
  private async generateDeviceId(): Promise<string> {
    try {
      // Try to get unique device ID (works on Android, limited on iOS due to privacy)
      const uniqueId = await DeviceInfo.getUniqueId();
      return uniqueId;
    } catch (error) {
      console.warn('Could not get unique device ID, generating random ID:', error);
      // Fallback: generate random UUID-like ID
      return this.generateRandomId();
    }
  }

  /**
   * Generate device fingerprint
   * Creates a unique hash based on multiple device characteristics
   */
  private async generateDeviceFingerprint(): Promise<string> {
    try {
      // Gather device information
      const [
        brand,
        deviceId,
        model,
        systemName,
        systemVersion,
        buildNumber,
        bundleId,
      ] = await Promise.all([
        DeviceInfo.getBrand(),
        DeviceInfo.getDeviceId(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getBundleId(),
      ]);

      // Combine device characteristics
      const fingerprintData = [
        brand,
        deviceId,
        model,
        systemName,
        systemVersion,
        buildNumber,
        bundleId,
        Platform.OS,
      ].join('|');

      // Create hash of the combined data
      const fingerprint = CryptoJS.SHA256(fingerprintData).toString();
      return fingerprint;
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
      // Fallback: use simple hash of timestamp and random data
      const fallbackData = `${Date.now()}_${Math.random()}_${Platform.OS}`;
      return CryptoJS.SHA256(fallbackData).toString();
    }
  }

  /**
   * Generate random ID as fallback
   * Creates a UUID v4-like identifier
   */
  private generateRandomId(): string {
     
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // eslint-disable-next-line no-bitwise
      const r = Math.random() * 16 | 0;
      // eslint-disable-next-line no-bitwise
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Persist device identity to secure storage
   * Uses React Native Keychain for secure storage
   */
  private async persistDeviceIdentity(identity: DeviceIdentity): Promise<void> {
    try {
      const identityJson = JSON.stringify({
        deviceId: identity.deviceId,
        deviceFingerprint: identity.deviceFingerprint,
        createdAt: identity.createdAt.toISOString(),
        lastUsedAt: identity.lastUsedAt.toISOString(),
        publicKey: identity.publicKey,
      });

      await Keychain.setGenericPassword(
        DEVICE_IDENTITY_KEY,
        identityJson,
        {
          service: DEVICE_IDENTITY_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        }
      );

      console.log('Device identity persisted to secure storage');
    } catch (error) {
      console.error('Error persisting device identity:', error);
      throw new Error('Failed to save device identity');
    }
  }

  /**
   * Load device identity from secure storage
   * Returns null if no identity exists
   */
  private async loadDeviceIdentity(): Promise<DeviceIdentity | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: DEVICE_IDENTITY_SERVICE,
      });

      if (!credentials) {
        console.log('No device identity found in secure storage');
        return null;
      }

      const identityData = JSON.parse(credentials.password);

      return {
        deviceId: identityData.deviceId,
        deviceFingerprint: identityData.deviceFingerprint,
        createdAt: new Date(identityData.createdAt),
        lastUsedAt: new Date(identityData.lastUsedAt),
        publicKey: identityData.publicKey,
      };
    } catch (error) {
      console.error('Error loading device identity:', error);
      return null;
    }
  }

  /**
   * Update last used timestamp
   * Should be called on each app launch
   */
  async updateLastUsed(): Promise<void> {
    try {
      const identity = await this.getDeviceIdentity();
      identity.lastUsedAt = new Date();
      await this.persistDeviceIdentity(identity);
      this.cachedIdentity = identity;
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  }

  /**
   * Get device information for display/debugging
   */
  async getDeviceInfo(): Promise<{
    brand: string;
    model: string;
    systemName: string;
    systemVersion: string;
    appVersion: string;
    buildNumber: string;
  }> {
    const [brand, model, systemName, systemVersion, version, buildNumber] =
      await Promise.all([
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion(),
        DeviceInfo.getBuildNumber(),
      ]);

    return {
      brand,
      model,
      systemName,
      systemVersion,
      appVersion: version,
      buildNumber,
    };
  }

  /**
   * Reset device identity (for testing or security purposes)
   * WARNING: This will generate a new device ID
   */
  async resetDeviceIdentity(): Promise<DeviceIdentity> {
    try {
      // Clear cached identity
      this.cachedIdentity = null;

      // Remove from secure storage
      await Keychain.resetGenericPassword({
        service: DEVICE_IDENTITY_SERVICE,
      });

      // Create and persist new identity
      const newIdentity = await this.createDeviceIdentity();
      await this.persistDeviceIdentity(newIdentity);
      this.cachedIdentity = newIdentity;

      console.log('Device identity reset successfully');
      return newIdentity;
    } catch (error) {
      console.error('Error resetting device identity:', error);
      throw new Error('Failed to reset device identity');
    }
  }

  /**
   * Check if device identity exists
   */
  async hasDeviceIdentity(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: DEVICE_IDENTITY_SERVICE,
      });
      return credentials !== false;
    } catch (error) {
      console.error('Error checking device identity:', error);
      return false;
    }
  }

  /**
   * Verify device fingerprint matches current device
   * Useful for detecting if the device has been modified or identity was transferred
   */
  async verifyDeviceFingerprint(): Promise<boolean> {
    try {
      const identity = await this.getDeviceIdentity();
      const currentFingerprint = await this.generateDeviceFingerprint();

      return identity.deviceFingerprint === currentFingerprint;
    } catch (error) {
      console.error('Error verifying device fingerprint:', error);
      return false;
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cachedIdentity = null;
  }
}

// Export singleton instance
export const DeviceIdentityService = new DeviceIdentityServiceClass();
