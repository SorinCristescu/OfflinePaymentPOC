/**
 * Color palette for the SMVC Offline Payment app
 * Supporting both light and dark themes
 */

// Base colors that don't change between themes
const baseColors = {
  primary: {
    main: '#2563EB',
    light: '#3B82F6',
    dark: '#1E40AF',
    contrast: '#FFFFFF',
  },
  secondary: {
    main: '#7C3AED',
    light: '#8B5CF6',
    dark: '#6D28D9',
    contrast: '#FFFFFF',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    contrast: '#FFFFFF',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    contrast: '#FFFFFF',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    contrast: '#FFFFFF',
  },
  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    contrast: '#FFFFFF',
  },
};

export const lightColors = {
  ...baseColors,

  success: {
    ...baseColors.success,
    background: '#D1FAE5',
  },
  error: {
    ...baseColors.error,
    background: '#FEE2E2',
  },
  warning: {
    ...baseColors.warning,
    background: '#FEF3C7',
  },
  info: {
    ...baseColors.info,
    background: '#DBEAFE',
  },

  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    dark: '#111827',
  },

  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    disabled: '#D1D5DB',
    inverse: '#FFFFFF',
  },

  border: {
    light: '#E5E7EB',
    main: '#D1D5DB',
    dark: '#9CA3AF',
  },

  finance: {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#6B7280',
  },

  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },

  surface: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    elevated: '#FFFFFF',
  },
} as const;

export const darkColors = {
  ...baseColors,

  success: {
    ...baseColors.success,
    background: '#064E3B',
  },
  error: {
    ...baseColors.error,
    background: '#7F1D1D',
  },
  warning: {
    ...baseColors.warning,
    background: '#78350F',
  },
  info: {
    ...baseColors.info,
    background: '#1E3A8A',
  },

  neutral: {
    50: '#111827',
    100: '#1F2937',
    200: '#374151',
    300: '#4B5563',
    400: '#6B7280',
    500: '#9CA3AF',
    600: '#D1D5DB',
    700: '#E5E7EB',
    800: '#F3F4F6',
    900: '#F9FAFB',
  },

  background: {
    primary: '#111827',
    secondary: '#1F2937',
    tertiary: '#374151',
    dark: '#000000',
  },

  text: {
    primary: '#F9FAFB',
    secondary: '#D1D5DB',
    tertiary: '#9CA3AF',
    disabled: '#6B7280',
    inverse: '#111827',
  },

  border: {
    light: '#374151',
    main: '#4B5563',
    dark: '#6B7280',
  },

  finance: {
    positive: '#34D399',
    negative: '#F87171',
    neutral: '#9CA3AF',
  },

  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.6)',
    dark: 'rgba(0, 0, 0, 0.8)',
  },

  surface: {
    primary: '#1F2937',
    secondary: '#374151',
    elevated: '#1F2937',
  },
} as const;

// Default export for backward compatibility (will be replaced by theme context)
export const colors = lightColors;

export type Colors = typeof lightColors;
