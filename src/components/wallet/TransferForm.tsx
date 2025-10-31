// src/components/wallet/TransferForm.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { AmountInput } from '../common/AmountInput';
import { Button } from '../Button';
import { Card } from '../Card';
import { useWalletStore } from '../../stores/walletStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthenticationGate } from '../../hooks';
import { Colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatCurrency } from '../../utils/formatting';
import { BALANCE_LIMITS } from '../../utils/constants';

interface TransferFormProps {
  onSuccess?: () => void;
}

export const TransferForm: React.FC<TransferFormProps> = ({ onSuccess }) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  const {
    onlineBalance,
    offlineBalance,
    transferOnlineToOffline,
    isLoading,
    error,
    clearError,
  } = useWalletStore();

  const {executeProtected, isAuthenticating, isAuthenticationRequired} = useAuthenticationGate();

  const [amount, setAmount] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const maxTransfer = Math.min(
    onlineBalance,
    BALANCE_LIMITS.MAX_SINGLE_TRANSACTION,
    BALANCE_LIMITS.MAX_OFFLINE_BALANCE - offlineBalance
  );

  useEffect(() => {
    if (amount === 0) {
      setValidationError(null);
      return;
    }

    if (amount < BALANCE_LIMITS.MIN_TRANSACTION) {
      setValidationError(
        `Minimum transfer is ${formatCurrency(BALANCE_LIMITS.MIN_TRANSACTION)}`
      );
    } else if (amount > maxTransfer) {
      setValidationError('Amount exceeds maximum allowed');
    } else {
      setValidationError(null);
    }
  }, [amount, maxTransfer]);

  useEffect(() => {
    if (error) {
      Alert.alert('Transfer Failed', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  const handleTransfer = async () => {
    if (validationError || amount === 0) return;

    // Check if authentication is required but not configured
    if (!isAuthenticationRequired) {
      Alert.alert(
        'Security Required',
        'You must set up security (PIN or Biometric) before you can make transfers.',
        [{text: 'OK'}]
      );
      return;
    }

    // Execute transfer with authentication protection
    const result = await executeProtected(
      async () => {
        await transferOnlineToOffline(amount);
        setAmount(0);
        onSuccess?.();
      },
      {
        promptMessage: `Authenticate to transfer ${formatCurrency(amount)}`,
        onAuthenticationSuccess: () => {
          console.log('Transfer authentication successful');
        },
        onAuthenticationFailed: (error) => {
          console.log('Transfer authentication failed:', error);
        },
      }
    );

    // If authentication was cancelled or failed, result will be null
    if (result === null) {
      console.log('Transfer cancelled or authentication failed');
    }
  };

  const resultingOfflineBalance = offlineBalance + amount;
  const resultingOnlineBalance = onlineBalance - amount;

  return (
    <View style={styles.container}>
      {/* Security Notice */}
      {isAuthenticationRequired ? (
        <Card style={styles.securityNotice}>
          <View style={styles.securityNoticeHeader}>
            <Text style={styles.securityIcon}>🔐</Text>
            <Text style={styles.securityNoticeText}>
              Authentication required for transfers
            </Text>
          </View>
        </Card>
      ) : (
        <Card style={styles.securityWarning}>
          <View style={styles.securityNoticeHeader}>
            <Text style={styles.securityIcon}>⚠️</Text>
            <Text style={styles.securityWarningText}>
              Security not configured - Transfers are disabled for your protection
            </Text>
          </View>
        </Card>
      )}

      <Card>
        <Text style={styles.sectionTitle}>Available Balances</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Online:</Text>
          <Text style={styles.balanceValue}>{formatCurrency(onlineBalance)}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Offline:</Text>
          <Text style={styles.balanceValue}>{formatCurrency(offlineBalance)}</Text>
        </View>
      </Card>

      <Card>
        <AmountInput
          value={amount}
          onChangeValue={setAmount}
          maxAmount={maxTransfer}
          label="Transfer Amount"
          error={validationError || undefined}
        />

        {amount > 0 && !validationError && (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>After Transfer:</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Online:</Text>
              <Text style={styles.previewValue}>
                {formatCurrency(resultingOnlineBalance)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Offline:</Text>
              <Text style={[styles.previewValue, styles.previewHighlight]}>
                {formatCurrency(resultingOfflineBalance)}
              </Text>
            </View>
          </View>
        )}

        <Button
          title={
            !isAuthenticationRequired
              ? 'Set Up Security to Transfer'
              : 'Transfer to Offline Balance'
          }
          onPress={handleTransfer}
          disabled={amount === 0 || !!validationError || !isAuthenticationRequired}
          loading={isLoading || isAuthenticating}
          style={styles.submitButton}
        />
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>Transfer Limits</Text>
        <Text style={styles.infoText}>
          Max offline balance: {formatCurrency(BALANCE_LIMITS.MAX_OFFLINE_BALANCE)}
        </Text>
        <Text style={styles.infoText}>
          Max per transfer: {formatCurrency(BALANCE_LIMITS.MAX_SINGLE_TRANSACTION)}
        </Text>
        <Text style={styles.infoText}>
          Min per transfer: {formatCurrency(BALANCE_LIMITS.MIN_TRANSACTION)}
        </Text>
      </Card>
    </View>
  );
};

const createStyles = (themeColors: Colors) => StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: themeColors.text.primary,
    marginBottom: spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  balanceLabel: {
    ...typography.body,
    color: themeColors.text.secondary,
  },
  balanceValue: {
    ...typography.body,
    color: themeColors.text.primary,
    fontWeight: '600',
  },
  preview: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: themeColors.primary.light + '20',
    borderRadius: 8,
  },
  previewTitle: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  previewLabel: {
    ...typography.body,
    color: themeColors.text.secondary,
  },
  previewValue: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  previewHighlight: {
    color: themeColors.primary.main,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  infoCard: {
    backgroundColor: themeColors.background.secondary,
  },
  infoTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: themeColors.text.secondary,
    marginBottom: spacing.xs,
  },
  securityNotice: {
    backgroundColor: themeColors.primary.light + '15',
    borderWidth: 1,
    borderColor: themeColors.primary.light,
    marginBottom: spacing.md,
  },
  securityNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  securityNoticeText: {
    ...typography.body,
    color: themeColors.text.primary,
    flex: 1,
  },
  securityWarning: {
    backgroundColor: themeColors.error.main + '15',
    borderWidth: 1,
    borderColor: themeColors.error.main,
    marginBottom: spacing.md,
  },
  securityWarningText: {
    ...typography.body,
    color: themeColors.error.main,
    flex: 1,
    fontWeight: '600',
  },
});
