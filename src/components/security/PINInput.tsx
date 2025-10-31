/**
 * PINInput Component
 *
 * Provides a secure PIN input interface with:
 * - Masked digit display (dots)
 * - Numeric keyboard
 * - Visual feedback
 * - Auto-submit on completion
 * - Error states
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Animated,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {theme as staticTheme} from '../../theme';
import {PIN_REQUIREMENTS} from '../../types';

interface PINInputProps {
  // PIN length (4-8 digits)
  length?: number;

  // Called when PIN is complete
  onComplete: (pin: string) => void;

  // Called on each PIN change
  onChange?: (pin: string) => void;

  // Error message to display
  error?: string;

  // Label text
  label?: string;

  // Auto-focus on mount
  autoFocus?: boolean;

  // Disabled state
  disabled?: boolean;

  // Clear PIN externally
  clearOnError?: boolean;
}

export const PINInput: React.FC<PINInputProps> = ({
  length = PIN_REQUIREMENTS.MIN_LENGTH,
  onComplete,
  onChange,
  error,
  label,
  autoFocus = true,
  disabled = false,
  clearOnError = false,
}) => {
  const {theme} = useTheme();
  const [pin, setPin] = useState('');
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Validate PIN length
  const validLength = Math.min(
    Math.max(length, PIN_REQUIREMENTS.MIN_LENGTH),
    PIN_REQUIREMENTS.MAX_LENGTH
  );

  // Shake animation on error
  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  // Auto-focus on mount if enabled
  useEffect(() => {
    if (autoFocus && !disabled) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // Clear PIN when error is set and clearOnError is true
  useEffect(() => {
    if (error && clearOnError) {
      setPin('');
      setShowError(true);
      shake();
    } else if (error) {
      setShowError(true);
      shake();
    } else {
      setShowError(false);
    }
  }, [error, clearOnError, shake]);

  // Handle PIN change
  const handlePINChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');

    // Limit to valid length
    const trimmedValue = numericValue.slice(0, validLength);

    setPin(trimmedValue);
    setShowError(false);

    // Call onChange callback
    if (onChange) {
      onChange(trimmedValue);
    }

    // Call onComplete if PIN length is reached
    if (trimmedValue.length === validLength) {
      Keyboard.dismiss();
      onComplete(trimmedValue);
    }
  };

  // Focus input
  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Create dot circles for PIN display
  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < validLength; i++) {
      const filled = i < pin.length;
      const isError = showError;

      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              borderColor: isError
                ? theme.error.main
                : filled
                ? theme.primary.main
                : theme.border.main,
              backgroundColor: isError
                ? `${theme.error.main}10`
                : filled
                ? theme.primary.main
                : 'transparent',
            },
          ]}>
          {filled && (
            <View
              style={[
                styles.dotFilled,
                {
                  backgroundColor: isError
                    ? theme.error.main
                    : theme.background.primary,
                },
              ]}
            />
          )}
        </View>
      );
    }
    return dots;
  };

  const styles = StyleSheet.create({
    container: {
      width: '100%',
    },
    label: {
      fontSize: staticTheme.fontSize.base,
      fontWeight: staticTheme.fontWeight.medium as any,
      color: theme.text.primary,
      marginBottom: staticTheme.spacing.md,
      textAlign: 'center',
    },
    inputWrapper: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: staticTheme.spacing.md,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: staticTheme.spacing.md,
      paddingVertical: staticTheme.spacing.lg,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dotFilled: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    hiddenInput: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0,
      color: 'transparent',
      backgroundColor: 'transparent',
    },
    errorText: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.error.main,
      textAlign: 'center',
      marginTop: staticTheme.spacing.sm,
      minHeight: 20,
    },
    tapToEnterText: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: staticTheme.spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputWrapper}>
        <TouchableWithoutFeedback onPress={focusInput} disabled={disabled}>
          <Animated.View
            style={[
              styles.dotsContainer,
              {
                transform: [{translateX: shakeAnimation}],
              },
            ]}>
            {renderDots()}
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Overlay input for keyboard - covers the dots area */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={pin}
          onChangeText={handlePINChange}
          keyboardType="number-pad"
          maxLength={validLength}
          autoFocus={autoFocus}
          editable={!disabled}
          secureTextEntry={false}
          textContentType="oneTimeCode"
          autoComplete="off"
          importantForAutofill="no"
          caretHidden={true}
          selectTextOnFocus={false}
          contextMenuHidden={true}
        />
      </View>

      {/* Error message */}
      {showError && error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Tap to enter hint */}
      {!showError && !disabled && pin.length === 0 && (
        <Text style={styles.tapToEnterText} onPress={focusInput}>
          Tap to enter PIN
        </Text>
      )}
    </View>
  );
};
