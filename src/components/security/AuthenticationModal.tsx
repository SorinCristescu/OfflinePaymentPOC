/**
 * AuthenticationModal - Global modal for authentication prompts
 *
 * Can be triggered from anywhere in the app to show PIN or biometric authentication
 */

import React, {useState, useEffect} from 'react';
import {Modal, View, StyleSheet, Text} from 'react-native';
import {PINInput} from './PINInput';
import {BiometricPrompt} from './BiometricPrompt';
import {Button} from '../Button';
import {useTheme} from '../../contexts/ThemeContext';
import {theme as staticTheme} from '../../theme';
import {useAuthStore} from '../../stores';
import {BiometricService} from '../../services/security';
import {AuthenticationMethod} from '../../types';

export const AuthenticationModal: React.FC = () => {
  const {theme} = useTheme();
  const {
    configuredMethod = AuthenticationMethod.NONE,
    biometricAvailable = false,
    authenticateWithPIN,
    showAuthPrompt = false,
    authPromptMessage,
    authPromptMethod,
    completeAuthenticationPrompt,
    cancelAuthenticationPrompt,
  } = useAuthStore();

  const [error, setError] = useState<string | undefined>();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Reset state when modal becomes visible
  useEffect(() => {
    if (showAuthPrompt) {
      setError(undefined);
      setIsAuthenticating(false);
    }
  }, [showAuthPrompt]);

  // Don't render if modal shouldn't be shown
  if (!showAuthPrompt) {
    return null;
  }

  // Determine which method to use
  const authMethod = authPromptMethod || configuredMethod;
  const showBiometric =
    authMethod === AuthenticationMethod.BIOMETRIC ||
    authMethod === AuthenticationMethod.PIN_AND_BIOMETRIC;
  const showPIN =
    authMethod === AuthenticationMethod.PIN ||
    authMethod === AuthenticationMethod.PIN_AND_BIOMETRIC;

  // Handle PIN authentication
  const handlePINComplete = async (enteredPin: string) => {
    setIsAuthenticating(true);
    setError(undefined);

    try {
      const result = await authenticateWithPIN(enteredPin);
      await completeAuthenticationPrompt(result);

      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Authentication failed';
      setError(errorMsg);
      await completeAuthenticationPrompt({
        success: false,
        method: AuthenticationMethod.PIN,
        error: errorMsg,
        timestamp: new Date(),
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle biometric authentication success
  const handleBiometricSuccess = async () => {
    const authResult = {
      success: true,
      method: AuthenticationMethod.BIOMETRIC,
      timestamp: new Date(),
    };
    await completeAuthenticationPrompt(authResult);
  };

  // Handle biometric authentication error
  const handleBiometricError = async (errorMsg: string) => {
    setError(errorMsg);
    await completeAuthenticationPrompt({
      success: false,
      method: AuthenticationMethod.BIOMETRIC,
      error: errorMsg,
      timestamp: new Date(),
    });
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.background.primary,
      borderRadius: staticTheme.borderRadius.lg,
      padding: staticTheme.spacing.xl,
      width: '85%',
      maxWidth: 400,
      ...staticTheme.shadows.lg,
    },
    header: {
      marginBottom: staticTheme.spacing.xl,
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
    content: {
      marginBottom: staticTheme.spacing.lg,
    },
    buttonsContainer: {
      gap: staticTheme.spacing.md,
    },
  });

  return (
    <Modal
      visible={showAuthPrompt}
      transparent={true}
      animationType="fade"
      onRequestClose={cancelAuthenticationPrompt}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Authentication Required</Text>
            <Text style={styles.message}>{authPromptMessage || 'Please authenticate'}</Text>
          </View>

          <View style={styles.content}>
            {showBiometric && biometricAvailable && (
              <BiometricPrompt
                promptMessage={authPromptMessage || 'Authenticate'}
                onSuccess={handleBiometricSuccess}
                onError={handleBiometricError}
                onFallbackToPIN={showPIN ? () => {} : undefined}
                variant="card"
              />
            )}

            {showPIN && (
              <PINInput
                key={`pin-${showAuthPrompt}`}
                onComplete={handlePINComplete}
                autoFocus={!showBiometric || !biometricAvailable}
                disabled={isAuthenticating}
                error={error}
                clearOnError={true}
              />
            )}
          </View>

          <View style={styles.buttonsContainer}>
            <Button
              title="Cancel"
              onPress={cancelAuthenticationPrompt}
              variant="outline"
              disabled={isAuthenticating}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
