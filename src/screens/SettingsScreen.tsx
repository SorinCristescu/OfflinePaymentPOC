/**
 * Settings Screen - App settings and preferences
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {Card, Button} from '../components';
import {useSettingsStore, useWalletStore, useTransactionStore, useAuthStore} from '../stores';
import {useTheme} from '../contexts/ThemeContext';
import {theme as staticTheme} from '../theme';
import {AuthenticationMethod, BiometricType} from '../types';
import {SecuritySetupScreen} from './onboarding/SecuritySetupScreen';
import {PINSetup} from '../components/security/PINSetup';

export const SettingsScreen: React.FC = () => {
  const {app, device, notifications, updateAppSettings, updateNotificationSettings} =
    useSettingsStore();
  const resetWallet = useWalletStore(state => state.reset);
  const resetTransactions = useTransactionStore(state => state.reset);
  const {theme, mode, toggleTheme} = useTheme();

  // Auth state
  const {
    configuredMethod,
    biometricAvailable,
    biometricCapabilities,
    setupAuthentication,
    disableAuthentication,
    authenticate,
  } = useAuthStore();

  // Modal states
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [showPINChange, setShowPINChange] = useState(false);

  // Helper to get biometric type name
  const getBiometricTypeName = (): string => {
    if (!biometricCapabilities) return 'Biometric';
    switch (biometricCapabilities.biometricType) {
      case BiometricType.FACE_ID:
        return 'Face ID';
      case BiometricType.FINGERPRINT:
        return 'Fingerprint';
      case BiometricType.IRIS:
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  };

  // Get security method display text
  const getSecurityMethodText = (): string => {
    switch (configuredMethod) {
      case AuthenticationMethod.NONE:
        return 'Not Configured';
      case AuthenticationMethod.PIN:
        return 'PIN Code';
      case AuthenticationMethod.BIOMETRIC:
        return getBiometricTypeName();
      case AuthenticationMethod.PIN_AND_BIOMETRIC:
        return `PIN + ${getBiometricTypeName()}`;
      default:
        return 'Unknown';
    }
  };

  // Handle setup security
  const handleSetupSecurity = () => {
    setShowSecuritySetup(true);
  };

  // Handle security setup complete
  const handleSecuritySetupComplete = () => {
    setShowSecuritySetup(false);
    Alert.alert('Success', 'Security has been configured successfully.');
  };

  // Handle change PIN
  const handleChangePIN = async () => {
    // First authenticate to change PIN
    const authResult = await authenticate(
      undefined,
      'Authenticate to change your PIN'
    );

    if (authResult.success) {
      setShowPINChange(true);
    }
  };

  // Handle PIN change complete
  const handlePINChangeComplete = async (newPin: string, confirmPin: string) => {
    try {
      const result = await setupAuthentication(
        configuredMethod === AuthenticationMethod.BIOMETRIC
          ? AuthenticationMethod.PIN_AND_BIOMETRIC
          : AuthenticationMethod.PIN,
        {pin: newPin, confirmPin}
      );

      if (result.success) {
        setShowPINChange(false);
        Alert.alert('Success', 'PIN has been changed successfully.');
      } else {
        Alert.alert('Error', result.error || 'Failed to change PIN.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to change PIN.');
    }
  };

  // Handle disable security
  const handleDisableSecurity = async () => {
    // First authenticate to disable security
    const authResult = await authenticate(
      undefined,
      'Authenticate to disable security'
    );

    if (!authResult.success) {
      return;
    }

    Alert.alert(
      'Disable Security',
      'Are you sure you want to disable security? This will remove all authentication requirements.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            const result = await disableAuthentication(configuredMethod);
            if (result.success) {
              // Small delay to ensure state propagates to all components
              setTimeout(() => {
                Alert.alert('Success', 'Security has been disabled.');
              }, 100);
            } else {
              Alert.alert('Error', result.error || 'Failed to disable security.');
            }
          },
        },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all wallet balances and transaction history. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetWallet();
            resetTransactions();
            Alert.alert('Success', 'App data has been reset.');
          },
        },
      ],
    );
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        {/* Device Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>

          <Card style={styles.card}>
            <SettingRow label="Device Name" value={device.deviceName} theme={theme} />
            <SettingRow label="Platform" value={device.platform.toUpperCase()} theme={theme} />
            <SettingRow label="OS Version" value={device.osVersion} theme={theme} />
            <SettingRow label="App Version" value={device.appVersion} theme={theme} />
            <SettingRow
              label="Device ID"
              value={`${device.deviceId.substring(0, 20)}...`}
              theme={theme}
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Security Features (Phase 4+)</Text>
            <SettingRow
              label="TEE Support"
              value={device.hasTEE ? 'Available' : 'Not Detected'}
              valueColor={
                device.hasTEE
                  ? theme.success.main
                  : theme.text.tertiary
              }
              theme={theme}
            />
            <SettingRow
              label="SE Support"
              value={device.hasSE ? 'Available' : 'Not Detected'}
              valueColor={
                device.hasSE
                  ? theme.success.main
                  : theme.text.tertiary
              }
              theme={theme}
            />
            <SettingRow
              label="NFC Support"
              value={device.hasNFC ? 'Available' : 'Not Detected'}
              valueColor={
                device.hasNFC
                  ? theme.success.main
                  : theme.text.tertiary
              }
              theme={theme}
            />
            <SettingRow
              label="BLE Support"
              value={device.hasBLE ? 'Available' : 'Not Detected'}
              valueColor={
                device.hasBLE
                  ? theme.success.main
                  : theme.text.tertiary
              }
              theme={theme}
            />
          </Card>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <Card style={styles.card}>
            <SettingSwitchRow
              label="Dark Mode"
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              theme={theme}
            />
            <SettingSwitchRow
              label="Show Balance on Home"
              value={app.showBalanceOnHome}
              onValueChange={value =>
                updateAppSettings({showBalanceOnHome: value})
              }
              theme={theme}
            />
            <SettingSwitchRow
              label="Haptic Feedback"
              value={app.hapticFeedback}
              onValueChange={value => updateAppSettings({hapticFeedback: value})}
              theme={theme}
            />
            <SettingSwitchRow
              label="Sound Effects"
              value={app.soundEffects}
              onValueChange={value => updateAppSettings({soundEffects: value})}
              theme={theme}
            />
          </Card>

          <Card style={styles.card}>
            <SettingRow label="Language" value={app.language.toUpperCase()} theme={theme} />
            <SettingRow label="Currency" value={app.currency} theme={theme} />
          </Card>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <Card style={styles.card}>
            <SettingSwitchRow
              label="Transaction Notifications"
              value={notifications.transactionsEnabled}
              onValueChange={value =>
                updateNotificationSettings({transactionsEnabled: value})
              }
              theme={theme}
            />
            <SettingSwitchRow
              label="Security Alerts"
              value={notifications.securityAlertsEnabled}
              onValueChange={value =>
                updateNotificationSettings({securityAlertsEnabled: value})
              }
              theme={theme}
            />
            <SettingSwitchRow
              label="Promotional Notifications"
              value={notifications.promotionsEnabled}
              onValueChange={value =>
                updateNotificationSettings({promotionsEnabled: value})
              }
              theme={theme}
            />
          </Card>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <Card style={styles.card}>
            <SettingRow
              label="Security Method"
              value={getSecurityMethodText()}
              valueColor={
                configuredMethod === AuthenticationMethod.NONE
                  ? theme.error?.main || '#EF4444'
                  : theme.success?.main || '#10B981'
              }
              theme={theme}
            />

            {configuredMethod !== AuthenticationMethod.NONE && (
              <>
                {(configuredMethod === AuthenticationMethod.PIN ||
                  configuredMethod === AuthenticationMethod.PIN_AND_BIOMETRIC) && (
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={handleChangePIN}>
                    <Text style={styles.settingLabel}>Change PIN</Text>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={handleDisableSecurity}>
                  <Text style={[styles.settingLabel, {color: theme.error?.main || '#EF4444'}]}>
                    Disable Security
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              </>
            )}

            {configuredMethod === AuthenticationMethod.NONE && (
              <View style={{marginTop: staticTheme.spacing.md}}>
                <Button
                  title="Set Up Security"
                  onPress={handleSetupSecurity}
                  variant="primary"
                  fullWidth
                />
              </View>
            )}
          </Card>

          {biometricAvailable && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Biometric Capabilities</Text>
              <SettingRow
                label="Type"
                value={getBiometricTypeName()}
                theme={theme}
              />
              <SettingRow
                label="Status"
                value={biometricCapabilities?.isAvailable ? 'Available' : 'Not Available'}
                valueColor={
                  biometricCapabilities?.isAvailable
                    ? theme.success?.main || '#10B981'
                    : theme.error?.main || '#EF4444'
                }
                theme={theme}
              />
            </Card>
          )}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                Alert.alert('Privacy Policy', 'Privacy Policy content would go here.')
              }>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                Alert.alert(
                  'Terms of Service',
                  'Terms of Service content would go here.',
                )
              }>
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                Alert.alert(
                  'Open Source Licenses',
                  'This app uses various open source libraries.',
                )
              }>
              <Text style={styles.settingLabel}>Open Source Licenses</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <Button
            title="Reset App Data"
            onPress={handleResetApp}
            variant="outline"
            fullWidth
            textStyle={{color: theme.error.main}}
            style={{borderColor: theme.error.main}}
          />
        </View>

        <Text style={styles.footer}>
          SMVC Offline Payment v{device.appVersion}
        </Text>
      </ScrollView>

      {/* Security Setup Modal */}
      <Modal
        visible={showSecuritySetup}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSecuritySetup(false)}>
        <SafeAreaView style={{flex: 1, backgroundColor: theme.background?.primary || '#FFFFFF'}}>
          <SecuritySetupScreen
            onComplete={handleSecuritySetupComplete}
            onSkip={() => setShowSecuritySetup(false)}
            showSkip={true}
          />
        </SafeAreaView>
      </Modal>

      {/* PIN Change Modal */}
      <Modal
        visible={showPINChange}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPINChange(false)}>
        <SafeAreaView style={{flex: 1, backgroundColor: theme.background?.primary || '#FFFFFF'}}>
          <PINSetup
            onComplete={handlePINChangeComplete}
            onCancel={() => setShowPINChange(false)}
            showCancel={true}
            title="Change Your PIN"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

interface SettingRowProps {
  label: string;
  value: string;
  valueColor?: string;
  theme?: any;
}

const SettingRow: React.FC<SettingRowProps> = ({label, value, valueColor, theme: themeColors}) => {
  const styles = createStyles(themeColors || staticTheme);
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={[styles.settingValue, valueColor && {color: valueColor}]}>
        {value}
      </Text>
    </View>
  );
};

interface SettingSwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme?: any;
}

const SettingSwitchRow: React.FC<SettingSwitchRowProps> = ({
  label,
  value,
  onValueChange,
  theme: themeColors,
}) => {
  const styles = createStyles(themeColors || staticTheme);
  const colors = themeColors || staticTheme.colors;

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.neutral[300],
          true: colors.primary.light,
        }}
        thumbColor={value ? colors.primary.main : colors.neutral[100]}
      />
    </View>
  );
};

const createStyles = (themeColors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background?.primary || staticTheme.colors.background.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: staticTheme.spacing.lg,
    paddingBottom: staticTheme.spacing['4xl'],
  },
  section: {
    marginBottom: staticTheme.spacing['3xl'],
  },
  sectionTitle: {
    ...staticTheme.typography.h3,
    color: themeColors.text?.primary || staticTheme.colors.text.primary,
    marginBottom: staticTheme.spacing.lg,
  },
  card: {
    padding: staticTheme.spacing.lg,
    marginBottom: staticTheme.spacing.md,
  },
  cardTitle: {
    ...staticTheme.typography.label,
    color: themeColors.text?.secondary || staticTheme.colors.text.secondary,
    marginBottom: staticTheme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: staticTheme.spacing.md,
    borderBottomWidth: staticTheme.borderWidth.thin,
    borderBottomColor: themeColors.border?.light || staticTheme.colors.border.light,
  },
  settingLabel: {
    ...staticTheme.typography.body,
    color: themeColors.text?.primary || staticTheme.colors.text.primary,
    flex: 1,
  },
  settingValue: {
    ...staticTheme.typography.body,
    color: themeColors.text?.secondary || staticTheme.colors.text.secondary,
  },
  chevron: {
    ...staticTheme.typography.h3,
    color: themeColors.text?.tertiary || staticTheme.colors.text.tertiary,
  },
  footer: {
    ...staticTheme.typography.captionSmall,
    color: themeColors.text?.tertiary || staticTheme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: staticTheme.spacing.xl,
  },
});
