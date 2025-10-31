/**
 * WelcomeScreen - First screen in the onboarding flow
 *
 * Features:
 * - Welcome message and app introduction
 * - Brief explanation of offline payment capabilities
 * - Get started button to proceed to security intro
 */

import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Button} from '../../components';
import {useTheme} from '../../contexts/ThemeContext';
import {theme as staticTheme} from '../../theme';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({onGetStarted}) => {
  const {theme} = useTheme();

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
    iconContainer: {
      alignItems: 'center',
      marginBottom: staticTheme.spacing['2xl'],
    },
    icon: {
      fontSize: 80,
      marginBottom: staticTheme.spacing.md,
    },
    title: {
      fontSize: staticTheme.fontSize["5xl"],
      fontWeight: staticTheme.fontWeight.bold as any,
      color: theme.text.primary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing.md,
    },
    subtitle: {
      fontSize: staticTheme.fontSize.lg,
      color: theme.text.secondary,
      textAlign: 'center',
      marginBottom: staticTheme.spacing['2xl'],
      lineHeight: 28,
    },
    featuresContainer: {
      marginBottom: staticTheme.spacing['2xl'],
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: staticTheme.spacing.lg,
    },
    featureIcon: {
      fontSize: 24,
      marginRight: staticTheme.spacing.md,
      marginTop: 2,
    },
    featureTextContainer: {
      flex: 1,
    },
    featureTitle: {
      fontSize: staticTheme.fontSize.base,
      fontWeight: staticTheme.fontWeight.semiBold as any,
      color: theme.text.primary,
      marginBottom: staticTheme.spacing.xs,
    },
    featureDescription: {
      fontSize: staticTheme.fontSize.sm,
      color: theme.text.secondary,
      lineHeight: 20,
    },
    buttonContainer: {
      marginTop: 'auto',
    },
  });

  const features = [
    {
      icon: '💰',
      title: 'Offline Payments',
      description: 'Make secure payments even without internet connectivity.',
    },
    {
      icon: '🔒',
      title: 'Bank-Grade Security',
      description: 'Your funds are protected with biometric authentication and encryption.',
    },
    {
      icon: '⚡',
      title: 'Fast & Reliable',
      description: 'Instant transfers with guaranteed delivery when you reconnect.',
    },
    {
      icon: '📱',
      title: 'Simple to Use',
      description: 'Intuitive interface designed for everyday transactions.',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* App Icon and Title */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💳</Text>
        </View>

        <Text style={styles.title}>Welcome to{'\n'}Offline Payment</Text>
        <Text style={styles.subtitle}>
          Secure, reliable payments that work anywhere, anytime
        </Text>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Get Started Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={onGetStarted}
            variant="primary"
          />
        </View>
      </ScrollView>
    </View>
  );
};
