/**
 * SendPaymentScreen - Send offline payment to a peer
 * Phase 6: Offline Payment Protocol
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {theme as staticTheme} from '../theme';
import {useTheme} from '../contexts/ThemeContext';
import {Colors} from '../theme/colors';
import {AmountInput} from '../components/AmountInput';
import {Button} from '../components/Button';
import {usePaymentStore} from '../stores/paymentStore';
import {useWalletStore} from '../stores/walletStore';
import {useConnectedPeers} from '../stores/peerStore';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type SendPaymentScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SendPayment'
>;

interface SendPaymentScreenProps {
  navigation: SendPaymentScreenNavigationProp;
}

export const SendPaymentScreen: React.FC<SendPaymentScreenProps> = ({
  navigation,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);

  const offlineBalance = useWalletStore(state => state.offlineBalance);
  const isLoading = usePaymentStore(state => state.isLoading);
  const error = usePaymentStore(state => state.error);
  const sendPaymentRequest = usePaymentStore(state => state.sendPaymentRequest);
  const clearError = usePaymentStore(state => state.clearError);

  const connectedPeers = useConnectedPeers();

  useEffect(() => {
    if (error) {
      Alert.alert('Payment Error', error, [
        {text: 'OK', onPress: () => clearError()},
      ]);
    }
  }, [error]);

  const handleSendPayment = async () => {
    try {
      const amountNum = parseFloat(amount);

      // Validation
      if (!selectedPeer) {
        Alert.alert('Error', 'Please select a recipient');
        return;
      }

      if (!amount || amountNum <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      if (amountNum > offlineBalance) {
        Alert.alert('Error', 'Insufficient balance');
        return;
      }

      // Send payment request
      await sendPaymentRequest({
        deviceId: selectedPeer,
        amount: amountNum,
        currency: 'USD',
        memo: memo || undefined,
      });

      // Success
      Alert.alert(
        'Payment Request Sent',
        'Waiting for the recipient to accept the payment.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Failed to send payment:', err);
    }
  };

  const renderPeerList = () => {
    if (connectedPeers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No connected peers</Text>
          <Text style={styles.emptyStateSubtext}>
            Connect to a peer via BLE before sending payments
          </Text>
          <Button
            title="Go to Peer Discovery"
            variant="outline"
            onPress={() => navigation.navigate('PeerDiscovery')}
            style={styles.emptyStateButton}
          />
        </View>
      );
    }

    return (
      <View style={styles.peerList}>
        <Text style={styles.sectionTitle}>Select Recipient</Text>
        {connectedPeers.map(peer => (
          <TouchableOpacity
            key={peer.deviceId}
            style={[
              styles.peerItem,
              selectedPeer === peer.deviceId && styles.peerItemSelected,
            ]}
            onPress={() => setSelectedPeer(peer.deviceId)}
            activeOpacity={0.7}>
            <View style={styles.peerInfo}>
              <Text style={styles.peerName}>{peer.name || peer.deviceId.substring(0, 12)}</Text>
              <Text style={styles.peerDeviceId}>
                {peer.deviceId.substring(0, 16)}...
              </Text>
            </View>
            {selectedPeer === peer.deviceId && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedCheckmark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {renderPeerList()}

        {connectedPeers.length > 0 && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amount</Text>
              <AmountInput
                value={amount}
                onChangeValue={setAmount}
                currency="USD"
                maxAmount={offlineBalance}
                placeholder="0.00"
              />
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Available Balance:</Text>
                <Text style={styles.balanceValue}>${offlineBalance.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Memo (Optional)</Text>
              <View style={styles.memoInput}>
                <Text style={styles.memoPlaceholder}>
                  {memo || 'Add a note...'}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                title="Send Payment Request"
                onPress={handleSendPayment}
                disabled={!selectedPeer || !amount || isLoading}
                loading={isLoading}
                fullWidth
                size="large"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (themeColors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: staticTheme.spacing.lg,
    },
    section: {
      marginBottom: staticTheme.spacing.xl,
    },
    sectionTitle: {
      ...staticTheme.typography.h3,
      color: themeColors.text.primary,
      marginBottom: staticTheme.spacing.md,
    },
    peerList: {
      marginBottom: staticTheme.spacing.xl,
    },
    peerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: themeColors.background.paper,
      borderRadius: staticTheme.borderRadius.md,
      borderWidth: staticTheme.borderWidth.medium,
      borderColor: themeColors.border.light,
      padding: staticTheme.spacing.md,
      marginBottom: staticTheme.spacing.sm,
    },
    peerItemSelected: {
      borderColor: themeColors.primary.main,
      backgroundColor: themeColors.primary.light,
    },
    peerInfo: {
      flex: 1,
    },
    peerName: {
      ...staticTheme.typography.body,
      color: themeColors.text.primary,
      fontWeight: '600',
      marginBottom: staticTheme.spacing.xxs,
    },
    peerDeviceId: {
      ...staticTheme.typography.caption,
      color: themeColors.text.secondary,
    },
    selectedIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: themeColors.primary.main,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedCheckmark: {
      color: themeColors.primary.contrast,
      fontSize: 14,
      fontWeight: '700',
    },
    balanceInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: staticTheme.spacing.md,
      paddingHorizontal: staticTheme.spacing.sm,
    },
    balanceLabel: {
      ...staticTheme.typography.body,
      color: themeColors.text.secondary,
    },
    balanceValue: {
      ...staticTheme.typography.h3,
      color: themeColors.success.main,
      fontWeight: '700',
    },
    memoInput: {
      backgroundColor: themeColors.background.secondary,
      borderRadius: staticTheme.borderRadius.md,
      borderWidth: staticTheme.borderWidth.medium,
      borderColor: themeColors.border.light,
      padding: staticTheme.spacing.md,
      minHeight: 80,
    },
    memoPlaceholder: {
      ...staticTheme.typography.body,
      color: themeColors.text.tertiary,
    },
    actions: {
      marginTop: staticTheme.spacing.lg,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: staticTheme.spacing.xxl,
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
