/**
 * PaymentHistoryScreen - View offline payment history
 * Phase 6: Offline Payment Protocol
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {theme as staticTheme} from '../theme';
import {useTheme} from '../contexts/ThemeContext';
import {Colors} from '../theme/colors';
import {Button} from '../components/Button';
import {OfflineTransactionItem} from '../components/payment/OfflineTransactionItem';
import {usePaymentStore} from '../stores/paymentStore';
import {OfflineTransaction, PaymentFilterOptions, SyncStatus} from '../types/payment';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type PaymentHistoryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PaymentHistory'
>;

interface PaymentHistoryScreenProps {
  navigation: PaymentHistoryScreenNavigationProp;
}

type FilterType = 'all' | 'sent' | 'received';

export const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({
  navigation,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshTransactions = usePaymentStore(state => state.refreshTransactions);
  const filterTransactions = usePaymentStore(state => state.filterTransactions);
  const queueStats = usePaymentStore(state => state.queueStats);
  const syncStats = usePaymentStore(state => state.syncStats);
  const isSyncing = usePaymentStore(state => state.isSyncing);
  const clearSyncedTransactions = usePaymentStore(state => state.clearSyncedTransactions);
  const syncTransactions = usePaymentStore(state => state.syncTransactions);
  const retryFailedSync = usePaymentStore(state => state.retryFailedSync);

  useEffect(() => {
    refreshTransactions();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  };

  const handleClearSynced = async () => {
    await clearSyncedTransactions();
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const result = await syncTransactions();
      console.log('[PaymentHistoryScreen] Sync result:', result);
      await refreshTransactions();
    } catch (error) {
      console.error('[PaymentHistoryScreen] Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setSyncing(true);
      const result = await retryFailedSync();
      console.log('[PaymentHistoryScreen] Retry result:', result);
      await refreshTransactions();
    } catch (error) {
      console.error('[PaymentHistoryScreen] Retry error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getFilteredTransactions = (): OfflineTransaction[] => {
    const filter: PaymentFilterOptions = {
      type: selectedFilter,
    };
    return filterTransactions(filter);
  };

  const handleTransactionPress = (transaction: OfflineTransaction) => {
    // Navigate to transaction details
    // navigation.navigate('TransactionDetails', {transactionId: transaction.id});
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Payment History</Text>

      {queueStats && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{queueStats.totalTransactions}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.pendingValue]}>
              {queueStats.pendingSync}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.syncedValue]}>
              {queueStats.synced}
            </Text>
            <Text style={styles.statLabel}>Synced</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.failedValue]}>
              {queueStats.failed}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      )}

      <View style={styles.filters}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('all')}>
          <Text
            style={[
              styles.filterButtonText,
              selectedFilter === 'all' && styles.filterButtonTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'sent' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('sent')}>
          <Text
            style={[
              styles.filterButtonText,
              selectedFilter === 'sent' && styles.filterButtonTextActive,
            ]}>
            Sent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'received' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('received')}>
          <Text
            style={[
              styles.filterButtonText,
              selectedFilter === 'received' && styles.filterButtonTextActive,
            ]}>
            Received
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync Controls */}
      <View style={styles.syncControls}>
        {syncStats && (
          <View style={styles.syncInfo}>
            <Text style={styles.syncInfoText}>
              {syncStats.isSyncing || isSyncing || syncing
                ? '🔄 Syncing...'
                : syncStats.lastSyncTime
                ? `✅ Last sync: ${new Date(syncStats.lastSyncTime).toLocaleTimeString()}`
                : '⏳ Not synced yet'}
            </Text>
            {syncStats.pendingTransactions > 0 && (
              <Text style={styles.pendingInfo}>
                {syncStats.pendingTransactions} pending
              </Text>
            )}
          </View>
        )}

        <View style={styles.syncButtons}>
          <Button
            title="Sync Now"
            variant="primary"
            size="small"
            onPress={handleSyncNow}
            disabled={isSyncing || syncing || (queueStats?.pendingSync === 0)}
            loading={isSyncing || syncing}
            style={styles.syncButton}
          />

          {syncStats && syncStats.failedTransactions > 0 && (
            <Button
              title={`Retry Failed (${syncStats.failedTransactions})`}
              variant="outline"
              size="small"
              onPress={handleRetryFailed}
              disabled={isSyncing || syncing}
              style={styles.syncButton}
            />
          )}
        </View>
      </View>

      {queueStats && queueStats.synced > 0 && (
        <Button
          title="Clear Synced Transactions"
          variant="outline"
          size="small"
          onPress={handleClearSynced}
          style={styles.clearButton}
        />
      )}
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No Transactions</Text>
      <Text style={styles.emptyStateSubtext}>
        Your offline payment history will appear here
      </Text>
      <Button
        title="Send Payment"
        variant="primary"
        onPress={() => navigation.navigate('SendPayment')}
        style={styles.emptyStateButton}
      />
    </View>
  );

  const transactions = getFilteredTransactions();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <OfflineTransactionItem
            transaction={item}
            onPress={handleTransactionPress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary.main}
          />
        }
      />
    </SafeAreaView>
  );
};

const createStyles = (themeColors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background.primary,
    },
    listContent: {
      padding: staticTheme.spacing.lg,
    },
    header: {
      marginBottom: staticTheme.spacing.lg,
    },
    title: {
      ...staticTheme.typography.h1,
      color: themeColors.text.primary,
      marginBottom: staticTheme.spacing.lg,
    },
    stats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: themeColors.background.paper,
      borderRadius: staticTheme.borderRadius.lg,
      padding: staticTheme.spacing.md,
      marginBottom: staticTheme.spacing.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      ...staticTheme.typography.h2,
      color: themeColors.text.primary,
      fontWeight: '700',
      marginBottom: staticTheme.spacing.xxs,
    },
    pendingValue: {
      color: themeColors.warning.main,
    },
    syncedValue: {
      color: themeColors.success.main,
    },
    failedValue: {
      color: themeColors.error.main,
    },
    statLabel: {
      ...staticTheme.typography.caption,
      color: themeColors.text.secondary,
    },
    filters: {
      flexDirection: 'row',
      gap: staticTheme.spacing.sm,
      marginBottom: staticTheme.spacing.md,
    },
    filterButton: {
      flex: 1,
      paddingVertical: staticTheme.spacing.sm,
      paddingHorizontal: staticTheme.spacing.md,
      borderRadius: staticTheme.borderRadius.md,
      borderWidth: staticTheme.borderWidth.medium,
      borderColor: themeColors.border.light,
      backgroundColor: themeColors.background.paper,
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: themeColors.primary.main,
      borderColor: themeColors.primary.main,
    },
    filterButtonText: {
      ...staticTheme.typography.body,
      color: themeColors.text.primary,
      fontWeight: '600',
    },
    filterButtonTextActive: {
      color: themeColors.primary.contrast,
    },
    clearButton: {
      marginTop: staticTheme.spacing.sm,
    },
    syncControls: {
      marginTop: staticTheme.spacing.md,
      marginBottom: staticTheme.spacing.md,
      backgroundColor: themeColors.background.paper,
      borderRadius: staticTheme.borderRadius.lg,
      padding: staticTheme.spacing.md,
      borderWidth: staticTheme.borderWidth.thin,
      borderColor: themeColors.border.light,
    },
    syncInfo: {
      marginBottom: staticTheme.spacing.sm,
    },
    syncInfoText: {
      ...staticTheme.typography.body,
      color: themeColors.text.primary,
      fontWeight: '500',
      marginBottom: staticTheme.spacing.xxs,
    },
    pendingInfo: {
      ...staticTheme.typography.caption,
      color: themeColors.warning.main,
      fontWeight: '600',
    },
    syncButtons: {
      flexDirection: 'row',
      gap: staticTheme.spacing.sm,
    },
    syncButton: {
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: staticTheme.spacing.xxl,
      marginTop: staticTheme.spacing.xxl,
    },
    emptyStateText: {
      ...staticTheme.typography.h3,
      color: themeColors.text.primary,
      marginBottom: staticTheme.spacing.sm,
    },
    emptyStateSubtext: {
      ...staticTheme.typography.body,
      color: themeColors.text.secondary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.lg,
      paddingHorizontal: staticTheme.spacing.xl,
    },
    emptyStateButton: {
      marginTop: staticTheme.spacing.md,
    },
  });
