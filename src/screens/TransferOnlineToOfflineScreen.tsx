// src/screens/TransferOnlineToOfflineScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TransferForm } from '../components/wallet/TransferForm';
import { useTheme } from '../contexts/ThemeContext';

export const TransferOnlineToOfflineScreen: React.FC = () => {
  const navigation = useNavigation();
  const {theme} = useTheme();

  const handleSuccess = () => {
    // Navigate back to home after successful transfer
    navigation.goBack();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <TransferForm onSuccess={handleSuccess} />
    </ScrollView>
  );
};
