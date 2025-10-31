/**
 * PINSetup Component
 *
 * Provides a multi-step PIN setup flow:
 * 1. Enter new PIN
 * 2. Confirm PIN
 *
 * Features:
 * - Two-step confirmation
 * - PIN validation
 * - Error handling
 * - Progress indicator
 */

import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {PINInput} from './PINInput';
import {Button} from '../Button';
import {useTheme} from '../../contexts/ThemeContext';
import {theme as staticTheme} from '../../theme';
import {PIN_REQUIREMENTS} from '../../types';

interface PINSetupProps {
  // Called when PIN setup is complete
  onComplete: (pin: string, confirmPin: string) => void;

  // Called when user cancels
  onCancel?: () => void;

  // PIN length (4-8 digits)
  pinLength?: number;

  // Title text
  title?: string;

  // Show cancel button
  showCancel?: boolean;

  // Instructions text
  instructions?: string;
}

enum SetupStep {
  ENTER_PIN = 'enter_pin',
  CONFIRM_PIN = 'confirm_pin',
}

export const PINSetup: React.FC<PINSetupProps> = ({
  onComplete,
  onCancel,
  pinLength = PIN_REQUIREMENTS.MIN_LENGTH,
  title = 'Create Your PIN',
  showCancel = true,
  instructions,
}) => {
  const {theme} = useTheme();
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.ENTER_PIN);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | undefined>();

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
      marginBottom: staticTheme.spacing.xl,
    },
    title: {
      fontSize: staticTheme.fontSize["3xl"],
      fontWeight: staticTheme.fontWeight.bold as any,
      color: theme.text.primary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.md,
    },
    instructions: {
      fontSize: staticTheme.fontSize.base,
      color: theme.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: staticTheme.spacing.sm,
      marginBottom: staticTheme.spacing.xl,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
    },
    progressDotActive: {
      backgroundColor: theme.primary.main,
    },
    stepLabel: {
      fontSize: staticTheme.fontSize.base,
      fontWeight: staticTheme.fontWeight.medium as any,
      color: theme.text.primary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.xl,
    },
    pinInputContainer: {
      marginBottom: staticTheme.spacing.xl,
    },
    requirementsContainer: {
      backgroundColor: `${theme.primary.main}10`,
      padding: staticTheme.spacing.md,
      borderRadius: staticTheme.borderRadius.md,
      marginBottom: staticTheme.spacing.xl,
    },
    requirementText: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.text.secondary,
      lineHeight: 20,
    },
    buttonsContainer: {
      gap: staticTheme.spacing.md,
    },
  });

  // Handle first PIN entry complete
  const handleFirstPINComplete = (enteredPin: string) => {
    setPin(enteredPin);
    setError(undefined);
    setCurrentStep(SetupStep.CONFIRM_PIN);
  };

  // Handle confirm PIN complete
  const handleConfirmPINComplete = (enteredConfirmPin: string) => {
    setConfirmPin(enteredConfirmPin);

    // Check if PINs match
    if (enteredConfirmPin !== pin) {
      setError('PINs do not match');
      return;
    }

    // PINs match, call onComplete
    setError(undefined);
    onComplete(pin, enteredConfirmPin);
  };

  // Handle back to first step
  const handleBack = () => {
    setCurrentStep(SetupStep.ENTER_PIN);
    setConfirmPin('');
    setError(undefined);
  };

  // Get step label
  const getStepLabel = () => {
    switch (currentStep) {
      case SetupStep.ENTER_PIN:
        return `Enter a ${pinLength}-digit PIN`;
      case SetupStep.CONFIRM_PIN:
        return 'Confirm your PIN';
      default:
        return '';
    }
  };

  // Get instructions text
  const getInstructions = () => {
    if (instructions) {
      return instructions;
    }

    switch (currentStep) {
      case SetupStep.ENTER_PIN:
        return `Create a secure ${pinLength}-digit PIN to protect your wallet. This PIN will be required for all sensitive operations.`;
      case SetupStep.CONFIRM_PIN:
        return 'Please re-enter your PIN to confirm.';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.instructions}>{getInstructions()}</Text>
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressDot,
              currentStep === SetupStep.ENTER_PIN && styles.progressDotActive,
            ]}
          />
          <View
            style={[
              styles.progressDot,
              currentStep === SetupStep.CONFIRM_PIN && styles.progressDotActive,
            ]}
          />
        </View>

        {/* Step label */}
        <Text style={styles.stepLabel}>{getStepLabel()}</Text>

        {/* PIN Input */}
        <View style={styles.pinInputContainer}>
          {currentStep === SetupStep.ENTER_PIN ? (
            <PINInput
              key="enter-pin"
              length={pinLength}
              onComplete={handleFirstPINComplete}
              autoFocus={true}
              error={error}
              clearOnError={false}
            />
          ) : (
            <PINInput
              key="confirm-pin"
              length={pinLength}
              onComplete={handleConfirmPINComplete}
              autoFocus={true}
              error={error}
              clearOnError={true}
            />
          )}
        </View>

        {/* PIN Requirements (show on first step) */}
        {currentStep === SetupStep.ENTER_PIN && (
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementText}>
              • Must be {PIN_REQUIREMENTS.MIN_LENGTH}-{PIN_REQUIREMENTS.MAX_LENGTH} digits{'\n'}
              • Only numbers allowed{'\n'}
              • Avoid common PINs (1234, 0000, etc.){'\n'}
              • Remember this PIN - you'll need it to access your wallet
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {currentStep === SetupStep.CONFIRM_PIN && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
            />
          )}

          {showCancel && currentStep === SetupStep.ENTER_PIN && onCancel && (
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="outline"
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};
