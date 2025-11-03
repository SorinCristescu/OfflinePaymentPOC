/**
 * PeerDeviceList Component
 * Phase 5: BLE Communication Foundation
 *
 * Displays a list of discovered peer devices
 * Shows device info, connection status, trust level, and signal strength
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {PeerDevice, getProximityLevel, ProximityLevel, TrustLevel} from '../../types/p2p';
import {useDiscoveredPeers, usePeerStore} from '../../stores/peerStore';

interface PeerDeviceListProps {
  onPeerPress?: (peer: PeerDevice) => void;
  onPeerLongPress?: (peer: PeerDevice) => void;
  filterTrusted?: boolean;
  filterConnected?: boolean;
  emptyMessage?: string;
}

export const PeerDeviceList: React.FC<PeerDeviceListProps> = ({
  onPeerPress,
  onPeerLongPress,
  filterTrusted = false,
  filterConnected = false,
  emptyMessage = 'No devices found',
}) => {
  const discoveredPeers = useDiscoveredPeers();
  const getTrustLevel = usePeerStore((state) => state.getTrustLevel);

  // Filter peers
  const peers = React.useMemo(() => {
    let filtered = [...discoveredPeers];

    if (filterTrusted) {
      filtered = filtered.filter((p) => p.isTrusted);
    }

    if (filterConnected) {
      filtered = filtered.filter((p) => p.isConnected);
    }

    // Sort by connection status, then trust, then RSSI
    filtered.sort((a, b) => {
      if (a.isConnected !== b.isConnected) {
        return a.isConnected ? -1 : 1;
      }
      if (a.isTrusted !== b.isTrusted) {
        return a.isTrusted ? -1 : 1;
      }
      return b.rssi - a.rssi; // Higher RSSI first (closer)
    });

    return filtered;
  }, [discoveredPeers, filterTrusted, filterConnected]);

  const renderPeerItem = ({item: peer}: {item: PeerDevice}) => {
    const proximity = getProximityLevel(peer.rssi);
    const trustLevel = getTrustLevel(peer.deviceId);

    return (
      <TouchableOpacity
        style={[styles.peerItem, peer.isConnected && styles.peerItemConnected]}
        onPress={() => onPeerPress?.(peer)}
        onLongPress={() => onPeerLongPress?.(peer)}
        activeOpacity={0.7}>
        {/* Connection Indicator */}
        <View
          style={[
            styles.connectionDot,
            {
              backgroundColor: peer.isConnected ? '#10B981' : '#D1D5DB',
            },
          ]}
        />

        {/* Peer Info */}
        <View style={styles.peerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.peerName} numberOfLines={1}>
              {peer.name}
            </Text>
            {peer.isTrusted && <Text style={styles.trustBadge}>★</Text>}
          </View>

          <Text style={styles.deviceId} numberOfLines={1}>
            {peer.deviceId.substring(0, 16)}...
          </Text>

          <View style={styles.metaRow}>
            {/* Signal Strength */}
            <View style={styles.signalContainer}>
              <Text style={styles.signalIcon}>{getSignalIcon(proximity)}</Text>
              <Text style={[styles.signalText, {color: getProximityColor(proximity)}]}>
                {getProximityLabel(proximity)}
              </Text>
            </View>

            {/* Connection Status */}
            {peer.isConnected && (
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            )}

            {/* Trust Level Badge */}
            {trustLevel !== TrustLevel.DISCOVERED && trustLevel !== TrustLevel.UNKNOWN && (
              <View
                style={[
                  styles.trustLevelBadge,
                  {backgroundColor: getTrustLevelColor(trustLevel)},
                ]}>
                <Text style={styles.trustLevelText}>{getTrustLevelLabel(trustLevel)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* RSSI Value */}
        <View style={styles.rssiContainer}>
          <Text style={styles.rssiValue}>{peer.rssi}</Text>
          <Text style={styles.rssiLabel}>dBm</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (peers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={peers}
      renderItem={renderPeerItem}
      keyExtractor={(item) => item.deviceId}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

// Helper functions
const getSignalIcon = (proximity: ProximityLevel): string => {
  switch (proximity) {
    case ProximityLevel.IMMEDIATE:
      return '📶';
    case ProximityLevel.NEAR:
      return '📡';
    case ProximityLevel.FAR:
      return '📉';
    case ProximityLevel.OUT_OF_RANGE:
      return '❌';
  }
};

const getProximityLabel = (proximity: ProximityLevel): string => {
  switch (proximity) {
    case ProximityLevel.IMMEDIATE:
      return 'Very Close';
    case ProximityLevel.NEAR:
      return 'Near';
    case ProximityLevel.FAR:
      return 'Far';
    case ProximityLevel.OUT_OF_RANGE:
      return 'Out of Range';
  }
};

const getProximityColor = (proximity: ProximityLevel): string => {
  switch (proximity) {
    case ProximityLevel.IMMEDIATE:
      return '#10B981'; // Green
    case ProximityLevel.NEAR:
      return '#3B82F6'; // Blue
    case ProximityLevel.FAR:
      return '#F59E0B'; // Orange
    case ProximityLevel.OUT_OF_RANGE:
      return '#EF4444'; // Red
  }
};

const getTrustLevelLabel = (level: TrustLevel): string => {
  switch (level) {
    case TrustLevel.TRUSTED:
      return 'Trusted';
    case TrustLevel.PENDING:
      return 'Pending';
    case TrustLevel.BLOCKED:
      return 'Blocked';
    default:
      return '';
  }
};

const getTrustLevelColor = (level: TrustLevel): string => {
  switch (level) {
    case TrustLevel.TRUSTED:
      return '#10B98120'; // Green with transparency
    case TrustLevel.PENDING:
      return '#F59E0B20'; // Orange with transparency
    case TrustLevel.BLOCKED:
      return '#EF444420'; // Red with transparency
    default:
      return '#D1D5DB20';
  }
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  peerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  peerItemConnected: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  peerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  peerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  trustBadge: {
    fontSize: 18,
    color: '#F59E0B',
    marginLeft: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  signalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  connectedBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  connectedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  trustLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trustLevelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  rssiContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  rssiValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  rssiLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
