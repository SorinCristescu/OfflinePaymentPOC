/**
 * Tab Navigator - Bottom tabs for main app screens
 */

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Platform} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {MainTabParamList} from './types';
import {HomeScreen, TransactionsScreen, SettingsScreen} from '../screens';
import {theme as staticTheme} from '../theme';
import {useTheme} from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  const {theme} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background.primary,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: staticTheme.borderWidth.thin,
          borderBottomColor: theme.border.light,
        },
        headerTitleStyle: {
          ...staticTheme.typography.h3,
          color: theme.text.primary,
        },
        tabBarStyle: {
          backgroundColor: theme.surface.primary,
          borderTopWidth: staticTheme.borderWidth.thin,
          borderTopColor: theme.border.light,
          paddingTop: staticTheme.spacing.sm,
          paddingBottom: Platform.OS === 'ios' ? staticTheme.spacing.lg : staticTheme.spacing.md,
          height: Platform.OS === 'ios' ? 88 : 65,
          ...staticTheme.componentShadows.card,
        },
        tabBarActiveTintColor: theme.primary.main,
        tabBarInactiveTintColor: theme.text.secondary,
        tabBarLabelStyle: {
          ...staticTheme.typography.captionSmall,
          marginTop: staticTheme.spacing.xs,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Wallet',
          headerTitle: 'My Wallet',
          tabBarLabel: 'Wallet',
          tabBarIcon: ({color, size}) => (
            <Icon name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Transactions',
          headerTitle: 'Transaction History',
          tabBarLabel: 'Transactions',
          tabBarIcon: ({color, size}) => (
            <Icon name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({color, size}) => (
            <Icon name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
