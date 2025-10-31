/**
 * Button Component - Reusable button with multiple variants
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {theme as staticTheme} from '../theme';
import {useTheme} from '../contexts/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const {theme} = useTheme();
  const styles = createStyles();
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      ...styles[`size_${size}`],
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    if (variant === 'primary') {
      baseStyle.backgroundColor = isDisabled
        ? theme.neutral[300]
        : theme.primary.main;
    } else if (variant === 'secondary') {
      baseStyle.backgroundColor = isDisabled
        ? theme.neutral[200]
        : theme.secondary.main;
    } else if (variant === 'outline') {
      baseStyle.backgroundColor = 'transparent';
      baseStyle.borderWidth = staticTheme.borderWidth.medium;
      baseStyle.borderColor = isDisabled
        ? theme.border.light
        : theme.primary.main;
    } else if (variant === 'ghost') {
      baseStyle.backgroundColor = 'transparent';
    }

    if (isDisabled) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...staticTheme.typography.button,
    };

    if (size === 'small') {
      baseTextStyle.fontSize = staticTheme.fontSize.sm;
    }

    if (variant === 'primary' || variant === 'secondary') {
      baseTextStyle.color = theme.primary.contrast;
    } else if (variant === 'outline' || variant === 'ghost') {
      baseTextStyle.color = isDisabled
        ? theme.text.disabled
        : theme.primary.main;
    }

    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'secondary'
              ? theme.primary.contrast
              : theme.primary.main
          }
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const createStyles = () => StyleSheet.create({
  button: {
    borderRadius: staticTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...staticTheme.componentShadows.button,
  },
  size_small: {
    paddingVertical: staticTheme.spacing.sm,
    paddingHorizontal: staticTheme.spacing.md,
  },
  size_medium: {
    paddingVertical: staticTheme.spacing.md,
    paddingHorizontal: staticTheme.spacing.xl,
  },
  size_large: {
    paddingVertical: staticTheme.spacing.lg,
    paddingHorizontal: staticTheme.spacing['2xl'],
  },
});
