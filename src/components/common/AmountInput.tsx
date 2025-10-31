// src/components/common/AmountInput.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { parseCurrencyInput, formatCurrency } from '../../utils/formatting';

interface AmountInputProps {
  value: number; // In cents
  onChangeValue: (amount: number) => void;
  maxAmount?: number;
  label?: string;
  error?: string;
  style?: ViewStyle;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeValue,
  maxAmount,
  label,
  error,
  style,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  const [displayValue, setDisplayValue] = useState(
    value > 0 ? (value / 100).toFixed(2) : ''
  );

  // Sync displayValue with value prop changes
  useEffect(() => {
    if (value === 0) {
      setDisplayValue('');
    } else if (value > 0) {
      // Only update if not currently editing (to avoid cursor jumps)
      setDisplayValue((value / 100).toFixed(2));
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    setDisplayValue(text);
    const amountInCents = parseCurrencyInput(text);
    onChangeValue(amountInCents);
  };

  const handleBlur = () => {
    // Format on blur
    if (value > 0) {
      setDisplayValue((value / 100).toFixed(2));
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputContainer, error && styles.inputError]}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={theme.neutral[400]}
          maxLength={10}
        />
      </View>

      {maxAmount && !error && (
        <Text style={styles.hint}>Max: {formatCurrency(maxAmount)}</Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const createStyles = (themeColors: Colors) => StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    color: themeColors.text.primary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background.primary,
    borderWidth: 2,
    borderColor: themeColors.border.main,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  inputError: {
    borderColor: themeColors.error.main,
  },
  currencySymbol: {
    ...typography.h2,
    color: themeColors.text.primary,
    marginRight: spacing.xs,
  },
  input: {
    ...typography.h2,
    flex: 1,
    color: themeColors.text.primary,
    padding: 0,
  },
  hint: {
    ...typography.caption,
    color: themeColors.neutral[400],
    marginTop: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: themeColors.error.main,
    marginTop: spacing.xs,
  },
});
