/**
 * BiometricPrompt Component
 *
 * Provides biometric authentication UI:
 * - Displays biometric type (Face ID, Touch ID, Fingerprint)
 * - Triggers biometric authentication
 * - Shows status and errors
 * - Supports fallback to PIN
 */

import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {BiometricService} from '../../services/security';
import {useTheme} from '../../contexts/ThemeContext';
import {theme as staticTheme} from '../../theme';
import {BiometricType, BiometricCapabilities} from '../../types';
import {Button} from '../Button';

interface BiometricPromptProps {
  // Prompt message for biometric authentication
  promptMessage?: string;

  // Called when authentication succeeds
  onSuccess: () => void;

  // Called when authentication fails
  onError?: (error: string) => void;

  // Called when user cancels
  onCancel?: () => void;

  // Called when user wants to use PIN instead
  onFallbackToPIN?: () => void;

  // Show fallback to PIN button
  showPINFallback?: boolean;

  // Auto-trigger on mount
  autoTrigger?: boolean;

  // Variant: 'button' | 'card'
  variant?: 'button' | 'card';

  // Button/Card title
  title?: string;
}

export const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  promptMessage,
  onSuccess,
  onError,
  onCancel,
  onFallbackToPIN,
  showPINFallback = true,
  autoTrigger = false,
  variant = 'card',
  title,
}) => {
  const {theme} = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    checkCapabilities();
  }, []);

  useEffect(() => {
    if (autoTrigger && capabilities?.isAvailable) {
      handleAuthenticate();
    }
  }, [autoTrigger, capabilities]);

  const checkCapabilities = async () => {
    const caps = await BiometricService.checkCapabilities();
    setCapabilities(caps);
  };

  const handleAuthenticate = async () => {
    if (!capabilities?.isAvailable) {
      const errorMsg = capabilities?.errorMessage || 'Biometric authentication not available';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const result = await BiometricService.authenticate(
        promptMessage,
        'Cancel'
      );

      setIsLoading(false);

      if (result.success) {
        onSuccess();
      } else {
        const errorMsg = BiometricService.getUserFriendlyError(result.error);
        setError(errorMsg);
        onError?.(errorMsg);

        if (result.cancelled) {
          onCancel?.();
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg = err?.message || 'Authentication failed';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const getBiometricIcon = (type: BiometricType): string => {
    switch (type) {
      case BiometricType.FACE_ID:
        return '👤'; // Face icon
      case BiometricType.FINGERPRINT:
        return '👆'; // Fingerprint icon
      case BiometricType.IRIS:
        return '👁'; // Eye icon
      default:
        return '🔒'; // Lock icon
    }
  };

  const getBiometricLabel = (): string => {
    if (!capabilities) return 'Checking...';
    if (!capabilities.isAvailable) return 'Not Available';
    return BiometricService.getBiometricTypeName(capabilities.biometricType);
  };

  const getTitle = (): string => {
    if (title) return title;
    if (!capabilities?.isAvailable) return 'Biometric Not Available';
    return `Authenticate with ${BiometricService.getBiometricTypeName(capabilities.biometricType)}`;
  };

  const styles = StyleSheet.create({
    cardContainer: {
      backgroundColor: theme.surface.primary,
      borderRadius: staticTheme.borderRadius.lg,
      padding: staticTheme.spacing.xl,
      ...staticTheme.shadows.sm,
    },
    buttonContainer: {
      width: '100%',
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: staticTheme.spacing.lg,
    },
    icon: {
      fontSize: 48,
      marginBottom: staticTheme.spacing.md,
    },
    biometricLabel: {
      fontSize: staticTheme.fontSize.base,
      color: theme.text.secondary,
      textAlign: 'center',
    },
    title: {
      fontSize: staticTheme.fontSize.lg,
      fontWeight: staticTheme.fontWeight.semiBold as any,
      color: theme.text.primary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.lg,
    },
    errorText: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.error.main,
      textAlign: 'center',
      marginTop: staticTheme.spacing.md,
      marginBottom: staticTheme.spacing.md,
    },
    authenticateButton: {
      marginBottom: showPINFallback && onFallbackToPIN ? staticTheme.spacing.md : 0,
    },
    fallbackButton: {
      marginTop: staticTheme.spacing.sm,
    },
    touchableCard: {
      backgroundColor: theme.surface.primary,
      borderRadius: staticTheme.borderRadius.lg,
      padding: staticTheme.spacing.xl,
      ...staticTheme.shadows.sm,
      borderWidth: 2,
      borderColor: error ? theme.error.main : theme.border.main,
    },
    touchableCardPressed: {
      opacity: 0.7,
      transform: [{scale: 0.98}],
    },
  });

  if (!capabilities) {
    return (
      <View style={variant === 'card' ? styles.cardContainer : styles.buttonContainer}>
        <ActivityIndicator size="large" color={theme.primary.main} />
      </View>
    );
  }

  if (!capabilities.isAvailable) {
    return (
      <View style={variant === 'card' ? styles.cardContainer : styles.buttonContainer}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.biometricLabel}>Biometric Not Available</Text>
        </View>

        <Text style={styles.errorText}>
          {capabilities.errorMessage || 'Biometric authentication is not available on this device.'}
        </Text>

        {showPINFallback && onFallbackToPIN && (
          <Button
            title="Use PIN Instead"
            onPress={onFallbackToPIN}
            variant="outline"
          />
        )}
      </View>
    );
  }

  if (variant === 'card') {
    return (
      <TouchableOpacity
        style={styles.touchableCard}
        onPress={handleAuthenticate}
        disabled={isLoading}
        activeOpacity={0.7}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getBiometricIcon(capabilities.biometricType)}</Text>
          <Text style={styles.biometricLabel}>{getBiometricLabel()}</Text>
        </View>

        <Text style={styles.title}>{getTitle()}</Text>

        {isLoading && (
          <View style={{alignItems: 'center', marginBottom: staticTheme.spacing.md}}>
            <ActivityIndicator size="small" color={theme.primary.main} />
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {showPINFallback && onFallbackToPIN && (
          <Button
            title="Use PIN Instead"
            onPress={onFallbackToPIN}
            variant="outline"
            style={styles.fallbackButton}
          />
        )}
      </TouchableOpacity>
    );
  }

  // Button variant
  return (
    <View style={styles.buttonContainer}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getBiometricIcon(capabilities.biometricType)}</Text>
        <Text style={styles.biometricLabel}>{getBiometricLabel()}</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Button
        title={isLoading ? 'Authenticating...' : getTitle()}
        onPress={handleAuthenticate}
        variant="primary"
        disabled={isLoading}
        style={styles.authenticateButton}
      />

      {showPINFallback && onFallbackToPIN && (
        <Button
          title="Use PIN Instead"
          onPress={onFallbackToPIN}
          variant="outline"
          style={styles.fallbackButton}
        />
      )}
    </View>
  );
};
