/**
 * Home Screen - Main wallet view
 * Shows balances and quick actions
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {SafeAreaView} from 'react-native-safe-area-context';

import {BalanceCard, Button, Card} from '../components';
import {useWalletStore} from '../stores';
import {useTransactionStore} from '../stores/transactionStore';
import {useAuthStore} from '../stores';
import {formatCurrency} from '../utils/formatting';
import {BALANCE_LIMITS} from '../utils/constants';
import {useTheme} from '../contexts/ThemeContext';
import {theme as staticTheme} from '../theme';
import {AuthenticationMethod, BiometricType} from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const {theme} = useTheme();

  // Wallet store - balances are in cents
  const {onlineBalance, offlineBalance, initializeWallet} = useWalletStore();

  // Transaction store
  const {loadTransactions, refreshTransactions} = useTransactionStore();

  // Auth store
  const {
    configuredMethod,
    biometricCapabilities,
    initialize: initializeAuth,
  } = useAuthStore();

  const styles = createStyles(theme);

  useEffect(() => {
    // Load data on mount
    initializeWallet();
    loadTransactions();
    initializeAuth();
  }, [initializeWallet, loadTransactions, initializeAuth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([initializeWallet(), refreshTransactions()]);
    setRefreshing(false);
  };

  const handleTransferPress = () => {
    // Check if security is configured
    if (configuredMethod === AuthenticationMethod.NONE) {
      Alert.alert(
        'Security Required',
        'You must set up security (PIN or Biometric) before you can make transfers. This protects your funds.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Set Up Security',
            onPress: () => navigation.navigate('Settings' as any),
          },
        ]
      );
      return;
    }

    // Navigate to the dedicated transfer screen
    navigation.navigate('TransferOnlineToOffline');
  };

  const handleSendPayment = () => {
    if (offlineBalance === 0) {
      Alert.alert(
        'No Balance',
        'Please transfer money to your offline balance first.',
      );
      return;
    }
    Alert.alert('Coming Soon', 'Send payment via BLE/NFC (Phase 5-6)');
  };

  const totalBalance = onlineBalance + offlineBalance;

  // Safe subtitle with proper string formatting
  const offlineSubtitle = `Available for offline payments - Max: ${formatCurrency(
    BALANCE_LIMITS.MAX_OFFLINE_BALANCE
  )}`;

  // Security status helpers
  const getSecurityStatusIcon = (): string => {
    if (configuredMethod === AuthenticationMethod.NONE) {
      return '⚠️';
    }
    return '🔐';
  };

  const getSecurityStatusText = (): string => {
    if (configuredMethod === AuthenticationMethod.NONE) {
      return 'Not Configured';
    }

    const methods: string[] = [];
    if (
      configuredMethod === AuthenticationMethod.PIN ||
      configuredMethod === AuthenticationMethod.PIN_AND_BIOMETRIC
    ) {
      methods.push('PIN');
    }
    if (
      configuredMethod === AuthenticationMethod.BIOMETRIC ||
      configuredMethod === AuthenticationMethod.PIN_AND_BIOMETRIC
    ) {
      const biometricName = biometricCapabilities?.biometricType === BiometricType.FACE_ID
        ? 'Face ID'
        : biometricCapabilities?.biometricType === BiometricType.FINGERPRINT
        ? 'Fingerprint'
        : 'Biometric';
      methods.push(biometricName);
    }

    return methods.join(' + ');
  };

  const getSecurityDescription = (): string => {
    if (configuredMethod === AuthenticationMethod.NONE) {
      return 'Set up security to protect your transfers';
    }
    return 'Your transfers are protected';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary.main}
          />
        }>
        {/* Total Balance Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Total Balance</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalBalance)}</Text>
          <Text style={styles.headerSubtitle}>Across all accounts</Text>
        </View>

        {/* Security Status Indicator */}
        <Card
          style={[
            styles.securityCard,
            configuredMethod === AuthenticationMethod.NONE && styles.securityCardWarning,
          ]}>
          <View style={styles.securityHeader}>
            <Text style={styles.securityIcon}>{getSecurityStatusIcon()}</Text>
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Security Status</Text>
              <Text
                style={[
                  styles.securityMethod,
                  configuredMethod === AuthenticationMethod.NONE && styles.securityWarningText,
                ]}>
                {getSecurityStatusText()}
              </Text>
            </View>
          </View>
          <Text style={styles.securityDescription}>{getSecurityDescription()}</Text>
          {configuredMethod === AuthenticationMethod.NONE && (
            <Button
              title="Set Up Security"
              onPress={() => navigation.navigate('Settings' as any)}
              variant="primary"
              size="small"
              style={styles.securityButton}
            />
          )}
        </Card>

        {/* Balance Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Balances</Text>

          <BalanceCard
            title="Online Balance"
            amount={onlineBalance / 100}
            currency="USD"
            subtitle="Mock Bank - Account ****1234"
            variant="online"
            style={styles.balanceCard}
          />

          <BalanceCard
            title="Offline Balance"
            amount={offlineBalance / 100}
            currency="USD"
            subtitle={offlineSubtitle}
            variant="offline"
            style={styles.balanceCard}
          />
        </View>

        {/* Transfer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer to Offline</Text>

          <Card elevated style={styles.transferCard}>
            <Text style={styles.transferDescription}>
              Transfer money from your online balance to offline balance for secure
              payments without internet connectivity.
            </Text>

            <Button
              title="Transfer Now"
              onPress={handleTransferPress}
              variant="primary"
              fullWidth
              style={styles.transferButton}
            />

            <View style={styles.limitsInfo}>
              <Text style={styles.limitsTitle}>Transfer Limits</Text>
              <Text style={styles.limitsText}>
                Max per transfer: {formatCurrency(BALANCE_LIMITS.MAX_SINGLE_TRANSACTION)}
              </Text>
              <Text style={styles.limitsText}>
                Max offline balance: {formatCurrency(BALANCE_LIMITS.MAX_OFFLINE_BALANCE)}
              </Text>
              <Text style={styles.limitsText}>
                Daily limit: {formatCurrency(BALANCE_LIMITS.MAX_DAILY_LIMIT)}
              </Text>
            </View>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            <Button
              title="Send Payment"
              onPress={handleSendPayment}
              variant="outline"
              size="large"
              style={styles.actionButton}
            />

            <Button
              title="Transaction History"
              onPress={() => (navigation as any).navigate('Transactions')}
              variant="ghost"
              size="large"
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (themeColors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: staticTheme.spacing.lg,
    paddingBottom: staticTheme.spacing['4xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: staticTheme.spacing['3xl'],
    paddingVertical: staticTheme.spacing.xl,
  },
  headerTitle: {
    ...staticTheme.typography.label,
    color: themeColors.text.secondary,
    marginBottom: staticTheme.spacing.sm,
  },
  totalAmount: {
    ...staticTheme.typography.currency,
    color: themeColors.text.primary,
    marginBottom: staticTheme.spacing.xs,
  },
  headerSubtitle: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.tertiary,
  },
  section: {
    marginBottom: staticTheme.spacing['3xl'],
  },
  sectionTitle: {
    ...staticTheme.typography.h3,
    color: themeColors.text.primary,
    marginBottom: staticTheme.spacing.lg,
  },
  balanceCard: {
    marginBottom: staticTheme.spacing.md,
  },
  transferCard: {
    padding: staticTheme.spacing.lg,
  },
  transferDescription: {
    ...staticTheme.typography.body,
    color: themeColors.text.secondary,
    marginBottom: staticTheme.spacing.lg,
    textAlign: 'center',
  },
  transferButton: {
    marginBottom: staticTheme.spacing.lg,
  },
  limitsInfo: {
    backgroundColor: themeColors.background.secondary,
    padding: staticTheme.spacing.md,
    borderRadius: 8,
  },
  limitsTitle: {
    ...staticTheme.typography.label,
    color: themeColors.text.primary,
    marginBottom: staticTheme.spacing.sm,
  },
  limitsText: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text.secondary,
    marginBottom: staticTheme.spacing.xs,
  },
  actionsGrid: {
    gap: staticTheme.spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  securityCard: {
    marginBottom: staticTheme.spacing['2xl'],
    padding: staticTheme.spacing.lg,
    backgroundColor: themeColors.primary.light + '10',
    borderWidth: 1,
    borderColor: themeColors.primary.light,
  },
  securityCardWarning: {
    backgroundColor: themeColors.error + '10',
    borderColor: themeColors.error,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: staticTheme.spacing.sm,
  },
  securityIcon: {
    fontSize: 24,
    marginRight: staticTheme.spacing.md,
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    ...staticTheme.typography.label,
    color: themeColors.text.secondary,
    marginBottom: 2,
  },
  securityMethod: {
    ...staticTheme.typography.body,
    fontWeight: '600',
    color: themeColors.primary.main,
  },
  securityWarningText: {
    color: themeColors.error,
  },
  securityDescription: {
    ...staticTheme.typography.caption,
    color: themeColors.text.secondary,
    marginBottom: staticTheme.spacing.md,
  },
  securityButton: {
    marginTop: staticTheme.spacing.sm,
  },
});
