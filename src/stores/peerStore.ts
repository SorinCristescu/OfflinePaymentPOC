/**
 * Peer Store - Peer Device State Management
 * Phase 5: BLE Communication Foundation
 *
 * Manages peer device state using Zustand
 * Provides reactive state for discovered peers, connections, and trust management
 */

import {create} from 'zustand';
import {useShallow} from 'zustand/react/shallow';
import {PeerDiscoveryService} from '../services/ble/PeerDiscoveryService';
import {ConnectionManager} from '../services/ble/ConnectionManager';
import {
  PeerDevice,
  PeerSession,
  PeerRanking,
  PeerDiscoveryFilter,
  TrustLevel,
  PeerConnectionEvent,
  PeerConnectionEventData,
  ProximityLevel,
  getProximityLevel,
} from '../types/p2p';

/**
 * Peer Store State
 */
interface PeerStore {
  // Peer Lists
  discoveredPeers: PeerDevice[];
  trustedPeers: PeerDevice[];
  connectedPeers: PeerDevice[];
  rankedPeers: PeerRanking[];

  // Active Sessions
  activeSessions: PeerSession[];

  // Filters
  currentFilter: PeerDiscoveryFilter | null;

  // Selection
  selectedPeerId: string | null;

  // Events
  lastConnectionEvent: PeerConnectionEventData | null;

  // Actions - Discovery
  refreshPeers: (filter?: PeerDiscoveryFilter) => void;
  rankPeers: () => void;
  setFilter: (filter: PeerDiscoveryFilter | null) => void;

  // Actions - Trust Management
  trustPeer: (deviceId: string) => Promise<void>;
  untrustPeer: (deviceId: string) => Promise<void>;
  blockPeer: (deviceId: string) => Promise<void>;
  unblockPeer: (deviceId: string) => Promise<void>;
  getTrustLevel: (deviceId: string) => TrustLevel;

  // Actions - Selection
  selectPeer: (deviceId: string | null) => void;
  getSelectedPeer: () => PeerDevice | null;

  // Actions - Sessions
  refreshSessions: () => void;
  getSession: (deviceId: string) => PeerSession | null;

  // Actions - Events
  handleConnectionEvent: (event: PeerConnectionEventData) => void;

  // Utility
  clearDiscovered: () => void;
}

/**
 * Peer Zustand Store
 */
export const usePeerStore = create<PeerStore>((set, get) => ({
  // Initial State
  discoveredPeers: [],
  trustedPeers: [],
  connectedPeers: [],
  rankedPeers: [],
  activeSessions: [],
  currentFilter: null,
  selectedPeerId: null,
  lastConnectionEvent: null,

  // Refresh peer lists
  refreshPeers: (filter?: PeerDiscoveryFilter) => {
    try {
      const filterToUse = filter || get().currentFilter || undefined;

      // Get discovered peers
      const discovered = PeerDiscoveryService.getDiscoveredPeers(filterToUse);

      // Filter trusted peers
      const trusted = discovered.filter((p) => p.isTrusted);

      // Filter connected peers
      const connected = discovered.filter((p) => p.isConnected);

      set({
        discoveredPeers: discovered,
        trustedPeers: trusted,
        connectedPeers: connected,
      });

      // Also rank peers
      get().rankPeers();

      console.log('[PeerStore] Peers refreshed:', {
        discovered: discovered.length,
        trusted: trusted.length,
        connected: connected.length,
      });
    } catch (error) {
      console.error('[PeerStore] Error refreshing peers:', error);
    }
  },

  // Rank peers by trust, proximity, and activity
  rankPeers: () => {
    try {
      const peers = get().discoveredPeers;
      const ranked = PeerDiscoveryService.rankPeers(peers);

      set({rankedPeers: ranked});

      console.log('[PeerStore] Peers ranked:', ranked.length);
    } catch (error) {
      console.error('[PeerStore] Error ranking peers:', error);
    }
  },

  // Set discovery filter
  setFilter: (filter: PeerDiscoveryFilter | null) => {
    set({currentFilter: filter});
    get().refreshPeers(filter || undefined);
  },

  // Trust a peer
  trustPeer: async (deviceId: string) => {
    try {
      console.log(`[PeerStore] Trusting peer: ${deviceId}`);

      await PeerDiscoveryService.trustPeer(deviceId);

      // Refresh peer lists
      get().refreshPeers();

      console.log('[PeerStore] Peer trusted successfully');
    } catch (error) {
      console.error('[PeerStore] Failed to trust peer:', error);
      throw error;
    }
  },

  // Untrust a peer
  untrustPeer: async (deviceId: string) => {
    try {
      console.log(`[PeerStore] Untrusting peer: ${deviceId}`);

      await PeerDiscoveryService.untrustPeer(deviceId);

      // Refresh peer lists
      get().refreshPeers();

      console.log('[PeerStore] Peer untrusted successfully');
    } catch (error) {
      console.error('[PeerStore] Failed to untrust peer:', error);
      throw error;
    }
  },

  // Block a peer
  blockPeer: async (deviceId: string) => {
    try {
      console.log(`[PeerStore] Blocking peer: ${deviceId}`);

      await PeerDiscoveryService.blockPeer(deviceId);

      // Deselect if currently selected
      if (get().selectedPeerId === deviceId) {
        set({selectedPeerId: null});
      }

      // Refresh peer lists
      get().refreshPeers();

      console.log('[PeerStore] Peer blocked successfully');
    } catch (error) {
      console.error('[PeerStore] Failed to block peer:', error);
      throw error;
    }
  },

  // Unblock a peer
  unblockPeer: async (deviceId: string) => {
    try {
      console.log(`[PeerStore] Unblocking peer: ${deviceId}`);

      await PeerDiscoveryService.unblockPeer(deviceId);

      console.log('[PeerStore] Peer unblocked successfully');
    } catch (error) {
      console.error('[PeerStore] Failed to unblock peer:', error);
      throw error;
    }
  },

  // Get trust level for a peer
  getTrustLevel: (deviceId: string): TrustLevel => {
    return PeerDiscoveryService.getTrustLevel(deviceId);
  },

  // Select a peer
  selectPeer: (deviceId: string | null) => {
    set({selectedPeerId: deviceId});
  },

  // Get selected peer
  getSelectedPeer: (): PeerDevice | null => {
    const {selectedPeerId, discoveredPeers} = get();
    if (!selectedPeerId) return null;

    return discoveredPeers.find((p) => p.deviceId === selectedPeerId) || null;
  },

  // Refresh active sessions
  refreshSessions: () => {
    try {
      const sessions = ConnectionManager.getActiveSessions();

      set({activeSessions: sessions});

      console.log('[PeerStore] Sessions refreshed:', sessions.length);
    } catch (error) {
      console.error('[PeerStore] Error refreshing sessions:', error);
    }
  },

  // Get session for a peer
  getSession: (deviceId: string): PeerSession | null => {
    return ConnectionManager.getSession(deviceId) || null;
  },

  // Handle connection event
  handleConnectionEvent: (event: PeerConnectionEventData) => {
    set({lastConnectionEvent: event});

    // Refresh peers and sessions based on event type
    switch (event.event) {
      case PeerConnectionEvent.DISCOVERED:
        get().refreshPeers();
        break;

      case PeerConnectionEvent.CONNECTED:
      case PeerConnectionEvent.AUTHENTICATED:
        get().refreshPeers();
        get().refreshSessions();
        break;

      case PeerConnectionEvent.DISCONNECTED:
      case PeerConnectionEvent.CONNECTION_FAILED:
        get().refreshPeers();
        get().refreshSessions();
        break;
    }

    console.log('[PeerStore] Connection event handled:', event.event);
  },

  // Clear discovered peers
  clearDiscovered: () => {
    PeerDiscoveryService.clearDiscoveredPeers();
    set({
      discoveredPeers: [],
      connectedPeers: [],
      rankedPeers: [],
      selectedPeerId: null,
    });
    console.log('[PeerStore] Discovered peers cleared');
  },
}));

/**
 * Selector hooks for optimized re-renders
 */

// Get all discovered peers
export const useDiscoveredPeers = () =>
  usePeerStore((state) => state.discoveredPeers);

// Get trusted peers only
export const useTrustedPeers = () =>
  usePeerStore((state) => state.trustedPeers);

// Get connected peers only
export const useConnectedPeers = () =>
  usePeerStore((state) => state.connectedPeers);

// Get ranked peers
export const useRankedPeers = () =>
  usePeerStore((state) => state.rankedPeers);

// Get peers by proximity level
export const usePeersByProximity = (proximity: ProximityLevel) =>
  usePeerStore((state) =>
    state.discoveredPeers.filter(
      (peer) => getProximityLevel(peer.rssi) === proximity
    )
  );

// Get selected peer
export const useSelectedPeer = () =>
  usePeerStore(
    useShallow((state) => ({
      peerId: state.selectedPeerId,
      peer: state.getSelectedPeer(),
    }))
  );

// Get peer by ID
export const usePeer = (deviceId: string | null) =>
  usePeerStore((state) =>
    deviceId
      ? state.discoveredPeers.find((p) => p.deviceId === deviceId) || null
      : null
  );

// Get session for a peer
export const usePeerSession = (deviceId: string | null) =>
  usePeerStore((state) => (deviceId ? state.getSession(deviceId) : null));

// Get active sessions
export const useActiveSessions = () =>
  usePeerStore((state) => state.activeSessions);

// Get last connection event
export const useLastConnectionEvent = () =>
  usePeerStore((state) => state.lastConnectionEvent);

// Get peer counts
export const usePeerCounts = () =>
  usePeerStore(
    useShallow((state) => ({
      discovered: state.discoveredPeers.length,
      trusted: state.trustedPeers.length,
      connected: state.connectedPeers.length,
    }))
  );

// Get current filter
export const useCurrentFilter = () =>
  usePeerStore((state) => state.currentFilter);

/**
 * Initialize peer store listeners
 * Call this once when the app starts
 */
export const initializePeerStoreListeners = () => {
  // Listen for peer discoveries
  PeerDiscoveryService.onPeerDiscovered((peer) => {
    console.log('[PeerStore] Peer discovered:', peer.deviceId);
    usePeerStore.getState().refreshPeers();
  });

  // Listen for connection events
  PeerDiscoveryService.onConnectionEvent((event) => {
    console.log('[PeerStore] Connection event:', event.event);
    usePeerStore.getState().handleConnectionEvent(event);
  });

  console.log('[PeerStore] Listeners initialized');
};
