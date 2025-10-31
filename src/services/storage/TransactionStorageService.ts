// src/services/storage/TransactionStorageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../../types/transaction';
import { STORAGE_KEYS } from '../../utils/constants';

/**
 * Service for persisting transactions to AsyncStorage
 */
class TransactionStorageService {
  /**
   * Get all transactions from storage
   */
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) return [];

      const transactions = JSON.parse(data);
      // Convert timestamp strings back to Date objects
      return transactions.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp),
      }));
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  }

  /**
   * Add a new transaction
   */
  async addTransaction(transaction: Transaction): Promise<void> {
    try {
      const transactions = await this.getAllTransactions();
      transactions.push(transaction);
      await AsyncStorage.setItem(
        STORAGE_KEYS.TRANSACTIONS,
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw new Error('Failed to save transaction');
    }
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    transactionId: string,
    updates: Partial<Transaction>
  ): Promise<void> {
    try {
      const transactions = await this.getAllTransactions();
      const index = transactions.findIndex((t) => t.id === transactionId);

      if (index === -1) {
        throw new Error('Transaction not found');
      }

      transactions[index] = { ...transactions[index], ...updates };
      await AsyncStorage.setItem(
        STORAGE_KEYS.TRANSACTIONS,
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error('Failed to update transaction');
    }
  }

  /**
   * Clear all transactions (for testing)
   */
  async clearAllTransactions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    } catch (error) {
      console.error('Error clearing transactions:', error);
    }
  }
}

export const transactionStorageService = new TransactionStorageService();
