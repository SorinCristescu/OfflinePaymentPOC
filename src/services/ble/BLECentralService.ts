/**
 * BLECentralService - Scanner/Sender Mode
 * Phase 5: BLE Communication Foundation
 *
 * Manages BLE central mode (scanning and initiating connections)
 * Discovers nearby peripheral devices advertising our service
 * Connects to peripherals and exchanges messages
 */

import {BleManager, Device, Subscription} from 'react-native-ble-plx';
import {BLEManager} from './BLEManager';
import {BLEProtocol} from './BLEProtocol';
import {BLEEncryption} from './BLEEncryption';
import {
  BLEDevice,
  BLEMessage,
  SMVC_BLE_SERVICE,
  ConnectionStatus,
  BLEConnection,
  BLEScanResult,
} from '../../types/ble';
import {KeyManagementService, KeyIds} from '../security/KeyManagementService';
import {DeviceIdentityService} from '../security/DeviceIdentityService';
import {Buffer} from 'buffer';

/**
 * Scan options
 */
interface ScanOptions {
  durationMs?: number; // Scan duration (default: 10s)
  allowDuplicates?: boolean; // Allow duplicate discoveries
}

/**
 * Discovery handler callback
 */
type DiscoveryHandler = (device: BLEDevice) => void;

/**
 * Connection event callback
 */
type ConnectionEventHandler = (
  deviceId: string,
  status: ConnectionStatus,
  error?: string
) => void;

/**
 * Message handler callback
 */
type MessageHandler = (message: BLEMessage, from: string) => Promise<void>;

/**
 * BLE Central Service
 */
class BLECentralServiceClass {
  private manager: BleManager | null = null;
  private isScanning: boolean = false;
  private scanSubscription: Subscription | null = null;
  private discoveredDevices: Map<string, BLEDevice> = new Map();
  private connectedPeripherals: Map<string, BLEConnection> = new Map();
  private deviceCharacteristicSubscriptions: Map<string, Subscription> = new Map();
  private discoveryHandlers: DiscoveryHandler[] = [];
  private connectionHandlers: ConnectionEventHandler[] = [];
  private messageHandlers: MessageHandler[] = [];
  private ourDeviceId: string = '';
  private ourPublicKey: string = '';

  /**
   * Initialize central service
   */
  async initialize(): Promise<void> {
    try {
      console.log('[BLECentral] Initializing...');

      // Ensure BLEManager is initialized
      if (!BLEManager.isReady()) {
        await BLEManager.initialize();
      }

      this.manager = BLEManager.getManager();

      // Get our device ID and public key
      const identity = await DeviceIdentityService.getDeviceIdentity();
      this.ourDeviceId = identity.deviceId;
      this.ourPublicKey = await KeyManagementService.getPublicKey(
        KeyIds.TRANSACTION_SIGNING
      );

      console.log('[BLECentral] Initialized successfully');
      console.log('[BLECentral] Device ID:', this.ourDeviceId);
    } catch (error) {
      console.error('[BLECentral] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start scanning for peripheral devices
   */
  async startScan(options: ScanOptions = {}): Promise<void> {
    try {
      if (this.isScanning) {
        console.log('[BLECentral] Already scanning');
        return;
      }

      if (!this.manager) {
        throw new Error('Central service not initialized');
      }

      const {durationMs = 10000, allowDuplicates = false} = options;

      console.log('[BLECentral] Starting scan...');
      console.log('[BLECentral] Duration:', durationMs, 'ms');
      console.log('[BLECentral] Service UUID:', SMVC_BLE_SERVICE.service);

      this.isScanning = true;

      // Start scanning for our service UUID
      this.scanSubscription = this.manager.startDeviceScan(
        [SMVC_BLE_SERVICE.service], // Filter by our service UUID
        {allowDuplicates},
        (error, device) => {
          if (error) {
            console.error('[BLECentral] Scan error:', error);
            this.stopScan();
            return;
          }

          if (device) {
            this.handleDiscoveredDevice(device);
          }
        }
      );

      // Auto-stop after duration
      if (durationMs > 0) {
        setTimeout(() => {
          if (this.isScanning) {
            console.log('[BLECentral] Scan duration elapsed, stopping...');
            this.stopScan();
          }
        }, durationMs);
      }

      console.log('[BLECentral] Scan started');
    } catch (error) {
      console.error('[BLECentral] Failed to start scan:', error);
      this.isScanning = false;
      throw error;
    }
  }

  /**
   * Stop scanning
   */
  stopScan(): void {
    try {
      if (!this.isScanning) {
        return;
      }

      console.log('[BLECentral] Stopping scan...');

      // Stop device scan - this automatically handles the subscription cleanup
      if (this.manager) {
        this.manager.stopDeviceScan();
      }

      // Clear subscription reference
      this.scanSubscription = null;
      this.isScanning = false;

      console.log('[BLECentral] Scan stopped');
    } catch (error) {
      console.error('[BLECentral] Error stopping scan:', error);
      // Ensure we mark scanning as stopped even on error
      this.isScanning = false;
      this.scanSubscription = null;
    }
  }

  /**
   * Handle discovered device
   */
  private async handleDiscoveredDevice(device: Device): Promise<void> {
    try {
      console.log(`[BLECentral] Discovered device: ${device.id} (${device.name})`);
      console.log(`[BLECentral] RSSI: ${device.rssi}`);

      // Check if we already discovered this device
      if (this.discoveredDevices.has(device.id)) {
        // Update RSSI and last seen
        const existingDevice = this.discoveredDevices.get(device.id)!;
        existingDevice.rssi = device.rssi || existingDevice.rssi;
        existingDevice.lastSeen = new Date();
        return;
      }

      // Create BLE device record (we'll get deviceId and publicKey after connecting)
      const bleDevice: BLEDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        rssi: device.rssi || -100,
        deviceId: '', // Will be populated after connection
        publicKey: '', // Will be populated after connection
        lastSeen: new Date(),
      };

      this.discoveredDevices.set(device.id, bleDevice);

      // Notify discovery handlers
      this.notifyDiscoveryHandlers(bleDevice);

      console.log(`[BLECentral] Device added to discovered list: ${device.id}`);
    } catch (error) {
      console.error('[BLECentral] Error handling discovered device:', error);
    }
  }

  /**
   * Connect to a peripheral device
   */
  async connect(peripheralId: string): Promise<void> {
    try {
      console.log(`[BLECentral] Connecting to: ${peripheralId}`);

      if (!this.manager) {
        throw new Error('Central service not initialized');
      }

      // Check if already connected
      if (this.connectedPeripherals.has(peripheralId)) {
        console.log('[BLECentral] Already connected to this device');
        return;
      }

      const device = this.discoveredDevices.get(peripheralId);
      if (!device) {
        throw new Error(`Device not found in discovered list: ${peripheralId}`);
      }

      // Create connection record
      const connection: BLEConnection = {
        deviceId: '', // Will be populated after reading characteristic
        peripheralId,
        status: ConnectionStatus.CONNECTING,
        connectedAt: new Date(),
      };

      this.connectedPeripherals.set(peripheralId, connection);
      this.notifyConnectionEvent('', ConnectionStatus.CONNECTING);

      // Connect to device
      const connectedDevice = await this.manager.connectToDevice(peripheralId, {
        timeout: 30000,
      });

      console.log(`[BLECentral] Connected to: ${peripheralId}`);

      // Discover services and characteristics
      await connectedDevice.discoverAllServicesAndCharacteristics();

      console.log('[BLECentral] Services and characteristics discovered');

      // Read device ID and public key
      const peerDeviceId = await this.readDeviceId(connectedDevice);
      const peerPublicKey = await this.readPublicKey(connectedDevice);

      console.log(`[BLECentral] Peer device ID: ${peerDeviceId}`);

      // Update connection and device records
      connection.deviceId = peerDeviceId;
      connection.status = ConnectionStatus.AUTHENTICATING;
      device.deviceId = peerDeviceId;
      device.publicKey = peerPublicKey;

      // Perform key exchange
      await BLEEncryption.performKeyExchange(peerDeviceId, peerPublicKey);

      // Update connection status
      connection.status = ConnectionStatus.AUTHENTICATED;
      connection.encryptionKey = BLEEncryption.getSession(peerDeviceId)?.sessionKey;

      // Subscribe to characteristic notifications (for receiving messages)
      await this.subscribeToNotifications(connectedDevice, peerDeviceId);

      // Monitor disconnection
      this.monitorDisconnection(connectedDevice, peerDeviceId);

      this.notifyConnectionEvent(peerDeviceId, ConnectionStatus.AUTHENTICATED);

      console.log(`[BLECentral] Authenticated with: ${peerDeviceId}`);
    } catch (error) {
      console.error('[BLECentral] Connection failed:', error);
      this.connectedPeripherals.delete(peripheralId);
      this.notifyConnectionEvent('', ConnectionStatus.ERROR, (error as Error).message);
      throw error;
    }
  }

  /**
   * Read device ID from characteristic
   */
  private async readDeviceId(device: Device): Promise<string> {
    try {
      const characteristic = await device.readCharacteristicForService(
        SMVC_BLE_SERVICE.service,
        SMVC_BLE_SERVICE.deviceIdCharacteristic
      );

      if (!characteristic.value) {
        throw new Error('Device ID characteristic has no value');
      }

      const deviceId = Buffer.from(characteristic.value, 'base64').toString('utf8');
      return deviceId;
    } catch (error) {
      console.error('[BLECentral] Failed to read device ID:', error);
      throw new Error('Failed to read device ID from peripheral');
    }
  }

  /**
   * Read public key from characteristic
   */
  private async readPublicKey(device: Device): Promise<string> {
    try {
      const characteristic = await device.readCharacteristicForService(
        SMVC_BLE_SERVICE.service,
        SMVC_BLE_SERVICE.publicKeyCharacteristic
      );

      if (!characteristic.value) {
        throw new Error('Public key characteristic has no value');
      }

      const publicKey = Buffer.from(characteristic.value, 'base64').toString('utf8');
      return publicKey;
    } catch (error) {
      console.error('[BLECentral] Failed to read public key:', error);
      throw new Error('Failed to read public key from peripheral');
    }
  }

  /**
   * Subscribe to characteristic notifications for receiving messages
   */
  private async subscribeToNotifications(
    device: Device,
    peerDeviceId: string
  ): Promise<void> {
    try {
      console.log(`[BLECentral] Subscribing to notifications from: ${peerDeviceId}`);

      const subscription = device.monitorCharacteristicForService(
        SMVC_BLE_SERVICE.service,
        SMVC_BLE_SERVICE.characteristic,
        (error, characteristic) => {
          if (error) {
            console.error('[BLECentral] Notification error:', error);
            return;
          }

          if (characteristic?.value) {
            this.handleIncomingMessage(characteristic.value, peerDeviceId);
          }
        }
      );

      this.deviceCharacteristicSubscriptions.set(peerDeviceId, subscription);

      console.log('[BLECentral] Subscribed to notifications');
    } catch (error) {
      console.error('[BLECentral] Failed to subscribe to notifications:', error);
      throw error;
    }
  }

  /**
   * Handle incoming message from peripheral
   */
  private async handleIncomingMessage(data: string, fromDeviceId: string): Promise<void> {
    try {
      console.log(`[BLECentral] Received message from: ${fromDeviceId}`);

      const connection = Array.from(this.connectedPeripherals.values()).find(
        (c) => c.deviceId === fromDeviceId
      );

      if (!connection) {
        throw new Error(`No connection found for device: ${fromDeviceId}`);
      }

      // Update last message time
      connection.lastMessageAt = new Date();

      // Decode from base64
      const messageData = Buffer.from(data, 'base64').toString('utf8');

      // Deserialize message
      const message = BLEProtocol.deserialize(messageData);

      // Validate message
      if (!BLEProtocol.validateMessage(message)) {
        throw new Error('Invalid message format');
      }

      const device = this.discoveredDevices.get(connection.peripheralId);
      if (!device) {
        throw new Error('Device not found in discovered list');
      }

      // Verify and decrypt message
      const decryptedMessage = await BLEEncryption.verifyAndDecryptMessage(
        message,
        fromDeviceId,
        device.publicKey
      );

      // Notify message handlers
      await this.notifyMessageHandlers(decryptedMessage, fromDeviceId);

      console.log('[BLECentral] Message processed successfully');
    } catch (error) {
      console.error('[BLECentral] Failed to handle message:', error);
    }
  }

  /**
   * Send message to a connected peripheral
   */
  async sendMessage(toDeviceId: string, message: BLEMessage): Promise<void> {
    try {
      const connection = Array.from(this.connectedPeripherals.values()).find(
        (c) => c.deviceId === toDeviceId
      );

      if (!connection) {
        throw new Error(`Not connected to device: ${toDeviceId}`);
      }

      if (connection.status !== ConnectionStatus.AUTHENTICATED) {
        throw new Error(`Connection not authenticated: ${toDeviceId}`);
      }

      console.log(`[BLECentral] Sending message to: ${toDeviceId}`);

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
        const base64Data = Buffer.from(serialized).toString('base64');

        // Write to characteristic
        if (this.manager) {
          await this.manager.writeCharacteristicWithResponseForDevice(
            connection.peripheralId,
            SMVC_BLE_SERVICE.service,
            SMVC_BLE_SERVICE.characteristic,
            base64Data
          );

          console.log(
            `[BLECentral] Sent fragment ${fragment.sequence || 0}/${fragment.totalFragments || 1}`
          );
        }
      }

      console.log('[BLECentral] Message sent successfully');
    } catch (error) {
      console.error('[BLECentral] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Monitor device disconnection
   */
  private monitorDisconnection(device: Device, peerDeviceId: string): void {
    device.onDisconnected((error, disconnectedDevice) => {
      console.log(`[BLECentral] Device disconnected: ${peerDeviceId}`);

      if (error) {
        console.error('[BLECentral] Disconnection error:', error);
      }

      this.handleDisconnection(peerDeviceId);
    });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(deviceId: string): void {
    try {
      console.log(`[BLECentral] Handling disconnection: ${deviceId}`);

      // Find and remove connection
      let peripheralId: string | null = null;
      for (const [pid, connection] of this.connectedPeripherals.entries()) {
        if (connection.deviceId === deviceId) {
          peripheralId = pid;
          connection.status = ConnectionStatus.DISCONNECTED;
          break;
        }
      }

      if (peripheralId) {
        this.connectedPeripherals.delete(peripheralId);
      }

      // Clean up notification subscription
      const subscription = this.deviceCharacteristicSubscriptions.get(deviceId);
      if (subscription) {
        subscription.remove();
        this.deviceCharacteristicSubscriptions.delete(deviceId);
      }

      // Revoke encryption session
      BLEEncryption.revokeSession(deviceId);

      this.notifyConnectionEvent(deviceId, ConnectionStatus.DISCONNECTED);

      console.log('[BLECentral] Disconnection handled');
    } catch (error) {
      console.error('[BLECentral] Error handling disconnection:', error);
    }
  }

  /**
   * Disconnect from a peripheral
   */
  async disconnect(deviceId: string): Promise<void> {
    try {
      console.log(`[BLECentral] Disconnecting from: ${deviceId}`);

      const connection = Array.from(this.connectedPeripherals.values()).find(
        (c) => c.deviceId === deviceId
      );

      if (!connection) {
        console.log('[BLECentral] Not connected to this device');
        return;
      }

      if (this.manager) {
        await this.manager.cancelDeviceConnection(connection.peripheralId);
      }

      this.handleDisconnection(deviceId);

      console.log('[BLECentral] Disconnected successfully');
    } catch (error) {
      console.error('[BLECentral] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Register discovery handler
   */
  onDeviceDiscovered(handler: DiscoveryHandler): () => void {
    this.discoveryHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.discoveryHandlers.indexOf(handler);
      if (index > -1) {
        this.discoveryHandlers.splice(index, 1);
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
   * Notify discovery handlers
   */
  private notifyDiscoveryHandlers(device: BLEDevice): void {
    for (const handler of this.discoveryHandlers) {
      try {
        handler(device);
      } catch (error) {
        console.error('[BLECentral] Error in discovery handler:', error);
      }
    }
  }

  /**
   * Notify connection event handlers
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
        console.error('[BLECentral] Error in connection handler:', err);
      }
    }
  }

  /**
   * Notify message handlers
   */
  private async notifyMessageHandlers(
    message: BLEMessage,
    from: string
  ): Promise<void> {
    for (const handler of this.messageHandlers) {
      try {
        await handler(message, from);
      } catch (error) {
        console.error('[BLECentral] Error in message handler:', error);
      }
    }
  }

  /**
   * Check if scanning
   */
  isScanningActive(): boolean {
    return this.isScanning;
  }

  /**
   * Get discovered devices
   */
  getDiscoveredDevices(): BLEDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get connected peripherals
   */
  getConnectedPeripherals(): BLEConnection[] {
    return Array.from(this.connectedPeripherals.values());
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connectedPeripherals.size;
  }

  /**
   * Check if connected to a specific device
   */
  isConnectedTo(deviceId: string): boolean {
    const connection = Array.from(this.connectedPeripherals.values()).find(
      (c) => c.deviceId === deviceId
    );
    return connection?.status === ConnectionStatus.AUTHENTICATED;
  }

  /**
   * Clear discovered devices
   */
  clearDiscoveredDevices(): void {
    this.discoveredDevices.clear();
    console.log('[BLECentral] Discovered devices cleared');
  }

  /**
   * Disconnect from all peripherals
   */
  async disconnectAll(): Promise<void> {
    try {
      console.log('[BLECentral] Disconnecting from all peripherals...');

      const connections = Array.from(this.connectedPeripherals.values());
      for (const connection of connections) {
        await this.disconnect(connection.deviceId);
      }

      console.log('[BLECentral] Disconnected from all peripherals');
    } catch (error) {
      console.error('[BLECentral] Failed to disconnect from all:', error);
    }
  }

  /**
   * Clean up and destroy service
   */
  async destroy(): Promise<void> {
    try {
      console.log('[BLECentral] Destroying...');

      // Stop scanning
      this.stopScan();

      // Disconnect from all peripherals
      await this.disconnectAll();

      // Clear handlers
      this.discoveryHandlers = [];
      this.connectionHandlers = [];
      this.messageHandlers = [];

      // Clear discovered devices
      this.discoveredDevices.clear();

      this.manager = null;

      console.log('[BLECentral] Destroyed successfully');
    } catch (error) {
      console.error('[BLECentral] Error during destroy:', error);
    }
  }
}

// Export singleton instance
export const BLECentralService = new BLECentralServiceClass();
