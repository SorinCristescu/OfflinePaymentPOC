/**
 * Authentication and security types for Phase 3
 */

import {BiometricType} from './settings';

/**
 * Authentication methods supported by the app
 */
export enum AuthenticationMethod {
  NONE = 'none',
  PIN = 'pin',
  BIOMETRIC = 'biometric',
  PIN_AND_BIOMETRIC = 'pin_and_biometric',
}

/**
 * Authentication status
 */
export enum AuthenticationStatus {
  UNAUTHENTICATED = 'unauthenticated',
  AUTHENTICATED = 'authenticated',
  LOCKED = 'locked',
  REQUIRES_SETUP = 'requires_setup',
}

/**
 * Biometric sensor capabilities on the device
 */
export interface BiometricCapabilities {
  isAvailable: boolean;
  biometricType: BiometricType;
  hasEnrolledCredentials: boolean;
  errorMessage?: string;
}

/**
 * Result of a biometric authentication attempt
 */
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

/**
 * PIN validation result
 */
export interface PINValidationResult {
  isValid: boolean;
  error?: string;
  attemptsRemaining?: number;
}

/**
 * Authentication result combining PIN and biometric
 */
export interface AuthenticationResult {
  success: boolean;
  method: AuthenticationMethod;
  error?: string;
  timestamp: Date;
}

/**
 * Authentication state for the app
 */
export interface AuthenticationState {
  status: AuthenticationStatus;
  method: AuthenticationMethod;
  lastAuthenticationTime?: Date;
  failedAttempts: number;
  isLocked: boolean;
  lockoutEndTime?: Date;
}

/**
 * Device identity information
 */
export interface DeviceIdentity {
  deviceId: string;
  deviceFingerprint: string; // Unique device identifier
  publicKey?: string; // For future Phase 4 TEE/SE integration
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * PIN setup data
 */
export interface PINSetupData {
  pin: string;
  confirmPin: string;
}

/**
 * PIN change data
 */
export interface PINChangeData {
  currentPin: string;
  newPin: string;
  confirmNewPin: string;
}

/**
 * Security event for audit logging
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  PIN_SETUP = 'pin_setup',
  PIN_CHANGED = 'pin_changed',
  BIOMETRIC_ENROLLED = 'biometric_enrolled',
  BIOMETRIC_DISABLED = 'biometric_disabled',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TRANSACTION_AUTHENTICATED = 'transaction_authenticated',
}

/**
 * Security audit event
 */
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: Date;
  deviceId: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Constants for PIN requirements
 */
export const PIN_REQUIREMENTS = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 8,
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 300, // 5 minutes in seconds
} as const;

/**
 * Constants for authentication
 */
export const AUTH_CONSTANTS = {
  SESSION_TIMEOUT: 900, // 15 minutes in seconds
  MAX_FAILED_ATTEMPTS: 5,
  BIOMETRIC_PROMPT_TITLE: 'Authentication Required',
  BIOMETRIC_PROMPT_SUBTITLE: 'Verify your identity to continue',
} as const;
