/**
 * OfflineQueue - Offline Transaction Queue Management
 * Phase 6: Offline Payment Protocol
 *
 * Manages queue of offline transactions waiting to be synced
 * Handles persistence, retry logic, and queue statistics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OfflineTransaction,
  SyncStatus,
  OfflineQueueStats,
  OfflineTransactionStatus,
} from '../../types/payment';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  QUEUE: '@offline_payment_queue',
  STATS: '@offline_payment_queue_stats',
};

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 5,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 60000, // 1 minute
  BACKOFF_MULTIPLIER: 2,
};

/**
 * Queue event listener
 */
type QueueEventListener = (queue: OfflineTransaction[]) => void;

/**
 * Offline Queue Service
 */
class OfflineQueueClass {
  private queue: Map<string, OfflineTransaction> = new Map();
  private listeners: QueueEventListener[] = [];
  private isInitialized: boolean = false;

  /**
   * Initialize offline queue
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('[OfflineQueue] Already initialized');
        return;
      }

      console.log('[OfflineQueue] Initializing...');

      // Load queue from storage
      await this.loadQueue();

      this.isInitialized = true;
      console.log('[OfflineQueue] Initialized successfully with', this.queue.size, 'transactions');
    } catch (error) {
      console.error('[OfflineQueue] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Add transaction to queue
   */
  async addTransaction(transaction: OfflineTransaction): Promise<void> {
    try {
      console.log('[OfflineQueue] Adding transaction to queue:', transaction.id);

      // Check if transaction already exists
      if (this.queue.has(transaction.id)) {
        console.warn('[OfflineQueue] Transaction already in queue:', transaction.id);
        return;
      }

      // Add to queue
      this.queue.set(transaction.id, transaction);

      // Save to storage
      await this.saveQueue();

      // Notify listeners
      this.notifyListeners();

      console.log('[OfflineQueue] Transaction added successfully');
    } catch (error) {
      console.error('[OfflineQueue] Failed to add transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction in queue
   */
  async updateTransaction(transaction: OfflineTransaction): Promise<void> {
    try {
      console.log('[OfflineQueue] Updating transaction:', transaction.id);

      if (!this.queue.has(transaction.id)) {
        throw new Error(`Transaction not found in queue: ${transaction.id}`);
      }

      // Update in queue
      this.queue.set(transaction.id, transaction);

      // Save to storage
      await this.saveQueue();

      // Notify listeners
      this.notifyListeners();

      console.log('[OfflineQueue] Transaction updated successfully');
    } catch (error) {
      console.error('[OfflineQueue] Failed to update transaction:', error);
      throw error;
    }
  }

  /**
   * Remove transaction from queue
   */
  async removeTransaction(transactionId: string): Promise<void> {
    try {
      console.log('[OfflineQueue] Removing transaction from queue:', transactionId);

      if (!this.queue.has(transactionId)) {
        console.warn('[OfflineQueue] Transaction not in queue:', transactionId);
        return;
      }

      // Remove from queue
      this.queue.delete(transactionId);

      // Save to storage
      await this.saveQueue();

      // Notify listeners
      this.notifyListeners();

      console.log('[OfflineQueue] Transaction removed successfully');
    } catch (error) {
      console.error('[OfflineQueue] Failed to remove transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): OfflineTransaction | undefined {
    return this.queue.get(transactionId);
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): OfflineTransaction[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get transactions by status
   */
  getTransactionsByStatus(status: OfflineTransactionStatus): OfflineTransaction[] {
    return Array.from(this.queue.values()).filter(tx => tx.status === status);
  }

  /**
   * Get transactions by sync status
   */
  getTransactionsBySyncStatus(syncStatus: SyncStatus): OfflineTransaction[] {
    return Array.from(this.queue.values()).filter(tx => tx.syncStatus === syncStatus);
  }

  /**
   * Get transactions pending sync
   */
  getPendingSyncTransactions(): OfflineTransaction[] {
    return this.getTransactionsBySyncStatus(SyncStatus.NOT_SYNCED);
  }

  /**
   * Get failed transactions
   */
  getFailedTransactions(): OfflineTransaction[] {
    return this.getTransactionsBySyncStatus(SyncStatus.SYNC_FAILED);
  }

  /**
   * Mark transaction as syncing
   */
  async markAsSyncing(transactionId: string): Promise<void> {
    const transaction = this.queue.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    transaction.syncStatus = SyncStatus.SYNCING;
    transaction.syncAttempts++;
    transaction.lastSyncAttempt = Date.now();

    await this.updateTransaction(transaction);
  }

  /**
   * Mark transaction as synced
   */
  async markAsSynced(transactionId: string): Promise<void> {
    const transaction = this.queue.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    transaction.syncStatus = SyncStatus.SYNCED;
    transaction.syncedAt = Date.now();
    transaction.error = undefined;

    await this.updateTransaction(transaction);

    // Optionally remove synced transactions from queue after some time
    // For now, we keep them for history
  }

  /**
   * Mark transaction as sync failed
   */
  async markAsSyncFailed(transactionId: string, error: string): Promise<void> {
    const transaction = this.queue.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    transaction.syncStatus = SyncStatus.SYNC_FAILED;
    transaction.error = error;

    await this.updateTransaction(transaction);
  }

  /**
   * Retry a failed transaction
   */
  async retryTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.queue.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // Check if max retries exceeded
    if (transaction.syncAttempts >= RETRY_CONFIG.MAX_ATTEMPTS) {
      console.warn('[OfflineQueue] Max retry attempts exceeded:', transactionId);
      return false;
    }

    // Reset sync status
    transaction.syncStatus = SyncStatus.NOT_SYNCED;
    transaction.error = undefined;

    await this.updateTransaction(transaction);
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(attempts: number): number {
    const delay = Math.min(
      RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempts - 1),
      RETRY_CONFIG.MAX_DELAY
    );
    return delay;
  }

  /**
   * Check if transaction should be retried
   */
  shouldRetryTransaction(transaction: OfflineTransaction): boolean {
    // Don't retry if max attempts exceeded
    if (transaction.syncAttempts >= RETRY_CONFIG.MAX_ATTEMPTS) {
      return false;
    }

    // Don't retry if already synced
    if (transaction.syncStatus === SyncStatus.SYNCED) {
      return false;
    }

    // Don't retry if currently syncing
    if (transaction.syncStatus === SyncStatus.SYNCING) {
      return false;
    }

    // Check if enough time has passed since last attempt
    if (transaction.lastSyncAttempt) {
      const delay = this.getRetryDelay(transaction.syncAttempts);
      const timeSinceLastAttempt = Date.now() - transaction.lastSyncAttempt;
      if (timeSinceLastAttempt < delay) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): OfflineQueueStats {
    const transactions = this.getAllTransactions();

    const stats: OfflineQueueStats = {
      totalTransactions: transactions.length,
      pendingSync: transactions.filter(tx => tx.syncStatus === SyncStatus.NOT_SYNCED).length,
      synced: transactions.filter(tx => tx.syncStatus === SyncStatus.SYNCED).length,
      failed: transactions.filter(tx => tx.syncStatus === SyncStatus.SYNC_FAILED).length,
      totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      oldestTransaction: transactions.length > 0
        ? Math.min(...transactions.map(tx => tx.timestamp))
        : undefined,
    };

    return stats;
  }

  /**
   * Clear synced transactions
   */
  async clearSyncedTransactions(): Promise<number> {
    try {
      console.log('[OfflineQueue] Clearing synced transactions...');

      const syncedTransactions = this.getTransactionsBySyncStatus(SyncStatus.SYNCED);
      let removedCount = 0;

      for (const transaction of syncedTransactions) {
        this.queue.delete(transaction.id);
        removedCount++;
      }

      await this.saveQueue();
      this.notifyListeners();

      console.log('[OfflineQueue] Cleared', removedCount, 'synced transactions');
      return removedCount;
    } catch (error) {
      console.error('[OfflineQueue] Failed to clear synced transactions:', error);
      throw error;
    }
  }

  /**
   * Clear all transactions (use with caution)
   */
  async clearAllTransactions(): Promise<void> {
    try {
      console.log('[OfflineQueue] Clearing all transactions...');

      this.queue.clear();

      await this.saveQueue();
      this.notifyListeners();

      console.log('[OfflineQueue] All transactions cleared');
    } catch (error) {
      console.error('[OfflineQueue] Failed to clear all transactions:', error);
      throw error;
    }
  }

  /**
   * Load queue from persistent storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
      if (queueData) {
        const transactions: OfflineTransaction[] = JSON.parse(queueData);
        this.queue = new Map(transactions.map(tx => [tx.id, tx]));
        console.log('[OfflineQueue] Loaded', transactions.length, 'transactions from storage');
      } else {
        console.log('[OfflineQueue] No existing queue found in storage');
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue from storage:', error);
      // Continue with empty queue
      this.queue = new Map();
    }
  }

  /**
   * Save queue to persistent storage
   */
  private async saveQueue(): Promise<void> {
    try {
      const transactions = Array.from(this.queue.values());
      await AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(transactions));
    } catch (error) {
      console.error('[OfflineQueue] Failed to save queue to storage:', error);
      throw error;
    }
  }

  /**
   * Register listener for queue changes
   */
  onQueueChange(listener: QueueEventListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(): void {
    const queue = this.getAllTransactions();
    for (const listener of this.listeners) {
      try {
        listener(queue);
      } catch (error) {
        console.error('[OfflineQueue] Error in queue change listener:', error);
      }
    }
  }

  /**
   * Export queue for debugging/backup
   */
  async exportQueue(): Promise<string> {
    const transactions = this.getAllTransactions();
    return JSON.stringify(transactions, null, 2);
  }

  /**
   * Import queue from backup
   */
  async importQueue(queueData: string): Promise<void> {
    try {
      const transactions: OfflineTransaction[] = JSON.parse(queueData);

      // Validate transactions
      if (!Array.isArray(transactions)) {
        throw new Error('Invalid queue data format');
      }

      // Clear existing queue
      this.queue.clear();

      // Add imported transactions
      for (const transaction of transactions) {
        this.queue.set(transaction.id, transaction);
      }

      await this.saveQueue();
      this.notifyListeners();

      console.log('[OfflineQueue] Imported', transactions.length, 'transactions');
    } catch (error) {
      console.error('[OfflineQueue] Failed to import queue:', error);
      throw error;
    }
  }

  /**
   * Clean up and destroy service
   */
  async destroy(): Promise<void> {
    try {
      console.log('[OfflineQueue] Destroying...');

      // Save queue before destroying
      await this.saveQueue();

      this.queue.clear();
      this.listeners = [];
      this.isInitialized = false;

      console.log('[OfflineQueue] Destroyed successfully');
    } catch (error) {
      console.error('[OfflineQueue] Error during destroy:', error);
    }
  }
}

// Export singleton instance
export const OfflineQueue = new OfflineQueueClass();
