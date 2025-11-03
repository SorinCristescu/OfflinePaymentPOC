/**
 * BLEStatus Component
 * Phase 5: BLE Communication Foundation
 *
 * Displays current Bluetooth and BLE status
 * Shows initialization state, Bluetooth state, and error messages
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {State as BleState} from 'react-native-ble-plx';
import {useBLEStatus} from '../../stores/bleStore';

interface BLEStatusProps {
  onEnableBluetooth?: () => void;
  compact?: boolean; // Compact mode for headers
}

export const BLEStatus: React.FC<BLEStatusProps> = ({
  onEnableBluetooth,
  compact = false,
}) => {
  const {isInitialized, bluetoothState, isBluetoothEnabled, error} = useBLEStatus();

  // Get status color
  const getStatusColor = (): string => {
    if (error) return '#EF4444'; // Red
    if (!isInitialized) return '#F59E0B'; // Orange
    if (!isBluetoothEnabled) return '#F59E0B'; // Orange
    return '#10B981'; // Green
  };

  // Get status text
  const getStatusText = (): string => {
    if (error) return 'Error';
    if (!isInitialized) return 'Initializing...';
    if (!isBluetoothEnabled) {
      switch (bluetoothState) {
        case BleState.PoweredOff:
          return 'Bluetooth Off';
        case BleState.Unauthorized:
          return 'Permission Denied';
        case BleState.Unsupported:
          return 'Not Supported';
        case BleState.Unknown:
          return 'Unknown State';
        default:
          return 'Not Ready';
      }
    }
    return 'Ready';
  };

  // Get status icon (simple text icon)
  const getStatusIcon = (): string => {
    if (error) return '✕';
    if (!isInitialized) return '⟳';
    if (!isBluetoothEnabled) return '⚠';
    return '✓';
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();
  const statusIcon = getStatusIcon();

  if (compact) {
    return (
      <View style={[styles.compactContainer, {backgroundColor: statusColor + '20'}]}>
        <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
        <Text style={[styles.compactText, {color: statusColor}]}>
          {statusText}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={[styles.iconContainer, {backgroundColor: statusColor + '20'}]}>
          <Text style={[styles.iconText, {color: statusColor}]}>{statusIcon}</Text>
        </View>

        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>Bluetooth Status</Text>
          <Text style={[styles.statusText, {color: statusColor}]}>{statusText}</Text>
        </View>

        {!isBluetoothEnabled && bluetoothState === BleState.PoweredOff && onEnableBluetooth && (
          <TouchableOpacity
            style={styles.enableButton}
            onPress={onEnableBluetooth}
            activeOpacity={0.7}>
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isInitialized && (
        <View style={styles.messageContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.messageText}>Initializing BLE services...</Text>
        </View>
      )}

      {error && (
        <View style={[styles.messageContainer, styles.errorContainer]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {bluetoothState === BleState.Unauthorized && (
        <View style={[styles.messageContainer, styles.warningContainer]}>
          <Text style={styles.warningText}>
            Bluetooth permission is required. Please enable it in Settings.
          </Text>
        </View>
      )}

      {bluetoothState === BleState.Unsupported && (
        <View style={[styles.messageContainer, styles.errorContainer]}>
          <Text style={styles.errorText}>
            Bluetooth is not supported on this device.
          </Text>
        </View>
      )}
    </View>
  );
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enableButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  messageContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    flex: 1,
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
