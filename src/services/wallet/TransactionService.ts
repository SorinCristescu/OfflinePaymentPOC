// src/services/wallet/TransactionService.ts
import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionDirection,
} from '../../types/transaction';
import { transactionStorageService } from '../storage/TransactionStorageService';
import { BALANCE_LIMITS } from '../../utils/constants';

/**
 * Service for managing transactions
 */
class TransactionService {
  /**
   * Determine transaction direction based on type
   */
  private getDirectionFromType(type: TransactionType): TransactionDirection {
    switch (type) {
      case TransactionType.ONLINE_TO_OFFLINE:
        return TransactionDirection.OUTGOING;
      case TransactionType.OFFLINE_TO_ONLINE:
        return TransactionDirection.INCOMING;
      case TransactionType.OFFLINE_TO_OFFLINE:
        // For P2P transactions, this will be set explicitly
        return TransactionDirection.OUTGOING;
      default:
        return TransactionDirection.OUTGOING;
    }
  }

  /**
   * Create a new transaction record
   */
  async createTransaction(
    type: TransactionType,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    const transaction: Transaction = {
      id: uuidv4(),
      type,
      amount,
      direction: this.getDirectionFromType(type),
      status: TransactionStatus.PENDING,
      timestamp: new Date(),
      metadata,
    };

    await transactionStorageService.addTransaction(transaction);
    return transaction;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    errorMessage?: string
  ): Promise<void> {
    await transactionStorageService.updateTransaction(transactionId, {
      status,
      errorMessage,
    });
  }

  /**
   * Get all transactions
   */
  async getAllTransactions(): Promise<Transaction[]> {
    return transactionStorageService.getAllTransactions();
  }

  /**
   * Get transactions by type
   */
  async getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
    const all = await this.getAllTransactions();
    return all.filter((t) => t.type === type);
  }

  /**
   * Get daily transaction total
   */
  async getDailyTotal(): Promise<number> {
    const all = await this.getAllTransactions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = all.filter((t) => {
      const txDate = new Date(t.timestamp);
      txDate.setHours(0, 0, 0, 0);
      return (
        txDate.getTime() === today.getTime() &&
        t.status === TransactionStatus.COMPLETED
      );
    });

    return todayTransactions.reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Check if daily limit is exceeded
   */
  async checkDailyLimit(additionalAmount: number): Promise<boolean> {
    const dailyTotal = await this.getDailyTotal();
    return dailyTotal + additionalAmount <= BALANCE_LIMITS.MAX_DAILY_LIMIT;
  }

  /**
   * Clear all transactions (for testing)
   */
  async clearAllTransactions(): Promise<void> {
    await transactionStorageService.clearAllTransactions();
  }
}

export const transactionService = new TransactionService();
