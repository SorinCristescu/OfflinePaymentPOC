/**
 * SyncService
 * Phase 6: Offline Payment Protocol
 *
 * Handles syncing offline transactions to backend when online
 * Manages conflict resolution and transaction status updates
 */

import NetInfo from '@react-native-community/netinfo';
import {OfflineQueue} from './OfflineQueue';
import {
  OfflineTransaction,
  OfflineTransactionStatus,
  SyncStatus,
  SyncResult,
} from '../../types/payment';

/**
 * Sync configuration
 */
interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  batchSize: number;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  totalTransactions: number;
  syncedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  lastSyncTime: number | null;
  nextSyncTime: number | null;
  isSyncing: boolean;
}

/**
 * Backend API response
 */
interface BackendSyncResponse {
  success: boolean;
  transactionId: string;
  serverId?: string;
  timestamp?: number;
  error?: string;
  conflict?: {
    reason: string;
    serverVersion: OfflineTransaction;
  };
}

/**
 * Sync conflict resolution strategy
 */
export enum ConflictResolution {
  USE_LOCAL = 'use_local',
  USE_SERVER = 'use_server',
  MERGE = 'merge',
  MANUAL = 'manual',
}

class SyncServiceClass {
  private config: SyncConfig = {
    autoSync: true,
    syncInterval: 60000, // 1 minute
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    batchSize: 10,
  };

  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private isInitialized: boolean = false;
  private isOnline: boolean = false;
  private lastSyncTime: number | null = null;

  // Callbacks
  private onSyncStartCallback?: () => void;
  private onSyncCompleteCallback?: (result: SyncResult) => void;
  private onSyncErrorCallback?: (error: Error) => void;
  private onConflictCallback?: (
    transaction: OfflineTransaction,
    serverVersion: OfflineTransaction
  ) => ConflictResolution;

  /**
   * Initialize sync service
   */
  async initialize(config?: Partial<SyncConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('[SyncService] Already initialized');
      return;
    }

    console.log('[SyncService] Initializing...');

    // Apply custom config
    if (config) {
      this.config = {...this.config, ...config};
    }

    // Setup network listener
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log('[SyncService] Network state changed:', {
        isOnline: this.isOnline,
        type: state.type,
      });

      // Trigger sync when coming back online
      if (wasOffline && this.isOnline && this.config.autoSync) {
        console.log('[SyncService] Back online, triggering sync...');
        this.syncNow();
      }
    });

    // Start auto-sync timer if enabled
    if (this.config.autoSync) {
      this.startAutoSync();
    }

    this.isInitialized = true;
    console.log('[SyncService] Initialized successfully');
  }

  /**
   * Start automatic sync timer
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        console.log('[SyncService] Auto-sync triggered');
        this.syncNow();
      }
    }, this.config.syncInterval);

    console.log(
      `[SyncService] Auto-sync started with interval: ${this.config.syncInterval}ms`
    );
  }

  /**
   * Stop automatic sync timer
   */
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[SyncService] Auto-sync stopped');
    }
  }

  /**
   * Trigger immediate sync
   */
  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress');
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        error: 'Sync already in progress',
      };
    }

    if (!this.isOnline) {
      console.log('[SyncService] Cannot sync - device is offline');
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        error: 'Device is offline',
      };
    }

    this.isSyncing = true;
    this.onSyncStartCallback?.();

    console.log('[SyncService] Starting sync...');

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
    };

    try {
      // Get all pending transactions
      const pendingTransactions = OfflineQueue.getAllTransactions().filter(
        tx => tx.syncStatus === SyncStatus.PENDING || tx.syncStatus === SyncStatus.FAILED
      );

      console.log(
        `[SyncService] Found ${pendingTransactions.length} transactions to sync`
      );

      if (pendingTransactions.length === 0) {
        this.lastSyncTime = Date.now();
        return result;
      }

      // Sync in batches
      for (let i = 0; i < pendingTransactions.length; i += this.config.batchSize) {
        const batch = pendingTransactions.slice(i, i + this.config.batchSize);

        for (const transaction of batch) {
          try {
            const syncResult = await this.syncTransaction(transaction);

            if (syncResult.success) {
              result.synced++;
            } else if (syncResult.conflict) {
              result.conflicts++;
              await this.handleConflict(transaction, syncResult.conflict.serverVersion);
            } else {
              result.failed++;
            }
          } catch (error) {
            console.error('[SyncService] Error syncing transaction:', error);
            result.failed++;
          }
        }
      }

      this.lastSyncTime = Date.now();
      console.log('[SyncService] Sync completed:', result);

      this.onSyncCompleteCallback?.(result);
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
      this.onSyncErrorCallback?.(error as Error);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync a single transaction to backend
   */
  private async syncTransaction(
    transaction: OfflineTransaction
  ): Promise<BackendSyncResponse> {
    console.log('[SyncService] Syncing transaction:', transaction.id);

    try {
      // Update transaction status to syncing
      const updatedTx = {
        ...transaction,
        syncStatus: SyncStatus.SYNCING,
        lastSyncAttempt: Date.now(),
        syncAttempts: transaction.syncAttempts + 1,
      };
      await OfflineQueue.updateTransaction(updatedTx);

      // TODO: Replace with actual backend API call
      // For now, simulate backend sync
      const response = await this.simulateBackendSync(transaction);

      if (response.success) {
        // Mark as synced
        const syncedTx = {
          ...updatedTx,
          syncStatus: SyncStatus.SYNCED,
          serverId: response.serverId,
          lastSyncAttempt: Date.now(),
        };
        await OfflineQueue.updateTransaction(syncedTx);

        console.log('[SyncService] Transaction synced successfully:', transaction.id);
      } else if (response.conflict) {
        // Handle conflict
        console.warn('[SyncService] Sync conflict detected:', transaction.id);
        return response;
      } else {
        // Mark as failed if max retries exceeded
        if (updatedTx.syncAttempts >= this.config.maxRetries) {
          const failedTx = {
            ...updatedTx,
            syncStatus: SyncStatus.FAILED,
            error: response.error || 'Max sync retries exceeded',
          };
          await OfflineQueue.updateTransaction(failedTx);
        } else {
          // Keep as pending for retry
          const pendingTx = {
            ...updatedTx,
            syncStatus: SyncStatus.PENDING,
            error: response.error,
          };
          await OfflineQueue.updateTransaction(pendingTx);
        }
      }

      return response;
    } catch (error) {
      console.error('[SyncService] Error syncing transaction:', error);
      return {
        success: false,
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Simulate backend sync (replace with actual API call)
   */
  private async simulateBackendSync(
    transaction: OfflineTransaction
  ): Promise<BackendSyncResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate 90% success rate
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        transactionId: transaction.id,
        serverId: `server_${transaction.id}`,
        timestamp: Date.now(),
      };
    } else {
      // Simulate error
      return {
        success: false,
        transactionId: transaction.id,
        error: 'Simulated backend error',
      };
    }
  }

  /**
   * Handle sync conflict
   */
  private async handleConflict(
    localTransaction: OfflineTransaction,
    serverTransaction: OfflineTransaction
  ): Promise<void> {
    console.log('[SyncService] Handling conflict for transaction:', localTransaction.id);

    // Get resolution strategy from callback
    const resolution =
      this.onConflictCallback?.(localTransaction, serverTransaction) ||
      ConflictResolution.USE_SERVER;

    switch (resolution) {
      case ConflictResolution.USE_LOCAL:
        // Force update server with local version
        console.log('[SyncService] Using local version');
        // TODO: Implement force update to server
        break;

      case ConflictResolution.USE_SERVER:
        // Accept server version
        console.log('[SyncService] Using server version');
        const syncedTx = {
          ...serverTransaction,
          syncStatus: SyncStatus.SYNCED,
        };
        await OfflineQueue.updateTransaction(syncedTx);
        break;

      case ConflictResolution.MERGE:
        // Merge both versions
        console.log('[SyncService] Merging versions');
        // TODO: Implement merge logic
        break;

      case ConflictResolution.MANUAL:
        // Mark for manual review
        console.log('[SyncService] Marked for manual review');
        const conflictTx = {
          ...localTransaction,
          syncStatus: SyncStatus.FAILED,
          error: 'Requires manual conflict resolution',
        };
        await OfflineQueue.updateTransaction(conflictTx);
        break;
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): SyncStats {
    const allTransactions = OfflineQueue.getAllTransactions();

    const pending = allTransactions.filter(
      tx => tx.syncStatus === SyncStatus.PENDING
    ).length;
    const synced = allTransactions.filter(
      tx => tx.syncStatus === SyncStatus.SYNCED
    ).length;
    const failed = allTransactions.filter(
      tx => tx.syncStatus === SyncStatus.FAILED
    ).length;

    return {
      totalTransactions: allTransactions.length,
      syncedTransactions: synced,
      pendingTransactions: pending,
      failedTransactions: failed,
      lastSyncTime: this.lastSyncTime,
      nextSyncTime:
        this.config.autoSync && this.lastSyncTime
          ? this.lastSyncTime + this.config.syncInterval
          : null,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Update sync configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = {...this.config, ...config};

    // Restart auto-sync if interval changed
    if (config.autoSync !== undefined || config.syncInterval !== undefined) {
      this.stopAutoSync();
      if (this.config.autoSync) {
        this.startAutoSync();
      }
    }

    console.log('[SyncService] Config updated:', this.config);
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: {
    onSyncStart?: () => void;
    onSyncComplete?: (result: SyncResult) => void;
    onSyncError?: (error: Error) => void;
    onConflict?: (
      transaction: OfflineTransaction,
      serverVersion: OfflineTransaction
    ) => ConflictResolution;
  }): void {
    this.onSyncStartCallback = callbacks.onSyncStart;
    this.onSyncCompleteCallback = callbacks.onSyncComplete;
    this.onSyncErrorCallback = callbacks.onSyncError;
    this.onConflictCallback = callbacks.onConflict;
  }

  /**
   * Retry failed transactions
   */
  async retryFailedTransactions(): Promise<SyncResult> {
    console.log('[SyncService] Retrying failed transactions...');

    const failedTransactions = OfflineQueue.getAllTransactions().filter(
      tx => tx.syncStatus === SyncStatus.FAILED
    );

    // Reset sync attempts and status
    for (const tx of failedTransactions) {
      const resetTx = {
        ...tx,
        syncStatus: SyncStatus.PENDING,
        syncAttempts: 0,
        error: undefined,
      };
      await OfflineQueue.updateTransaction(resetTx);
    }

    // Trigger sync
    return this.syncNow();
  }

  /**
   * Clean up and destroy
   */
  async destroy(): Promise<void> {
    console.log('[SyncService] Destroying...');

    this.stopAutoSync();
    this.isInitialized = false;
    this.isSyncing = false;
    this.isOnline = false;

    console.log('[SyncService] Destroyed successfully');
  }
}

// Export singleton instance
export const SyncService = new SyncServiceClass();
