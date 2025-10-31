/**
 * Spacing system for the SMVC Offline Payment app
 * Using a consistent 4px base unit
 */

// Base unit for spacing (4px)
const BASE_UNIT = 4;

// Spacing scale
export const spacing = {
  xs: BASE_UNIT, // 4px
  sm: BASE_UNIT * 2, // 8px
  md: BASE_UNIT * 3, // 12px
  lg: BASE_UNIT * 4, // 16px
  xl: BASE_UNIT * 5, // 20px
  '2xl': BASE_UNIT * 6, // 24px
  '3xl': BASE_UNIT * 8, // 32px
  '4xl': BASE_UNIT * 10, // 40px
  '5xl': BASE_UNIT * 12, // 48px
  '6xl': BASE_UNIT * 16, // 64px
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// Border widths
export const borderWidth = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 4,
} as const;

// Component-specific spacing
export const componentSpacing = {
  // Card spacing
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Button spacing
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },

  // Input spacing
  input: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  // Screen spacing
  screen: {
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  // List spacing
  list: {
    gap: spacing.md,
    itemPadding: spacing.lg,
  },

  // Safe area insets (additional padding for notched devices)
  safeArea: {
    top: spacing.md,
    bottom: spacing.md,
  },
} as const;

// Icon sizes
export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  '2xl': 48,
} as const;

// Avatar sizes
export const avatarSize = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type IconSize = typeof iconSize;
