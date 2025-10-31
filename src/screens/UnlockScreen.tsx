/**
 * UnlockScreen - Authentication screen for unlocking the app
 *
 * Features:
 * - Biometric authentication option
 * - PIN authentication fallback
 * - Failed attempt tracking
 * - Lockout handling
 * - Integration with authStore
 */

import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert} from 'react-native';
import {PINInput, BiometricPrompt, Button} from '../components';
import {useTheme} from '../contexts/ThemeContext';
import {theme as staticTheme} from '../theme';
import {useAuthStore} from '../stores';
import {AuthenticationMethod} from '../types';

interface UnlockScreenProps {
  onUnlock: () => void;
  message?: string;
  promptMessage?: string;
}

enum UnlockMode {
  BIOMETRIC = 'biometric',
  PIN = 'pin',
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  onUnlock,
  message = 'Unlock to continue',
  promptMessage,
}) => {
  const {theme} = useTheme();
  const {
    authenticateWithPIN,
    configuredMethod,
    biometricAvailable,
    failedAttempts,
    isLocked,
    lockoutEndTime,
    getState,
  } = useAuthStore();

  const [unlockMode, setUnlockMode] = useState<UnlockMode>(UnlockMode.BIOMETRIC);
  const [error, setError] = useState<string | undefined>();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);

  useEffect(() => {
    // Update state on mount
    getState();

    // Determine initial unlock mode
    if (
      configuredMethod === AuthenticationMethod.BIOMETRIC ||
      configuredMethod === AuthenticationMethod.PIN_AND_BIOMETRIC
    ) {
      setUnlockMode(UnlockMode.BIOMETRIC);
    } else {
      setUnlockMode(UnlockMode.PIN);
    }
  }, [configuredMethod, getState]);

  useEffect(() => {
    // Update attempts remaining
    setAttemptsRemaining(Math.max(0, 5 - failedAttempts));
  }, [failedAttempts]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: staticTheme.spacing.xl,
    },
    header: {
      alignItems: 'center',
      marginBottom: staticTheme.spacing['2xl'],
    },
    lockIcon: {
      fontSize: 60,
      marginBottom: staticTheme.spacing.md,
    },
    title: {
      fontSize: staticTheme.fontSize["2xl"],
      fontWeight: staticTheme.fontWeight.bold as any,
      color: theme.text.primary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.sm,
    },
    message: {
      fontSize: staticTheme.fontSize.base,
      color: theme.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    contentContainer: {
      marginBottom: staticTheme.spacing.xl,
    },
    attemptsContainer: {
      backgroundColor: `${theme.error.main}10`,
      padding: staticTheme.spacing.md,
      borderRadius: staticTheme.borderRadius.md,
      marginTop: staticTheme.spacing.md,
    },
    attemptsText: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.error.main,
      textAlign: 'center',
    },
    lockoutContainer: {
      backgroundColor: theme.error.main,
      padding: staticTheme.spacing.lg,
      borderRadius: staticTheme.borderRadius.lg,
      marginVertical: staticTheme.spacing.xl,
    },
    lockoutText: {
      fontSize: staticTheme.fontSize.base,
      fontWeight: staticTheme.fontWeight.semiBold as any,
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: staticTheme.spacing.sm,
    },
    lockoutMessage: {
      fontSize: staticTheme.fontSize.sm,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    switchModeContainer: {
      marginTop: staticTheme.spacing.xl,
      alignItems: 'center',
    },
    switchModeText: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.text.secondary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.sm,
    },
  });

  const handleBiometricSuccess = () => {
    setError(undefined);
    onUnlock();
  };

  const handleBiometricError = (err: string) => {
    setError(err);
  };

  const handleBiometricCancel = () => {
    // User cancelled biometric, show PIN option
    if (
      configuredMethod === AuthenticationMethod.PIN_AND_BIOMETRIC ||
      configuredMethod === AuthenticationMethod.PIN
    ) {
      setUnlockMode(UnlockMode.PIN);
    }
  };

  const handlePINComplete = async (pin: string) => {
    if (isLocked) {
      Alert.alert('Account Locked', 'Too many failed attempts. Please try again later.');
      return;
    }

    setIsAuthenticating(true);
    setError(undefined);

    try {
      const result = await authenticateWithPIN(pin);

      if (result.success) {
        onUnlock();
      } else {
        setError(result.error || 'Incorrect PIN');
        // State will be updated automatically via authStore
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSwitchToBiometric = () => {
    if (biometricAvailable) {
      setUnlockMode(UnlockMode.BIOMETRIC);
      setError(undefined);
    }
  };

  const handleSwitchToPIN = () => {
    setUnlockMode(UnlockMode.PIN);
    setError(undefined);
  };

  // Show lockout screen if locked
  if (isLocked && lockoutEndTime) {
    const now = new Date();
    const remaining = Math.ceil((lockoutEndTime.getTime() - now.getTime()) / 1000);

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.title}>Account Locked</Text>
          </View>

          <View style={styles.lockoutContainer}>
            <Text style={styles.lockoutText}>Too Many Failed Attempts</Text>
            <Text style={styles.lockoutMessage}>
              Please try again in {remaining > 0 ? remaining : 0} seconds
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={styles.title}>Unlock Wallet</Text>
          <Text style={styles.message}>{message}</Text>
        </View>

        {/* Authentication Content */}
        <View style={styles.contentContainer}>
          {unlockMode === UnlockMode.BIOMETRIC ? (
            <BiometricPrompt
              promptMessage={promptMessage || 'Unlock your wallet'}
              onSuccess={handleBiometricSuccess}
              onError={handleBiometricError}
              onCancel={handleBiometricCancel}
              onFallbackToPIN={handleSwitchToPIN}
              showPINFallback={
                configuredMethod === AuthenticationMethod.PIN_AND_BIOMETRIC ||
                configuredMethod === AuthenticationMethod.PIN
              }
              autoTrigger={false}
              variant="card"
            />
          ) : (
            <>
              <PINInput
                onComplete={handlePINComplete}
                error={error}
                label="Enter your PIN"
                autoFocus={true}
                disabled={isAuthenticating}
                clearOnError={true}
              />

              {/* Show attempts remaining if there have been failures */}
              {failedAttempts > 0 && attemptsRemaining > 0 && (
                <View style={styles.attemptsContainer}>
                  <Text style={styles.attemptsText}>
                    {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Switch mode options */}
        {unlockMode === UnlockMode.PIN &&
          biometricAvailable &&
          (configuredMethod === AuthenticationMethod.PIN_AND_BIOMETRIC ||
            configuredMethod === AuthenticationMethod.BIOMETRIC) && (
            <View style={styles.switchModeContainer}>
              <Text style={styles.switchModeText}>or</Text>
              <Button
                title="Use Biometric Authentication"
                onPress={handleSwitchToBiometric}
                variant="outline"
              />
            </View>
          )}
      </ScrollView>
    </View>
  );
};
