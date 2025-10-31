// src/stores/transactionStore.ts
/**
 * Transaction store for managing transaction history
 * Integrates with TransactionService
 */

import { create } from 'zustand';
import { Transaction, TransactionStatus } from '../types/transaction';
import { transactionService } from '../services/wallet/TransactionService';

interface TransactionStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
}

interface TransactionStore {
  transactions: Transaction[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  loadTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  clearError: () => void;
  getStats: () => TransactionStats;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  isLoading: false,
  isRefreshing: false,
  error: null,

  /**
   * Load transactions from storage
   */
  loadTransactions: async () => {
    try {
      set({ isLoading: true, error: null });
      const transactions = await transactionService.getAllTransactions();

      // Sort by timestamp descending (newest first)
      transactions.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      set({ transactions, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load transactions',
        isLoading: false,
      });
    }
  },

  /**
   * Refresh transactions (for pull-to-refresh)
   */
  refreshTransactions: async () => {
    try {
      set({ isRefreshing: true, error: null });
      const transactions = await transactionService.getAllTransactions();

      // Sort by timestamp descending (newest first)
      transactions.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      set({ transactions, isRefreshing: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh transactions',
        isRefreshing: false,
      });
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Get transaction statistics
   */
  getStats: () => {
    const state = useTransactionStore.getState();
    const { transactions } = state;

    return {
      totalTransactions: transactions.length,
      successfulTransactions: transactions.filter(
        (txn) => txn.status === TransactionStatus.COMPLETED
      ).length,
      failedTransactions: transactions.filter(
        (txn) => txn.status === TransactionStatus.FAILED
      ).length,
    };
  },
}));
