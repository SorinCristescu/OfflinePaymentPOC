// src/types/wallet.ts

/**
 * Wallet state interface
 */
export interface WalletState {
  onlineBalance: number; // In cents
  offlineBalance: number; // In cents
  deviceId: string;
  lastSyncTimestamp?: Date;
}

/**
 * Transfer request interface
 */
export interface TransferRequest {
  amount: number; // In cents
  sourceType: 'online' | 'offline';
  destinationType: 'online' | 'offline';
}
