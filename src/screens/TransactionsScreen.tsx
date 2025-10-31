/**
 * Transactions Screen - Transaction history view
 */

import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';

import {TransactionItem, Card} from '../components';
import {useTransactionStore} from '../stores';
import {
  TransactionDirection,
} from '../types';
import {useTheme} from '../contexts/ThemeContext';
import {theme as staticTheme} from '../theme';

type FilterTab = 'all' | 'incoming' | 'outgoing';

export const TransactionsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const {theme} = useTheme();

  const {transactions, getStats, loadTransactions} = useTransactionStore();
  const stats = getStats();

  const styles = createStyles(theme);

  // Reload transactions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') {
      return transactions;
    }
    const direction =
      activeFilter === 'incoming'
        ? TransactionDirection.INCOMING
        : TransactionDirection.OUTGOING;
    return transactions.filter(txn => txn.direction === direction);
  }, [transactions, activeFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{stats.totalTransactions}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Successful</Text>
          <Text style={[styles.statValue, {color: theme.success.main}]}>
            {stats.successfulTransactions}
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Failed</Text>
          <Text style={[styles.statValue, {color: theme.error.main}]}>
            {stats.failedTransactions}
          </Text>
        </Card>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FilterTab
          label="All"
          count={transactions.length}
          active={activeFilter === 'all'}
          onPress={() => setActiveFilter('all')}
          styles={styles}
        />
        <FilterTab
          label="Received"
          count={
            transactions.filter(
              txn => txn.direction === TransactionDirection.INCOMING,
            ).length
          }
          active={activeFilter === 'incoming'}
          onPress={() => setActiveFilter('incoming')}
          styles={styles}
        />
        <FilterTab
          label="Sent"
          count={
            transactions.filter(
              txn => txn.direction === TransactionDirection.OUTGOING,
            ).length
          }
          active={activeFilter === 'outgoing'}
          onPress={() => setActiveFilter('outgoing')}
          styles={styles}
        />
      </View>

      <Text style={styles.listTitle}>
        {filteredTransactions.length} Transaction
        {filteredTransactions.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Your transaction history will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={filteredTransactions}
        keyExtractor={item => item.id}
        renderItem={({item}) => <TransactionItem transaction={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary.main}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

interface FilterTabProps {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  styles: any;
}

const FilterTab: React.FC<FilterTabProps> = ({label, count, active, onPress, styles}) => (
  <TouchableOpacity
    style={[styles.filterTab, active && styles.filterTabActive]}
    onPress={onPress}
    activeOpacity={0.7}>
    <Text style={[styles.filterTabLabel, active && styles.filterTabLabelActive]}>
      {label}
    </Text>
    <View style={[styles.filterTabBadge, active && styles.filterTabBadgeActive]}>
      <Text
        style={[
          styles.filterTabBadgeText,
          active && styles.filterTabBadgeTextActive,
        ]}>
        {count}
      </Text>
    </View>
  </TouchableOpacity>
);

const createStyles = (themeColors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  contentContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    padding: staticTheme.spacing.lg,
    paddingBottom: staticTheme.spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: staticTheme.spacing.md,
    marginBottom: staticTheme.spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: staticTheme.spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.secondary,
    marginBottom: staticTheme.spacing.xs,
    textAlign: 'center',
  },
  statValue: {
    ...staticTheme.typography.h3,
    color: themeColors.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: staticTheme.spacing.sm,
    marginBottom: staticTheme.spacing.xl,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: staticTheme.spacing.md,
    paddingHorizontal: staticTheme.spacing.lg,
    borderRadius: staticTheme.borderRadius.md,
    backgroundColor: themeColors.background.secondary,
    gap: staticTheme.spacing.sm,
  },
  filterTabActive: {
    backgroundColor: themeColors.primary.main,
  },
  filterTabLabel: {
    ...staticTheme.typography.label,
    color: themeColors.text.primary,
  },
  filterTabLabelActive: {
    color: themeColors.text.inverse,
  },
  filterTabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: staticTheme.borderRadius.full,
    backgroundColor: themeColors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: staticTheme.spacing.xs,
  },
  filterTabBadgeActive: {
    backgroundColor: themeColors.primary.dark,
  },
  filterTabBadgeText: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.primary,
    fontSize: 11,
    fontWeight: staticTheme.fontWeight.semiBold,
  },
  filterTabBadgeTextActive: {
    color: themeColors.text.inverse,
  },
  listTitle: {
    ...staticTheme.typography.h4,
    color: themeColors.text.primary,
    marginBottom: staticTheme.spacing.md,
  },
  separator: {
    height: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: staticTheme.spacing['6xl'],
  },
  emptyStateTitle: {
    ...staticTheme.typography.h3,
    color: themeColors.text.primary,
    marginBottom: staticTheme.spacing.sm,
  },
  emptyStateSubtitle: {
    ...staticTheme.typography.body,
    color: themeColors.text.secondary,
  },
});
