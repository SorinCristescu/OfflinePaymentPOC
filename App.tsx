/**
 * SMVC Offline Payment App
 * Main application entry point
 *
 * @format
 */

import React, {useEffect} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {RootNavigator} from './src/navigation';
import {useWalletStore, useAuthStore} from './src/stores';
import {useTransactionStore} from './src/stores/transactionStore';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import {AuthenticationModal} from './src/components/security/AuthenticationModal';
import {KeyManagementService} from './src/services/security/KeyManagementService';

function AppContent() {
  const initializeWallet = useWalletStore(state => state.initializeWallet);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);
  const initializeAuth = useAuthStore(state => state.initialize);
  const {theme, mode} = useTheme();

  useEffect(() => {
    // Initialize hardware keys, wallet, auth, and load transactions on app start
    const initApp = async () => {
      try {
        console.log('[App] Starting app initialization...');

        // Step 1: Initialize hardware security keys first
        try {
          console.log('[App] Initializing hardware security keys...');
          await KeyManagementService.initializeAllKeys();
          console.log('[App] Hardware security keys initialized successfully');
        } catch (keyError) {
          console.error('[App] Hardware key initialization failed:', keyError);
          // Continue with app initialization even if hardware keys fail
          // (they will be generated on-demand if needed)
        }

        // Step 2: Initialize wallet (now with hardware encryption)
        await initializeWallet();

        // Step 3: Initialize auth in the background without blocking (with better error handling)
        setTimeout(() => {
          // Use setTimeout to ensure it doesn't block app startup
          if (typeof initializeAuth === 'function') {
            initializeAuth().catch(error => {
              console.warn('[App] Auth initialization failed (non-blocking):', error);
            });
          }
        }, 100);

        // Step 4: Load transaction history
        await loadTransactions();

        console.log('[App] App initialization complete');
      } catch (error) {
        console.error('[App] App initialization error:', error);
      }
    };
    initApp();
  }, [initializeWallet, loadTransactions, initializeAuth]);

  const styles = StyleSheet.create({
    gestureHandler: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
  });

  return (
    <GestureHandlerRootView style={styles.gestureHandler}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar
            barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={theme.background.primary}
          />
          <View style={styles.container}>
            <RootNavigator />
          </View>
        </NavigationContainer>
        <AuthenticationModal />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
