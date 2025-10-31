// src/utils/formatting.ts
import { TransactionType } from '../types/transaction';

/**
 * Format amount in cents to currency string
 */
export const formatCurrency = (amountInCents: number): string => {
  // Handle undefined, null, or NaN values
  if (amountInCents == null || isNaN(amountInCents)) {
    return '$0.00';
  }

  return `$${(amountInCents / 100).toFixed(2)}`;
};

/**
 * Parse currency input string to cents
 */
export const parseCurrencyInput = (input: string): number => {
  // Remove non-numeric characters except decimal point
  const cleaned = input.replace(/[^0-9.]/g, '');
  const amount = parseFloat(cleaned);

  if (isNaN(amount)) return 0;

  // Convert to cents
  return Math.round(amount * 100);
};

/**
 * Format transaction type to human-readable string
 */
export const formatTransactionType = (type: TransactionType): string => {
  switch (type) {
    case TransactionType.ONLINE_TO_OFFLINE:
      return 'Load Offline Balance';
    case TransactionType.OFFLINE_TO_OFFLINE:
      return 'P2P Payment';
    case TransactionType.OFFLINE_TO_ONLINE:
      return 'Unload to Bank';
    default:
      return 'Unknown';
  }
};

/**
 * Format date to human-readable string
 */
export const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
