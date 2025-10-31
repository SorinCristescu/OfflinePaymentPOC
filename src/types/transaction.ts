// src/types/transaction.ts

/**
 * Transaction type enumeration
 */
export enum TransactionType {
  ONLINE_TO_OFFLINE = 'online_to_offline',
  OFFLINE_TO_OFFLINE = 'offline_to_offline',
  OFFLINE_TO_ONLINE = 'offline_to_online',
}

/**
 * Transaction status enumeration
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Transaction direction enumeration
 */
export enum TransactionDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

/**
 * Transaction record interface
 */
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // In cents
  direction: TransactionDirection;
  senderDeviceId?: string;
  receiverDeviceId?: string;
  status: TransactionStatus;
  timestamp: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Transaction history interface
 */
export interface TransactionHistory {
  transactions: Transaction[];
  lastUpdated: Date;
}
