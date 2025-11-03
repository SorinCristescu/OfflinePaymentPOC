/**
 * PeerDiscoveryService - High-Level Peer Management
 * Phase 5: BLE Communication Foundation
 *
 * Coordinates BLE scanning and advertising to discover nearby peers
 * Manages peer device lists, trust levels, and connection requests
 * Provides proximity-based filtering and peer ranking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {BLECentralService} from './BLECentralService';
import {BLEPeripheralService} from './BLEPeripheralService';
import {BLEDevice, BLEMode, ConnectionStatus} from '../../types/ble';
import {
  PeerDevice,
  PeerMetadata,
  ConnectionRequest,
  TrustLevel,
  PeerDiscoveryFilter,
  ProximityLevel,
  getProximityLevel,
  PeerRanking,
  PeerConnectionEvent,
  PeerConnectionEventData,
} from '../../types/p2p';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  PEER_METADATA: '@smvc:peer_metadata',
  TRUSTED_PEERS: '@smvc:trusted_peers',
  BLOCKED_DEVICES: '@smvc:blocked_devices',
};

/**
 * Peer discovery event callback
 */
type PeerDiscoveryHandler = (peer: PeerDevice) => void;

/**
 * Connection request callback
 */
type ConnectionRequestHandler = (request: ConnectionRequest) => void;

/**
 * Peer Discovery Service
 */
class PeerDiscoveryServiceClass {
  private isInitialized: boolean = false;
  private currentMode: BLEMode = BLEMode.BOTH;
  private discoveredPeers: Map<string, PeerDevice> = new Map();
  private trustedPeers: Set<string> = new Set();
  private blockedDevices: Set<string> = new Set();
  private peerMetadata: Map<string, PeerMetadata> = new Map();
  private pendingRequests: Map<string, ConnectionRequest> = new Map();
  private discoveryHandlers: PeerDiscoveryHandler[] = [];
  private connectionRequestHandlers: ConnectionRequestHandler[] = [];
  private connectionEventHandlers: Array<(event: PeerConnectionEventData) => void> = [];

  /**
   * Initialize peer discovery service
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('[PeerDiscovery] Already initialized');
        return;
      }

      console.log('[PeerDiscovery] Initializing...');

      // Initialize BLE services
      await BLECentralService.initialize();
      await BLEPeripheralService.initialize();

      // Load persisted data
      await this.loadTrustedPeers();
      await this.loadBlockedDevices();
      await this.loadPeerMetadata();

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      console.log('[PeerDiscovery] Initialized successfully');
    } catch (error) {
      console.error('[PeerDiscovery] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for BLE services
   */
  private setupEventHandlers(): void {
    // Handle device discoveries from central service
    BLECentralService.onDeviceDiscovered((device: BLEDevice) => {
      this.handleDiscoveredDevice(device);
    });

    // Handle connection events from central service
    BLECentralService.onConnectionEvent((deviceId, status, error) => {
      this.handleConnectionEvent(deviceId, status, error, 'central');
    });

    // Handle connection events from peripheral service
    BLEPeripheralService.onConnectionEvent((deviceId, status, error) => {
      this.handleConnectionEvent(deviceId, status, error, 'peripheral');
    });
  }

  /**
   * Start peer discovery
   */
  async startDiscovery(mode: BLEMode = BLEMode.BOTH): Promise<void> {
    try {
      console.log(`[PeerDiscovery] Starting discovery in ${mode} mode...`);

      this.currentMode = mode;

      // Start central mode (scanning)
      if (mode === BLEMode.CENTRAL || mode === BLEMode.BOTH) {
        await BLECentralService.startScan({
          durationMs: 0, // Continuous scanning
          allowDuplicates: false,
        });
      }

      // Start peripheral mode (advertising)
      if (mode === BLEMode.PERIPHERAL || mode === BLEMode.BOTH) {
        await BLEPeripheralService.startAdvertising();
      }

      console.log('[PeerDiscovery] Discovery started');
    } catch (error) {
      console.error('[PeerDiscovery] Failed to start discovery:', error);
      throw error;
    }
  }

  /**
   * Stop peer discovery
   */
  async stopDiscovery(): Promise<void> {
    try {
      console.log('[PeerDiscovery] Stopping discovery...');

      // Stop central mode
      BLECentralService.stopScan();

      // Stop peripheral mode
      await BLEPeripheralService.stopAdvertising();

      console.log('[PeerDiscovery] Discovery stopped');
    } catch (error) {
      console.error('[PeerDiscovery] Error stopping discovery:', error);
    }
  }

  /**
   * Handle discovered BLE device
   */
  private handleDiscoveredDevice(bleDevice: BLEDevice): void {
    try {
      // Check if device is blocked
      if (this.blockedDevices.has(bleDevice.deviceId)) {
        console.log(`[PeerDiscovery] Ignoring blocked device: ${bleDevice.deviceId}`);
        return;
      }

      // Create or update peer device
      let peer = this.discoveredPeers.get(bleDevice.deviceId);

      if (!peer) {
        // New peer discovered
        peer = {
          deviceId: bleDevice.deviceId,
          publicKey: bleDevice.publicKey,
          name: bleDevice.name,
          lastSeen: bleDevice.lastSeen,
          rssi: bleDevice.rssi,
          isConnected: false,
          isTrusted: this.trustedPeers.has(bleDevice.deviceId),
          peripheralId: bleDevice.id,
        };

        this.discoveredPeers.set(bleDevice.deviceId, peer);

        // Update metadata
        this.updatePeerMetadata(bleDevice.deviceId, {
          firstSeen: new Date(),
          lastSeen: new Date(),
        });

        // Notify handlers
        this.notifyDiscoveryHandlers(peer);

        // Emit discovery event
        this.emitConnectionEvent({
          event: PeerConnectionEvent.DISCOVERED,
          peer,
          timestamp: new Date(),
        });

        console.log(`[PeerDiscovery] New peer discovered: ${bleDevice.deviceId}`);
      } else {
        // Update existing peer
        peer.lastSeen = bleDevice.lastSeen;
        peer.rssi = bleDevice.rssi;
        peer.peripheralId = bleDevice.id;

        // Update metadata
        this.updatePeerMetadata(bleDevice.deviceId, {
          lastSeen: new Date(),
        });
      }
    } catch (error) {
      console.error('[PeerDiscovery] Error handling discovered device:', error);
    }
  }

  /**
   * Handle connection event
   */
  private handleConnectionEvent(
    deviceId: string,
    status: ConnectionStatus,
    error: string | undefined,
    source: 'central' | 'peripheral'
  ): void {
    try {
      console.log(`[PeerDiscovery] Connection event: ${deviceId} - ${status} (${source})`);

      const peer = this.discoveredPeers.get(deviceId);
      if (!peer) {
        console.warn('[PeerDiscovery] Peer not found for connection event');
        return;
      }

      // Update peer connection status
      if (status === ConnectionStatus.AUTHENTICATED) {
        peer.isConnected = true;

        // Update metadata
        this.updatePeerMetadata(deviceId, {
          lastConnected: new Date(),
          connectionCount: (this.peerMetadata.get(deviceId)?.connectionCount || 0) + 1,
        });

        // Emit connected event
        this.emitConnectionEvent({
          event: PeerConnectionEvent.CONNECTED,
          peer,
          timestamp: new Date(),
        });

        // Then emit authenticated event
        this.emitConnectionEvent({
          event: PeerConnectionEvent.AUTHENTICATED,
          peer,
          timestamp: new Date(),
        });
      } else if (status === ConnectionStatus.DISCONNECTED) {
        peer.isConnected = false;

        // Emit disconnected event
        this.emitConnectionEvent({
          event: PeerConnectionEvent.DISCONNECTED,
          peer,
          timestamp: new Date(),
        });
      } else if (status === ConnectionStatus.ERROR) {
        peer.isConnected = false;

        // Emit connection failed event
        this.emitConnectionEvent({
          event: PeerConnectionEvent.CONNECTION_FAILED,
          peer,
          timestamp: new Date(),
          error,
        });
      }
    } catch (error) {
      console.error('[PeerDiscovery] Error handling connection event:', error);
    }
  }

  /**
   * Get discovered peers (with optional filtering)
   */
  getDiscoveredPeers(filter?: PeerDiscoveryFilter): PeerDevice[] {
    let peers = Array.from(this.discoveredPeers.values());

    if (filter) {
      // Filter by minimum RSSI
      if (filter.minRSSI !== undefined) {
        peers = peers.filter((p) => p.rssi >= filter.minRSSI!);
      }

      // Filter by trust level
      if (filter.trustLevelRequired) {
        peers = peers.filter((p) => {
          const trustLevel = this.getTrustLevel(p.deviceId);
          return this.compareTrustLevel(trustLevel, filter.trustLevelRequired!);
        });
      }

      // Filter by connection status
      if (filter.connectedOnly) {
        peers = peers.filter((p) => p.isConnected);
      }

      // Exclude blocked devices
      if (filter.excludeBlocked) {
        peers = peers.filter((p) => !this.blockedDevices.has(p.deviceId));
      }
    }

    return peers;
  }

  /**
   * Get trusted peers
   */
  getTrustedPeers(): PeerDevice[] {
    return this.getDiscoveredPeers().filter((p) => p.isTrusted);
  }

  /**
   * Rank peers by trust, proximity, and activity
   */
  rankPeers(peers?: PeerDevice[]): PeerRanking[] {
    const peersToRank = peers || this.getDiscoveredPeers();

    return peersToRank
      .map((peer) => {
        const trustLevel = this.getTrustLevel(peer.deviceId);
        const proximity = getProximityLevel(peer.rssi);
        const metadata = this.peerMetadata.get(peer.deviceId);

        // Calculate composite score
        let score = 0;

        // Trust level score (0-40)
        switch (trustLevel) {
          case TrustLevel.TRUSTED:
            score += 40;
            break;
          case TrustLevel.PENDING:
            score += 20;
            break;
          case TrustLevel.DISCOVERED:
            score += 10;
            break;
          case TrustLevel.BLOCKED:
            score = -100;
            break;
        }

        // Proximity score (0-30)
        switch (proximity) {
          case ProximityLevel.IMMEDIATE:
            score += 30;
            break;
          case ProximityLevel.NEAR:
            score += 20;
            break;
          case ProximityLevel.FAR:
            score += 10;
            break;
        }

        // Activity score (0-30)
        if (peer.isConnected) {
          score += 15;
        }
        if (metadata?.connectionCount) {
          score += Math.min(metadata.connectionCount, 10);
        }
        if (metadata?.messageCount) {
          score += Math.min(metadata.messageCount / 10, 5);
        }

        return {
          peer,
          score,
          proximity,
          trustLevel,
          lastActivity: peer.lastSeen,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Trust a peer device
   */
  async trustPeer(deviceId: string): Promise<void> {
    try {
      console.log(`[PeerDiscovery] Trusting peer: ${deviceId}`);

      this.trustedPeers.add(deviceId);

      // Update peer device
      const peer = this.discoveredPeers.get(deviceId);
      if (peer) {
        peer.isTrusted = true;
      }

      // Update metadata
      this.updatePeerMetadata(deviceId, {
        trustLevel: TrustLevel.TRUSTED,
      });

      // Persist to storage
      await this.saveTrustedPeers();

      console.log('[PeerDiscovery] Peer trusted successfully');
    } catch (error) {
      console.error('[PeerDiscovery] Failed to trust peer:', error);
      throw error;
    }
  }

  /**
   * Untrust a peer device
   */
  async untrustPeer(deviceId: string): Promise<void> {
    try {
      console.log(`[PeerDiscovery] Untrusting peer: ${deviceId}`);

      this.trustedPeers.delete(deviceId);

      // Update peer device
      const peer = this.discoveredPeers.get(deviceId);
      if (peer) {
        peer.isTrusted = false;
      }

      // Update metadata
      this.updatePeerMetadata(deviceId, {
        trustLevel: TrustLevel.DISCOVERED,
      });

      // Persist to storage
      await this.saveTrustedPeers();

      console.log('[PeerDiscovery] Peer untrusted successfully');
    } catch (error) {
      console.error('[PeerDiscovery] Failed to untrust peer:', error);
      throw error;
    }
  }

  /**
   * Block a peer device
   */
  async blockPeer(deviceId: string): Promise<void> {
    try {
      console.log(`[PeerDiscovery] Blocking peer: ${deviceId}`);

      this.blockedDevices.add(deviceId);
      this.trustedPeers.delete(deviceId);

      // Remove from discovered peers
      this.discoveredPeers.delete(deviceId);

      // Update metadata
      this.updatePeerMetadata(deviceId, {
        trustLevel: TrustLevel.BLOCKED,
      });

      // Persist to storage
      await this.saveBlockedDevices();
      await this.saveTrustedPeers();

      console.log('[PeerDiscovery] Peer blocked successfully');
    } catch (error) {
      console.error('[PeerDiscovery] Failed to block peer:', error);
      throw error;
    }
  }

  /**
   * Unblock a peer device
   */
  async unblockPeer(deviceId: string): Promise<void> {
    try {
      console.log(`[PeerDiscovery] Unblocking peer: ${deviceId}`);

      this.blockedDevices.delete(deviceId);

      // Update metadata
      this.updatePeerMetadata(deviceId, {
        trustLevel: TrustLevel.UNKNOWN,
      });

      // Persist to storage
      await this.saveBlockedDevices();

      console.log('[PeerDiscovery] Peer unblocked successfully');
    } catch (error) {
      console.error('[PeerDiscovery] Failed to unblock peer:', error);
      throw error;
    }
  }

  /**
   * Get trust level for a peer
   */
  getTrustLevel(deviceId: string): TrustLevel {
    if (this.blockedDevices.has(deviceId)) {
      return TrustLevel.BLOCKED;
    }
    if (this.trustedPeers.has(deviceId)) {
      return TrustLevel.TRUSTED;
    }
    if (this.pendingRequests.has(deviceId)) {
      return TrustLevel.PENDING;
    }
    if (this.discoveredPeers.has(deviceId)) {
      return TrustLevel.DISCOVERED;
    }
    return TrustLevel.UNKNOWN;
  }

  /**
   * Compare trust levels
   */
  private compareTrustLevel(level: TrustLevel, required: TrustLevel): boolean {
    const order = [
      TrustLevel.BLOCKED,
      TrustLevel.UNKNOWN,
      TrustLevel.DISCOVERED,
      TrustLevel.PENDING,
      TrustLevel.TRUSTED,
    ];

    return order.indexOf(level) >= order.indexOf(required);
  }

  /**
   * Update peer metadata
   */
  private updatePeerMetadata(
    deviceId: string,
    updates: Partial<PeerMetadata>
  ): void {
    let metadata = this.peerMetadata.get(deviceId);

    if (!metadata) {
      metadata = {
        deviceId,
        trustLevel: TrustLevel.DISCOVERED,
        firstSeen: new Date(),
        lastSeen: new Date(),
        connectionCount: 0,
        messageCount: 0,
      };
      this.peerMetadata.set(deviceId, metadata);
    }

    // Apply updates
    Object.assign(metadata, updates);

    // Save to storage (debounced in production)
    this.savePeerMetadata().catch((error) => {
      console.error('[PeerDiscovery] Failed to save peer metadata:', error);
    });
  }

  /**
   * Register discovery handler
   */
  onPeerDiscovered(handler: PeerDiscoveryHandler): () => void {
    this.discoveryHandlers.push(handler);
    return () => {
      const index = this.discoveryHandlers.indexOf(handler);
      if (index > -1) this.discoveryHandlers.splice(index, 1);
    };
  }

  /**
   * Register connection request handler
   */
  onConnectionRequest(handler: ConnectionRequestHandler): () => void {
    this.connectionRequestHandlers.push(handler);
    return () => {
      const index = this.connectionRequestHandlers.indexOf(handler);
      if (index > -1) this.connectionRequestHandlers.splice(index, 1);
    };
  }

  /**
   * Register connection event handler
   */
  onConnectionEvent(handler: (event: PeerConnectionEventData) => void): () => void {
    this.connectionEventHandlers.push(handler);
    return () => {
      const index = this.connectionEventHandlers.indexOf(handler);
      if (index > -1) this.connectionEventHandlers.splice(index, 1);
    };
  }

  /**
   * Notify discovery handlers
   */
  private notifyDiscoveryHandlers(peer: PeerDevice): void {
    for (const handler of this.discoveryHandlers) {
      try {
        handler(peer);
      } catch (error) {
        console.error('[PeerDiscovery] Error in discovery handler:', error);
      }
    }
  }

  /**
   * Emit connection event
   */
  private emitConnectionEvent(event: PeerConnectionEventData): void {
    for (const handler of this.connectionEventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[PeerDiscovery] Error in connection event handler:', error);
      }
    }
  }

  /**
   * Load trusted peers from storage
   */
  private async loadTrustedPeers(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TRUSTED_PEERS);
      if (data) {
        const peers = JSON.parse(data) as string[];
        this.trustedPeers = new Set(peers);
        console.log(`[PeerDiscovery] Loaded ${peers.length} trusted peers`);
      }
    } catch (error) {
      console.error('[PeerDiscovery] Failed to load trusted peers:', error);
    }
  }

  /**
   * Save trusted peers to storage
   */
  private async saveTrustedPeers(): Promise<void> {
    try {
      const peers = Array.from(this.trustedPeers);
      await AsyncStorage.setItem(STORAGE_KEYS.TRUSTED_PEERS, JSON.stringify(peers));
    } catch (error) {
      console.error('[PeerDiscovery] Failed to save trusted peers:', error);
    }
  }

  /**
   * Load blocked devices from storage
   */
  private async loadBlockedDevices(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKED_DEVICES);
      if (data) {
        const devices = JSON.parse(data) as string[];
        this.blockedDevices = new Set(devices);
        console.log(`[PeerDiscovery] Loaded ${devices.length} blocked devices`);
      }
    } catch (error) {
      console.error('[PeerDiscovery] Failed to load blocked devices:', error);
    }
  }

  /**
   * Save blocked devices to storage
   */
  private async saveBlockedDevices(): Promise<void> {
    try {
      const devices = Array.from(this.blockedDevices);
      await AsyncStorage.setItem(STORAGE_KEYS.BLOCKED_DEVICES, JSON.stringify(devices));
    } catch (error) {
      console.error('[PeerDiscovery] Failed to save blocked devices:', error);
    }
  }

  /**
   * Load peer metadata from storage
   */
  private async loadPeerMetadata(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PEER_METADATA);
      if (data) {
        const metadata = JSON.parse(data) as Record<string, PeerMetadata>;
        this.peerMetadata = new Map(Object.entries(metadata));
        console.log(`[PeerDiscovery] Loaded metadata for ${this.peerMetadata.size} peers`);
      }
    } catch (error) {
      console.error('[PeerDiscovery] Failed to load peer metadata:', error);
    }
  }

  /**
   * Save peer metadata to storage
   */
  private async savePeerMetadata(): Promise<void> {
    try {
      const metadata = Object.fromEntries(this.peerMetadata);
      await AsyncStorage.setItem(STORAGE_KEYS.PEER_METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.error('[PeerDiscovery] Failed to save peer metadata:', error);
    }
  }

  /**
   * Clear discovered peers
   */
  clearDiscoveredPeers(): void {
    this.discoveredPeers.clear();
    console.log('[PeerDiscovery] Discovered peers cleared');
  }

  /**
   * Get current discovery mode
   */
  getCurrentMode(): BLEMode {
    return this.currentMode;
  }

  /**
   * Check if discovery is active
   */
  isDiscoveryActive(): boolean {
    return BLECentralService.isScanningActive() || BLEPeripheralService.isAdvertisingActive();
  }

  /**
   * Clean up and destroy service
   */
  async destroy(): Promise<void> {
    try {
      console.log('[PeerDiscovery] Destroying...');

      // Stop discovery
      await this.stopDiscovery();

      // Save data
      await this.saveTrustedPeers();
      await this.saveBlockedDevices();
      await this.savePeerMetadata();

      // Clear data
      this.discoveredPeers.clear();
      this.peerMetadata.clear();
      this.pendingRequests.clear();
      this.discoveryHandlers = [];
      this.connectionRequestHandlers = [];
      this.connectionEventHandlers = [];

      // Destroy BLE services
      await BLECentralService.destroy();
      await BLEPeripheralService.destroy();

      this.isInitialized = false;

      console.log('[PeerDiscovery] Destroyed successfully');
    } catch (error) {
      console.error('[PeerDiscovery] Error during destroy:', error);
    }
  }
}

// Export singleton instance
export const PeerDiscoveryService = new PeerDiscoveryServiceClass();
