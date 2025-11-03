/**
 * PeerDiscoveryScreen
 * Phase 5: BLE Communication Foundation
 *
 * Main screen for discovering nearby peer devices
 * Provides BLE control, device scanning, and peer list management
 */

import React, {useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import {useBLEStore} from '../stores/bleStore';
import {usePeerStore, initializePeerStoreListeners} from '../stores/peerStore';
import {
  BLEStatus,
  DeviceScanner,
  PeerDeviceList,
  ConnectionIndicator,
} from '../components/ble';
import {PeerDevice} from '../types/p2p';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type RootStackParamList = {
  PeerDiscovery: undefined;
  Connection: {deviceId: string};
  BLESettings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PeerDiscovery'>;

export const PeerDiscoveryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // BLE Store
  const initialize = useBLEStore((state) => state.initialize);
  const isInitialized = useBLEStore((state) => state.isInitialized);
  const isBluetoothEnabled = useBLEStore((state) => state.isBluetoothEnabled);
  const connectToPeer = useBLEStore((state) => state.connectToPeer);
  const disconnectFromPeer = useBLEStore((state) => state.disconnectFromPeer);

  // Peer Store
  const refreshPeers = usePeerStore((state) => state.refreshPeers);
  const selectPeer = usePeerStore((state) => state.selectPeer);
  const trustPeer = usePeerStore((state) => state.trustPeer);
  const untrustPeer = usePeerStore((state) => state.untrustPeer);
  const blockPeer = usePeerStore((state) => state.blockPeer);

  // Local state
  const [refreshing, setRefreshing] = React.useState(false);

  // Initialize BLE services on mount
  useEffect(() => {
    const initServices = async () => {
      try {
        if (!isInitialized) {
          console.log('[PeerDiscoveryScreen] Initializing BLE services...');
          await initialize();

          // Initialize peer store listeners
          initializePeerStoreListeners();

          console.log('[PeerDiscoveryScreen] BLE services initialized');
        }
      } catch (error) {
        console.error('[PeerDiscoveryScreen] Initialization failed:', error);
        Alert.alert('Error', 'Failed to initialize BLE services');
      }
    };

    initServices();
  }, [initialize, isInitialized]);

  // Handle peer press - show options
  const handlePeerPress = (peer: PeerDevice) => {
    selectPeer(peer.deviceId);

    const options = [];

    // Connection option
    if (peer.isConnected) {
      options.push({
        text: 'Disconnect',
        onPress: () => handleDisconnect(peer),
      });
      options.push({
        text: 'View Connection',
        onPress: () => handleViewConnection(peer),
      });
    } else {
      options.push({
        text: 'Connect',
        onPress: () => handleConnect(peer),
      });
    }

    // Trust options
    if (peer.isTrusted) {
      options.push({
        text: 'Remove Trust',
        onPress: () => handleUntrust(peer),
        style: 'destructive' as const,
      });
    } else {
      options.push({
        text: 'Trust Device',
        onPress: () => handleTrust(peer),
      });
    }

    options.push({
      text: 'Block Device',
      onPress: () => handleBlock(peer),
      style: 'destructive' as const,
    });

    options.push({text: 'Cancel', style: 'cancel' as const});

    Alert.alert(peer.name, `Device ID: ${peer.deviceId.substring(0, 20)}...`, options);
  };

  // Handle peer long press - quick connect/disconnect
  const handlePeerLongPress = (peer: PeerDevice) => {
    if (peer.isConnected) {
      handleDisconnect(peer);
    } else {
      handleConnect(peer);
    }
  };

  // Connect to peer
  const handleConnect = async (peer: PeerDevice) => {
    try {
      await connectToPeer(peer.deviceId);
      Alert.alert('Success', `Connected to ${peer.name}`);
    } catch (error) {
      Alert.alert('Error', `Failed to connect: ${(error as Error).message}`);
    }
  };

  // Disconnect from peer
  const handleDisconnect = async (peer: PeerDevice) => {
    try {
      await disconnectFromPeer(peer.deviceId);
      Alert.alert('Success', `Disconnected from ${peer.name}`);
    } catch (error) {
      Alert.alert('Error', `Failed to disconnect: ${(error as Error).message}`);
    }
  };

  // View connection details
  const handleViewConnection = (peer: PeerDevice) => {
    navigation.navigate('Connection', {deviceId: peer.deviceId});
  };

  // Trust peer
  const handleTrust = async (peer: PeerDevice) => {
    try {
      await trustPeer(peer.deviceId);
      Alert.alert('Success', `${peer.name} is now trusted`);
    } catch (error) {
      Alert.alert('Error', `Failed to trust device: ${(error as Error).message}`);
    }
  };

  // Untrust peer
  const handleUntrust = async (peer: PeerDevice) => {
    try {
      await untrustPeer(peer.deviceId);
      Alert.alert('Success', `Removed trust from ${peer.name}`);
    } catch (error) {
      Alert.alert('Error', `Failed to untrust device: ${(error as Error).message}`);
    }
  };

  // Block peer
  const handleBlock = async (peer: PeerDevice) => {
    Alert.alert(
      'Block Device',
      `Are you sure you want to block ${peer.name}? This device will no longer appear in your device list.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockPeer(peer.deviceId);
              Alert.alert('Success', `${peer.name} has been blocked`);
            } catch (error) {
              Alert.alert('Error', `Failed to block device: ${(error as Error).message}`);
            }
          },
        },
      ]
    );
  };

  // Handle refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      refreshPeers();
      await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for UX
    } finally {
      setRefreshing(false);
    }
  }, [refreshPeers]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* BLE Status */}
        <BLEStatus />

        {/* Connection Indicator */}
        {isInitialized && <ConnectionIndicator onPress={() => {}} />}

        {/* Device Scanner */}
        {isInitialized && isBluetoothEnabled && <DeviceScanner />}

        {/* Peer Device List */}
        {isInitialized && isBluetoothEnabled && (
          <PeerDeviceList
            onPeerPress={handlePeerPress}
            onPeerLongPress={handlePeerLongPress}
            emptyMessage="No devices found. Start discovery to find nearby peers."
          />
        )}
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
    gap: 16,
  },
});
