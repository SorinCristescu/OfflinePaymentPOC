/**
 * BLE Type Definitions
 * Phase 5: BLE Communication Foundation
 */

/**
 * Discovered BLE device
 */
export interface BLEDevice {
  id: string; // Device MAC address
  name: string | null;
  rssi: number; // Signal strength
  deviceId: string; // Our app's device ID from Phase 3
  publicKey: string; // Hardware public key from Phase 4
  lastSeen: Date;
}

/**
 * BLE Service and Characteristic UUIDs
 */
export interface BLEServiceUUID {
  service: string; // Primary service UUID
  characteristic: string; // Data characteristic UUID
  deviceIdCharacteristic: string; // Device ID characteristic
  publicKeyCharacteristic: string; // Public key characteristic
}

/**
 * BLE UUIDs for SMVC Offline Payment Service
 */
export const SMVC_BLE_SERVICE: BLEServiceUUID = {
  service: 'A0B1C2D3-E4F5-6789-ABCD-EF0123456789',
  characteristic: 'A0B1C2D3-E4F5-6789-ABCD-EF012345678A',
  deviceIdCharacteristic: 'A0B1C2D3-E4F5-6789-ABCD-EF012345678B',
  publicKeyCharacteristic: 'A0B1C2D3-E4F5-6789-ABCD-EF012345678C',
};

/**
 * BLE operation mode
 */
export enum BLEMode {
  PERIPHERAL = 'peripheral', // Advertising mode (receiver)
  CENTRAL = 'central', // Scanning mode (sender)
  BOTH = 'both', // Both modes simultaneously
}

/**
 * Connection status
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error',
}

/**
 * Active BLE connection
 */
export interface BLEConnection {
  deviceId: string; // Our app's device ID
  peripheralId: string; // BLE peripheral ID
  status: ConnectionStatus;
  connectedAt?: Date;
  lastMessageAt?: Date;
  encryptionKey?: string; // Shared encryption key (AES session key)
  rssi?: number; // Signal strength
}

/**
 * Message types for BLE communication
 */
export enum MessageType {
  HANDSHAKE = 'handshake', // Initial connection handshake
  KEY_EXCHANGE = 'key_exchange', // ECDH key exchange
  DATA = 'data', // Generic data message
  PAYMENT = 'payment', // Payment transaction (Phase 6)
  ACK = 'ack', // Acknowledgment
  ERROR = 'error', // Error message
}

/**
 * BLE message structure
 */
export interface BLEMessage {
  id: string; // Unique message ID
  type: MessageType;
  payload: string; // Base64 encoded encrypted data
  signature: string; // Hardware-signed message
  timestamp: number;
  from: string; // Sender device ID
  to: string; // Recipient device ID
  sequence?: number; // For fragmented messages
  totalFragments?: number; // Total number of fragments
}

/**
 * BLE Protocol message (wire format)
 */
export interface BLEProtocolMessage {
  version: number; // Protocol version (1)
  type: MessageType;
  sequence: number; // For fragmented messages
  totalFragments: number;
  payload: string; // Base64 encrypted data
  signature: string; // Hardware signature
  timestamp: number;
  from: string;
  to: string;
}

/**
 * BLE state
 */
export interface BLEState {
  isEnabled: boolean; // Bluetooth is on
  isScanning: boolean; // Currently scanning for devices
  isAdvertising: boolean; // Currently advertising
  mode: BLEMode; // Current operation mode
  connections: BLEConnection[]; // Active connections
  discoveredDevices: BLEDevice[]; // Discovered devices
  error: string | null; // Last error
}

/**
 * BLE Manager configuration
 */
export interface BLEConfig {
  scanDurationMs: number; // How long to scan for devices
  advertisingIntervalMs: number; // Advertising interval
  connectionTimeoutMs: number; // Connection timeout
  messageTimeoutMs: number; // Message delivery timeout
  maxConnections: number; // Maximum concurrent connections
  autoReconnect: boolean; // Auto-reconnect on disconnect
}

/**
 * Default BLE configuration
 */
export const DEFAULT_BLE_CONFIG: BLEConfig = {
  scanDurationMs: 10000, // 10 seconds
  advertisingIntervalMs: 1000, // 1 second
  connectionTimeoutMs: 30000, // 30 seconds
  messageTimeoutMs: 5000, // 5 seconds
  maxConnections: 5,
  autoReconnect: true,
};

/**
 * BLE Error types
 */
export enum BLEErrorType {
  BLUETOOTH_OFF = 'bluetooth_off',
  UNAUTHORIZED = 'unauthorized',
  UNSUPPORTED = 'unsupported',
  CONNECTION_FAILED = 'connection_failed',
  SCAN_FAILED = 'scan_failed',
  ADVERTISING_FAILED = 'advertising_failed',
  MESSAGE_FAILED = 'message_failed',
  ENCRYPTION_FAILED = 'encryption_failed',
  UNKNOWN = 'unknown',
}

/**
 * BLE Error
 */
export interface BLEError {
  type: BLEErrorType;
  message: string;
  originalError?: Error;
}

/**
 * Scan result
 */
export interface BLEScanResult {
  device: BLEDevice;
  manufacturerData?: string;
  serviceData?: Record<string, string>;
}

/**
 * Message delivery status
 */
export enum MessageDeliveryStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

/**
 * Message queue item
 */
export interface QueuedMessage {
  message: BLEMessage;
  status: MessageDeliveryStatus;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}
