/**
 * Peer-to-Peer Type Definitions
 * Phase 5: BLE Communication Foundation
 */

/**
 * Peer device information
 */
export interface PeerDevice {
  deviceId: string; // Unique device identifier
  publicKey: string; // Hardware public key from Phase 4
  name: string; // Device display name
  lastSeen: Date; // Last time device was seen
  rssi: number; // Signal strength
  isConnected: boolean; // Currently connected
  isTrusted: boolean; // User has approved this device
  peripheralId?: string; // BLE peripheral ID (for active connections)
}

/**
 * Connection request from a peer
 */
export interface ConnectionRequest {
  from: PeerDevice;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
  expiresAt: Date; // Request expires after X minutes
}

/**
 * Active peer session with encryption
 */
export interface PeerSession {
  sessionId: string; // Unique session ID
  peer: PeerDevice;
  sharedSecret: string; // ECDH shared secret (Base64)
  sessionKey: string; // Derived AES session key (Base64)
  establishedAt: Date;
  expiresAt: Date; // Session expires after X hours
  messageCount: number; // Number of messages exchanged
}

/**
 * Peer connection event
 */
export enum PeerConnectionEvent {
  DISCOVERED = 'discovered',
  CONNECTION_REQUEST = 'connection_request',
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  DISCONNECTED = 'disconnected',
  CONNECTION_FAILED = 'connection_failed',
}

/**
 * Peer connection event data
 */
export interface PeerConnectionEventData {
  event: PeerConnectionEvent;
  peer: PeerDevice;
  timestamp: Date;
  error?: string;
}

/**
 * Peer store state
 */
export interface PeerState {
  discoveredPeers: PeerDevice[]; // All discovered devices
  trustedPeers: PeerDevice[]; // User-approved devices
  activeSessions: PeerSession[]; // Active encrypted sessions
  pendingRequests: ConnectionRequest[]; // Pending connection requests
  blockedDevices: string[]; // Blocked device IDs
}

/**
 * Trust level for peer devices
 */
export enum TrustLevel {
  UNKNOWN = 'unknown', // Never seen before
  DISCOVERED = 'discovered', // Seen but not trusted
  PENDING = 'pending', // Connection request pending
  TRUSTED = 'trusted', // User explicitly trusted
  BLOCKED = 'blocked', // User explicitly blocked
}

/**
 * Peer metadata (stored locally)
 */
export interface PeerMetadata {
  deviceId: string;
  trustLevel: TrustLevel;
  firstSeen: Date;
  lastSeen: Date;
  lastConnected?: Date;
  connectionCount: number;
  messageCount: number;
  notes?: string; // User notes about this device
}

/**
 * Peer discovery filter
 */
export interface PeerDiscoveryFilter {
  minRSSI?: number; // Minimum signal strength
  trustLevelRequired?: TrustLevel; // Minimum trust level
  connectedOnly?: boolean; // Only show connected peers
  excludeBlocked?: boolean; // Exclude blocked devices
}

/**
 * Proximity level based on RSSI
 */
export enum ProximityLevel {
  IMMEDIATE = 'immediate', // < 1 meter (RSSI > -50)
  NEAR = 'near', // 1-3 meters (RSSI -50 to -70)
  FAR = 'far', // 3-10 meters (RSSI -70 to -90)
  OUT_OF_RANGE = 'out_of_range', // > 10 meters (RSSI < -90)
}

/**
 * Calculate proximity from RSSI
 */
export function getProximityLevel(rssi: number): ProximityLevel {
  if (rssi > -50) return ProximityLevel.IMMEDIATE;
  if (rssi > -70) return ProximityLevel.NEAR;
  if (rssi > -90) return ProximityLevel.FAR;
  return ProximityLevel.OUT_OF_RANGE;
}

/**
 * Peer ranking criteria
 */
export interface PeerRanking {
  peer: PeerDevice;
  score: number; // Composite score based on trust, proximity, activity
  proximity: ProximityLevel;
  trustLevel: TrustLevel;
  lastActivity: Date;
}
