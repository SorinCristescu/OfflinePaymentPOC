/**
 * PaymentStatusIndicator - Visual indicator for payment status
 * Phase 6: Offline Payment Protocol
 */

import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {theme as staticTheme} from '../../theme';
import {useTheme} from '../../contexts/ThemeContext';
import {Colors} from '../../theme/colors';
import {PaymentStatus, OfflineTransactionStatus, SyncStatus} from '../../types/payment';

interface PaymentStatusIndicatorProps {
  status: PaymentStatus | OfflineTransactionStatus | SyncStatus;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: ViewStyle;
}

export const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  status,
  size = 'medium',
  showLabel = true,
  style,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  const getStatusConfig = (
    status: PaymentStatus | OfflineTransactionStatus | SyncStatus
  ): {
    label: string;
    color: string;
    icon: string;
  } => {
    // Payment Status
    if (status === 'initiated') {
      return {label: 'Initiated', color: theme.info.main, icon: '⚡'};
    }
    if (status === 'pending') {
      return {label: 'Pending', color: theme.warning.main, icon: '⏳'};
    }
    if (status === 'accepted') {
      return {label: 'Accepted', color: theme.success.main, icon: '✓'};
    }
    if (status === 'rejected') {
      return {label: 'Rejected', color: theme.error.main, icon: '✕'};
    }
    if (status === 'completed') {
      return {label: 'Completed', color: theme.success.main, icon: '✓'};
    }
    if (status === 'failed') {
      return {label: 'Failed', color: theme.error.main, icon: '✕'};
    }
    if (status === 'expired') {
      return {label: 'Expired', color: theme.neutral[500], icon: '⌛'};
    }

    // Offline Transaction Status
    if (status === 'signed') {
      return {label: 'Signed', color: theme.info.main, icon: '🔏'};
    }
    if (status === 'transmitted') {
      return {label: 'Transmitted', color: theme.info.main, icon: '📤'};
    }
    if (status === 'confirmed') {
      return {label: 'Confirmed', color: theme.success.main, icon: '✓'};
    }

    // Sync Status
    if (status === 'not_synced') {
      return {label: 'Not Synced', color: theme.warning.main, icon: '⬆'};
    }
    if (status === 'syncing') {
      return {label: 'Syncing', color: theme.info.main, icon: '🔄'};
    }
    if (status === 'synced') {
      return {label: 'Synced', color: theme.success.main, icon: '✓'};
    }
    if (status === 'sync_failed') {
      return {label: 'Sync Failed', color: theme.error.main, icon: '✕'};
    }
    if (status === 'conflict') {
      return {label: 'Conflict', color: theme.error.main, icon: '⚠'};
    }

    // Default
    return {label: status, color: theme.neutral[500], icon: '•'};
  };

  const config = getStatusConfig(status);

  const indicatorSize =
    size === 'small' ? 8 : size === 'medium' ? 12 : 16;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.indicator,
          {
            width: indicatorSize,
            height: indicatorSize,
            backgroundColor: config.color,
          },
        ]}
      />
      {showLabel && (
        <Text style={[styles.label, size === 'small' && styles.labelSmall]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

const createStyles = (themeColors: Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: staticTheme.spacing.xs,
    },
    indicator: {
      borderRadius: 100,
    },
    label: {
      ...staticTheme.typography.body,
      color: themeColors.text.secondary,
      fontWeight: '500',
    },
    labelSmall: {
      ...staticTheme.typography.caption,
    },
  });
