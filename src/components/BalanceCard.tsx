/**
 * BalanceCard Component - Displays balance information
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {Card} from './Card';
import {theme as staticTheme} from '../theme';
import {useTheme} from '../contexts/ThemeContext';
import {Colors} from '../theme/colors';

interface BalanceCardProps {
  title: string;
  amount: number;
  currency?: string;
  subtitle?: string;
  onPress?: () => void;
  variant?: 'online' | 'offline';
  style?: ViewStyle;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  title,
  amount,
  currency = 'USD',
  subtitle,
  onPress,
  variant = 'online',
  style,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

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

  const formatAmount = (value: number): string => {
    return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getVariantColor = () => {
    if (variant === 'offline') {
      return theme.secondary.main;
    }
    return theme.primary.main;
  };

  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {variant && (
          <View
            style={[
              styles.badge,
              {backgroundColor: getVariantColor()},
            ]}>
            <Text style={styles.badgeText}>
              {variant === 'online' ? 'Online' : 'Offline'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
        <Text style={styles.amount}>{formatAmount(amount)}</Text>
      </View>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={style}>
        <Card elevated padding style={styles.card}>
          {content}
        </Card>
      </TouchableOpacity>
    );
  }

  const cardStyle = style ? [styles.card, style] : styles.card;

  return (
    <Card elevated padding style={cardStyle}>
      {content}
    </Card>
  );
};

const createStyles = (themeColors: Colors) => StyleSheet.create({
  card: {
    width: '100%',
  },
  content: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: staticTheme.spacing.md,
  },
  title: {
    ...staticTheme.typography.h4,
    color: themeColors.text.primary,
  },
  badge: {
    paddingHorizontal: staticTheme.spacing.md,
    paddingVertical: staticTheme.spacing.xs,
    borderRadius: staticTheme.borderRadius.full,
  },
  badgeText: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.inverse,
    fontWeight: staticTheme.fontWeight.semiBold,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: staticTheme.spacing.xs,
  },
  currencySymbol: {
    ...staticTheme.typography.h2,
    color: themeColors.text.secondary,
    marginRight: staticTheme.spacing.xs,
  },
  amount: {
    ...staticTheme.typography.currency,
    color: themeColors.text.primary,
  },
  subtitle: {
    ...staticTheme.typography.bodySmall,
    color: themeColors.text.secondary,
  },
});
