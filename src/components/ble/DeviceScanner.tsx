/**
 * DeviceScanner Component
 * Phase 5: BLE Communication Foundation
 *
 * Provides controls for starting/stopping device discovery
 * Shows scanning/advertising status and discovered device count
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useBLEStore, useDiscoveryStatus} from '../../stores/bleStore';
import {usePeerCounts} from '../../stores/peerStore';
import {BLEMode} from '../../types/ble';

interface DeviceScannerProps {
  mode?: BLEMode;
  onModeChange?: (mode: BLEMode) => void;
}

export const DeviceScanner: React.FC<DeviceScannerProps> = ({
  mode = BLEMode.BOTH,
  onModeChange,
}) => {
  const {isScanning, isAdvertising, currentMode} = useDiscoveryStatus();
  const {discovered, trusted, connected} = usePeerCounts();
  const startDiscovery = useBLEStore((state) => state.startDiscovery);
  const stopDiscovery = useBLEStore((state) => state.stopDiscovery);
  const isBluetoothEnabled = useBLEStore((state) => state.isBluetoothEnabled);

  const [selectedMode, setSelectedMode] = React.useState<BLEMode>(mode);

  const isActive = isScanning || isAdvertising;

  const handleToggleScan = async () => {
    try {
      if (isActive) {
        await stopDiscovery();
      } else {
        await startDiscovery(selectedMode);
      }
    } catch (error) {
      console.error('[DeviceScanner] Error toggling scan:', error);
    }
  };

  const handleModeSelect = (newMode: BLEMode) => {
    setSelectedMode(newMode);
    onModeChange?.(newMode);
  };

  return (
    <View style={styles.container}>
      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <Text style={styles.modeLabel}>Discovery Mode:</Text>
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              selectedMode === BLEMode.CENTRAL && styles.modeButtonActive,
            ]}
            onPress={() => handleModeSelect(BLEMode.CENTRAL)}
            disabled={isActive}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeButtonText,
                selectedMode === BLEMode.CENTRAL && styles.modeButtonTextActive,
              ]}>
              Scan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              selectedMode === BLEMode.PERIPHERAL && styles.modeButtonActive,
            ]}
            onPress={() => handleModeSelect(BLEMode.PERIPHERAL)}
            disabled={isActive}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeButtonText,
                selectedMode === BLEMode.PERIPHERAL && styles.modeButtonTextActive,
              ]}>
              Advertise
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              selectedMode === BLEMode.BOTH && styles.modeButtonActive,
            ]}
            onPress={() => handleModeSelect(BLEMode.BOTH)}
            disabled={isActive}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeButtonText,
                selectedMode === BLEMode.BOTH && styles.modeButtonTextActive,
              ]}>
              Both
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Row */}
      <View style={styles.statusRow}>
        {/* Scanning Status */}
        {(isScanning || (isActive && selectedMode !== BLEMode.PERIPHERAL)) && (
          <View style={styles.statusBadge}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.statusText}>Scanning...</Text>
          </View>
        )}

        {/* Advertising Status */}
        {(isAdvertising || (isActive && selectedMode !== BLEMode.CENTRAL)) && (
          <View style={styles.statusBadge}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.statusText}>Advertising...</Text>
          </View>
        )}

        {!isActive && <Text style={styles.inactiveText}>Discovery inactive</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{discovered}</Text>
          <Text style={styles.statLabel}>Discovered</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{trusted}</Text>
          <Text style={styles.statLabel}>Trusted</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{connected}</Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>
      </View>

      {/* Control Button */}
      <TouchableOpacity
        style={[
          styles.controlButton,
          !isBluetoothEnabled && styles.controlButtonDisabled,
          isActive && styles.controlButtonActive,
        ]}
        onPress={handleToggleScan}
        disabled={!isBluetoothEnabled}
        activeOpacity={0.7}>
        <Text
          style={[
            styles.controlButtonText,
            isActive && styles.controlButtonTextActive,
          ]}>
          {isActive ? 'Stop Discovery' : 'Start Discovery'}
        </Text>
      </TouchableOpacity>

      {!isBluetoothEnabled && (
        <Text style={styles.disabledText}>Enable Bluetooth to start discovery</Text>
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
  modeSelector: {
    marginBottom: 16,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 32,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#1E40AF',
    marginLeft: 6,
    fontWeight: '500',
  },
  inactiveText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  statsRow: {
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
  controlButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#EF4444',
  },
  controlButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  controlButtonTextActive: {
    color: '#FFFFFF',
  },
  disabledText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
