// src/services/wallet/BalanceService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WalletState } from '../../types/wallet';
import { STORAGE_KEYS, MOCK_BANK } from '../../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import { EncryptionService } from '../security/EncryptionService';
import { KeyManagementService, KeyIds } from '../security/KeyManagementService';

/**
 * Service for managing wallet balances and persistence
 */
class BalanceService {
  /**
   * Initialize wallet state (with encrypted storage)
   */
  async initializeWallet(): Promise<WalletState> {
    try {
      console.log('[BalanceService] Initializing wallet...');

      // Try to load encrypted wallet first
      const encryptedWallet = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);

      if (encryptedWallet) {
        console.log('[BalanceService] Found encrypted wallet, decrypting...');
        try {
          // Decrypt wallet data
          const decrypted = await EncryptionService.decrypt(
            KeyIds.DEVICE_MASTER,
            encryptedWallet
          );

          const walletData = JSON.parse(decrypted);
          console.log('[BalanceService] Wallet decrypted successfully');

          return {
            onlineBalance: walletData.onlineBalance,
            offlineBalance: walletData.offlineBalance,
            deviceId: walletData.deviceId,
            lastSyncTimestamp: walletData.lastSyncTimestamp
              ? new Date(walletData.lastSyncTimestamp)
              : undefined,
          };
        } catch (decryptError) {
          console.error('[BalanceService] Failed to decrypt wallet:', decryptError);
          // Fall through to create new wallet
        }
      }

      // Try legacy plaintext wallet (migration from Phase 3)
      const legacyWallet = await AsyncStorage.getItem(STORAGE_KEYS.WALLET);
      if (legacyWallet) {
        console.log('[BalanceService] Found legacy plaintext wallet, migrating...');
        const wallet = JSON.parse(legacyWallet);
        const migratedWallet: WalletState = {
          ...wallet,
          lastSyncTimestamp: wallet.lastSyncTimestamp
            ? new Date(wallet.lastSyncTimestamp)
            : undefined,
        };

        // Save as encrypted and delete plaintext
        await this.saveWallet(migratedWallet);
        await AsyncStorage.removeItem(STORAGE_KEYS.WALLET);
        console.log('[BalanceService] Legacy wallet migrated to encrypted storage');

        return migratedWallet;
      }

      // Create new wallet
      console.log('[BalanceService] No wallet found, creating new wallet...');
      const deviceId = await this.getOrCreateDeviceId();
      const newWallet: WalletState = {
        onlineBalance: MOCK_BANK.INITIAL_ONLINE_BALANCE,
        offlineBalance: 0,
        deviceId,
      };

      await this.saveWallet(newWallet);
      console.log('[BalanceService] New wallet created and encrypted');
      return newWallet;
    } catch (error) {
      console.error('[BalanceService] Error initializing wallet:', error);
      throw new Error('Failed to initialize wallet');
    }
  }

  /**
   * Save wallet state to storage (encrypted with hardware key)
   */
  async saveWallet(wallet: WalletState): Promise<void> {
    try {
      console.log('[BalanceService] Saving wallet with hardware encryption...');

      // Ensure hardware key exists
      const keyExists = await KeyManagementService.keyExists(KeyIds.DEVICE_MASTER);
      if (!keyExists) {
        console.warn('[BalanceService] Device master key not found, generating...');
        await KeyManagementService.generateKeyPair(KeyIds.DEVICE_MASTER, false);
      }

      // Prepare wallet data for encryption
      const walletData = JSON.stringify({
        onlineBalance: wallet.onlineBalance,
        offlineBalance: wallet.offlineBalance,
        deviceId: wallet.deviceId,
        lastSyncTimestamp: wallet.lastSyncTimestamp?.toISOString(),
      });

      // Encrypt wallet data with hardware key
      const encrypted = await EncryptionService.encrypt(
        KeyIds.DEVICE_MASTER,
        walletData
      );

      // Store encrypted data
      await AsyncStorage.setItem(
        STORAGE_KEYS.ENCRYPTED_WALLET,
        encrypted
      );

      console.log('[BalanceService] Wallet encrypted and saved successfully');
    } catch (error) {
      console.error('[BalanceService] Error saving wallet:', error);
      throw new Error('Failed to save wallet');
    }
  }

  /**
   * Get or create device ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);

      if (!deviceId) {
        deviceId = `DEVICE-${uuidv4()}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }

      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `DEVICE-${uuidv4()}`;
    }
  }

  /**
   * Clear wallet data (for testing)
   */
  async clearWallet(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET);
    } catch (error) {
      console.error('Error clearing wallet:', error);
    }
  }
}

export const balanceService = new BalanceService();
