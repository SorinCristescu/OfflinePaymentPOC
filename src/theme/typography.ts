/**
 * Typography system for the SMVC Offline Payment app
 * Based on a modular scale for consistency
 */

import {Platform} from 'react-native';

// Font families
export const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  semiBold: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

// Font weights
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
} as const;

// Font sizes - Using a modular scale (1.250 - Major Third)
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

// Line heights
export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// Typography variants for common text styles
export const typography = {
  // Display text (large headings)
  displayLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['5xl'],
    lineHeight: fontSize['5xl'] * lineHeight.tight,
    fontWeight: fontWeight.bold,
  },
  displayMedium: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'] * lineHeight.tight,
    fontWeight: fontWeight.bold,
  },
  displaySmall: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * lineHeight.tight,
    fontWeight: fontWeight.bold,
  },

  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * lineHeight.tight,
    fontWeight: fontWeight.bold,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.tight,
    fontWeight: fontWeight.bold,
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * lineHeight.tight,
    fontWeight: fontWeight.semiBold,
  },
  h4: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * lineHeight.normal,
    fontWeight: fontWeight.semiBold,
  },

  // Body text
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * lineHeight.normal,
    fontWeight: fontWeight.regular,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.normal,
    fontWeight: fontWeight.regular,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    fontWeight: fontWeight.regular,
  },

  // Labels
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.normal,
    fontWeight: fontWeight.medium,
  },
  labelSmall: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    fontWeight: fontWeight.medium,
  },

  // Captions
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    fontWeight: fontWeight.regular,
  },
  captionSmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * lineHeight.normal,
    fontWeight: fontWeight.regular,
  },

  // Button text
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.tight,
    fontWeight: fontWeight.semiBold,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.tight,
    fontWeight: fontWeight.semiBold,
    letterSpacing: 0.5,
  },

  // Special: Currency/Amount display
  currency: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'] * lineHeight.tight,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  currencySmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.tight,
    fontWeight: fontWeight.semiBold,
  },

  // Monospace (for transaction IDs, codes)
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    fontWeight: fontWeight.regular,
  },
} as const;

export type Typography = typeof typography;
