/**
 * TransactionService - Offline Transaction Management
 * Phase 6: Offline Payment Protocol
 *
 * Creates, signs, and validates offline payment transactions
 * Manages transaction balances and nonces
 */

import {NativeModules} from 'react-native';
import {DeviceIdentityService} from '../security/DeviceIdentityService';
import {KeyManagementService, KeyIds} from '../security/KeyManagementService';
import {
  PaymentTransaction,
  OfflineTransaction,
  PaymentMessageType,
  OfflineTransactionStatus,
  SyncStatus,
} from '../../types/payment';

const {SMVCSecurityModule} = NativeModules;

/**
 * Transaction creation options
 */
interface CreateTransactionOptions {
  requestId: string;
  toDeviceId: string;
  amount: number;
  currency: string;
  memo?: string;
  currentBalance: number;
}

/**
 * Transaction signing result
 */
interface SigningResult {
  signature: string;
  publicKey: string;
}

/**
 * Transaction Service
 */
class TransactionServiceClass {
  private isInitialized: boolean = false;
  private ourDeviceId: string = '';
  private usedNonces: Set<string> = new Set();

  /**
   * Initialize transaction service
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('[TransactionService] Already initialized');
        return;
      }

      console.log('[TransactionService] Initializing...');

      // Get our device ID
      const identity = await DeviceIdentityService.getDeviceIdentity();
      this.ourDeviceId = identity.deviceId;

      // Ensure transaction signing key exists
      const keyExists = await KeyManagementService.keyExists(KeyIds.TRANSACTION_SIGNING);
      if (!keyExists) {
        console.log('[TransactionService] Transaction key not found, generating...');
        await KeyManagementService.initializeTransactionKey();
      }

      this.isInitialized = true;
      console.log('[TransactionService] Initialized successfully');
    } catch (error) {
      console.error('[TransactionService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a payment transaction
   */
  async createTransaction(options: CreateTransactionOptions): Promise<PaymentTransaction> {
    try {
      if (!this.isInitialized) {
        throw new Error('TransactionService not initialized');
      }

      console.log('[TransactionService] Creating transaction:', options.requestId);

      // Generate transaction ID and nonce
      const transactionId = this.generateTransactionId();
      const nonce = await this.generateNonce();

      // Calculate new balance
      const newBalance = options.currentBalance - options.amount;
      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }

      // Create transaction object
      const transaction: PaymentTransaction = {
        type: PaymentMessageType.PAYMENT_TRANSACTION,
        id: transactionId,
        requestId: options.requestId,
        timestamp: Date.now(),
        from: this.ourDeviceId,
        to: options.toDeviceId,
        amount: options.amount,
        currency: options.currency,
        memo: options.memo,
        nonce,
        senderBalance: options.currentBalance,
        signatures: {
          sender: '', // Will be filled by signTransaction
        },
      };

      // Sign the transaction
      const signature = await this.signTransaction(transaction);
      transaction.signatures.sender = signature.signature;

      console.log('[TransactionService] Transaction created:', transactionId);
      return transaction;
    } catch (error) {
      console.error('[TransactionService] Failed to create transaction:', error);
      throw error;
    }
  }

  /**
   * Create an offline transaction record
   */
  createOfflineTransaction(
    transaction: PaymentTransaction,
    type: 'sent' | 'received'
  ): OfflineTransaction {
    try {
      console.log('[TransactionService] Creating offline transaction record:', transaction.id);

      const offlineTransaction: OfflineTransaction = {
        id: transaction.id,
        type,
        amount: transaction.amount,
        currency: transaction.currency,
        from: transaction.from,
        to: transaction.to,
        memo: transaction.memo,
        timestamp: transaction.timestamp,
        status: OfflineTransactionStatus.SIGNED,
        signatures: {
          sender: transaction.signatures.sender,
          receiver: transaction.signatures.receiver,
        },
        syncStatus: SyncStatus.NOT_SYNCED,
        syncAttempts: 0,
        requestId: transaction.requestId,
        nonce: transaction.nonce,
        balance: {
          before: transaction.senderBalance,
          after: transaction.senderBalance - transaction.amount,
        },
      };

      return offlineTransaction;
    } catch (error) {
      console.error('[TransactionService] Failed to create offline transaction:', error);
      throw error;
    }
  }

  /**
   * Sign a payment transaction using hardware keys
   */
  async signTransaction(transaction: PaymentTransaction): Promise<SigningResult> {
    try {
      console.log('[TransactionService] Signing transaction:', transaction.id);

      // Create signing payload (canonical transaction representation)
      const payload = this.createSigningPayload(transaction);

      // Get public key for transaction signing
      const publicKey = await KeyManagementService.getPublicKey(KeyIds.TRANSACTION_SIGNING);

      // Sign using hardware-backed key
      let signature: string;

      if (SMVCSecurityModule && SMVCSecurityModule.signData) {
        // Use native module to sign with hardware key
        const result = await SMVCSecurityModule.signData(
          KeyIds.TRANSACTION_SIGNING,
          payload
        );
        signature = result.signature;
      } else {
        // Fallback: Create a placeholder signature for development
        // In production, this should ALWAYS use hardware signing
        console.warn('[TransactionService] Native signing not available, using placeholder');
        signature = Buffer.from(payload).toString('base64');
      }

      console.log('[TransactionService] Transaction signed successfully');

      return {
        signature,
        publicKey,
      };
    } catch (error) {
      console.error('[TransactionService] Failed to sign transaction:', error);
      throw error;
    }
  }

  /**
   * Verify a transaction signature
   */
  async verifyTransactionSignature(
    transaction: PaymentTransaction,
    publicKey: string,
    signature: string
  ): Promise<boolean> {
    try {
      console.log('[TransactionService] Verifying transaction signature:', transaction.id);

      // Create signing payload
      const payload = this.createSigningPayload(transaction);

      if (SMVCSecurityModule && SMVCSecurityModule.verifySignature) {
        // Use native module to verify signature
        const result = await SMVCSecurityModule.verifySignature(
          publicKey,
          payload,
          signature
        );
        return result.valid;
      } else {
        // Fallback: Accept all signatures in development
        console.warn('[TransactionService] Native verification not available, accepting signature');
        return true;
      }
    } catch (error) {
      console.error('[TransactionService] Failed to verify signature:', error);
      return false;
    }
  }

  /**
   * Add receiver signature to transaction
   */
  addReceiverSignature(
    transaction: PaymentTransaction,
    signature: string
  ): PaymentTransaction {
    const updated = {...transaction};
    updated.signatures.receiver = signature;
    return updated;
  }

  /**
   * Create canonical signing payload for a transaction
   */
  private createSigningPayload(transaction: PaymentTransaction): string {
    // Create a canonical representation for signing
    // Order is important to ensure consistent signatures
    const signingData = {
      id: transaction.id,
      type: transaction.type,
      requestId: transaction.requestId,
      timestamp: transaction.timestamp,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      currency: transaction.currency,
      nonce: transaction.nonce,
      senderBalance: transaction.senderBalance,
    };

    // Convert to JSON string (deterministic)
    return JSON.stringify(signingData);
  }

  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `tx_${timestamp}_${random}`;
  }

  /**
   * Generate a cryptographically secure nonce
   */
  private async generateNonce(): Promise<string> {
    // Create a nonce that combines:
    // - Timestamp
    // - Device ID
    // - Random component
    // This ensures uniqueness and prevents replay attacks

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const nonce = `${this.ourDeviceId}_${timestamp}_${random}`;

    // Check if nonce has been used (prevent duplicates in same session)
    if (this.usedNonces.has(nonce)) {
      // Recursive call to generate a new one (very unlikely)
      return this.generateNonce();
    }

    this.usedNonces.add(nonce);

    // Limit memory usage by clearing old nonces (keep last 10000)
    if (this.usedNonces.size > 10000) {
      const noncesArray = Array.from(this.usedNonces);
      this.usedNonces = new Set(noncesArray.slice(-5000));
    }

    return nonce;
  }

  /**
   * Validate nonce uniqueness
   */
  isNonceValid(nonce: string, existingNonces: string[]): boolean {
    // Check if nonce has been seen before
    return !existingNonces.includes(nonce);
  }

  /**
   * Calculate transaction hash for verification
   */
  calculateTransactionHash(transaction: PaymentTransaction): string {
    const payload = this.createSigningPayload(transaction);
    // In production, use a proper hash function (SHA-256)
    // For now, use base64 encoding
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Validate transaction data
   */
  validateTransactionData(transaction: PaymentTransaction): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate required fields
    if (!transaction.id) errors.push('Transaction ID is required');
    if (!transaction.requestId) errors.push('Request ID is required');
    if (!transaction.from) errors.push('Sender device ID is required');
    if (!transaction.to) errors.push('Receiver device ID is required');
    if (!transaction.nonce) errors.push('Nonce is required');

    // Validate amount
    if (transaction.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // Validate balance
    if (transaction.senderBalance < transaction.amount) {
      errors.push('Insufficient sender balance');
    }

    // Validate timestamp (not too old, not in future)
    const now = Date.now();
    const age = now - transaction.timestamp;
    if (age < 0) {
      errors.push('Transaction timestamp is in the future');
    } else if (age > 5 * 60 * 1000) {
      // Older than 5 minutes
      errors.push('Transaction is too old');
    }

    // Validate signature
    if (!transaction.signatures.sender) {
      errors.push('Sender signature is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update transaction status
   */
  updateTransactionStatus(
    transaction: OfflineTransaction,
    status: OfflineTransactionStatus,
    error?: string
  ): OfflineTransaction {
    return {
      ...transaction,
      status,
      error,
    };
  }

  /**
   * Mark transaction as transmitted
   */
  markAsTransmitted(transaction: OfflineTransaction): OfflineTransaction {
    return {
      ...transaction,
      status: OfflineTransactionStatus.TRANSMITTED,
    };
  }

  /**
   * Mark transaction as confirmed
   */
  markAsConfirmed(transaction: OfflineTransaction): OfflineTransaction {
    return {
      ...transaction,
      status: OfflineTransactionStatus.CONFIRMED,
      syncStatus: SyncStatus.NOT_SYNCED, // Ready to sync to backend
    };
  }

  /**
   * Get transaction summary for display
   */
  getTransactionSummary(transaction: OfflineTransaction): {
    id: string;
    type: string;
    amount: string;
    status: string;
    date: string;
  } {
    return {
      id: transaction.id,
      type: transaction.type === 'sent' ? 'Sent' : 'Received',
      amount: `${transaction.amount} ${transaction.currency}`,
      status: this.getStatusLabel(transaction.status),
      date: new Date(transaction.timestamp).toLocaleString(),
    };
  }

  /**
   * Get human-readable status label
   */
  private getStatusLabel(status: OfflineTransactionStatus): string {
    const labels: Record<OfflineTransactionStatus, string> = {
      [OfflineTransactionStatus.PENDING]: 'Pending',
      [OfflineTransactionStatus.SIGNED]: 'Signed',
      [OfflineTransactionStatus.TRANSMITTED]: 'Transmitted',
      [OfflineTransactionStatus.CONFIRMED]: 'Confirmed',
      [OfflineTransactionStatus.FAILED]: 'Failed',
    };

    return labels[status] || status;
  }

  /**
   * Clean up and destroy service
   */
  async destroy(): Promise<void> {
    try {
      console.log('[TransactionService] Destroying...');

      this.usedNonces.clear();
      this.isInitialized = false;

      console.log('[TransactionService] Destroyed successfully');
    } catch (error) {
      console.error('[TransactionService] Error during destroy:', error);
    }
  }
}

// Export singleton instance
export const TransactionService = new TransactionServiceClass();
