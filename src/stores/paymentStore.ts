/**
 * PaymentStore - Payment State Management
 * Phase 6: Offline Payment Protocol
 *
 * Zustand store for managing payment sessions and offline transactions
 * Integrates PaymentProtocol, TransactionService, ValidationService, and OfflineQueue
 */

import {create} from 'zustand';
import {PaymentProtocol} from '../services/payment/PaymentProtocol';
import {TransactionService} from '../services/payment/TransactionService';
import {ValidationService} from '../services/payment/ValidationService';
import {OfflineQueue} from '../services/payment/OfflineQueue';
import {SyncService, SyncStats} from '../services/payment/SyncService';
import {useWalletStore} from '../stores/walletStore';
import {
  PaymentSession,
  PaymentRequest,
  PaymentResponse,
  PaymentTransaction,
  PaymentConfirmation,
  PaymentCancellation,
  OfflineTransaction,
  CreatePaymentOptions,
  PaymentStatus,
  OfflineTransactionStatus,
  SyncStatus,
  OfflineQueueStats,
  PaymentFilterOptions,
  PaymentStats,
  SyncResult,
} from '../types/payment';

/**
 * Payment store state
 */
interface PaymentStoreState {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Sessions
  activeSessions: PaymentSession[];
  currentSession: PaymentSession | null;

  // Transactions
  offlineTransactions: OfflineTransaction[];
  queueStats: OfflineQueueStats | null;

  // Sync
  syncStats: SyncStats | null;
  isSyncing: boolean;

  // Actions
  initialize: () => Promise<void>;
  destroy: () => Promise<void>;

  // Payment actions
  sendPaymentRequest: (options: CreatePaymentOptions) => Promise<string>;
  acceptPaymentRequest: (requestId: string) => Promise<void>;
  rejectPaymentRequest: (requestId: string, reason: string) => Promise<void>;
  cancelPayment: (sessionId: string, reason: string) => Promise<void>;

  // Transaction management
  refreshTransactions: () => Promise<void>;
  retryFailedTransaction: (transactionId: string) => Promise<void>;
  clearSyncedTransactions: () => Promise<void>;

  // Sync management
  syncTransactions: () => Promise<SyncResult>;
  retryFailedSync: () => Promise<SyncResult>;
  refreshSyncStats: () => void;

  // Getters
  getSession: (sessionId: string) => PaymentSession | null;
  getTransaction: (transactionId: string) => OfflineTransaction | null;
  getPaymentStats: () => PaymentStats;
  filterTransactions: (filter: PaymentFilterOptions) => OfflineTransaction[];

  // Utilities
  clearError: () => void;
}

/**
 * Create payment store
 */
export const usePaymentStore = create<PaymentStoreState>((set, get) => ({
  // Initial state
  isInitialized: false,
  isLoading: false,
  error: null,
  activeSessions: [],
  currentSession: null,
  offlineTransactions: [],
  queueStats: null,
  syncStats: null,
  isSyncing: false,

  /**
   * Initialize payment store
   */
  initialize: async () => {
    try {
      set({isLoading: true, error: null});

      console.log('[PaymentStore] Initializing...');

      // Initialize services
      await Promise.all([
        PaymentProtocol.initialize(),
        TransactionService.initialize(),
        OfflineQueue.initialize(),
        SyncService.initialize({autoSync: true, syncInterval: 60000}),
      ]);

      // Set up payment protocol event handlers
      PaymentProtocol.setEventHandlers({
        onPaymentRequest: async (request: PaymentRequest, from: string) => {
          await get().handlePaymentRequest(request, from);
        },
        onPaymentResponse: async (response: PaymentResponse, from: string) => {
          await get().handlePaymentResponse(response, from);
        },
        onPaymentTransaction: async (transaction: PaymentTransaction, from: string) => {
          await get().handlePaymentTransaction(transaction, from);
        },
        onPaymentConfirmation: async (confirmation: PaymentConfirmation, from: string) => {
          await get().handlePaymentConfirmation(confirmation, from);
        },
        onPaymentCancellation: async (cancellation: PaymentCancellation, from: string) => {
          await get().handlePaymentCancellation(cancellation, from);
        },
      });

      // Load transactions from queue
      await get().refreshTransactions();

      // Listen to queue changes
      OfflineQueue.onQueueChange((transactions) => {
        set({offlineTransactions: transactions});
      });

      // Set up sync callbacks
      SyncService.setCallbacks({
        onSyncStart: () => {
          set({isSyncing: true});
        },
        onSyncComplete: (result) => {
          console.log('[PaymentStore] Sync completed:', result);
          get().refreshTransactions();
          get().refreshSyncStats();
          set({isSyncing: false});
        },
        onSyncError: (error) => {
          console.error('[PaymentStore] Sync error:', error);
          set({isSyncing: false, error: error.message});
        },
      });

      // Initial sync stats refresh
      get().refreshSyncStats();

      set({isInitialized: true, isLoading: false});
      console.log('[PaymentStore] Initialized successfully');
    } catch (error) {
      console.error('[PaymentStore] Initialization failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize payment store',
        isLoading: false,
      });
    }
  },

  /**
   * Send payment request
   */
  sendPaymentRequest: async (options: CreatePaymentOptions) => {
    try {
      set({isLoading: true, error: null});

      console.log('[PaymentStore] Sending payment request:', options);

      // Get current balance
      const walletState = useWalletStore.getState();
      const currentBalance = walletState.offlineBalance;

      // Validate payment request
      const validation = ValidationService.validatePaymentRequest(
        {
          id: '',
          type: 'payment_request' as any,
          timestamp: Date.now(),
          from: '',
          to: options.deviceId,
          amount: options.amount,
          currency: options.currency || 'USD',
          memo: options.memo,
          expiresAt: Date.now() + (options.timeout || 300000),
          signature: '',
        },
        currentBalance
      );

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Send payment request
      const requestId = await PaymentProtocol.sendPaymentRequest(options);

      // Update sessions
      const sessions = PaymentProtocol.getAllSessions();
      set({activeSessions: sessions, isLoading: false});

      return requestId;
    } catch (error) {
      console.error('[PaymentStore] Failed to send payment request:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to send payment request',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Accept payment request
   */
  acceptPaymentRequest: async (requestId: string) => {
    try {
      set({isLoading: true, error: null});

      console.log('[PaymentStore] Accepting payment request:', requestId);

      // Send acceptance response
      await PaymentProtocol.sendPaymentResponse(requestId, true);

      // Update sessions
      const sessions = PaymentProtocol.getAllSessions();
      set({activeSessions: sessions, isLoading: false});
    } catch (error) {
      console.error('[PaymentStore] Failed to accept payment request:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to accept payment request',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Reject payment request
   */
  rejectPaymentRequest: async (requestId: string, reason: string) => {
    try {
      set({isLoading: true, error: null});

      console.log('[PaymentStore] Rejecting payment request:', requestId);

      // Send rejection response
      await PaymentProtocol.sendPaymentResponse(requestId, false, reason);

      // Update sessions
      const sessions = PaymentProtocol.getAllSessions();
      set({activeSessions: sessions, isLoading: false});
    } catch (error) {
      console.error('[PaymentStore] Failed to reject payment request:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to reject payment request',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Cancel payment
   */
  cancelPayment: async (sessionId: string, reason: string) => {
    try {
      set({isLoading: true, error: null});

      console.log('[PaymentStore] Cancelling payment:', sessionId);

      await PaymentProtocol.cancelPayment(sessionId, reason);

      // Update sessions
      const sessions = PaymentProtocol.getAllSessions();
      set({activeSessions: sessions, isLoading: false});
    } catch (error) {
      console.error('[PaymentStore] Failed to cancel payment:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to cancel payment',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Refresh transactions from queue
   */
  refreshTransactions: async () => {
    try {
      const transactions = OfflineQueue.getAllTransactions();
      const stats = OfflineQueue.getQueueStats();

      set({
        offlineTransactions: transactions,
        queueStats: stats,
      });
    } catch (error) {
      console.error('[PaymentStore] Failed to refresh transactions:', error);
    }
  },

  /**
   * Retry failed transaction
   */
  retryFailedTransaction: async (transactionId: string) => {
    try {
      set({isLoading: true, error: null});

      console.log('[PaymentStore] Retrying failed transaction:', transactionId);

      const success = await OfflineQueue.retryTransaction(transactionId);

      if (!success) {
        throw new Error('Max retry attempts exceeded');
      }

      await get().refreshTransactions();
      set({isLoading: false});
    } catch (error) {
      console.error('[PaymentStore] Failed to retry transaction:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to retry transaction',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Clear synced transactions
   */
  clearSyncedTransactions: async () => {
    try {
      set({isLoading: true, error: null});

      console.log('[PaymentStore] Clearing synced transactions');

      await OfflineQueue.clearSyncedTransactions();
      await get().refreshTransactions();

      set({isLoading: false});
    } catch (error) {
      console.error('[PaymentStore] Failed to clear synced transactions:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to clear synced transactions',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Get session by ID
   */
  getSession: (sessionId: string) => {
    return get().activeSessions.find(s => s.id === sessionId) || null;
  },

  /**
   * Get transaction by ID
   */
  getTransaction: (transactionId: string) => {
    return get().offlineTransactions.find(tx => tx.id === transactionId) || null;
  },

  /**
   * Get payment statistics
   */
  getPaymentStats: () => {
    const transactions = get().offlineTransactions;

    const sent = transactions.filter(tx => tx.type === 'sent');
    const received = transactions.filter(tx => tx.type === 'received');
    const pending = transactions.filter(tx => tx.status === OfflineTransactionStatus.PENDING);
    const confirmed = transactions.filter(tx => tx.status === OfflineTransactionStatus.CONFIRMED);
    const failed = transactions.filter(tx => tx.status === OfflineTransactionStatus.FAILED);

    const totalSent = sent.reduce((sum, tx) => sum + tx.amount, 0);
    const totalReceived = received.reduce((sum, tx) => sum + tx.amount, 0);
    const totalVolume = totalSent + totalReceived;
    const averageAmount = transactions.length > 0 ? totalVolume / transactions.length : 0;

    return {
      totalSent,
      totalReceived,
      pendingCount: pending.length,
      completedCount: confirmed.length,
      failedCount: failed.length,
      averageAmount,
      totalVolume,
    };
  },

  /**
   * Filter transactions
   */
  filterTransactions: (filter: PaymentFilterOptions) => {
    let transactions = get().offlineTransactions;

    // Filter by type
    if (filter.type && filter.type !== 'all') {
      transactions = transactions.filter(tx => tx.type === filter.type);
    }

    // Filter by status
    if (filter.status && filter.status.length > 0) {
      transactions = transactions.filter(tx => filter.status!.includes(tx.status));
    }

    // Filter by sync status
    if (filter.syncStatus && filter.syncStatus.length > 0) {
      transactions = transactions.filter(tx => filter.syncStatus!.includes(tx.syncStatus));
    }

    // Filter by date range
    if (filter.dateFrom) {
      transactions = transactions.filter(tx => tx.timestamp >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      transactions = transactions.filter(tx => tx.timestamp <= filter.dateTo!);
    }

    // Filter by amount range
    if (filter.minAmount !== undefined) {
      transactions = transactions.filter(tx => tx.amount >= filter.minAmount!);
    }
    if (filter.maxAmount !== undefined) {
      transactions = transactions.filter(tx => tx.amount <= filter.maxAmount!);
    }

    // Filter by device ID
    if (filter.deviceId) {
      transactions = transactions.filter(
        tx => tx.from === filter.deviceId || tx.to === filter.deviceId
      );
    }

    return transactions;
  },

  /**
   * Handle incoming payment request
   */
  handlePaymentRequest: async (request: PaymentRequest, from: string) => {
    try {
      console.log('[PaymentStore] Handling payment request:', request.id);

      // Update sessions
      const sessions = PaymentProtocol.getAllSessions();
      set({activeSessions: sessions});

      // TODO: Show notification to user
    } catch (error) {
      console.error('[PaymentStore] Error handling payment request:', error);
    }
  },

  /**
   * Handle incoming payment response
   */
  handlePaymentResponse: async (response: PaymentResponse, from: string) => {
    try {
      console.log('[PaymentStore] Handling payment response:', response.id);

      if (response.accepted) {
        // Create and send transaction
        const session = PaymentProtocol.getSession(response.requestId);
        if (session) {
          const walletState = useWalletStore.getState();

          const transaction = await TransactionService.createTransaction({
            requestId: response.requestId,
            toDeviceId: session.deviceId,
            amount: session.amount,
            currency: session.currency,
            memo: session.memo,
            currentBalance: walletState.offlineBalance,
          });

          await PaymentProtocol.sendPaymentTransaction(response.requestId, transaction);

          // Add to offline queue
          const offlineTx = TransactionService.createOfflineTransaction(transaction, 'sent');
          await OfflineQueue.addTransaction(offlineTx);

          // Deduct balance immediately (sender side)
          console.log('[PaymentStore] Deducting balance for sent payment');
          await walletState.updateOfflineBalance(session.amount, 'subtract');
        }
      }

      // Update sessions
      const sessions = PaymentProtocol.getAllSessions();
      set({activeSessions: sessions});

      await get().refreshTransactions();
    } catch (error) {
      console.error('[PaymentStore] Error handling payment response:', error);
    }
  },

  /**
   * Handle incoming payment transaction
   */
  handlePaymentTransaction: async (transaction: PaymentTransaction, from: string) => {
    try {
      console.log('[PaymentStore] Handling payment transaction:', transaction.id);

      // Validate transaction
      const walletState = useWalletStore.getState();
      const usedNonces = get().offlineTransactions.map(tx => tx.nonce);

      const validation = await ValidationService.validatePaymentTransaction(
        transaction,
        walletState.offlineBalance,
        usedNonces
      );

      if (validation.valid) {
        // Add to offline queue
        const offlineTx = TransactionService.createOfflineTransaction(transaction, 'received');
        await OfflineQueue.addTransaction(offlineTx);

        // Add balance immediately (receiver side)
        console.log('[PaymentStore] Adding balance for received payment');
        await walletState.updateOfflineBalance(transaction.amount, 'add');

        // Send confirmation
        await PaymentProtocol.sendPaymentConfirmation(transaction.id, true, from);
      } else {
        // Send rejection
        await PaymentProtocol.sendPaymentConfirmation(transaction.id, false, from);
      }

      await get().refreshTransactions();
    } catch (error) {
      console.error('[PaymentStore] Error handling payment transaction:', error);
    }
  },

  /**
   * Handle incoming payment confirmation
   */
  handlePaymentConfirmation: async (confirmation: PaymentConfirmation, from: string) => {
    try {
      console.log('[PaymentStore] Handling payment confirmation:', confirmation.id);

      if (confirmation.confirmed) {
        // Mark transaction as confirmed
        const transaction = OfflineQueue.getTransaction(confirmation.transactionId);
        if (transaction) {
          const updated = TransactionService.markAsConfirmed(transaction);
          await OfflineQueue.updateTransaction(updated);
        }
      }

      // Update sessions
      const sessions = PaymentProtocol.getAllSessions();
      set({activeSessions: sessions});

      await get().refreshTransactions();
    } catch (error) {
      console.error('[PaymentStore] Error handling payment confirmation:', error);
    }
  },

  /**
   * Handle incoming payment cancellation
   */
  handlePaymentCancellation: async (cancellation: PaymentCancellation, from: string) => {
    try {
      console.log('[PaymentStore] Handling payment cancellation:', cancellation.id);

      // Update sessions
      const sessions = PaymentProtocol.getAllSessions();
      set({activeSessions: sessions});
    } catch (error) {
      console.error('[PaymentStore] Error handling payment cancellation:', error);
    }
  },

  /**
   * Sync transactions to backend
   */
  syncTransactions: async () => {
    try {
      console.log('[PaymentStore] Starting transaction sync...');
      const result = await SyncService.syncNow();
      return result;
    } catch (error) {
      console.error('[PaymentStore] Sync failed:', error);
      throw error;
    }
  },

  /**
   * Retry failed sync
   */
  retryFailedSync: async () => {
    try {
      console.log('[PaymentStore] Retrying failed transactions...');
      const result = await SyncService.retryFailedTransactions();
      return result;
    } catch (error) {
      console.error('[PaymentStore] Retry failed sync error:', error);
      throw error;
    }
  },

  /**
   * Refresh sync statistics
   */
  refreshSyncStats: () => {
    const stats = SyncService.getSyncStats();
    set({syncStats: stats});
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({error: null});
  },

  /**
   * Destroy and clean up
   */
  destroy: async () => {
    try {
      console.log('[PaymentStore] Destroying...');

      await Promise.all([
        PaymentProtocol.destroy(),
        TransactionService.destroy(),
        OfflineQueue.destroy(),
        SyncService.destroy(),
      ]);

      set({
        isInitialized: false,
        activeSessions: [],
        currentSession: null,
        offlineTransactions: [],
        queueStats: null,
        syncStats: null,
        isSyncing: false,
      });

      console.log('[PaymentStore] Destroyed successfully');
    } catch (error) {
      console.error('[PaymentStore] Error during destroy:', error);
    }
  },
}));
