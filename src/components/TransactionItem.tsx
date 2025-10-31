/**
 * TransactionItem Component - Displays a single transaction in a list
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionDirection,
} from '../types';
import {theme as staticTheme} from '../theme';
import {formatCurrency} from '../utils/formatting';
import {useTheme} from '../contexts/ThemeContext';
import {Colors} from '../theme/colors';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  const formatDateDisplay = (timestamp: Date): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (): string => {
    switch (transaction.type) {
      case TransactionType.ONLINE_TO_OFFLINE:
        return 'Transfer to Offline';
      case TransactionType.OFFLINE_TO_OFFLINE:
        return transaction.direction === TransactionDirection.INCOMING
          ? 'Payment Received'
          : 'Payment Sent';
      case TransactionType.OFFLINE_TO_ONLINE:
        return 'Transfer to Online';
      default:
        return 'Transaction';
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case TransactionStatus.COMPLETED:
        return theme.success.main;
      case TransactionStatus.FAILED:
        return theme.error.main;
      case TransactionStatus.PENDING:
        return theme.warning.main;
      case TransactionStatus.CANCELLED:
        return theme.text.secondary;
      default:
        return theme.text.secondary;
    }
  };

  const getAmountColor = () => {
    if (transaction.status !== TransactionStatus.COMPLETED) {
      return theme.text.secondary;
    }
    return transaction.direction === TransactionDirection.INCOMING
      ? theme.finance.positive
      : theme.finance.negative;
  };

  const getAmountPrefix = () => {
    if (transaction.status !== TransactionStatus.COMPLETED) {
      return '';
    }
    return transaction.direction === TransactionDirection.INCOMING ? '+' : '-';
  };

  const content = (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                transaction.direction === TransactionDirection.INCOMING
                  ? theme.success.background
                  : theme.info.background,
            },
          ]}>
          <Text style={styles.iconText}>
            {transaction.direction === TransactionDirection.INCOMING ? '↓' : '↑'}
          </Text>
        </View>

        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={1}>
            {getTypeLabel()}
          </Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>{formatDateDisplay(transaction.timestamp)}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.subtitle}>{formatTime(transaction.timestamp)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightContent}>
        <Text
          style={[
            styles.amount,
            {color: getAmountColor()},
          ]}>
          {getAmountPrefix()}
          {formatCurrency(transaction.amount)}
        </Text>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor()}]}>
          <Text style={styles.statusText}>
            {transaction.status.charAt(0).toUpperCase() +
              transaction.status.slice(1)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const createStyles = (themeColors: Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: staticTheme.spacing.md,
    paddingHorizontal: staticTheme.spacing.lg,
    backgroundColor: themeColors.surface.primary,
    borderBottomWidth: staticTheme.borderWidth.thin,
    borderBottomColor: themeColors.border.light,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: staticTheme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: staticTheme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: staticTheme.spacing.md,
  },
  iconText: {
    fontSize: 20,
    fontWeight: staticTheme.fontWeight.bold,
  },
  textContent: {
    flex: 1,
  },
  title: {
    ...staticTheme.typography.body,
    color: themeColors.text.primary,
    fontWeight: staticTheme.fontWeight.medium,
    marginBottom: staticTheme.spacing.xs,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.secondary,
  },
  dot: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.tertiary,
    marginHorizontal: staticTheme.spacing.xs,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  amount: {
    ...staticTheme.typography.body,
    fontWeight: staticTheme.fontWeight.semiBold,
    marginBottom: staticTheme.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: staticTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: staticTheme.borderRadius.sm,
  },
  statusText: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.inverse,
    fontSize: 10,
    fontWeight: staticTheme.fontWeight.semiBold,
  },
});
