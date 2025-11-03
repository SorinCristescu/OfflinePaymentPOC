/**
 * ConnectionScreen
 * Phase 5: BLE Communication Foundation
 *
 * Detailed view of a single peer connection
 * Shows connection health, session info, and message controls
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useBLEStore} from '../stores/bleStore';
import {usePeer, usePeerSession, usePeerStore} from '../stores/peerStore';
import {ConnectionManager} from '../services/ble/ConnectionManager';
import {MessageProtocol} from '../services/ble/MessageProtocol';
import {getProximityLevel, ProximityLevel} from '../types/p2p';

type RootStackParamList = {
  PeerDiscovery: undefined;
  Connection: {deviceId: string};
  BLESettings: undefined;
};

type ConnectionScreenRouteProp = RouteProp<RootStackParamList, 'Connection'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Connection'>;

export const ConnectionScreen: React.FC = () => {
  const route = useRoute<ConnectionScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const {deviceId} = route.params;

  // Stores
  const peer = usePeer(deviceId);
  const session = usePeerSession(deviceId);
  const disconnectFromPeer = useBLEStore((state) => state.disconnectFromPeer);
  const sendMessage = useBLEStore((state) => state.sendMessage);
  const trustPeer = usePeerStore((state) => state.trustPeer);
  const untrustPeer = usePeerStore((state) => state.untrustPeer);
  const blockPeer = usePeerStore((state) => state.blockPeer);

  // Local state
  const [connectionHealth, setConnectionHealth] = useState<any>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Refresh connection health
  useEffect(() => {
    const refreshHealth = () => {
      const health = ConnectionManager.getConnectionHealth(deviceId);
      setConnectionHealth(health);
    };

    refreshHealth();
    const interval = setInterval(refreshHealth, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [deviceId]);

  // Handle back if peer disconnected
  useEffect(() => {
    if (peer && !peer.isConnected) {
      Alert.alert(
        'Connection Lost',
        'The connection to this device has been lost.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [peer, navigation]);

  if (!peer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Device not found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const proximity = getProximityLevel(peer.rssi);

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect',
      `Are you sure you want to disconnect from ${peer.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectFromPeer(deviceId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', `Failed to disconnect: ${(error as Error).message}`);
            }
          },
        },
      ]
    );
  };

  const handleTrust = async () => {
    try {
      if (peer.isTrusted) {
        await untrustPeer(deviceId);
        Alert.alert('Success', `Removed trust from ${peer.name}`);
      } else {
        await trustPeer(deviceId);
        Alert.alert('Success', `${peer.name} is now trusted`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to update trust: ${(error as Error).message}`);
    }
  };

  const handleBlock = async () => {
    Alert.alert(
      'Block Device',
      `Are you sure you want to block ${peer.name}? This will disconnect and prevent future connections.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockPeer(deviceId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', `Failed to block device: ${(error as Error).message}`);
            }
          },
        },
      ]
    );
  };

  const handleSendTestMessage = async () => {
    setIsSendingTest(true);
    try {
      const testData = {
        type: 'test',
        timestamp: Date.now(),
        message: 'Hello from ConnectionScreen!',
      };

      await sendMessage(deviceId, testData);
      Alert.alert('Success', 'Test message sent');
    } catch (error) {
      Alert.alert('Error', `Failed to send message: ${(error as Error).message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Peer Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Device Information</Text>
            {peer.isTrusted && <Text style={styles.trustBadge}>★ Trusted</Text>}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{peer.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Device ID:</Text>
            <Text style={styles.valueSmall} numberOfLines={1}>
              {peer.deviceId}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  {backgroundColor: peer.isConnected ? '#10B981' : '#EF4444'},
                ]}
              />
              <Text style={styles.statusText}>
                {peer.isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
        </View>

        {/* Signal Strength Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Signal Strength</Text>

          <View style={styles.signalContainer}>
            <Text style={styles.rssiValue}>{peer.rssi} dBm</Text>
            <Text style={[styles.proximityLabel, {color: getProximityColor(proximity)}]}>
              {getProximityLabel(proximity)}
            </Text>
          </View>

          <View style={styles.signalBar}>
            <View
              style={[
                styles.signalFill,
                {
                  width: `${getSignalPercentage(peer.rssi)}%`,
                  backgroundColor: getProximityColor(proximity),
                },
              ]}
            />
          </View>
        </View>

        {/* Session Info Card */}
        {session && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Session Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Session ID:</Text>
              <Text style={styles.valueSmall} numberOfLines={1}>
                {session.sessionId}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Established:</Text>
              <Text style={styles.value}>
                {new Date(session.establishedAt).toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Expires:</Text>
              <Text style={styles.value}>
                {new Date(session.expiresAt).toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Messages:</Text>
              <Text style={styles.value}>{session.messageCount}</Text>
            </View>
          </View>
        )}

        {/* Connection Health Card */}
        {connectionHealth && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connection Health</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{connectionHealth.messagesSent}</Text>
                <Text style={styles.statLabel}>Sent</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{connectionHealth.messagesReceived}</Text>
                <Text style={styles.statLabel}>Received</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{connectionHealth.errors}</Text>
                <Text style={styles.statLabel}>Errors</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Last Heartbeat:</Text>
              <Text style={styles.value}>
                {new Date(connectionHealth.lastHeartbeat).toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Missed Heartbeats:</Text>
              <Text
                style={[
                  styles.value,
                  connectionHealth.missedHeartbeats > 0 && styles.errorText,
                ]}>
                {connectionHealth.missedHeartbeats}
              </Text>
            </View>
          </View>
        )}

        {/* Test Message Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Test Communication</Text>

          <TouchableOpacity
            style={[styles.button, isSendingTest && styles.buttonDisabled]}
            onPress={handleSendTestMessage}
            disabled={isSendingTest || !peer.isConnected}>
            {isSendingTest ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Send Test Message</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.trustButton]}
            onPress={handleTrust}>
            <Text style={styles.actionButtonText}>
              {peer.isTrusted ? 'Remove Trust' : 'Trust Device'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.disconnectButton]}
            onPress={handleDisconnect}>
            <Text style={styles.actionButtonText}>Disconnect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.blockButton]}
            onPress={handleBlock}>
            <Text style={styles.actionButtonText}>Block Device</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper functions
const getProximityLabel = (proximity: ProximityLevel): string => {
  switch (proximity) {
    case ProximityLevel.IMMEDIATE:
      return 'Excellent (< 1m)';
    case ProximityLevel.NEAR:
      return 'Good (1-3m)';
    case ProximityLevel.FAR:
      return 'Weak (3-10m)';
    case ProximityLevel.OUT_OF_RANGE:
      return 'Poor (> 10m)';
  }
};

const getProximityColor = (proximity: ProximityLevel): string => {
  switch (proximity) {
    case ProximityLevel.IMMEDIATE:
      return '#10B981';
    case ProximityLevel.NEAR:
      return '#3B82F6';
    case ProximityLevel.FAR:
      return '#F59E0B';
    case ProximityLevel.OUT_OF_RANGE:
      return '#EF4444';
  }
};

const getSignalPercentage = (rssi: number): number => {
  // Convert RSSI (-100 to -30) to percentage (0 to 100)
  const min = -100;
  const max = -30;
  const percentage = ((rssi - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, percentage));
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
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  trustBadge: {
    fontSize: 16,
    color: '#F59E0B',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  valueSmall: {
    fontSize: 12,
    color: '#111827',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  signalContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rssiValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
  },
  proximityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  signalBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  signalFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  trustButton: {
    backgroundColor: '#10B981',
  },
  disconnectButton: {
    backgroundColor: '#F59E0B',
  },
  blockButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 16,
  },
});
