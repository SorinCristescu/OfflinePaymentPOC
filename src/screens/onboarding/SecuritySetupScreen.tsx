/**
 * SecuritySetupScreen - Guide user through security setup
 *
 * Features:
 * - Choice between PIN, Biometric, or both
 * - PIN setup flow using PINSetup component
 * - Biometric enrollment
 * - Integrated with AuthenticationService
 */

import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity} from 'react-native';
import {Button, PINSetup} from '../../components';
import {useTheme} from '../../contexts/ThemeContext';
import {theme as staticTheme} from '../../theme';
import {useAuthStore} from '../../stores';
import {AuthenticationMethod, BiometricType} from '../../types';

interface SecuritySetupScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

enum SetupStep {
  CHOOSE_METHOD = 'choose_method',
  SETUP_PIN = 'setup_pin',
  SETUP_BIOMETRIC = 'setup_biometric',
  COMPLETE = 'complete',
}

export const SecuritySetupScreen: React.FC<SecuritySetupScreenProps> = ({
  onComplete,
  onSkip,
  showSkip = false,
}) => {
  const {theme} = useTheme();
  const {
    biometricAvailable,
    biometricCapabilities,
    setupAuthentication,
    checkBiometricCapabilities,
  } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<SetupStep>(
    SetupStep.CHOOSE_METHOD
  );
  const [selectedMethod, setSelectedMethod] = useState<AuthenticationMethod>(
    AuthenticationMethod.NONE
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pinData, setPinData] = useState<{pin: string; confirmPin: string} | null>(null);

  useEffect(() => {
    // Check biometric capabilities on mount
    checkBiometricCapabilities();
  }, [checkBiometricCapabilities]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: staticTheme.spacing.xl,
    },
    header: {
      marginBottom: staticTheme.spacing.xl,
      marginTop: staticTheme.spacing.xl,
    },
    title: {
      fontSize: staticTheme.fontSize["3xl"],
      fontWeight: staticTheme.fontWeight.bold as any,
      color: theme.text.primary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.md,
    },
    subtitle: {
      fontSize: staticTheme.fontSize.base,
      color: theme.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    optionsContainer: {
      marginBottom: staticTheme.spacing.xl,
    },
    optionCard: {
      backgroundColor: theme.surface.primary,
      padding: staticTheme.spacing.lg,
      borderRadius: staticTheme.borderRadius.lg,
      marginBottom: staticTheme.spacing.md,
      ...staticTheme.shadows.sm,
      borderWidth: 2,
      borderColor: theme.border.main,
    },
    optionCardSelected: {
      borderColor: theme.primary.main,
      backgroundColor: `${theme.primary.main}10`,
    },
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: staticTheme.spacing.sm,
    },
    optionIcon: {
      fontSize: 28,
      marginRight: staticTheme.spacing.md,
    },
    optionTitle: {
      fontSize: staticTheme.fontSize.base,
      fontWeight: staticTheme.fontWeight.semiBold as any,
      color: theme.text.primary,
      flex: 1,
    },
    optionDescription: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.text.secondary,
      lineHeight: 20,
    },
    recommendedBadge: {
      backgroundColor: theme.primary.main,
      paddingHorizontal: staticTheme.spacing.sm,
      paddingVertical: 4,
      borderRadius: staticTheme.borderRadius.sm,
      marginLeft: staticTheme.spacing.sm,
    },
    recommendedText: {
      fontSize: staticTheme.fontSize.xs,
      color: '#FFFFFF',
      fontWeight: staticTheme.fontWeight.semiBold as any,
    },
    unavailableText: {
      fontSize: staticTheme.fontSize.xs,
      color: theme.error.main,
      marginTop: staticTheme.spacing.xs,
    },
    buttonsContainer: {
      marginTop: 'auto',
      gap: staticTheme.spacing.md,
    },
    successContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    successIcon: {
      fontSize: 80,
      marginBottom: staticTheme.spacing.xl,
    },
    successTitle: {
      fontSize: staticTheme.fontSize["3xl"],
      fontWeight: staticTheme.fontWeight.bold as any,
      color: theme.text.primary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.md,
    },
    successMessage: {
      fontSize: staticTheme.fontSize.base,
      color: theme.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: staticTheme.spacing['2xl'],
    },
  });

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

  const handleMethodSelect = (method: AuthenticationMethod) => {
    setSelectedMethod(method);
  };

  const handleContinueFromChoose = () => {
    if (selectedMethod === AuthenticationMethod.NONE) {
      Alert.alert('Please select a security method');
      return;
    }

    // Start with PIN setup for PIN or PIN_AND_BIOMETRIC
    if (
      selectedMethod === AuthenticationMethod.PIN ||
      selectedMethod === AuthenticationMethod.PIN_AND_BIOMETRIC
    ) {
      setCurrentStep(SetupStep.SETUP_PIN);
    } else if (selectedMethod === AuthenticationMethod.BIOMETRIC) {
      setCurrentStep(SetupStep.SETUP_BIOMETRIC);
    }
  };

  const handlePINComplete = async (pin: string, confirmPin: string) => {
    setPinData({pin, confirmPin});

    // If only PIN, set it up now
    if (selectedMethod === AuthenticationMethod.PIN) {
      await setupPIN(pin, confirmPin);
    } else if (selectedMethod === AuthenticationMethod.PIN_AND_BIOMETRIC) {
      // Move to biometric setup
      setCurrentStep(SetupStep.SETUP_BIOMETRIC);
    }
  };

  const setupPIN = async (pin: string, confirmPin: string) => {
    setIsLoading(true);

    try {
      const result = await setupAuthentication(AuthenticationMethod.PIN, {
        pin,
        confirmPin,
      });

      if (result.success) {
        setCurrentStep(SetupStep.COMPLETE);
      } else {
        Alert.alert('Setup Failed', result.error || 'Failed to setup PIN');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to setup PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSetup = async () => {
    setIsLoading(true);

    try {
      let method = selectedMethod;
      let setupData;

      // If PIN was already set up, use PIN_AND_BIOMETRIC
      if (pinData) {
        method = AuthenticationMethod.PIN_AND_BIOMETRIC;
        setupData = pinData;
      } else {
        method = AuthenticationMethod.BIOMETRIC;
      }

      const result = await setupAuthentication(method, setupData);

      if (result.success) {
        setCurrentStep(SetupStep.COMPLETE);
      } else {
        Alert.alert('Setup Failed', result.error || 'Failed to setup biometric authentication');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to setup biometric authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const renderChooseMethod = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Security Method</Text>
        <Text style={styles.subtitle}>
          Select how you want to protect your wallet
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {/* PIN Option */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedMethod === AuthenticationMethod.PIN && styles.optionCardSelected,
          ]}
          onPress={() => handleMethodSelect(AuthenticationMethod.PIN)}>
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>🔐</Text>
            <Text style={styles.optionTitle}>PIN Code</Text>
          </View>
          <Text style={styles.optionDescription}>
            Set up a 4-8 digit PIN code for authentication
          </Text>
        </TouchableOpacity>

        {/* Biometric Option */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedMethod === AuthenticationMethod.BIOMETRIC && styles.optionCardSelected,
          ]}
          onPress={() =>
            biometricAvailable && handleMethodSelect(AuthenticationMethod.BIOMETRIC)
          }
          disabled={!biometricAvailable}>
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>👤</Text>
            <Text style={styles.optionTitle}>{getBiometricTypeName()}</Text>
          </View>
          <Text style={styles.optionDescription}>
            Use biometric authentication for quick access
          </Text>
          {!biometricAvailable && (
            <Text style={styles.unavailableText}>
              Not available on this device
            </Text>
          )}
        </TouchableOpacity>

        {/* PIN + Biometric Option */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedMethod === AuthenticationMethod.PIN_AND_BIOMETRIC &&
              styles.optionCardSelected,
          ]}
          onPress={() =>
            biometricAvailable &&
            handleMethodSelect(AuthenticationMethod.PIN_AND_BIOMETRIC)
          }
          disabled={!biometricAvailable}>
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>🔐👤</Text>
            <Text style={styles.optionTitle}>PIN + {getBiometricTypeName()}</Text>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>RECOMMENDED</Text>
            </View>
          </View>
          <Text style={styles.optionDescription}>
            Maximum security with both PIN and biometric authentication
          </Text>
          {!biometricAvailable && (
            <Text style={styles.unavailableText}>
              Biometric not available on this device
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.buttonsContainer}>
        <Button
          title="Continue"
          onPress={handleContinueFromChoose}
          variant="primary"
          disabled={selectedMethod === AuthenticationMethod.NONE}
        />

        {showSkip && onSkip && (
          <Button
            title="Skip for Now"
            onPress={onSkip}
            variant="outline"
          />
        )}
      </View>
    </>
  );

  const renderPINSetup = () => (
    <PINSetup
      onComplete={handlePINComplete}
      onCancel={() => setCurrentStep(SetupStep.CHOOSE_METHOD)}
      showCancel={true}
      title="Create Your PIN"
    />
  );

  const renderBiometricSetup = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Set Up {getBiometricTypeName()}</Text>
        <Text style={styles.subtitle}>
          Use your device's biometric authentication for quick and secure access
        </Text>
      </View>

      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{fontSize: 80, marginBottom: staticTheme.spacing.xl}}>👤</Text>
        <Text
          style={{
            fontSize: staticTheme.fontSize.base,
            color: theme.text.secondary,
            textAlign: 'center',
            marginBottom: staticTheme.spacing['2xl'],
          }}>
          Tap the button below to enable {getBiometricTypeName()} authentication
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <Button
          title={`Enable ${getBiometricTypeName()}`}
          onPress={handleBiometricSetup}
          variant="primary"
          disabled={isLoading}
        />

        <Button
          title="Back"
          onPress={() =>
            setCurrentStep(
              pinData ? SetupStep.SETUP_PIN : SetupStep.CHOOSE_METHOD
            )
          }
          variant="outline"
          disabled={isLoading}
        />
      </View>
    </>
  );

  const renderComplete = () => (
    <View style={styles.successContainer}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.successTitle}>Security Setup Complete!</Text>
      <Text style={styles.successMessage}>
        Your wallet is now protected. You'll need to authenticate for sensitive operations.
      </Text>

      <Button
        title="Get Started"
        onPress={onComplete}
        variant="primary"
        style={{width: '100%'}}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {currentStep === SetupStep.CHOOSE_METHOD && renderChooseMethod()}
        {currentStep === SetupStep.SETUP_PIN && renderPINSetup()}
        {currentStep === SetupStep.SETUP_BIOMETRIC && renderBiometricSetup()}
        {currentStep === SetupStep.COMPLETE && renderComplete()}
      </ScrollView>
    </View>
  );
};
