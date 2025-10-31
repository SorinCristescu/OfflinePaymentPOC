// src/utils/validation.ts
import { z } from 'zod';
import { BALANCE_LIMITS } from './constants';

/**
 * Zod schema for transfer validation
 */
export const TransferSchema = z.object({
  amount: z
    .number()
    .min(BALANCE_LIMITS.MIN_TRANSACTION, 'Minimum transfer is $1.00')
    .max(BALANCE_LIMITS.MAX_SINGLE_TRANSACTION, 'Maximum transfer is $100.00')
    .refine((val) => val % 1 === 0, 'Amount must be in cents (no decimals)'),
  sourceBalance: z.number().min(0),
  destinationBalance: z.number().min(0),
  destinationLimit: z.number(),
});

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a transfer request
 */
export const validateTransfer = (
  amount: number,
  sourceBalance: number,
  destinationBalance: number,
  destinationLimit: number
): ValidationResult => {
  // Check sufficient source balance
  if (amount > sourceBalance) {
    return { valid: false, error: 'Insufficient balance' };
  }

  // Check destination limit
  if (destinationBalance + amount > destinationLimit) {
    return {
      valid: false,
      error: `Cannot exceed offline balance limit of $${(
        destinationLimit / 100
      ).toFixed(2)}`,
    };
  }

  // Validate with Zod schema
  const result = TransferSchema.safeParse({
    amount,
    sourceBalance,
    destinationBalance,
    destinationLimit,
  });

  if (!result.success) {
    return { valid: false, error: result.error.issues[0].message };
  }

  return { valid: true };
};
