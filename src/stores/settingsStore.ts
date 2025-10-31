/**
 * Settings store for managing app settings and preferences
 * Uses Zustand for state management
 */

import {create} from 'zustand';
import {Platform} from 'react-native';
import {
  SettingsState,
  SecuritySettings,
  NotificationSettings,
  AppSettings,
  DeviceInfo,
  BiometricType,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_APP_SETTINGS,
} from '../types';

interface SettingsStore extends SettingsState {
  // Actions
  initializeSettings: (deviceInfo: DeviceInfo) => void;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  setBiometricEnabled: (enabled: boolean, type?: BiometricType) => void;
  setPinEnabled: (enabled: boolean) => void;
  setOnboardingCompleted: () => void;
  reset: () => void;
}

// Generate a unique device ID (in real app, this would be more robust)
const generateDeviceId = (): string => {
  return `device_${Platform.OS}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
};

// Mock device info (will be enhanced in Phase 3-4 with real device detection)
const getInitialDeviceInfo = (): DeviceInfo => ({
  deviceId: generateDeviceId(),
  deviceName: Platform.select({
    ios: 'iPhone',
    android: 'Android Device',
    default: 'Unknown Device',
  }) as string,
  platform: Platform.OS as 'ios' | 'android',
  osVersion: Platform.Version.toString(),
  appVersion: '1.0.0',
  hasTEE: false, // Will be detected in Phase 4
  hasSE: false, // Will be detected in Phase 4
  hasNFC: false, // Will be detected in Phase 7
  hasBLE: true, // Will be detected in Phase 5
});

const initialState: SettingsState = {
  security: DEFAULT_SECURITY_SETTINGS,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  app: DEFAULT_APP_SETTINGS,
  device: getInitialDeviceInfo(),
  isOnboardingCompleted: false,
};

export const useSettingsStore = create<SettingsStore>((set, _get) => ({
  ...initialState,

  initializeSettings: (deviceInfo: DeviceInfo) => {
    set({
      device: deviceInfo,
    });
  },

  updateSecuritySettings: (settings: Partial<SecuritySettings>) => {
    set(state => ({
      security: {
        ...state.security,
        ...settings,
      },
    }));
  },

  updateNotificationSettings: (settings: Partial<NotificationSettings>) => {
    set(state => ({
      notifications: {
        ...state.notifications,
        ...settings,
      },
    }));
  },

  updateAppSettings: (settings: Partial<AppSettings>) => {
    set(state => ({
      app: {
        ...state.app,
        ...settings,
      },
    }));
  },

  setBiometricEnabled: (enabled: boolean, type?: BiometricType) => {
    set(state => ({
      security: {
        ...state.security,
        biometricEnabled: enabled,
        ...(type && {biometricType: type}),
      },
    }));
  },

  setPinEnabled: (enabled: boolean) => {
    set(state => ({
      security: {
        ...state.security,
        pinEnabled: enabled,
      },
    }));
  },

  setOnboardingCompleted: () => {
    set({isOnboardingCompleted: true});
  },

  reset: () => {
    set({
      ...initialState,
      device: getInitialDeviceInfo(), // Keep device info
    });
  },
}));
