/**
 * Payment Types
 * Phase 6: Offline Payment Protocol
 *
 * Type definitions for offline peer-to-peer payments
 */

/**
 * Payment status enumeration
 */
export enum PaymentStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * Offline transaction status
 */
export enum OfflineTransactionStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
  TRANSMITTED = 'transmitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * Sync status for offline transactions
 */
export enum SyncStatus {
  NOT_SYNCED = 'not_synced',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  SYNC_FAILED = 'sync_failed',
  CONFLICT = 'conflict',
}

/**
 * Payment message types
 */
export enum PaymentMessageType {
  PAYMENT_REQUEST = 'payment_request',
  PAYMENT_RESPONSE = 'payment_response',
  PAYMENT_TRANSACTION = 'payment_transaction',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  PAYMENT_CANCELLATION = 'payment_cancellation',
}

/**
 * Payment request message
 */
export interface PaymentRequest {
  type: PaymentMessageType.PAYMENT_REQUEST;
  id: string;
  timestamp: number;
  from: string; // Sender device ID
  to: string; // Receiver device ID
  amount: number;
  currency: string;
  memo?: string;
  expiresAt: number;
  signature: string;
}

/**
 * Payment response message
 */
export interface PaymentResponse {
  type: PaymentMessageType.PAYMENT_RESPONSE;
  id: string;
  requestId: string; // Original request ID
  timestamp: number;
  from: string; // Receiver device ID
  to: string; // Sender device ID
  accepted: boolean;
  reason?: string; // Rejection reason if not accepted
  signature: string;
}

/**
 * Payment transaction message
 */
export interface PaymentTransaction {
  type: PaymentMessageType.PAYMENT_TRANSACTION;
  id: string;
  requestId: string; // Original request ID
  timestamp: number;
  from: string; // Sender device ID
  to: string; // Receiver device ID
  amount: number;
  currency: string;
  memo?: string;
  nonce: string; // Unique nonce to prevent replay
  senderBalance: number; // Sender's balance before transaction
  signatures: {
    sender: string;
    receiver?: string; // Added after receiver confirms
  };
}

/**
 * Payment confirmation message
 */
export interface PaymentConfirmation {
  type: PaymentMessageType.PAYMENT_CONFIRMATION;
  id: string;
  transactionId: string;
  timestamp: number;
  from: string;
  to: string;
  confirmed: boolean;
  signature: string;
}

/**
 * Payment cancellation message
 */
export interface PaymentCancellation {
  type: PaymentMessageType.PAYMENT_CANCELLATION;
  id: string;
  requestId: string;
  timestamp: number;
  from: string;
  to: string;
  reason: string;
  signature: string;
}

/**
 * Union type for all payment messages
 */
export type PaymentMessage =
  | PaymentRequest
  | PaymentResponse
  | PaymentTransaction
  | PaymentConfirmation
  | PaymentCancellation;

/**
 * Offline transaction record
 */
export interface OfflineTransaction {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  currency: string;
  from: string; // Device ID
  to: string; // Device ID
  memo?: string;
  timestamp: number;
  status: OfflineTransactionStatus;
  signatures: {
    sender: string;
    receiver?: string;
  };
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncAttempt?: number;
  syncedAt?: number;
  error?: string;
  requestId?: string;
  nonce: string;
  balance: {
    before: number;
    after: number;
  };
}

/**
 * Payment session (active payment in progress)
 */
export interface PaymentSession {
  id: string;
  deviceId: string; // Peer device ID
  deviceName: string; // Peer device name
  role: 'sender' | 'receiver';
  amount: number;
  currency: string;
  memo?: string;
  status: PaymentStatus;
  createdAt: number;
  expiresAt: number;
  requestId?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Payment validation result
 */
export interface PaymentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Payment creation options
 */
export interface CreatePaymentOptions {
  deviceId: string;
  amount: number;
  currency?: string;
  memo?: string;
  timeout?: number; // In milliseconds
}

/**
 * Offline queue statistics
 */
export interface OfflineQueueStats {
  totalTransactions: number;
  pendingSync: number;
  synced: number;
  failed: number;
  totalAmount: number;
  oldestTransaction?: number;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{
    transactionId: string;
    error: string;
  }>;
}

/**
 * Transaction conflict
 */
export interface TransactionConflict {
  localTransaction: OfflineTransaction;
  remoteTransaction: any; // Server transaction
  conflictType: 'duplicate' | 'double_spend' | 'balance_mismatch';
  resolution?: 'keep_local' | 'keep_remote' | 'merge';
}

/**
 * Payment notification
 */
export interface PaymentNotification {
  id: string;
  type: 'request' | 'received' | 'sent' | 'failed';
  title: string;
  message: string;
  amount: number;
  currency: string;
  deviceId: string;
  timestamp: number;
  read: boolean;
}

/**
 * Payment filter options
 */
export interface PaymentFilterOptions {
  type?: 'sent' | 'received' | 'all';
  status?: OfflineTransactionStatus[];
  syncStatus?: SyncStatus[];
  dateFrom?: number;
  dateTo?: number;
  minAmount?: number;
  maxAmount?: number;
  deviceId?: string;
}

/**
 * Payment statistics
 */
export interface PaymentStats {
  totalSent: number;
  totalReceived: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  averageAmount: number;
  totalVolume: number;
}
