/**
 * AmountInput Component - Input for entering currency amounts
 */

import React, {useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {theme as staticTheme} from '../theme';
import {useTheme} from '../contexts/ThemeContext';
import {Colors} from '../theme/colors';

interface AmountInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  currency?: string;
  label?: string;
  error?: string;
  maxAmount?: number;
  placeholder?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeValue,
  currency = 'USD',
  label,
  error,
  maxAmount,
  placeholder = '0.00',
  disabled = false,
  style,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (text: string) => {
    // Allow only numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Allow only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }

    // Limit decimal places to 2
    if (parts[1]?.length > 2) {
      return;
    }

    // Check max amount
    const numValue = parseFloat(cleaned || '0');
    if (maxAmount && numValue > maxAmount) {
      return;
    }

    onChangeValue(cleaned);
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return currency;
    }
  };

  const containerStyle = [
    styles.container,
    isFocused && styles.containerFocused,
    error && styles.containerError,
    disabled && styles.containerDisabled,
    style,
  ].filter(Boolean);

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={theme.text.tertiary}
          keyboardType="decimal-pad"
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {maxAmount && (
        <Text style={styles.helperText}>Maximum: {getCurrencySymbol()}{maxAmount.toFixed(2)}</Text>
      )}
    </View>
  );
};

const createStyles = (themeColors: Colors) => StyleSheet.create({
  container: {
    width: '100%',
  },
  containerFocused: {
    // Focus styles handled by inputContainer
  },
  containerError: {
    // Error styles handled by inputContainer
  },
  containerDisabled: {
    opacity: 0.6,
  },
  label: {
    ...staticTheme.typography.label,
    color: themeColors.text.primary,
    marginBottom: staticTheme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background.secondary,
    borderRadius: staticTheme.borderRadius.md,
    borderWidth: staticTheme.borderWidth.medium,
    borderColor: themeColors.border.light,
    paddingHorizontal: staticTheme.spacing.lg,
    paddingVertical: staticTheme.spacing.md,
  },
  currencySymbol: {
    ...staticTheme.typography.h2,
    color: themeColors.text.secondary,
    marginRight: staticTheme.spacing.sm,
  },
  input: {
    flex: 1,
    ...staticTheme.typography.h2,
    color: themeColors.text.primary,
    padding: 0,
  },
  errorText: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.error.main,
    marginTop: staticTheme.spacing.xs,
  },
  helperText: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.tertiary,
    marginTop: staticTheme.spacing.xs,
  },
});
