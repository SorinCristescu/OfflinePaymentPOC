/**
 * BLE Store - BLE State Management
 * Phase 5: BLE Communication Foundation
 *
 * Manages global BLE state using Zustand
 * Provides reactive state for BLE status, scanning, advertising, and connections
 */

import {create} from 'zustand';
import {useShallow} from 'zustand/react/shallow';
import {State as BleState} from 'react-native-ble-plx';
import {BLEManager} from '../services/ble/BLEManager';
import {BLECentralService} from '../services/ble/BLECentralService';
import {BLEPeripheralService} from '../services/ble/BLEPeripheralService';
import {PeerDiscoveryService} from '../services/ble/PeerDiscoveryService';
import {ConnectionManager} from '../services/ble/ConnectionManager';
import {MessageProtocol} from '../services/ble/MessageProtocol';
import {BLEMode, ConnectionStatus} from '../types/ble';

/**
 * BLE Store State
 */
interface BLEStore {
  // BLE Status
  isInitialized: boolean;
  bluetoothState: BleState;
  isBluetoothEnabled: boolean;
  isScanning: boolean;
  isAdvertising: boolean;
  currentMode: BLEMode;
  error: string | null;

  // Connection Status
  connectionCount: number;
  maxConnections: number;

  // Message Queue
  messageQueueSize: number;
  pendingAcks: number;

  // Actions
  initialize: () => Promise<void>;
  startDiscovery: (mode?: BLEMode) => Promise<void>;
  stopDiscovery: () => Promise<void>;
  connectToPeer: (deviceId: string) => Promise<void>;
  disconnectFromPeer: (deviceId: string) => Promise<void>;
  sendMessage: (toDeviceId: string, data: any) => Promise<string>;
  updateBluetoothState: (state: BleState) => void;
  setError: (error: string | null) => void;
  refreshStats: () => void;
  destroy: () => Promise<void>;
}

/**
 * BLE Zustand Store
 */
export const useBLEStore = create<BLEStore>((set, get) => ({
  // Initial State
  isInitialized: false,
  bluetoothState: BleState.Unknown,
  isBluetoothEnabled: false,
  isScanning: false,
  isAdvertising: false,
  currentMode: BLEMode.BOTH,
  error: null,
  connectionCount: 0,
  maxConnections: 5,
  messageQueueSize: 0,
  pendingAcks: 0,

  // Initialize all BLE services
  initialize: async () => {
    try {
      console.log('[BLEStore] Initializing...');

      // Initialize core services
      await BLEManager.initialize();
      await PeerDiscoveryService.initialize();
      await ConnectionManager.initialize();
      await MessageProtocol.initialize();

      // Get initial Bluetooth state
      const state = await BLEManager.getState();
      const isEnabled = state === BleState.PoweredOn;

      // Set up state change listener
      BLEManager.onStateChange((newState) => {
        get().updateBluetoothState(newState);
      });

      // Set up connection event listener
      ConnectionManager.onConnectionEvent((deviceId, status, error) => {
        if (status === ConnectionStatus.AUTHENTICATED || status === ConnectionStatus.DISCONNECTED) {
          get().refreshStats();
        }
        if (error) {
          set({error});
        }
      });

      set({
        isInitialized: true,
        bluetoothState: state,
        isBluetoothEnabled: isEnabled,
        error: null,
      });

      console.log('[BLEStore] Initialized successfully');
    } catch (error) {
      console.error('[BLEStore] Initialization failed:', error);
      set({
        error: (error as Error).message,
        isInitialized: false,
      });
      throw error;
    }
  },

  // Start peer discovery
  startDiscovery: async (mode: BLEMode = BLEMode.BOTH) => {
    try {
      console.log(`[BLEStore] Starting discovery in ${mode} mode...`);

      if (!get().isInitialized) {
        throw new Error('BLE not initialized. Call initialize() first.');
      }

      if (!get().isBluetoothEnabled) {
        throw new Error('Bluetooth is not enabled');
      }

      await PeerDiscoveryService.startDiscovery(mode);

      set({
        currentMode: mode,
        isScanning: mode === BLEMode.CENTRAL || mode === BLEMode.BOTH,
        isAdvertising: mode === BLEMode.PERIPHERAL || mode === BLEMode.BOTH,
        error: null,
      });

      console.log('[BLEStore] Discovery started');
    } catch (error) {
      console.error('[BLEStore] Failed to start discovery:', error);
      set({error: (error as Error).message});
      throw error;
    }
  },

  // Stop peer discovery
  stopDiscovery: async () => {
    try {
      console.log('[BLEStore] Stopping discovery...');

      await PeerDiscoveryService.stopDiscovery();

      set({
        isScanning: false,
        isAdvertising: false,
        error: null,
      });

      console.log('[BLEStore] Discovery stopped');
    } catch (error) {
      console.error('[BLEStore] Failed to stop discovery:', error);
      set({error: (error as Error).message});
    }
  },

  // Connect to a peer device
  connectToPeer: async (deviceId: string) => {
    try {
      console.log(`[BLEStore] Connecting to peer: ${deviceId}`);

      if (!get().isInitialized) {
        throw new Error('BLE not initialized');
      }

      await ConnectionManager.connect(deviceId);

      // Update connection count
      get().refreshStats();

      set({error: null});

      console.log('[BLEStore] Connected successfully');
    } catch (error) {
      console.error('[BLEStore] Connection failed:', error);
      set({error: (error as Error).message});
      throw error;
    }
  },

  // Disconnect from a peer device
  disconnectFromPeer: async (deviceId: string) => {
    try {
      console.log(`[BLEStore] Disconnecting from peer: ${deviceId}`);

      await ConnectionManager.disconnect(deviceId);

      // Update connection count
      get().refreshStats();

      set({error: null});

      console.log('[BLEStore] Disconnected successfully');
    } catch (error) {
      console.error('[BLEStore] Disconnect failed:', error);
      set({error: (error as Error).message});
      throw error;
    }
  },

  // Send message to a peer
  sendMessage: async (toDeviceId: string, data: any): Promise<string> => {
    try {
      console.log(`[BLEStore] Sending message to: ${toDeviceId}`);

      if (!get().isInitialized) {
        throw new Error('BLE not initialized');
      }

      const messageId = await MessageProtocol.sendData(toDeviceId, data);

      // Update message queue stats
      get().refreshStats();

      set({error: null});

      return messageId;
    } catch (error) {
      console.error('[BLEStore] Failed to send message:', error);
      set({error: (error as Error).message});
      throw error;
    }
  },

  // Update Bluetooth state
  updateBluetoothState: (state: BleState) => {
    const isEnabled = state === BleState.PoweredOn;

    set({
      bluetoothState: state,
      isBluetoothEnabled: isEnabled,
    });

    // If Bluetooth turned off, stop discovery
    if (!isEnabled && (get().isScanning || get().isAdvertising)) {
      get().stopDiscovery();
    }
  },

  // Set error
  setError: (error: string | null) => {
    set({error});
  },

  // Refresh statistics
  refreshStats: () => {
    const connectionCount = ConnectionManager.getConnectionCount();
    const config = ConnectionManager.getConfig();
    const stats = MessageProtocol.getStatistics();

    set({
      connectionCount,
      maxConnections: config.maxConnections,
      messageQueueSize: stats.queueSize,
      pendingAcks: stats.pendingAcks,
    });
  },

  // Clean up and destroy
  destroy: async () => {
    try {
      console.log('[BLEStore] Destroying...');

      await get().stopDiscovery();
      await ConnectionManager.disconnectAll();
      await MessageProtocol.destroy();
      await ConnectionManager.destroy();
      await PeerDiscoveryService.destroy();
      await BLEManager.destroy();

      set({
        isInitialized: false,
        bluetoothState: BleState.Unknown,
        isBluetoothEnabled: false,
        isScanning: false,
        isAdvertising: false,
        connectionCount: 0,
        messageQueueSize: 0,
        pendingAcks: 0,
        error: null,
      });

      console.log('[BLEStore] Destroyed successfully');
    } catch (error) {
      console.error('[BLEStore] Error during destroy:', error);
    }
  },
}));

/**
 * Selector hooks for optimized re-renders
 * Uses useShallow to prevent infinite loops when returning objects
 */

export const useBLEStatus = () =>
  useBLEStore(
    useShallow((state) => ({
      isInitialized: state.isInitialized,
      bluetoothState: state.bluetoothState,
      isBluetoothEnabled: state.isBluetoothEnabled,
      error: state.error,
    }))
  );

export const useDiscoveryStatus = () =>
  useBLEStore(
    useShallow((state) => ({
      isScanning: state.isScanning,
      isAdvertising: state.isAdvertising,
      currentMode: state.currentMode,
    }))
  );

export const useConnectionStats = () =>
  useBLEStore(
    useShallow((state) => ({
      connectionCount: state.connectionCount,
      maxConnections: state.maxConnections,
      isAtMaxConnections: state.connectionCount >= state.maxConnections,
    }))
  );

export const useMessageStats = () =>
  useBLEStore(
    useShallow((state) => ({
      messageQueueSize: state.messageQueueSize,
      pendingAcks: state.pendingAcks,
    }))
  );
