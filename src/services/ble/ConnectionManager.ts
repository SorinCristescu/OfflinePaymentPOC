/**
 * ConnectionManager - Connection Lifecycle Management
 * Phase 5: BLE Communication Foundation
 *
 * Manages active peer connections and their lifecycle
 * Handles connection health monitoring, reconnection logic
 * Coordinates between central and peripheral services
 */

import {BLECentralService} from './BLECentralService';
import {BLEPeripheralService} from './BLEPeripheralService';
import {PeerDiscoveryService} from './PeerDiscoveryService';
import {BLEProtocol} from './BLEProtocol';
import {ConnectionStatus, MessageType} from '../../types/ble';
import {PeerDevice, PeerSession} from '../../types/p2p';

/**
 * Connection health metrics
 */
interface ConnectionHealth {
  deviceId: string;
  lastHeartbeat: Date;
  missedHeartbeats: number;
  averageRTT: number; // Average round-trip time in ms
  messagesSent: number;
  messagesReceived: number;
  errors: number;
}

/**
 * Connection configuration
 */
interface ConnectionConfig {
  maxConnections: number; // Maximum concurrent connections
  heartbeatIntervalMs: number; // Heartbeat interval
  connectionTimeoutMs: number; // Connection timeout
  maxReconnectAttempts: number; // Maximum reconnection attempts
  reconnectDelayMs: number; // Delay between reconnection attempts
  autoReconnect: boolean; // Enable auto-reconnection
}

/**
 * Default connection configuration
 */
const DEFAULT_CONFIG: ConnectionConfig = {
  maxConnections: 5,
  heartbeatIntervalMs: 30000, // 30 seconds
  connectionTimeoutMs: 60000, // 60 seconds
  maxReconnectAttempts: 3,
  reconnectDelayMs: 5000, // 5 seconds
  autoReconnect: true,
};

/**
 * Connection event callback
 */
type ConnectionEventHandler = (
  deviceId: string,
  status: ConnectionStatus,
  error?: string
) => void;

/**
 * Connection Manager Service
 */
class ConnectionManagerClass {
  private config: ConnectionConfig = DEFAULT_CONFIG;
  private activeSessions: Map<string, PeerSession> = new Map();
  private connectionHealth: Map<string, ConnectionHealth> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private connectionEventHandlers: ConnectionEventHandler[] = [];
  private isInitialized: boolean = false;

  /**
   * Initialize connection manager
   */
  async initialize(config?: Partial<ConnectionConfig>): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('[ConnectionManager] Already initialized');
        return;
      }

      console.log('[ConnectionManager] Initializing...');

      // Merge config
      if (config) {
        this.config = {...DEFAULT_CONFIG, ...config};
      }

      // Ensure peer discovery is initialized
      await PeerDiscoveryService.initialize();

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      console.log('[ConnectionManager] Initialized successfully');
    } catch (error) {
      console.error('[ConnectionManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Monitor connection events from central service
    BLECentralService.onConnectionEvent((deviceId, status, error) => {
      this.handleConnectionEvent(deviceId, status, error);
    });

    // Monitor connection events from peripheral service
    BLEPeripheralService.onConnectionEvent((deviceId, status, error) => {
      this.handleConnectionEvent(deviceId, status, error);
    });

    // Monitor messages for heartbeat detection
    BLECentralService.onMessage(async (message, from) => {
      this.handleMessage(message.type, from);
    });

    BLEPeripheralService.onMessage(async (message, from) => {
      this.handleMessage(message.type, from);
    });
  }

  /**
   * Connect to a peer device
   */
  async connect(deviceId: string): Promise<void> {
    try {
      console.log(`[ConnectionManager] Connecting to: ${deviceId}`);

      // Check connection limit
      if (this.activeSessions.size >= this.config.maxConnections) {
        throw new Error(
          `Maximum connections reached (${this.config.maxConnections}). Disconnect from a peer first.`
        );
      }

      // Check if already connected
      if (this.isConnected(deviceId)) {
        console.log('[ConnectionManager] Already connected to this peer');
        return;
      }

      // Get peer info from discovery service
      const peers = PeerDiscoveryService.getDiscoveredPeers();
      const peer = peers.find((p) => p.deviceId === deviceId);

      if (!peer) {
        throw new Error(`Peer not found: ${deviceId}`);
      }

      // Determine connection mode (central or peripheral)
      // For simplicity, we'll always try central mode first
      const peripheralId = peer.peripheralId;
      if (!peripheralId) {
        throw new Error('Peer peripheral ID not available');
      }

      // Connect via central service
      await BLECentralService.connect(peripheralId);

      console.log(`[ConnectionManager] Connected to: ${deviceId}`);

      // Connection will be tracked via event handler
    } catch (error) {
      console.error('[ConnectionManager] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Handle connection event
   */
  private handleConnectionEvent(
    deviceId: string,
    status: ConnectionStatus,
    error?: string
  ): void {
    try {
      console.log(`[ConnectionManager] Connection event: ${deviceId} - ${status}`);

      if (status === ConnectionStatus.AUTHENTICATED) {
        // Connection established - create session
        this.createSession(deviceId);

        // Start heartbeat monitoring
        this.startHeartbeat(deviceId);

        // Reset reconnect attempts
        this.reconnectAttempts.delete(deviceId);

        // Notify handlers
        this.notifyConnectionEvent(deviceId, status);
      } else if (status === ConnectionStatus.DISCONNECTED) {
        // Connection lost - clean up
        this.cleanupSession(deviceId);

        // Attempt reconnection if enabled
        if (this.config.autoReconnect) {
          this.attemptReconnect(deviceId);
        }

        // Notify handlers
        this.notifyConnectionEvent(deviceId, status);
      } else if (status === ConnectionStatus.ERROR) {
        // Connection error - clean up
        this.cleanupSession(deviceId);

        // Notify handlers
        this.notifyConnectionEvent(deviceId, status, error);
      }
    } catch (err) {
      console.error('[ConnectionManager] Error handling connection event:', err);
    }
  }

  /**
   * Create session for connected peer
   */
  private createSession(deviceId: string): void {
    try {
      const peers = PeerDiscoveryService.getDiscoveredPeers();
      const peer = peers.find((p) => p.deviceId === deviceId);

      if (!peer) {
        throw new Error('Peer not found');
      }

      // Get encryption session from BLEEncryption
      const encryptionSession = BLECentralService.manager
        ? undefined
        : undefined; // Will be available after key exchange

      const session: PeerSession = {
        sessionId: `session_${deviceId}_${Date.now()}`,
        peer,
        sharedSecret: '', // Populated by BLEEncryption
        sessionKey: '', // Populated by BLEEncryption
        establishedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        messageCount: 0,
      };

      this.activeSessions.set(deviceId, session);

      // Initialize health metrics
      this.connectionHealth.set(deviceId, {
        deviceId,
        lastHeartbeat: new Date(),
        missedHeartbeats: 0,
        averageRTT: 0,
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
      });

      console.log(`[ConnectionManager] Session created: ${deviceId}`);
    } catch (error) {
      console.error('[ConnectionManager] Failed to create session:', error);
    }
  }

  /**
   * Clean up session
   */
  private cleanupSession(deviceId: string): void {
    try {
      // Stop heartbeat
      this.stopHeartbeat(deviceId);

      // Remove session
      this.activeSessions.delete(deviceId);

      // Remove health metrics
      this.connectionHealth.delete(deviceId);

      console.log(`[ConnectionManager] Session cleaned up: ${deviceId}`);
    } catch (error) {
      console.error('[ConnectionManager] Error cleaning up session:', error);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(deviceId: string): void {
    try {
      console.log(`[ConnectionManager] Starting heartbeat for: ${deviceId}`);

      const interval = setInterval(() => {
        this.checkHeartbeat(deviceId);
      }, this.config.heartbeatIntervalMs);

      this.heartbeatIntervals.set(deviceId, interval);
    } catch (error) {
      console.error('[ConnectionManager] Error starting heartbeat:', error);
    }
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(deviceId: string): void {
    const interval = this.heartbeatIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(deviceId);
      console.log(`[ConnectionManager] Heartbeat stopped for: ${deviceId}`);
    }
  }

  /**
   * Check heartbeat health
   */
  private checkHeartbeat(deviceId: string): void {
    try {
      const health = this.connectionHealth.get(deviceId);
      if (!health) {
        return;
      }

      const timeSinceLastHeartbeat = Date.now() - health.lastHeartbeat.getTime();

      if (timeSinceLastHeartbeat > this.config.connectionTimeoutMs) {
        // Connection appears dead
        health.missedHeartbeats++;

        console.warn(
          `[ConnectionManager] Missed heartbeat for ${deviceId} (${health.missedHeartbeats})`
        );

        if (health.missedHeartbeats >= 3) {
          console.error(`[ConnectionManager] Connection timeout for: ${deviceId}`);
          // Force disconnect
          this.disconnect(deviceId).catch((error) => {
            console.error('[ConnectionManager] Force disconnect failed:', error);
          });
        }
      } else {
        // Connection healthy
        health.missedHeartbeats = 0;
      }
    } catch (error) {
      console.error('[ConnectionManager] Error checking heartbeat:', error);
    }
  }

  /**
   * Handle incoming message (update heartbeat)
   */
  private handleMessage(messageType: MessageType, from: string): void {
    try {
      const health = this.connectionHealth.get(from);
      if (health) {
        health.lastHeartbeat = new Date();
        health.messagesReceived++;
        health.missedHeartbeats = 0;
      }

      const session = this.activeSessions.get(from);
      if (session) {
        session.messageCount++;
      }
    } catch (error) {
      console.error('[ConnectionManager] Error handling message:', error);
    }
  }

  /**
   * Attempt to reconnect to a peer
   */
  private async attemptReconnect(deviceId: string): Promise<void> {
    try {
      const attempts = this.reconnectAttempts.get(deviceId) || 0;

      if (attempts >= this.config.maxReconnectAttempts) {
        console.log(
          `[ConnectionManager] Maximum reconnect attempts reached for: ${deviceId}`
        );
        this.reconnectAttempts.delete(deviceId);
        return;
      }

      this.reconnectAttempts.set(deviceId, attempts + 1);

      console.log(
        `[ConnectionManager] Reconnecting to ${deviceId} (attempt ${attempts + 1}/${this.config.maxReconnectAttempts})`
      );

      // Wait before reconnecting
      await new Promise((resolve) => setTimeout(resolve, this.config.reconnectDelayMs));

      // Attempt reconnection
      await this.connect(deviceId);
    } catch (error) {
      console.error('[ConnectionManager] Reconnection failed:', error);
      // Will retry on next attempt
    }
  }

  /**
   * Disconnect from a peer
   */
  async disconnect(deviceId: string): Promise<void> {
    try {
      console.log(`[ConnectionManager] Disconnecting from: ${deviceId}`);

      // Check if connected
      if (!this.isConnected(deviceId)) {
        console.log('[ConnectionManager] Not connected to this peer');
        return;
      }

      // Disable auto-reconnect for this disconnect
      const wasAutoReconnectEnabled = this.config.autoReconnect;
      this.config.autoReconnect = false;

      // Disconnect via central service
      const isConnectedViaCentral = BLECentralService.isConnectedTo(deviceId);
      if (isConnectedViaCentral) {
        await BLECentralService.disconnect(deviceId);
      }

      // Disconnect via peripheral service
      const isConnectedViaPeripheral = BLEPeripheralService.isConnectedTo(deviceId);
      if (isConnectedViaPeripheral) {
        await BLEPeripheralService.disconnect(deviceId);
      }

      // Clean up session
      this.cleanupSession(deviceId);

      // Restore auto-reconnect setting
      this.config.autoReconnect = wasAutoReconnectEnabled;

      console.log('[ConnectionManager] Disconnected successfully');
    } catch (error) {
      console.error('[ConnectionManager] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from all peers
   */
  async disconnectAll(): Promise<void> {
    try {
      console.log('[ConnectionManager] Disconnecting from all peers...');

      const deviceIds = Array.from(this.activeSessions.keys());
      for (const deviceId of deviceIds) {
        await this.disconnect(deviceId);
      }

      console.log('[ConnectionManager] Disconnected from all peers');
    } catch (error) {
      console.error('[ConnectionManager] Failed to disconnect from all:', error);
    }
  }

  /**
   * Check if connected to a peer
   */
  isConnected(deviceId: string): boolean {
    return this.activeSessions.has(deviceId);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): PeerSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session for a peer
   */
  getSession(deviceId: string): PeerSession | undefined {
    return this.activeSessions.get(deviceId);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get connection health metrics
   */
  getConnectionHealth(deviceId: string): ConnectionHealth | undefined {
    return this.connectionHealth.get(deviceId);
  }

  /**
   * Get all connection health metrics
   */
  getAllConnectionHealth(): ConnectionHealth[] {
    return Array.from(this.connectionHealth.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConnectionConfig>): void {
    this.config = {...this.config, ...config};
    console.log('[ConnectionManager] Configuration updated:', this.config);
  }

  /**
   * Get configuration
   */
  getConfig(): ConnectionConfig {
    return {...this.config};
  }

  /**
   * Register connection event handler
   */
  onConnectionEvent(handler: ConnectionEventHandler): () => void {
    this.connectionEventHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.connectionEventHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionEventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Notify connection event handlers
   */
  private notifyConnectionEvent(
    deviceId: string,
    status: ConnectionStatus,
    error?: string
  ): void {
    for (const handler of this.connectionEventHandlers) {
      try {
        handler(deviceId, status, error);
      } catch (err) {
        console.error('[ConnectionManager] Error in connection event handler:', err);
      }
    }
  }

  /**
   * Check if at max connections
   */
  isAtMaxConnections(): boolean {
    return this.activeSessions.size >= this.config.maxConnections;
  }

  /**
   * Get available connection slots
   */
  getAvailableSlots(): number {
    return Math.max(0, this.config.maxConnections - this.activeSessions.size);
  }

  /**
   * Find best peer to disconnect (for connection pooling)
   */
  findPeerToDisconnect(): string | null {
    if (this.activeSessions.size === 0) {
      return null;
    }

    // Find peer with lowest activity
    let lowestActivity: string | null = null;
    let lowestScore = Infinity;

    for (const [deviceId, session] of this.activeSessions.entries()) {
      const health = this.connectionHealth.get(deviceId);
      if (!health) continue;

      // Score based on activity (lower is worse)
      const score = session.messageCount + health.messagesReceived;

      if (score < lowestScore) {
        lowestScore = score;
        lowestActivity = deviceId;
      }
    }

    return lowestActivity;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    let removed = 0;

    for (const [deviceId, session] of this.activeSessions.entries()) {
      if (now > session.expiresAt) {
        this.disconnect(deviceId).catch((error) => {
          console.error('[ConnectionManager] Failed to disconnect expired session:', error);
        });
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[ConnectionManager] Cleaned up ${removed} expired sessions`);
    }
  }

  /**
   * Clean up and destroy service
   */
  async destroy(): Promise<void> {
    try {
      console.log('[ConnectionManager] Destroying...');

      // Stop all heartbeats
      for (const deviceId of this.heartbeatIntervals.keys()) {
        this.stopHeartbeat(deviceId);
      }

      // Disconnect from all peers
      await this.disconnectAll();

      // Clear data
      this.activeSessions.clear();
      this.connectionHealth.clear();
      this.reconnectAttempts.clear();
      this.connectionEventHandlers = [];

      this.isInitialized = false;

      console.log('[ConnectionManager] Destroyed successfully');
    } catch (error) {
      console.error('[ConnectionManager] Error during destroy:', error);
    }
  }
}

// Export singleton instance
export const ConnectionManager = new ConnectionManagerClass();
