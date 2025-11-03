/**
 * PaymentRequestCard - Display payment request details
 * Phase 6: Offline Payment Protocol
 */

import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {theme as staticTheme} from '../../theme';
import {useTheme} from '../../contexts/ThemeContext';
import {Colors} from '../../theme/colors';
import {Button} from '../Button';
import {PaymentRequest, PaymentSession} from '../../types/payment';

interface PaymentRequestCardProps {
  request: PaymentRequest | PaymentSession;
  onAccept?: () => void;
  onReject?: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

export const PaymentRequestCard: React.FC<PaymentRequestCardProps> = ({
  request,
  onAccept,
  onReject,
  loading = false,
  style,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  const formatAmount = (amount: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amount.toFixed(2)}`;
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return currency + ' ';
    }
  };

  const formatDeviceId = (deviceId: string) => {
    // Show first 8 and last 4 characters
    if (deviceId.length > 16) {
      return `${deviceId.substring(0, 8)}...${deviceId.substring(deviceId.length - 4)}`;
    }
    return deviceId;
  };

  // Check if it's a PaymentRequest or PaymentSession
  const isPaymentRequest = 'from' in request && 'to' in request && 'signature' in request;
  const amount = request.amount;
  const currency = request.currency;
  const memo = request.memo;
  const deviceId = isPaymentRequest ? (request as PaymentRequest).from : (request as PaymentSession).deviceId;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Request</Text>
        <Text style={styles.amount}>{formatAmount(amount, currency)}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>From:</Text>
          <Text style={styles.detailValue}>{formatDeviceId(deviceId)}</Text>
        </View>

        {memo && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Memo:</Text>
            <Text style={styles.detailValue}>{memo}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Currency:</Text>
          <Text style={styles.detailValue}>{currency}</Text>
        </View>
      </View>

      {(onAccept || onReject) && (
        <View style={styles.actions}>
          {onReject && (
            <Button
              title="Reject"
              variant="outline"
              onPress={onReject}
              disabled={loading}
              style={styles.button}
            />
          )}
          {onAccept && (
            <Button
              title="Accept"
              variant="primary"
              onPress={onAccept}
              loading={loading}
              disabled={loading}
              style={styles.button}
            />
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (themeColors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: themeColors.background.paper,
      borderRadius: staticTheme.borderRadius.lg,
      borderWidth: staticTheme.borderWidth.medium,
      borderColor: themeColors.border.light,
      padding: staticTheme.spacing.lg,
    },
    header: {
      marginBottom: staticTheme.spacing.md,
    },
    title: {
      ...staticTheme.typography.h3,
      color: themeColors.text.primary,
      marginBottom: staticTheme.spacing.xs,
    },
    amount: {
      ...staticTheme.typography.h1,
      color: themeColors.primary.main,
      fontWeight: '700',
    },
    details: {
      marginBottom: staticTheme.spacing.lg,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: staticTheme.spacing.sm,
    },
    detailLabel: {
      ...staticTheme.typography.body,
      color: themeColors.text.secondary,
    },
    detailValue: {
      ...staticTheme.typography.body,
      color: themeColors.text.primary,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      gap: staticTheme.spacing.md,
    },
    button: {
      flex: 1,
    },
  });
