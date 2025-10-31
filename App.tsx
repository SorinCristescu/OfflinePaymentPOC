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

function AppContent() {
  const initializeWallet = useWalletStore(state => state.initializeWallet);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);
  const initializeAuth = useAuthStore(state => state.initialize);
  const {theme, mode} = useTheme();

  useEffect(() => {
    // Initialize wallet, auth, and load transactions on app start
    const initApp = async () => {
      try {
        await initializeWallet();

        // Initialize auth in the background without blocking (with better error handling)
        setTimeout(() => {
          // Use setTimeout to ensure it doesn't block app startup
          if (typeof initializeAuth === 'function') {
            initializeAuth().catch(error => {
              console.warn('[App] Auth initialization failed (non-blocking):', error);
            });
          }
        }, 100);

        await loadTransactions();
      } catch (error) {
        console.error('App initialization error:', error);
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
