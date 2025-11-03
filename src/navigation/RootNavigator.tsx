/**
 * Root Navigator - Main stack navigator for the app
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './types';
import {TabNavigator} from './TabNavigator';
import {TransferOnlineToOfflineScreen} from '../screens/TransferOnlineToOfflineScreen';
import {HardwareSecurityTestScreen} from '../screens';
import {
  PeerDiscoveryScreen,
  ConnectionScreen,
  BLESettingsScreen,
  SendPaymentScreen,
  ReceivePaymentScreen,
  PaymentHistoryScreen,
} from '../screens';
import {useTheme} from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const {theme} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.background.primary,
        },
      }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="TransferOnlineToOffline"
        component={TransferOnlineToOfflineScreen}
        options={{
          headerShown: true,
          title: 'Transfer to Offline',
          headerStyle: {
            backgroundColor: theme.background.primary,
          },
          headerTintColor: theme.text.primary,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="HardwareSecurityTest"
        component={HardwareSecurityTestScreen}
        options={{
          headerShown: true,
          title: 'Hardware Security Test',
          headerStyle: {
            backgroundColor: theme.background.primary,
          },
          headerTintColor: theme.text.primary,
          presentation: 'card',
        }}
      />
      {/* Phase 5: BLE Communication Foundation */}
      <Stack.Screen
        name="PeerDiscovery"
        component={PeerDiscoveryScreen}
        options={{
          headerShown: true,
          title: 'Peer Discovery',
          headerStyle: {
            backgroundColor: theme.background.primary,
          },
          headerTintColor: theme.text.primary,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Connection"
        component={ConnectionScreen}
        options={{
          headerShown: true,
          title: 'Connection Details',
          headerStyle: {
            backgroundColor: theme.background.primary,
          },
          headerTintColor: theme.text.primary,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="BLESettings"
        component={BLESettingsScreen}
        options={{
          headerShown: true,
          title: 'BLE Settings',
          headerStyle: {
            backgroundColor: theme.background.primary,
          },
          headerTintColor: theme.text.primary,
          presentation: 'card',
        }}
      />
      {/* Phase 6: Offline Payment Protocol */}
      <Stack.Screen
        name="SendPayment"
        component={SendPaymentScreen}
        options={{
          headerShown: true,
          title: 'Send Payment',
          headerStyle: {
            backgroundColor: theme.background.primary,
          },
          headerTintColor: theme.text.primary,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="ReceivePayment"
        component={ReceivePaymentScreen}
        options={{
          headerShown: true,
          title: 'Receive Payment',
          headerStyle: {
            backgroundColor: theme.background.primary,
          },
          headerTintColor: theme.text.primary,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{
          headerShown: true,
          title: 'Payment History',
          headerStyle: {
            backgroundColor: theme.background.primary,
          },
          headerTintColor: theme.text.primary,
          presentation: 'card',
        }}
      />
      {/* Other modal screens will be added in future phases */}
    </Stack.Navigator>
  );
};
