/**
 * ValidationService - Payment Validation
 * Phase 6: Offline Payment Protocol
 *
 * Validates payment requests, transactions, and balances
 * Ensures payment integrity and security
 */

import {TransactionService} from './TransactionService';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentTransaction,
  PaymentValidationResult,
  OfflineTransaction,
} from '../../types/payment';

/**
 * Payment limits and constraints
 */
const PAYMENT_LIMITS = {
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 10000,
  MAX_PAYMENT_AGE: 5 * 60 * 1000, // 5 minutes
  MIN_BALANCE: 0,
};

/**
 * Validation rules configuration
 */
interface ValidationConfig {
  requireTrustedPeers?: boolean;
  enforceAmountLimits?: boolean;
  strictTimestamps?: boolean;
  requireSignatures?: boolean;
}

const DEFAULT_CONFIG: ValidationConfig = {
  requireTrustedPeers: false, // Will be enabled when trust system is implemented
  enforceAmountLimits: true,
  strictTimestamps: true,
  requireSignatures: true,
};

/**
 * Validation Service
 */
class ValidationServiceClass {
  private config: ValidationConfig = DEFAULT_CONFIG;

  /**
   * Configure validation rules
   */
  configure(config: Partial<ValidationConfig>): void {
    this.config = {...this.config, ...config};
    console.log('[ValidationService] Configuration updated:', this.config);
  }

  /**
   * Validate a payment request
   */
  validatePaymentRequest(
    request: PaymentRequest,
    currentBalance: number
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('[ValidationService] Validating payment request:', request.id);

    // Validate required fields
    if (!request.id) errors.push('Request ID is required');
    if (!request.from) errors.push('Sender device ID is required');
    if (!request.to) errors.push('Receiver device ID is required');
    if (!request.timestamp) errors.push('Timestamp is required');

    // Validate amount
    const amountValidation = this.validateAmount(request.amount, request.currency);
    if (!amountValidation.valid) {
      errors.push(...amountValidation.errors);
    }
    warnings.push(...amountValidation.warnings);

    // Validate timestamp
    if (this.config.strictTimestamps) {
      const timestampValidation = this.validateTimestamp(request.timestamp);
      if (!timestampValidation.valid) {
        errors.push(...timestampValidation.errors);
      }
    }

    // Validate expiration
    if (request.expiresAt) {
      if (request.expiresAt <= Date.now()) {
        errors.push('Payment request has expired');
      }
      if (request.expiresAt <= request.timestamp) {
        errors.push('Expiration time must be after creation time');
      }
    }

    // Validate signature
    if (this.config.requireSignatures && !request.signature) {
      errors.push('Request signature is required');
    }

    // Validate balance (if we're the sender)
    if (currentBalance < request.amount) {
      errors.push('Insufficient balance');
    } else if (currentBalance - request.amount < PAYMENT_LIMITS.MIN_BALANCE) {
      warnings.push('Payment will leave balance very low');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a payment response
   */
  validatePaymentResponse(
    response: PaymentResponse,
    originalRequest?: PaymentRequest
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('[ValidationService] Validating payment response:', response.id);

    // Validate required fields
    if (!response.id) errors.push('Response ID is required');
    if (!response.requestId) errors.push('Request ID is required');
    if (!response.from) errors.push('Responder device ID is required');
    if (!response.to) errors.push('Requester device ID is required');
    if (!response.timestamp) errors.push('Timestamp is required');

    // Validate against original request
    if (originalRequest) {
      if (response.requestId !== originalRequest.id) {
        errors.push('Response request ID does not match original request');
      }
      if (response.from !== originalRequest.to) {
        errors.push('Response sender should be original receiver');
      }
      if (response.to !== originalRequest.from) {
        errors.push('Response receiver should be original sender');
      }
      if (response.timestamp < originalRequest.timestamp) {
        errors.push('Response timestamp cannot be before request timestamp');
      }
    }

    // Validate rejection reason
    if (!response.accepted && !response.reason) {
      warnings.push('Rejection reason not provided');
    }

    // Validate signature
    if (this.config.requireSignatures && !response.signature) {
      errors.push('Response signature is required');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a payment transaction
   */
  async validatePaymentTransaction(
    transaction: PaymentTransaction,
    currentBalance: number,
    usedNonces: string[]
  ): Promise<PaymentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('[ValidationService] Validating payment transaction:', transaction.id);

    // Use TransactionService for basic validation
    const basicValidation = TransactionService.validateTransactionData(transaction);
    errors.push(...basicValidation.errors);

    // Validate amount
    const amountValidation = this.validateAmount(transaction.amount, transaction.currency);
    if (!amountValidation.valid) {
      errors.push(...amountValidation.errors);
    }
    warnings.push(...amountValidation.warnings);

    // Validate nonce uniqueness
    if (!TransactionService.isNonceValid(transaction.nonce, usedNonces)) {
      errors.push('Nonce has already been used (possible replay attack)');
    }

    // Validate sender balance
    if (transaction.senderBalance < transaction.amount) {
      errors.push('Sender balance insufficient');
    }

    // Validate balance consistency
    if (currentBalance !== transaction.senderBalance) {
      warnings.push('Current balance does not match transaction sender balance');
    }

    // Validate signatures
    if (this.config.requireSignatures) {
      if (!transaction.signatures.sender) {
        errors.push('Sender signature is required');
      }
      // Receiver signature is optional (added after confirmation)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate amount
   */
  validateAmount(amount: number, currency: string): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if amount is a valid number
    if (typeof amount !== 'number' || isNaN(amount)) {
      errors.push('Amount must be a valid number');
      return {valid: false, errors, warnings};
    }

    // Check if amount is positive
    if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // Check minimum amount
    if (this.config.enforceAmountLimits && amount < PAYMENT_LIMITS.MIN_AMOUNT) {
      errors.push(`Amount must be at least ${PAYMENT_LIMITS.MIN_AMOUNT}`);
    }

    // Check maximum amount
    if (this.config.enforceAmountLimits && amount > PAYMENT_LIMITS.MAX_AMOUNT) {
      errors.push(`Amount cannot exceed ${PAYMENT_LIMITS.MAX_AMOUNT}`);
    }

    // Validate decimal places (max 2 for currency)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push('Amount cannot have more than 2 decimal places');
    }

    // Validate currency
    if (!currency || typeof currency !== 'string') {
      errors.push('Currency is required');
    } else if (currency.length !== 3) {
      warnings.push('Currency code should be 3 characters (ISO 4217)');
    }

    // Warning for large amounts
    if (amount > 1000) {
      warnings.push('Large payment amount - verify recipient before proceeding');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate timestamp
   */
  validateTimestamp(timestamp: number): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const now = Date.now();
    const age = now - timestamp;

    // Check if timestamp is valid
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
      errors.push('Invalid timestamp');
      return {valid: false, errors, warnings};
    }

    // Check if timestamp is in the future
    if (age < -60000) {
      // Allow 1 minute clock skew
      errors.push('Timestamp is in the future');
    }

    // Check if timestamp is too old
    if (age > PAYMENT_LIMITS.MAX_PAYMENT_AGE) {
      errors.push(`Payment is too old (max age: ${PAYMENT_LIMITS.MAX_PAYMENT_AGE / 1000}s)`);
    }

    // Warning for timestamps close to expiry
    if (age > PAYMENT_LIMITS.MAX_PAYMENT_AGE * 0.8) {
      warnings.push('Payment is nearing expiration');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate balance sufficiency
   */
  validateBalance(
    currentBalance: number,
    amount: number,
    minBalance: number = PAYMENT_LIMITS.MIN_BALANCE
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('[ValidationService] Validating balance:', {currentBalance, amount, minBalance});

    // Check if balance is sufficient
    if (currentBalance < amount) {
      errors.push('Insufficient balance');
    }

    // Check if payment would leave balance below minimum
    const remainingBalance = currentBalance - amount;
    if (remainingBalance < minBalance) {
      errors.push(`Balance would fall below minimum (${minBalance})`);
    }

    // Warning if balance is getting low
    if (remainingBalance < minBalance * 2) {
      warnings.push('Low balance after payment');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate peer device
   */
  validatePeer(
    deviceId: string,
    trustedDevices: string[] = []
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('[ValidationService] Validating peer device:', deviceId);

    // Check if device ID is provided
    if (!deviceId) {
      errors.push('Device ID is required');
      return {valid: false, errors, warnings};
    }

    // Check if device is trusted (if required)
    if (this.config.requireTrustedPeers && !trustedDevices.includes(deviceId)) {
      errors.push('Device is not in trusted peers list');
    }

    // Warning for non-trusted devices
    if (!trustedDevices.includes(deviceId)) {
      warnings.push('Device is not marked as trusted');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate offline transaction before sync
   */
  validateOfflineTransactionForSync(
    transaction: OfflineTransaction
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('[ValidationService] Validating offline transaction for sync:', transaction.id);

    // Check required fields
    if (!transaction.id) errors.push('Transaction ID is required');
    if (!transaction.from) errors.push('Sender device ID is required');
    if (!transaction.to) errors.push('Receiver device ID is required');
    if (!transaction.nonce) errors.push('Nonce is required');

    // Validate amount
    const amountValidation = this.validateAmount(transaction.amount, transaction.currency);
    if (!amountValidation.valid) {
      errors.push(...amountValidation.errors);
    }

    // Validate signatures
    if (!transaction.signatures.sender) {
      errors.push('Sender signature is missing');
    }
    if (!transaction.signatures.receiver && transaction.type === 'sent') {
      warnings.push('Receiver signature is missing');
    }

    // Validate balance tracking
    if (transaction.balance) {
      const expectedAfter = transaction.balance.before - transaction.amount;
      if (Math.abs(transaction.balance.after - expectedAfter) > 0.01) {
        errors.push('Balance calculation is incorrect');
      }
    }

    // Check transaction age
    const age = Date.now() - transaction.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      // Older than 24 hours
      warnings.push('Transaction is older than 24 hours');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Batch validate multiple transactions
   */
  async validateTransactionBatch(
    transactions: OfflineTransaction[]
  ): Promise<{
    valid: OfflineTransaction[];
    invalid: Array<{transaction: OfflineTransaction; errors: string[]}>;
  }> {
    const valid: OfflineTransaction[] = [];
    const invalid: Array<{transaction: OfflineTransaction; errors: string[]}> = [];

    for (const transaction of transactions) {
      const validation = this.validateOfflineTransactionForSync(transaction);
      if (validation.valid) {
        valid.push(transaction);
      } else {
        invalid.push({
          transaction,
          errors: validation.errors,
        });
      }
    }

    return {valid, invalid};
  }

  /**
   * Get validation summary for logging/debugging
   */
  getValidationSummary(result: PaymentValidationResult): string {
    const parts: string[] = [];

    if (result.valid) {
      parts.push('VALID');
    } else {
      parts.push('INVALID');
    }

    if (result.errors.length > 0) {
      parts.push(`Errors: ${result.errors.join(', ')}`);
    }

    if (result.warnings.length > 0) {
      parts.push(`Warnings: ${result.warnings.join(', ')}`);
    }

    return parts.join(' | ');
  }
}

// Export singleton instance
export const ValidationService = new ValidationServiceClass();
