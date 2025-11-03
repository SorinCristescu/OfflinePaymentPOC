/**
 * BLESettingsScreen
 * Phase 5: BLE Communication Foundation
 *
 * Configuration screen for BLE and peer discovery settings
 * Allows users to customize connection behavior and view statistics
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import {useBLEStore, useConnectionStats, useMessageStats} from '../stores/bleStore';
import {usePeerCounts, usePeerStore} from '../stores/peerStore';
import {ConnectionManager} from '../services/ble/ConnectionManager';
import {BLEManager} from '../services/ble/BLEManager';
import {MessageProtocol} from '../services/ble/MessageProtocol';

interface SettingRowProps {
  label: string;
  value: string | number;
  onPress?: () => void;
}

const SettingRow: React.FC<SettingRowProps> = ({label, value, onPress}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Text style={styles.settingValue}>{value}</Text>
  </TouchableOpacity>
);

interface SettingSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
}

const SettingSwitch: React.FC<SettingSwitchProps> = ({
  label,
  value,
  onValueChange,
  description,
}) => (
  <View style={styles.switchContainer}>
    <View style={styles.switchLabelContainer}>
      <Text style={styles.settingLabel}>{label}</Text>
      {description && <Text style={styles.settingDescription}>{description}</Text>}
    </View>
    <Switch value={value} onValueChange={onValueChange} />
  </View>
);

export const BLESettingsScreen: React.FC = () => {
  // Store state
  const {connectionCount, maxConnections} = useConnectionStats();
  const {messageQueueSize, pendingAcks} = useMessageStats();
  const {discovered, trusted, connected} = usePeerCounts();
  const clearDiscovered = usePeerStore((state) => state.clearDiscovered);
  const refreshStats = useBLEStore((state) => state.refreshStats);

  // Connection Manager config
  const [config, setConfig] = useState(ConnectionManager.getConfig());

  // BLE Manager platform info
  const [platformInfo, setPlatformInfo] = useState(BLEManager.getPlatformInfo());

  // Local state for editing
  const [isEditingMaxConnections, setIsEditingMaxConnections] = useState(false);
  const [maxConnectionsInput, setMaxConnectionsInput] = useState(
    config.maxConnections.toString()
  );

  // Refresh config
  useEffect(() => {
    const interval = setInterval(() => {
      setConfig(ConnectionManager.getConfig());
      refreshStats();
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshStats]);

  const handleToggleAutoReconnect = (value: boolean) => {
    ConnectionManager.updateConfig({autoReconnect: value});
    setConfig(ConnectionManager.getConfig());
  };

  const handleSaveMaxConnections = () => {
    const newMax = parseInt(maxConnectionsInput, 10);
    if (isNaN(newMax) || newMax < 1 || newMax > 10) {
      Alert.alert('Invalid Value', 'Max connections must be between 1 and 10');
      return;
    }

    ConnectionManager.updateConfig({maxConnections: newMax});
    setConfig(ConnectionManager.getConfig());
    setIsEditingMaxConnections(false);
    Alert.alert('Success', `Max connections updated to ${newMax}`);
  };

  const handleClearDiscovered = () => {
    Alert.alert(
      'Clear Discovered Devices',
      'This will remove all discovered devices from the list. Trusted and connected devices will remain.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearDiscovered();
            Alert.alert('Success', 'Discovered devices cleared');
          },
        },
      ]
    );
  };

  const handleClearMessageQueue = () => {
    Alert.alert(
      'Clear Message Queue',
      'This will clear all pending messages. Messages will not be sent.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            MessageProtocol.clearQueue();
            refreshStats();
            Alert.alert('Success', 'Message queue cleared');
          },
        },
      ]
    );
  };

  const handleDisconnectAll = async () => {
    Alert.alert(
      'Disconnect All',
      'This will disconnect from all connected devices.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await ConnectionManager.disconnectAll();
              Alert.alert('Success', 'Disconnected from all devices');
            } catch (error) {
              Alert.alert('Error', `Failed to disconnect: ${(error as Error).message}`);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{discovered}</Text>
              <Text style={styles.statLabel}>Discovered</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{trusted}</Text>
              <Text style={styles.statLabel}>Trusted</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{connected}</Text>
              <Text style={styles.statLabel}>Connected</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{messageQueueSize}</Text>
              <Text style={styles.statLabel}>Queue</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{pendingAcks}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Connection Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Settings</Text>

          <View style={styles.card}>
            {isEditingMaxConnections ? (
              <View style={styles.editContainer}>
                <Text style={styles.settingLabel}>Max Connections:</Text>
                <TextInput
                  style={styles.input}
                  value={maxConnectionsInput}
                  onChangeText={setMaxConnectionsInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  autoFocus
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelButton]}
                    onPress={() => {
                      setMaxConnectionsInput(config.maxConnections.toString());
                      setIsEditingMaxConnections(false);
                    }}>
                    <Text style={styles.editButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, styles.saveButton]}
                    onPress={handleSaveMaxConnections}>
                    <Text style={styles.editButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <SettingRow
                label="Max Connections"
                value={`${connectionCount} / ${maxConnections}`}
                onPress={() => setIsEditingMaxConnections(true)}
              />
            )}

            <SettingRow
              label="Connection Timeout"
              value={`${config.connectionTimeoutMs / 1000}s`}
            />

            <SettingRow
              label="Heartbeat Interval"
              value={`${config.heartbeatIntervalMs / 1000}s`}
            />

            <SettingRow
              label="Reconnect Attempts"
              value={config.maxReconnectAttempts.toString()}
            />

            <SettingRow
              label="Reconnect Delay"
              value={`${config.reconnectDelayMs / 1000}s`}
            />

            <SettingSwitch
              label="Auto-Reconnect"
              value={config.autoReconnect}
              onValueChange={handleToggleAutoReconnect}
              description="Automatically reconnect when connection is lost"
            />
          </View>
        </View>

        {/* Platform Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Information</Text>

          <View style={styles.card}>
            <SettingRow label="Platform" value={platformInfo.platform} />
            {platformInfo.apiLevel && (
              <SettingRow label="API Level" value={platformInfo.apiLevel.toString()} />
            )}
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={handleClearDiscovered}
            disabled={discovered === 0}>
            <Text style={styles.buttonText}>Clear Discovered Devices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={handleClearMessageQueue}
            disabled={messageQueueSize === 0}>
            <Text style={styles.buttonText}>Clear Message Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleDisconnectAll}
            disabled={connected === 0}>
            <Text style={styles.buttonText}>Disconnect All Devices</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.card}>
            <Text style={styles.aboutText}>
              BLE Communication Foundation - Phase 5
            </Text>
            <Text style={styles.aboutSubtext}>
              Secure peer-to-peer communication for offline payments
            </Text>
          </View>
        </View>
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
    color: '#6B7280',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  editContainer: {
    paddingVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aboutText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  aboutSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
});
