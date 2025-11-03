// src/stores/walletStore.ts
/**
 * Wallet store for managing balances and transfers
 * Integrates with BankMockService, BalanceService, and TransactionService
 */

import { create } from 'zustand';
import { WalletState } from '../types/wallet';
import { TransactionType, TransactionStatus } from '../types/transaction';
import { balanceService } from '../services/wallet/BalanceService';
import { bankMockService } from '../services/wallet/BankMockService';
import { transactionService } from '../services/wallet/TransactionService';
import { validateTransfer } from '../utils/validation';
import { BALANCE_LIMITS } from '../utils/constants';
import { KeyManagementService, KeyIds } from '../services/security/KeyManagementService';

interface WalletStore extends WalletState {
  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeWallet: () => Promise<void>;
  transferOnlineToOffline: (amount: number) => Promise<void>;
  updateOfflineBalance: (amount: number, operation: 'add' | 'subtract') => Promise<void>;
  clearError: () => void;
  reset: () => Promise<void>;
}

const initialState: WalletState = {
  onlineBalance: 0,
  offlineBalance: 0,
  deviceId: '',
};

export const useWalletStore = create<WalletStore>((set, get) => ({
  ...initialState,
  isLoading: false,
  error: null,

  /**
   * Initialize wallet from storage or create new
   * Ensures hardware keys exist before loading encrypted wallet
   */
  initializeWallet: async () => {
    try {
      set({ isLoading: true, error: null });

      console.log('[walletStore] Initializing wallet with hardware security...');

      // Ensure device master key exists for wallet encryption
      const keyExists = await KeyManagementService.keyExists(KeyIds.DEVICE_MASTER);
      if (!keyExists) {
        console.log('[walletStore] Device master key not found, generating...');
        await KeyManagementService.generateKeyPair(KeyIds.DEVICE_MASTER, false);
        console.log('[walletStore] Device master key generated successfully');
      } else {
        console.log('[walletStore] Device master key already exists');
      }

      // Initialize wallet with encrypted storage
      const walletState = await balanceService.initializeWallet();
      console.log('[walletStore] Wallet initialized successfully');

      set({
        ...walletState,
        isLoading: false,
      });
    } catch (error) {
      console.error('[walletStore] Failed to initialize wallet:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize wallet',
        isLoading: false,
      });
    }
  },

  /**
   * Transfer funds from online to offline balance
   */
  transferOnlineToOffline: async (amount: number) => {
    const state = get();

    try {
      set({ isLoading: true, error: null });

      // Validate transfer
      const validation = validateTransfer(
        amount,
        state.onlineBalance,
        state.offlineBalance,
        BALANCE_LIMITS.MAX_OFFLINE_BALANCE
      );

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check daily limit
      const withinLimit = await transactionService.checkDailyLimit(amount);
      if (!withinLimit) {
        throw new Error(
          `Daily transfer limit of $${(BALANCE_LIMITS.MAX_DAILY_LIMIT / 100).toFixed(
            2
          )} exceeded`
        );
      }

      // Create pending transaction
      const transaction = await transactionService.createTransaction(
        TransactionType.ONLINE_TO_OFFLINE,
        amount
      );

      try {
        // Call mock bank API to withdraw
        const bankAccount = await bankMockService.getAccount();
        const withdrawal = await bankMockService.withdraw({
          amount,
          accountNumber: bankAccount.accountNumber,
        });

        if (!withdrawal.success) {
          throw new Error(withdrawal.errorMessage || 'Bank withdrawal failed');
        }

        // Update balances
        const newOnlineBalance = state.onlineBalance - amount;
        const newOfflineBalance = state.offlineBalance + amount;

        const updatedWallet: WalletState = {
          ...state,
          onlineBalance: newOnlineBalance,
          offlineBalance: newOfflineBalance,
          lastSyncTimestamp: new Date(),
        };

        // Save to storage
        await balanceService.saveWallet(updatedWallet);

        // Mark transaction as completed
        await transactionService.updateTransactionStatus(
          transaction.id,
          TransactionStatus.COMPLETED
        );

        // Update store
        set({
          ...updatedWallet,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        // Mark transaction as failed
        await transactionService.updateTransactionStatus(
          transaction.id,
          TransactionStatus.FAILED,
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Transfer failed',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Update offline balance for P2P payments
   * Used when sending/receiving payments via BLE
   */
  updateOfflineBalance: async (amount: number, operation: 'add' | 'subtract') => {
    const state = get();

    try {
      set({ isLoading: true, error: null });

      console.log(`[walletStore] Updating offline balance: ${operation} ${amount / 100}`);

      // Calculate new balance
      const newOfflineBalance = operation === 'add'
        ? state.offlineBalance + amount
        : state.offlineBalance - amount;

      // Validate new balance
      if (newOfflineBalance < 0) {
        throw new Error('Insufficient balance for payment');
      }

      if (newOfflineBalance > BALANCE_LIMITS.MAX_OFFLINE_BALANCE) {
        throw new Error('Offline balance would exceed maximum limit');
      }

      // Update wallet state
      const updatedWallet: WalletState = {
        ...state,
        offlineBalance: newOfflineBalance,
        lastSyncTimestamp: new Date(),
      };

      // Save to storage with hardware encryption
      await balanceService.saveWallet(updatedWallet);

      // Update store
      set({
        ...updatedWallet,
        isLoading: false,
        error: null,
      });

      console.log(`[walletStore] Balance updated: ${newOfflineBalance / 100}`);
    } catch (error) {
      console.error('[walletStore] Failed to update balance:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update balance',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset wallet (for testing)
   */
  reset: async () => {
    await balanceService.clearWallet();
    await transactionService.clearAllTransactions();
    set({ ...initialState, isLoading: false, error: null });
  },
}));
