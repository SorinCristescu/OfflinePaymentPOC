// src/services/wallet/BalanceService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WalletState } from '../../types/wallet';
import { STORAGE_KEYS, MOCK_BANK } from '../../utils/constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing wallet balances and persistence
 */
class BalanceService {
  /**
   * Initialize wallet state
   */
  async initializeWallet(): Promise<WalletState> {
    try {
      const storedWallet = await AsyncStorage.getItem(STORAGE_KEYS.WALLET);

      if (storedWallet) {
        const wallet = JSON.parse(storedWallet);
        return {
          ...wallet,
          lastSyncTimestamp: wallet.lastSyncTimestamp
            ? new Date(wallet.lastSyncTimestamp)
            : undefined,
        };
      }

      // Create new wallet
      const deviceId = await this.getOrCreateDeviceId();
      const newWallet: WalletState = {
        onlineBalance: MOCK_BANK.INITIAL_ONLINE_BALANCE,
        offlineBalance: 0,
        deviceId,
      };

      await this.saveWallet(newWallet);
      return newWallet;
    } catch (error) {
      console.error('Error initializing wallet:', error);
      throw new Error('Failed to initialize wallet');
    }
  }

  /**
   * Save wallet state to storage
   */
  async saveWallet(wallet: WalletState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(wallet));
    } catch (error) {
      console.error('Error saving wallet:', error);
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
