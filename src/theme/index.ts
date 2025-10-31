/**
 * Main theme export for the SMVC Offline Payment app
 * Combines colors, typography, spacing, and shadows into a unified theme object
 */

import {colors} from './colors';
import {typography, fontFamily, fontSize, fontWeight, lineHeight} from './typography';
import {spacing, borderRadius, borderWidth, componentSpacing, iconSize, avatarSize} from './spacing';
import {shadows, componentShadows} from './shadows';

// Main theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  borderWidth,
  componentSpacing,
  iconSize,
  avatarSize,
  shadows,
  componentShadows,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} as const;

// Export individual modules for convenience
export {colors} from './colors';
export {typography, fontFamily, fontSize, fontWeight, lineHeight} from './typography';
export {spacing, borderRadius, borderWidth, componentSpacing, iconSize, avatarSize} from './spacing';
export {shadows, componentShadows} from './shadows';

// Theme type
export type Theme = typeof theme;

// Default export
export default theme;
