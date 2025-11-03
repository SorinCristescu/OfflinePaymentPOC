/**
 * ReceivePaymentScreen
 * Phase 6: Offline Payment Protocol
 *
 * Screen for receiving payments from peers
 * Shows incoming payment requests and allows accepting/rejecting
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

import {Button, Card} from '../components';
import {PaymentRequestCard} from '../components/payment/PaymentRequestCard';
import {PaymentQRCode} from '../components/payment/PaymentQRCode';
import {usePaymentStore} from '../stores/paymentStore';
import {useConnectedPeers} from '../stores/peerStore';
import {useWalletStore} from '../stores';
import {formatCurrency} from '../utils/formatting';
import {PaymentStatus} from '../types/payment';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReceivePayment'>;

export const ReceivePaymentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const {activeSessions, isLoading, error} = usePaymentStore();
  const connectedPeers = useConnectedPeers();
  const offlineBalance = useWalletStore(state => state.offlineBalance);
  const deviceId = useWalletStore(state => state.deviceId);

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Get incoming payment requests (waiting for response)
  const incomingRequests = activeSessions.filter(
    session =>
      session.status === PaymentStatus.PENDING ||
      session.status === PaymentStatus.AWAITING_RESPONSE
  );

  useEffect(() => {
    // Auto-select first incoming request
    if (incomingRequests.length > 0 && !selectedSession) {
      setSelectedSession(incomingRequests[0].id);
    }
  }, [incomingRequests.length]);

  const handleAcceptPayment = async (sessionId: string) => {
    try {
      const session = activeSessions.find(s => s.id === sessionId);
      if (!session || !session.requestId) {
        Alert.alert('Error', 'Payment request not found');
        return;
      }

      Alert.alert(
        'Accept Payment',
        `Accept payment of ${formatCurrency(session.amount)} from this peer?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Accept',
            onPress: async () => {
              try {
                await usePaymentStore.getState().acceptPaymentRequest(session.requestId!);
                Alert.alert('Success', 'Payment accepted! Waiting for transaction...');
              } catch (error) {
                Alert.alert('Error', (error as Error).message);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('[ReceivePaymentScreen] Error accepting payment:', error);
      Alert.alert('Error', 'Failed to accept payment');
    }
  };

  const handleRejectPayment = async (sessionId: string) => {
    try {
      const session = activeSessions.find(s => s.id === sessionId);
      if (!session || !session.requestId) {
        Alert.alert('Error', 'Payment request not found');
        return;
      }

      Alert.alert(
        'Reject Payment',
        `Reject payment of ${formatCurrency(session.amount)}?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              try {
                await usePaymentStore.getState().rejectPaymentRequest(
                  session.requestId!,
                  'Rejected by recipient'
                );
                Alert.alert('Payment Rejected', 'The payment request has been rejected');
              } catch (error) {
                Alert.alert('Error', (error as Error).message);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('[ReceivePaymentScreen] Error rejecting payment:', error);
      Alert.alert('Error', 'Failed to reject payment');
    }
  };

  const getPeerName = (deviceId: string): string => {
    const peer = connectedPeers.find(p => p.deviceId === deviceId);
    return peer?.name || 'Unknown Peer';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Receive Payment</Text>
          <Text style={styles.headerSubtitle}>
            Current Balance: {formatCurrency(offlineBalance)}
          </Text>
        </View>

        {/* QR Code Section */}
        <Card style={styles.qrCodeCard}>
          <View style={styles.qrCodeHeader}>
            <Text style={styles.qrCodeTitle}>Receive via QR Code</Text>
            <Button
              title={showQRCode ? 'Hide QR Code' : 'Show QR Code'}
              variant="outline"
              size="small"
              onPress={() => setShowQRCode(!showQRCode)}
            />
          </View>

          {showQRCode && (
            <View style={styles.qrCodeContent}>
              <PaymentQRCode
                deviceId={deviceId}
                deviceName={`Device ${deviceId.substring(0, 8)}`}
                size={220}
              />
              <Text style={styles.qrCodeDescription}>
                Share this QR code with others to receive payments. They can scan it to get your device information.
              </Text>
            </View>
          )}
        </Card>

        {/* Error Display */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Processing payment...</Text>
          </View>
        )}

        {/* Incoming Payment Requests */}
        {incomingRequests.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Incoming Requests ({incomingRequests.length})
            </Text>

            {incomingRequests.map(session => (
              <PaymentRequestCard
                key={session.id}
                amount={session.amount}
                currency={session.currency}
                from={getPeerName(session.deviceId)}
                memo={session.memo}
                status={session.status}
                onAccept={() => handleAcceptPayment(session.id)}
                onReject={() => handleRejectPayment(session.id)}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No Incoming Payments</Text>
            <Text style={styles.emptyText}>
              When someone sends you a payment request, it will appear here.
            </Text>
            <Text style={styles.emptyHint}>
              Make sure you're connected to peers via Bluetooth to receive payments.
            </Text>
          </Card>
        )}

        {/* Connected Peers Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Connected Peers</Text>
          <Text style={styles.infoText}>
            {connectedPeers.length === 0
              ? 'No peers connected'
              : `${connectedPeers.length} peer${connectedPeers.length > 1 ? 's' : ''} connected`}
          </Text>
          {connectedPeers.length === 0 && (
            <Button
              title="Connect to Peers"
              onPress={() => (navigation as any).navigate('PeerDiscovery')}
              variant="outline"
              size="small"
              style={styles.connectButton}
            />
          )}
        </Card>

        {/* How it Works */}
        <Card style={styles.helpCard}>
          <Text style={styles.helpTitle}>How to Receive Payments</Text>
          <View style={styles.helpSteps}>
            <View style={styles.helpStep}>
              <Text style={styles.helpStepNumber}>1</Text>
              <Text style={styles.helpStepText}>
                Connect to peers via Bluetooth in Peer Discovery
              </Text>
            </View>
            <View style={styles.helpStep}>
              <Text style={styles.helpStepNumber}>2</Text>
              <Text style={styles.helpStepText}>
                Wait for payment requests to appear on this screen
              </Text>
            </View>
            <View style={styles.helpStep}>
              <Text style={styles.helpStepNumber}>3</Text>
              <Text style={styles.helpStepText}>
                Review the request and tap Accept or Reject
              </Text>
            </View>
            <View style={styles.helpStep}>
              <Text style={styles.helpStepNumber}>4</Text>
              <Text style={styles.helpStepText}>
                Your balance will be updated immediately
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoCard: {
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  connectButton: {
    marginTop: 12,
  },
  helpCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  helpSteps: {
    gap: 12,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helpStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  helpStepText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 24,
  },
  qrCodeCard: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  qrCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  qrCodeContent: {
    marginTop: 16,
    alignItems: 'center',
  },
  qrCodeDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});
