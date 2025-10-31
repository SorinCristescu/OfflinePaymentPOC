/**
 * Navigation types for type-safe navigation
 */

import {NavigatorScreenParams} from '@react-navigation/native';

// Root Stack Navigator params
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  TransferOnlineToOffline: undefined;
  SendPayment: undefined;
  TransactionDetails: {transactionId: string};
  HardwareSecurityTest: undefined;
};

// Main Tab Navigator params
export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Settings: undefined;
};

// Declare global navigation types for TypeScript
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
