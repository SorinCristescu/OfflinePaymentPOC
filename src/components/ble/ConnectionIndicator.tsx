/**
 * ConnectionIndicator Component
 * Phase 5: BLE Communication Foundation
 *
 * Shows real-time connection status and statistics
 * Displays active connections, signal strength, and message queue
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useConnectionStats, useMessageStats} from '../../stores/bleStore';
import {useConnectedPeers, useActiveSessions} from '../../stores/peerStore';
import {getProximityLevel, ProximityLevel} from '../../types/p2p';

interface ConnectionIndicatorProps {
  onPress?: () => void;
  compact?: boolean;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  onPress,
  compact = false,
}) => {
  const {connectionCount, maxConnections, isAtMaxConnections} = useConnectionStats();
  const {messageQueueSize, pendingAcks} = useMessageStats();
  const connectedPeers = useConnectedPeers();
  const activeSessions = useActiveSessions();

  // Calculate average signal strength
  const averageRSSI = React.useMemo(() => {
    if (connectedPeers.length === 0) return 0;
    const totalRSSI = connectedPeers.reduce((sum, peer) => sum + peer.rssi, 0);
    return Math.round(totalRSSI / connectedPeers.length);
  }, [connectedPeers]);

  const averageProximity = getProximityLevel(averageRSSI);

  // Get connection quality color
  const getQualityColor = (): string => {
    if (connectionCount === 0) return '#9CA3AF'; // Gray
    switch (averageProximity) {
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

  const qualityColor = getQualityColor();

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, {borderColor: qualityColor}]}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}>
        <View style={[styles.compactDot, {backgroundColor: qualityColor}]} />
        <Text style={styles.compactText}>
          {connectionCount} / {maxConnections}
        </Text>
        {messageQueueSize > 0 && (
          <View style={styles.queueBadge}>
            <Text style={styles.queueBadgeText}>{messageQueueSize}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Active Connections</Text>
        <View style={[styles.statusIndicator, {backgroundColor: qualityColor}]}>
          <Text style={styles.statusText}>
            {connectionCount} / {maxConnections}
          </Text>
        </View>
      </View>

      {/* Connection Stats */}
      {connectionCount > 0 ? (
        <>
          <View style={styles.statsGrid}>
            {/* Average Signal Strength */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Signal</Text>
              <Text style={[styles.statValue, {color: qualityColor}]}>
                {averageRSSI} dBm
              </Text>
              <Text style={styles.statSubtext}>{getProximityLabel(averageProximity)}</Text>
            </View>

            {/* Message Queue */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Queue</Text>
              <Text style={styles.statValue}>{messageQueueSize}</Text>
              <Text style={styles.statSubtext}>
                {messageQueueSize === 1 ? 'message' : 'messages'}
              </Text>
            </View>

            {/* Pending ACKs */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statValue}>{pendingAcks}</Text>
              <Text style={styles.statSubtext}>ACKs</Text>
            </View>
          </View>

          {/* Connected Peers List */}
          {connectedPeers.length > 0 && (
            <View style={styles.peersContainer}>
              <Text style={styles.peersLabel}>Connected Devices:</Text>
              {connectedPeers.map((peer) => {
                const proximity = getProximityLevel(peer.rssi);
                const session = activeSessions.find((s) => s.peer.deviceId === peer.deviceId);

                return (
                  <View key={peer.deviceId} style={styles.peerRow}>
                    <View
                      style={[
                        styles.peerDot,
                        {backgroundColor: getProximityColor(proximity)},
                      ]}
                    />
                    <Text style={styles.peerName} numberOfLines={1}>
                      {peer.name}
                    </Text>
                    <Text style={styles.peerRSSI}>{peer.rssi} dBm</Text>
                    {session && (
                      <Text style={styles.peerMessages}>
                        {session.messageCount} msgs
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Capacity Warning */}
          {isAtMaxConnections && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠ Maximum connections reached
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active connections</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const getProximityLabel = (proximity: ProximityLevel): string => {
  switch (proximity) {
    case ProximityLevel.IMMEDIATE:
      return 'Excellent';
    case ProximityLevel.NEAR:
      return 'Good';
    case ProximityLevel.FAR:
      return 'Weak';
    case ProximityLevel.OUT_OF_RANGE:
      return 'Poor';
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  peersContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  peersLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  peerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  peerName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  peerRSSI: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  peerMessages: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  warningContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  queueBadge: {
    marginLeft: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  queueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
