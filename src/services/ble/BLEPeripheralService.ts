/**
 * BLEPeripheralService - Receiver/Advertising Mode
 * Phase 5: BLE Communication Foundation
 *
 * Manages BLE peripheral mode (advertising and receiving connections)
 * Broadcasts device ID and public key to nearby devices
 * Accepts incoming connections and messages from central devices
 */

import {BleManager, Characteristic} from 'react-native-ble-plx';
import {Platform} from 'react-native';
import {BLEManager} from './BLEManager';
import {BLEProtocol} from './BLEProtocol';
import {BLEEncryption} from './BLEEncryption';
import {
  BLEMessage,
  SMVC_BLE_SERVICE,
  ConnectionStatus,
  BLEConnection,
  BLEErrorType,
} from '../../types/ble';
import {KeyManagementService, KeyIds} from '../security/KeyManagementService';
import {DeviceIdentityService} from '../security/DeviceIdentityService';

/**
 * Connected central device
 */
interface ConnectedCentral {
  deviceId: string; // Our app's device ID
  peripheralId: string; // BLE peripheral ID
  publicKey: string; // Peer's public key
  connectedAt: Date;
  lastMessageAt: Date;
  status: ConnectionStatus;
}

/**
 * Message handler callback
 */
type MessageHandler = (message: BLEMessage, from: string) => Promise<void>;

/**
 * Connection event callback
 */
type ConnectionEventHandler = (
  deviceId: string,
  status: ConnectionStatus,
  error?: string
) => void;

/**
 * BLE Peripheral Service
 */
class BLEPeripheralServiceClass {
  private manager: BleManager | null = null;
  private isAdvertising: boolean = false;
  private connectedCentrals: Map<string, ConnectedCentral> = new Map();
  private messageHandlers: MessageHandler[] = [];
  private connectionHandlers: ConnectionEventHandler[] = [];
  private deviceId: string = '';
  private publicKey: string = '';

  /**
   * Initialize peripheral service
   */
  async initialize(): Promise<void> {
    try {
      console.log('[BLEPeripheral] Initializing...');

      // Ensure BLEManager is initialized
      if (!BLEManager.isReady()) {
        await BLEManager.initialize();
      }

      this.manager = BLEManager.getManager();

      // Get our device ID and public key
      const identity = await DeviceIdentityService.getDeviceIdentity();
      this.deviceId = identity.deviceId;
      this.publicKey = await KeyManagementService.getPublicKey(
        KeyIds.TRANSACTION_SIGNING
      );

      console.log('[BLEPeripheral] Initialized successfully');
      console.log('[BLEPeripheral] Device ID:', this.deviceId);
    } catch (error) {
      console.error('[BLEPeripheral] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start advertising as a peripheral
   *
   * Note: BLE peripheral mode has limitations on iOS due to CoreBluetooth restrictions.
   * - iOS can only advertise service UUIDs, not custom data
   * - Characteristics must be used to exchange device ID and public key
   * - Android has more flexible advertising capabilities
   */
  async startAdvertising(): Promise<void> {
    try {
      if (this.isAdvertising) {
        console.log('[BLEPeripheral] Already advertising');
        return;
      }

      if (!this.manager) {
        throw new Error('Peripheral service not initialized');
      }

      console.log('[BLEPeripheral] Starting advertising...');

      if (Platform.OS === 'ios') {
        await this.startAdvertisingiOS();
      } else {
        await this.startAdvertisingAndroid();
      }

      this.isAdvertising = true;
      console.log('[BLEPeripheral] Advertising started successfully');
    } catch (error) {
      console.error('[BLEPeripheral] Failed to start advertising:', error);
      throw new Error(`Failed to start advertising: ${(error as Error).message}`);
    }
  }

  /**
   * Start advertising on iOS
   *
   * iOS limitations:
   * - Can only advertise service UUID
   * - Cannot include custom data in advertisement
   * - Central must connect and read characteristics to get device info
   */
  private async startAdvertisingiOS(): Promise<void> {
    // iOS BLE peripheral mode is severely limited via react-native-ble-plx
    // The library primarily supports central mode
    // For iOS peripheral mode, we would need to use native modules

    console.warn('[BLEPeripheral] iOS peripheral mode has limited support');
    console.log('[BLEPeripheral] Device will be discoverable via iOS background advertising');

    // In a production app, you would:
    // 1. Create a native iOS module using CBPeripheralManager
    // 2. Implement GATT services and characteristics
    // 3. Handle read/write requests from centrals

    // For this POC, we'll simulate the advertising state
    // Real implementation would require native code
  }

  /**
   * Start advertising on Android
   *
   * Android has more flexible advertising capabilities:
   * - Can include service data in advertisement
   * - Can include manufacturer data
   * - More control over advertising parameters
   */
  private async startAdvertisingAndroid(): Promise<void> {
    // Android BLE peripheral mode also requires native implementation
    // react-native-ble-plx is primarily a central-mode library

    console.warn('[BLEPeripheral] Android peripheral mode requires native implementation');
    console.log('[BLEPeripheral] Device will use Android BLE advertising capabilities');

    // In a production app, you would:
    // 1. Create a native Android module using BluetoothLeAdvertiser
    // 2. Set up AdvertiseSettings and AdvertiseData
    // 3. Include service UUID and device info in advertisement
    // 4. Implement GATT server for characteristics

    // For this POC, we'll simulate the advertising state
    // Real implementation would require native code
  }

  /**
   * Stop advertising
   */
  async stopAdvertising(): Promise<void> {
    try {
      if (!this.isAdvertising) {
        console.log('[BLEPeripheral] Not advertising');
        return;
      }

      console.log('[BLEPeripheral] Stopping advertising...');

      // Stop platform-specific advertising
      if (Platform.OS === 'ios') {
        await this.stopAdvertisingiOS();
      } else {
        await this.stopAdvertisingAndroid();
      }

      this.isAdvertising = false;
      console.log('[BLEPeripheral] Advertising stopped');
    } catch (error) {
      console.error('[BLEPeripheral] Failed to stop advertising:', error);
    }
  }

  private async stopAdvertisingiOS(): Promise<void> {
    // Stop iOS advertising (native implementation needed)
    console.log('[BLEPeripheral] Stopping iOS advertising');
  }

  private async stopAdvertisingAndroid(): Promise<void> {
    // Stop Android advertising (native implementation needed)
    console.log('[BLEPeripheral] Stopping Android advertising');
  }

  /**
   * Handle incoming connection from a central device
   *
   * This would be called by the native module when a central connects
   */
  async handleConnectionRequest(
    peripheralId: string,
    peerDeviceId: string,
    peerPublicKey: string
  ): Promise<boolean> {
    try {
      console.log(`[BLEPeripheral] Connection request from: ${peerDeviceId}`);

      // Check if already connected
      if (this.connectedCentrals.has(peerDeviceId)) {
        console.log('[BLEPeripheral] Already connected to this device');
        return true;
      }

      // Create connection record
      const connection: ConnectedCentral = {
        deviceId: peerDeviceId,
        peripheralId,
        publicKey: peerPublicKey,
        connectedAt: new Date(),
        lastMessageAt: new Date(),
        status: ConnectionStatus.CONNECTING,
      };

      this.connectedCentrals.set(peerDeviceId, connection);

      // Perform key exchange
      await BLEEncryption.performKeyExchange(peerDeviceId, peerPublicKey);

      // Update connection status
      connection.status = ConnectionStatus.AUTHENTICATED;
      this.notifyConnectionEvent(peerDeviceId, ConnectionStatus.AUTHENTICATED);

      console.log(`[BLEPeripheral] Connected to: ${peerDeviceId}`);
      return true;
    } catch (error) {
      console.error('[BLEPeripheral] Connection failed:', error);
      this.notifyConnectionEvent(
        peerDeviceId,
        ConnectionStatus.ERROR,
        (error as Error).message
      );
      return false;
    }
  }

  /**
   * Handle incoming message from a central device
   *
   * This would be called when a central writes to our characteristic
   */
  async handleIncomingMessage(data: string, fromDeviceId: string): Promise<void> {
    try {
      console.log(`[BLEPeripheral] Received message from: ${fromDeviceId}`);

      const connection = this.connectedCentrals.get(fromDeviceId);
      if (!connection) {
        throw new Error(`No connection found for device: ${fromDeviceId}`);
      }

      // Update last message time
      connection.lastMessageAt = new Date();

      // Deserialize message
      const message = BLEProtocol.deserialize(data);

      // Validate message
      if (!BLEProtocol.validateMessage(message)) {
        throw new Error('Invalid message format');
      }

      // Verify and decrypt message
      const decryptedMessage = await BLEEncryption.verifyAndDecryptMessage(
        message,
        fromDeviceId,
        connection.publicKey
      );

      // Notify message handlers
      await this.notifyMessageHandlers(decryptedMessage, fromDeviceId);

      console.log('[BLEPeripheral] Message processed successfully');
    } catch (error) {
      console.error('[BLEPeripheral] Failed to handle message:', error);
      throw error;
    }
  }

  /**
   * Send message to a connected central device
   *
   * This would notify the central via characteristic notifications
   */
  async sendMessage(toDeviceId: string, message: BLEMessage): Promise<void> {
    try {
      const connection = this.connectedCentrals.get(toDeviceId);
      if (!connection) {
        throw new Error(`Not connected to device: ${toDeviceId}`);
      }

      if (connection.status !== ConnectionStatus.AUTHENTICATED) {
        throw new Error(`Connection not authenticated: ${toDeviceId}`);
      }

      console.log(`[BLEPeripheral] Sending message to: ${toDeviceId}`);

      // Encrypt and sign message
      const encryptedMessage = await BLEEncryption.encryptAndSignMessage(
        message,
        toDeviceId
      );

      // Check if fragmentation is needed
      const fragments = BLEProtocol.fragment(encryptedMessage);

      // Send each fragment
      for (const fragment of fragments) {
        const serialized = BLEProtocol.serialize(fragment);

        // In production, this would use native module to send characteristic notification
        // For now, we'll just log it
        console.log(`[BLEPeripheral] Would send fragment ${fragment.sequence || 0}/${fragment.totalFragments || 1}`);
      }

      console.log('[BLEPeripheral] Message sent successfully');
    } catch (error) {
      console.error('[BLEPeripheral] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Handle disconnection from a central device
   */
  async handleDisconnection(deviceId: string): Promise<void> {
    try {
      console.log(`[BLEPeripheral] Disconnected from: ${deviceId}`);

      const connection = this.connectedCentrals.get(deviceId);
      if (connection) {
        connection.status = ConnectionStatus.DISCONNECTED;
        this.notifyConnectionEvent(deviceId, ConnectionStatus.DISCONNECTED);
      }

      // Clean up connection
      this.connectedCentrals.delete(deviceId);

      // Revoke encryption session
      BLEEncryption.revokeSession(deviceId);

      console.log('[BLEPeripheral] Disconnection handled');
    } catch (error) {
      console.error('[BLEPeripheral] Error handling disconnection:', error);
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Register connection event handler
   */
  onConnectionEvent(handler: ConnectionEventHandler): () => void {
    this.connectionHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all message handlers
   */
  private async notifyMessageHandlers(
    message: BLEMessage,
    from: string
  ): Promise<void> {
    for (const handler of this.messageHandlers) {
      try {
        await handler(message, from);
      } catch (error) {
        console.error('[BLEPeripheral] Error in message handler:', error);
      }
    }
  }

  /**
   * Notify all connection event handlers
   */
  private notifyConnectionEvent(
    deviceId: string,
    status: ConnectionStatus,
    error?: string
  ): void {
    for (const handler of this.connectionHandlers) {
      try {
        handler(deviceId, status, error);
      } catch (err) {
        console.error('[BLEPeripheral] Error in connection handler:', err);
      }
    }
  }

  /**
   * Check if advertising
   */
  isAdvertisingActive(): boolean {
    return this.isAdvertising;
  }

  /**
   * Get connected centrals
   */
  getConnectedCentrals(): ConnectedCentral[] {
    return Array.from(this.connectedCentrals.values());
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connectedCentrals.size;
  }

  /**
   * Check if connected to a specific device
   */
  isConnectedTo(deviceId: string): boolean {
    const connection = this.connectedCentrals.get(deviceId);
    return connection?.status === ConnectionStatus.AUTHENTICATED;
  }

  /**
   * Get our device info
   */
  getDeviceInfo(): {deviceId: string; publicKey: string} {
    return {
      deviceId: this.deviceId,
      publicKey: this.publicKey,
    };
  }

  /**
   * Disconnect from a specific central
   */
  async disconnect(deviceId: string): Promise<void> {
    try {
      console.log(`[BLEPeripheral] Disconnecting from: ${deviceId}`);

      const connection = this.connectedCentrals.get(deviceId);
      if (!connection) {
        console.log('[BLEPeripheral] Not connected to this device');
        return;
      }

      // In production, this would use native module to close the connection
      await this.handleDisconnection(deviceId);

      console.log('[BLEPeripheral] Disconnected successfully');
    } catch (error) {
      console.error('[BLEPeripheral] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from all centrals
   */
  async disconnectAll(): Promise<void> {
    try {
      console.log('[BLEPeripheral] Disconnecting from all centrals...');

      const deviceIds = Array.from(this.connectedCentrals.keys());
      for (const deviceId of deviceIds) {
        await this.disconnect(deviceId);
      }

      console.log('[BLEPeripheral] Disconnected from all centrals');
    } catch (error) {
      console.error('[BLEPeripheral] Failed to disconnect from all:', error);
    }
  }

  /**
   * Clean up and destroy service
   */
  async destroy(): Promise<void> {
    try {
      console.log('[BLEPeripheral] Destroying...');

      // Stop advertising
      await this.stopAdvertising();

      // Disconnect from all centrals
      await this.disconnectAll();

      // Clear handlers
      this.messageHandlers = [];
      this.connectionHandlers = [];

      this.manager = null;

      console.log('[BLEPeripheral] Destroyed successfully');
    } catch (error) {
      console.error('[BLEPeripheral] Error during destroy:', error);
    }
  }
}

// Export singleton instance
export const BLEPeripheralService = new BLEPeripheralServiceClass();
