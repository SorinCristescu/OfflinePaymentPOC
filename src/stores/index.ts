/**
 * Central export for all Zustand stores
 */

// Phase 1-4 stores
export {useWalletStore} from './walletStore';
export {useTransactionStore} from './transactionStore';
export {useSettingsStore} from './settingsStore';
export {useAuthStore} from './authStore';

// Phase 5 stores (BLE Communication)
export {
  useBLEStore,
  useBLEStatus,
  useDiscoveryStatus,
  useConnectionStats,
  useMessageStats,
} from './bleStore';

export {
  usePeerStore,
  useDiscoveredPeers,
  useTrustedPeers,
  useConnectedPeers,
  useRankedPeers,
  usePeersByProximity,
  useSelectedPeer,
  usePeer,
  usePeerSession,
  useActiveSessions,
  useLastConnectionEvent,
  usePeerCounts,
  useCurrentFilter,
  initializePeerStoreListeners,
} from './peerStore';

// Phase 6 stores (Offline Payments)
export {usePaymentStore} from './paymentStore';
