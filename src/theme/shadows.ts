/**
 * Shadow and elevation system for the SMVC Offline Payment app
 * Provides depth and hierarchy to UI elements
 */

import {Platform} from 'react-native';

// iOS shadow properties
const iOSShadow = (elevation: number) => {
  const opacity = Math.min(0.3, elevation * 0.015);
  const radius = elevation;
  const offset = {
    width: 0,
    height: Math.ceil(elevation / 2),
  };

  return {
    shadowColor: '#000',
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
};

// Android elevation
const androidElevation = (elevation: number) => ({
  elevation,
});

// Unified shadow function
const createShadow = (elevation: number) => {
  if (Platform.OS === 'ios') {
    return iOSShadow(elevation);
  } else if (Platform.OS === 'android') {
    return androidElevation(elevation);
  }
  return {};
};

// Shadow presets
export const shadows = {
  none: createShadow(0),
  sm: createShadow(2),
  md: createShadow(4),
  lg: createShadow(8),
  xl: createShadow(12),
  '2xl': createShadow(16),
  '3xl': createShadow(24),
} as const;

// Specific shadows for components
export const componentShadows = {
  card: shadows.sm,
  cardElevated: shadows.md,
  button: shadows.sm,
  modal: shadows.xl,
  dropdown: shadows.lg,
  bottomSheet: shadows['2xl'],
  floatingActionButton: shadows.lg,
} as const;

export type Shadows = typeof shadows;
