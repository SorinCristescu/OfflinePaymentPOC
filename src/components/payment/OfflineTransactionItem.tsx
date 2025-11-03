/**
 * OfflineTransactionItem - List item for offline transactions
 * Phase 6: Offline Payment Protocol
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {theme as staticTheme} from '../../theme';
import {useTheme} from '../../contexts/ThemeContext';
import {Colors} from '../../theme/colors';
import {PaymentStatusIndicator} from './PaymentStatusIndicator';
import {OfflineTransaction} from '../../types/payment';

interface OfflineTransactionItemProps {
  transaction: OfflineTransaction;
  onPress?: (transaction: OfflineTransaction) => void;
}

export const OfflineTransactionItem: React.FC<OfflineTransactionItemProps> = ({
  transaction,
  onPress,
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDeviceId = (deviceId: string) => {
    if (deviceId.length > 12) {
      return `${deviceId.substring(0, 6)}...${deviceId.substring(deviceId.length - 4)}`;
    }
    return deviceId;
  };

  const isSent = transaction.type === 'sent';
  const otherParty = isSent ? transaction.to : transaction.from;

  const handlePress = () => {
    if (onPress) {
      onPress(transaction);
    }
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={styles.container}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.leftSection}>
        <View style={[styles.typeIndicator, isSent ? styles.sentIndicator : styles.receivedIndicator]}>
          <Text style={styles.typeIcon}>{isSent ? '↑' : '↓'}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.primaryText}>
            {isSent ? 'Sent to' : 'Received from'} {formatDeviceId(otherParty)}
          </Text>
          {transaction.memo && (
            <Text style={styles.secondaryText} numberOfLines={1}>
              {transaction.memo}
            </Text>
          )}
          <View style={styles.statusRow}>
            <PaymentStatusIndicator status={transaction.status} size="small" showLabel={true} />
            <Text style={styles.separator}>•</Text>
            <PaymentStatusIndicator
              status={transaction.syncStatus}
              size="small"
              showLabel={true}
            />
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.amount, isSent && styles.sentAmount]}>
          {isSent ? '-' : '+'}
          {formatAmount(transaction.amount, transaction.currency)}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.timestamp)}</Text>
      </View>
    </Container>
  );
};

const createStyles = (themeColors: Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: themeColors.background.paper,
      borderRadius: staticTheme.borderRadius.md,
      borderWidth: staticTheme.borderWidth.thin,
      borderColor: themeColors.border.light,
      padding: staticTheme.spacing.md,
      marginBottom: staticTheme.spacing.sm,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: staticTheme.spacing.md,
    },
    typeIndicator: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sentIndicator: {
      backgroundColor: themeColors.error.light,
    },
    receivedIndicator: {
      backgroundColor: themeColors.success.light,
    },
    typeIcon: {
      fontSize: 20,
      color: themeColors.text.primary,
    },
    details: {
      flex: 1,
      gap: staticTheme.spacing.xxs,
    },
    primaryText: {
      ...staticTheme.typography.body,
      color: themeColors.text.primary,
      fontWeight: '600',
    },
    secondaryText: {
      ...staticTheme.typography.caption,
      color: themeColors.text.secondary,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: staticTheme.spacing.xs,
      marginTop: staticTheme.spacing.xxs,
    },
    separator: {
      ...staticTheme.typography.caption,
      color: themeColors.text.tertiary,
    },
    rightSection: {
      alignItems: 'flex-end',
      gap: staticTheme.spacing.xxs,
    },
    amount: {
      ...staticTheme.typography.h3,
      color: themeColors.success.main,
      fontWeight: '700',
    },
    sentAmount: {
      color: themeColors.error.main,
    },
    date: {
      ...staticTheme.typography.captionSmall,
      color: themeColors.text.tertiary,
    },
  });
