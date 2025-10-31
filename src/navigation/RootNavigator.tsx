/**
 * Root Navigator - Main stack navigator for the app
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './types';
import {TabNavigator} from './TabNavigator';
import {TransferOnlineToOfflineScreen} from '../screens/TransferOnlineToOfflineScreen';
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
      {/* Other modal screens will be added in future phases */}
    </Stack.Navigator>
  );
};
