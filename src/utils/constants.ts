// src/utils/constants.ts

/**
 * Balance and transaction limits
 */
export const BALANCE_LIMITS = {
  MAX_OFFLINE_BALANCE: 50000, // $500.00 in cents
  MAX_SINGLE_TRANSACTION: 10000, // $100.00 in cents
  MAX_DAILY_LIMIT: 30000, // $300.00 in cents
  MAX_HOURLY_TRANSACTIONS: 10,
  MIN_TRANSACTION: 100, // $1.00 in cents
} as const;

/**
 * Mock bank service configuration
 */
export const MOCK_BANK = {
  INITIAL_ONLINE_BALANCE: 100000, // $1,000.00 in cents
  API_DELAY_MS: 800, // Simulate network latency
  FAILURE_RATE: 0.05, // 5% simulated failure rate
} as const;

/**
 * AsyncStorage keys for data persistence
 */
export const STORAGE_KEYS = {
  TRANSACTIONS: '@smvc_transactions',
  WALLET: '@smvc_wallet',
  ENCRYPTED_WALLET: '@smvc_encrypted_wallet',
  DEVICE_ID: '@smvc_device_id',
} as const;
