// src/services/wallet/BankMockService.ts
import { MOCK_BANK } from '../../utils/constants';

/**
 * Bank account interface
 */
export interface BankAccount {
  accountNumber: string;
  balance: number; // In cents
  accountHolder: string;
}

/**
 * Withdrawal request interface
 */
export interface WithdrawalRequest {
  amount: number;
  accountNumber: string;
}

/**
 * Withdrawal/deposit response interface
 */
export interface WithdrawalResponse {
  success: boolean;
  transactionId: string;
  newBalance: number;
  timestamp: Date;
  errorMessage?: string;
}

/**
 * Mock bank service for simulating online banking API
 */
class BankMockService {
  private account: BankAccount;

  constructor() {
    // Initialize mock account
    this.account = {
      accountNumber:
        'MOCK-' + Math.random().toString(36).substring(7).toUpperCase(),
      balance: MOCK_BANK.INITIAL_ONLINE_BALANCE,
      accountHolder: 'Test User',
    };
  }

  /**
   * Get current account details
   */
  async getAccount(): Promise<BankAccount> {
    await this.simulateNetworkDelay();
    return { ...this.account };
  }

  /**
   * Withdraw funds from bank account (transfer to offline balance)
   */
  async withdraw(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    await this.simulateNetworkDelay();

    // Simulate random failures
    if (Math.random() < MOCK_BANK.FAILURE_RATE) {
      return {
        success: false,
        transactionId: '',
        newBalance: this.account.balance,
        timestamp: new Date(),
        errorMessage: 'Bank service temporarily unavailable',
      };
    }

    // Check sufficient balance
    if (request.amount > this.account.balance) {
      return {
        success: false,
        transactionId: '',
        newBalance: this.account.balance,
        timestamp: new Date(),
        errorMessage: 'Insufficient bank account balance',
      };
    }

    // Process withdrawal
    this.account.balance -= request.amount;

    return {
      success: true,
      transactionId: 'TXN-' + Date.now().toString(36).toUpperCase(),
      newBalance: this.account.balance,
      timestamp: new Date(),
    };
  }

  /**
   * Deposit funds to bank account (transfer from offline balance)
   */
  async deposit(amount: number): Promise<WithdrawalResponse> {
    await this.simulateNetworkDelay();

    this.account.balance += amount;

    return {
      success: true,
      transactionId: 'TXN-' + Date.now().toString(36).toUpperCase(),
      newBalance: this.account.balance,
      timestamp: new Date(),
    };
  }

  /**
   * Reset account to initial state (for testing)
   */
  resetAccount(): void {
    this.account.balance = MOCK_BANK.INITIAL_ONLINE_BALANCE;
  }

  /**
   * Simulate network delay
   */
  private async simulateNetworkDelay(): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, MOCK_BANK.API_DELAY_MS)
    );
  }
}

export const bankMockService = new BankMockService();
