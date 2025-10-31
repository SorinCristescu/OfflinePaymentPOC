/**
 * SecurityIntroScreen - Security education screen in the onboarding flow
 *
 * Features:
 * - Explains the importance of security
 * - Introduces authentication options (PIN, biometric)
 * - Shows what security features protect
 * - Prepares user for security setup
 */

import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Button} from '../../components';
import {useTheme} from '../../contexts/ThemeContext';
import {theme as staticTheme} from '../../theme';

interface SecurityIntroScreenProps {
  onContinue: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export const SecurityIntroScreen: React.FC<SecurityIntroScreenProps> = ({
  onContinue,
  onSkip,
  showSkip = false,
}) => {
  const {theme} = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: staticTheme.spacing.xl,
    },
    iconContainer: {
      alignItems: 'center',
      marginTop: staticTheme.spacing['2xl'],
      marginBottom: staticTheme.spacing.xl,
    },
    icon: {
      fontSize: 80,
      marginBottom: staticTheme.spacing.md,
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
      marginBottom: staticTheme.spacing['2xl'],
      lineHeight: 24,
    },
    securityOptionsContainer: {
      marginBottom: staticTheme.spacing['2xl'],
    },
    securityOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.primary,
      padding: staticTheme.spacing.lg,
      borderRadius: staticTheme.borderRadius.lg,
      marginBottom: staticTheme.spacing.md,
      ...staticTheme.shadows.sm,
    },
    optionIcon: {
      fontSize: 32,
      marginRight: staticTheme.spacing.md,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      fontSize: staticTheme.fontSize.base,
      fontWeight: staticTheme.fontWeight.semiBold as any,
      color: theme.text.primary,
      marginBottom: staticTheme.spacing.xs,
    },
    optionDescription: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.text.secondary,
      lineHeight: 18,
    },
    protectionContainer: {
      backgroundColor: `${theme.primary.main}10`,
      padding: staticTheme.spacing.lg,
      borderRadius: staticTheme.borderRadius.lg,
      marginBottom: staticTheme.spacing['2xl'],
    },
    protectionTitle: {
      fontSize: staticTheme.fontSize.base,
      fontWeight: staticTheme.fontWeight.semiBold as any,
      color: theme.text.primary,
      marginBottom: staticTheme.spacing.md,
      textAlign: 'center',
    },
    protectionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: staticTheme.spacing.sm,
    },
    protectionIcon: {
      fontSize: 16,
      marginRight: staticTheme.spacing.sm,
    },
    protectionText: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.text.primary,
      flex: 1,
    },
    buttonsContainer: {
      marginTop: 'auto',
      gap: staticTheme.spacing.md,
    },
  });

  const securityOptions = [
    {
      icon: '🔐',
      title: 'PIN Code',
      description: 'A secure 4-8 digit code that only you know.',
    },
    {
      icon: '👤',
      title: 'Biometric Authentication',
      description: 'Use Face ID, Touch ID, or fingerprint for quick access.',
    },
  ];

  const protectionItems = [
    'Making payments and transfers',
    'Viewing transaction history',
    'Changing security settings',
    'Accessing sensitive account data',
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* Icon and Title */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🛡️</Text>
        </View>

        <Text style={styles.title}>Secure Your Wallet</Text>
        <Text style={styles.subtitle}>
          Add an extra layer of protection to keep your funds safe and secure
        </Text>

        {/* Security Options */}
        <View style={styles.securityOptionsContainer}>
          {securityOptions.map((option, index) => (
            <View key={index} style={styles.securityOption}>
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* What's Protected */}
        <View style={styles.protectionContainer}>
          <Text style={styles.protectionTitle}>
            Security will be required for:
          </Text>
          {protectionItems.map((item, index) => (
            <View key={index} style={styles.protectionItem}>
              <Text style={styles.protectionIcon}>✓</Text>
              <Text style={styles.protectionText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <Button
            title="Set Up Security"
            onPress={onContinue}
            variant="primary"
          />

          {showSkip && onSkip && (
            <Button
              title="Skip for Now"
              onPress={onSkip}
              variant="outline"
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};
