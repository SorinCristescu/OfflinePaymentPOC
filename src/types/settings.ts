/**
 * Settings types for the SMVC Offline Payment app
 */

export enum BiometricType {
  NONE = 'none',
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'face_id',
  IRIS = 'iris',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum NotificationPreference {
  ALL = 'all',
  IMPORTANT = 'important',
  NONE = 'none',
}

export interface SecuritySettings {
  biometricEnabled: boolean;
  biometricType: BiometricType;
  pinEnabled: boolean;
  autoLockEnabled: boolean;
  autoLockDuration: number; // in seconds
  requireAuthForTransactions: boolean;
}

export interface NotificationSettings {
  transactionsEnabled: boolean;
  securityAlertsEnabled: boolean;
  promotionsEnabled: boolean;
  preference: NotificationPreference;
}

export interface AppSettings {
  theme: Theme;
  language: string;
  currency: string;
  showBalanceOnHome: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
  hasTEE: boolean;
  hasSE: boolean;
  hasNFC: boolean;
  hasBLE: boolean;
}

export interface SettingsState {
  security: SecuritySettings;
  notifications: NotificationSettings;
  app: AppSettings;
  device: DeviceInfo;
  isOnboardingCompleted: boolean;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  biometricEnabled: false,
  biometricType: BiometricType.NONE,
  pinEnabled: false,
  autoLockEnabled: true,
  autoLockDuration: 300, // 5 minutes
  requireAuthForTransactions: true,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  transactionsEnabled: true,
  securityAlertsEnabled: true,
  promotionsEnabled: false,
  preference: NotificationPreference.IMPORTANT,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: Theme.AUTO,
  language: 'en',
  currency: 'USD',
  showBalanceOnHome: true,
  hapticFeedback: true,
  soundEffects: true,
};
