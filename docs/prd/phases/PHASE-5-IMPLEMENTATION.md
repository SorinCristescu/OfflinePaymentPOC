# Phase 5: BLE Communication Foundation - Implementation Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Implementation Details](#implementation-details)
4. [API Reference](#api-reference)
5. [Integration Guide](#integration-guide)
6. [Security Model](#security-model)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │PeerDiscovery │  │ Connection   │  │ BLESettings  │      │
│  │   Screen     │  │   Screen     │  │   Screen     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Component Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  BLEStatus   │  │DeviceScanner │  │PeerDeviceList│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       State Layer                            │
│  ┌─────────────────┐           ┌─────────────────┐          │
│  │   BLEStore      │◄─────────►│   PeerStore     │          │
│  │  (Zustand)      │           │   (Zustand)     │          │
│  └─────────────────┘           └─────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   BLEManager │  │  Connection  │  │   Message    │      │
│  │              │  │   Manager    │  │  Protocol    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ BLECentral   │  │BLEPeripheral │  │PeerDiscovery │      │
│  │  Service     │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ BLEProtocol  │  │BLEEncryption │  │SessionManager│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Native Layer                             │
│                  react-native-ble-plx                        │
│                   (BLE Hardware API)                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → UI Component → State Store → Service Layer → Native BLE
                                  ↑                ↓
                                  └────── Events ──┘
```

---

## Core Components

### 1. Service Layer

#### BLEManager (`src/services/ble/BLEManager.ts`)

**Purpose**: Core BLE manager, singleton managing BleManager instance.

**Key Responsibilities**:
- Initialize react-native-ble-plx
- Request Bluetooth permissions
- Monitor Bluetooth state
- Provide platform-specific information

**Usage**:
```typescript
import {BLEManager} from '../services/ble/BLEManager';

// Initialize
await BLEManager.initialize();

// Get manager instance
const manager = BLEManager.getManager();

// Check Bluetooth state
const isEnabled = await BLEManager.isBluetoothEnabled();

// Request permissions
await BLEManager.requestPermissions();
```

**Methods**:
- `initialize()`: Initialize BLE services
- `destroy()`: Clean up resources
- `getManager()`: Get BleManager instance
- `isBluetoothEnabled()`: Check BT state
- `requestPermissions()`: Request BLE permissions
- `getPlatformInfo()`: Get platform details

---

#### BLECentralService (`src/services/ble/BLECentralService.ts`)

**Purpose**: Scanner/Sender mode - discovers and connects to peripherals.

**Key Responsibilities**:
- Scan for nearby devices
- Connect to peripherals
- Send messages to connected devices
- Manage central-side connections

**Usage**:
```typescript
import {BLECentralService} from '../services/ble/BLECentralService';

// Initialize
await BLECentralService.initialize();

// Start scanning
await BLECentralService.startScan({
  durationMs: 10000,
  onDeviceDiscovered: (device) => {
    console.log('Found device:', device.name);
  }
});

// Connect to device
await BLECentralService.connectToDevice('device-id');

// Send message
await BLECentralService.sendMessage('device-id', messageData);

// Disconnect
await BLECentralService.disconnectFromDevice('device-id');
```

**Events**:
- `deviceDiscovered`: New device found
- `deviceConnected`: Device connected
- `deviceDisconnected`: Device disconnected
- `messageReceived`: Message received
- `error`: Error occurred

---

#### BLEPeripheralService (`src/services/ble/BLEPeripheralService.ts`)

**Purpose**: Receiver/Advertising mode - advertises and accepts connections.

**Key Responsibilities**:
- Advertise device presence
- Accept incoming connections
- Receive messages from connected devices
- Manage peripheral-side connections

**Usage**:
```typescript
import {BLEPeripheralService} from '../services/ble/BLEPeripheralService';

// Initialize
await BLEPeripheralService.initialize();

// Start advertising
await BLEPeripheralService.startAdvertising();

// Stop advertising
await BLEPeripheralService.stopAdvertising();

// Send message to connected central
await BLEPeripheralService.sendMessage('central-id', messageData);
```

**Events**:
- `centralConnected`: Central device connected
- `centralDisconnected`: Central device disconnected
- `messageReceived`: Message received
- `error`: Error occurred

---

#### ConnectionManager (`src/services/ble/ConnectionManager.ts`)

**Purpose**: High-level connection management across central and peripheral.

**Key Responsibilities**:
- Unified connection interface
- Connection pooling and limits
- Auto-reconnect logic
- Heartbeat monitoring
- Connection health tracking

**Usage**:
```typescript
import {ConnectionManager} from '../services/ble/ConnectionManager';

// Initialize
await ConnectionManager.initialize();

// Connect to peer
await ConnectionManager.connectToPeer('device-id');

// Disconnect from peer
await ConnectionManager.disconnectFromPeer('device-id');

// Disconnect all
await ConnectionManager.disconnectAll();

// Get connection health
const health = ConnectionManager.getConnectionHealth('device-id');

// Get all connections
const connections = ConnectionManager.getAllConnections();
```

**Configuration**:
```typescript
ConnectionManager.updateConfig({
  maxConnections: 5,
  autoReconnect: true,
  connectionTimeoutMs: 30000,
  heartbeatIntervalMs: 10000,
  maxReconnectAttempts: 3,
  reconnectDelayMs: 5000
});
```

---

#### MessageProtocol (`src/services/ble/MessageProtocol.ts`)

**Purpose**: High-level messaging API with queuing and delivery confirmation.

**Key Responsibilities**:
- Message queuing
- Delivery confirmation (ACK)
- Retry logic
- Message ordering
- Duplicate detection

**Usage**:
```typescript
import {MessageProtocol} from '../services/ble/MessageProtocol';

// Initialize
await MessageProtocol.initialize();

// Send message
const messageId = await MessageProtocol.sendMessage(
  'device-id',
  { type: 'payment', amount: 100 }
);

// Register message handler
MessageProtocol.registerHandler('payment', async (message, fromDeviceId) => {
  console.log('Payment received:', message);
  // Process payment
});

// Get queue status
const stats = MessageProtocol.getQueueStats();

// Clear queue
MessageProtocol.clearQueue();
```

**Message Types**:
- `handshake`: Connection establishment
- `heartbeat`: Keep-alive
- `ack`: Acknowledgment
- `data`: Application data
- `payment`: Payment transaction (future)

---

#### PeerDiscoveryService (`src/services/ble/PeerDiscoveryService.ts`)

**Purpose**: Peer device discovery and management.

**Key Responsibilities**:
- Discover nearby peers
- Filter and validate peers
- Track peer metadata (RSSI, proximity)
- Manage peer lifecycle

**Usage**:
```typescript
import {PeerDiscoveryService} from '../services/ble/PeerDiscoveryService';

// Initialize
await PeerDiscoveryService.initialize();

// Start discovery
await PeerDiscoveryService.startDiscovery({
  durationMs: 10000,
  filterByServiceUUID: true
});

// Stop discovery
PeerDiscoveryService.stopDiscovery();

// Get discovered peers
const peers = PeerDiscoveryService.getDiscoveredPeers();

// Clear discovered
PeerDiscoveryService.clearDiscovered();
```

**Events**:
- `peerDiscovered`: New peer found
- `peerUpdated`: Peer data updated (RSSI)
- `discoveryStarted`: Discovery started
- `discoveryStopped`: Discovery stopped

---

### 2. State Management

#### BLEStore (`src/store/bleStore.ts`)

**Purpose**: Zustand store for BLE state.

**State**:
```typescript
{
  isInitialized: boolean,
  isBluetoothEnabled: boolean,
  isScanning: boolean,
  isAdvertising: boolean,
  connections: Map<string, BLEConnection>,
  messageQueue: QueuedMessage[],
  pendingAcks: Map<string, QueuedMessage>
}
```

**Actions**:
- `initialize()`: Initialize BLE services
- `destroy()`: Clean up BLE resources
- `connectToPeer(deviceId)`: Connect to peer
- `disconnectFromPeer(deviceId)`: Disconnect from peer
- `sendMessage(deviceId, data)`: Send message
- `refreshStats()`: Update statistics

**Selectors**:
```typescript
// Connection stats
const {connectionCount, maxConnections} = useConnectionStats();

// Message stats
const {messageQueueSize, pendingAcks} = useMessageStats();

// Get connection
const connection = useBLEStore(state =>
  state.connections.get(deviceId)
);
```

---

#### PeerStore (`src/store/peerStore.ts`)

**Purpose**: Zustand store for peer device management.

**State**:
```typescript
{
  discoveredPeers: Map<string, PeerDevice>,
  trustedPeers: Set<string>,
  blockedPeers: Set<string>,
  sessions: Map<string, PeerSession>,
  selectedPeerId: string | null
}
```

**Actions**:
- `addPeer(peer)`: Add discovered peer
- `updatePeer(deviceId, updates)`: Update peer data
- `removePeer(deviceId)`: Remove peer
- `trustPeer(deviceId)`: Mark as trusted
- `untrustPeer(deviceId)`: Remove trust
- `blockPeer(deviceId)`: Block peer
- `selectPeer(deviceId)`: Select peer
- `refreshPeers()`: Update peer list

**Selectors**:
```typescript
// Get peer
const peer = usePeer(deviceId);

// Get session
const session = usePeerSession(deviceId);

// Get counts
const {discovered, trusted, connected} = usePeerCounts();

// Get filtered peers
const trustedPeers = usePeerStore(state =>
  Array.from(state.discoveredPeers.values())
    .filter(p => state.trustedPeers.has(p.deviceId))
);
```

---

### 3. UI Components

#### BLEStatus (`src/components/ble/BLEStatus.tsx`)

Displays Bluetooth and BLE status.

```typescript
<BLEStatus />
```

**Shows**:
- Bluetooth enabled/disabled
- Permissions status
- Initialization state

---

#### DeviceScanner (`src/components/ble/DeviceScanner.tsx`)

Controls for device discovery.

```typescript
<DeviceScanner />
```

**Features**:
- Start/Stop discovery buttons
- Discovery status indicator
- Scan duration display

---

#### PeerDeviceList (`src/components/ble/PeerDeviceList.tsx`)

List of discovered peers.

```typescript
<PeerDeviceList
  onPeerPress={(peer) => handlePress(peer)}
  onPeerLongPress={(peer) => handleLongPress(peer)}
  emptyMessage="No devices found"
/>
```

**Props**:
- `onPeerPress`: Single tap handler
- `onPeerLongPress`: Long press handler
- `emptyMessage`: Message when list is empty
- `filter`: Filter function (optional)

**Features**:
- Real-time RSSI updates
- Connection status indicators
- Trust badges
- Signal strength visualization

---

#### ConnectionIndicator (`src/components/ble/ConnectionIndicator.tsx`)

Shows connection statistics.

```typescript
<ConnectionIndicator onPress={() => navigate('BLESettings')} />
```

**Displays**:
- Active connections count
- Max connections
- Tap to view settings

---

### 4. Screens

#### PeerDiscoveryScreen (`src/screens/PeerDiscoveryScreen.tsx`)

Main discovery interface.

**Features**:
- BLE status display
- Device scanner controls
- Peer device list
- Connection management
- Trust management

**Navigation**:
```typescript
navigation.navigate('PeerDiscovery');
```

---

#### ConnectionScreen (`src/screens/ConnectionScreen.tsx`)

Detailed connection view.

**Features**:
- Device information
- Signal strength visualization
- Session details
- Connection health metrics
- Test messaging
- Connection actions

**Navigation**:
```typescript
navigation.navigate('Connection', { deviceId: 'device-id' });
```

---

#### BLESettingsScreen (`src/screens/BLESettingsScreen.tsx`)

BLE configuration and statistics.

**Features**:
- Statistics dashboard
- Connection settings editor
- Platform information
- Bulk actions
- About section

**Navigation**:
```typescript
navigation.navigate('BLESettings');
```

---

## Implementation Details

### BLE Protocol Stack

#### 1. **Physical Layer** (Hardware)
- Bluetooth 4.0+ LE radio
- 2.4 GHz frequency
- GFSK modulation

#### 2. **Link Layer** (react-native-ble-plx)
- Device discovery (scanning/advertising)
- Connection establishment
- Data transmission

#### 3. **Service Layer** (Our Implementation)

**GATT Service Structure**:
```
SMVC BLE Service (UUID: 12345678-1234-5678-1234-56789ABCDEF0)
├── Device Info Characteristic (Read)
│   └── Device ID + Public Key
├── Message TX Characteristic (Write with Response)
│   └── Outgoing messages
└── Message RX Characteristic (Notify)
    └── Incoming messages
```

#### 4. **Protocol Layer** (BLEProtocol)

**Message Format** (Binary):
```
┌────────────────────────────────────────────────────────┐
│ Header (32 bytes)                                      │
├────────────────────────────────────────────────────────┤
│ Version (1 byte) │ Type (1 byte) │ Flags (2 bytes)    │
├────────────────────────────────────────────────────────┤
│ Message ID (16 bytes UUID)                            │
├────────────────────────────────────────────────────────┤
│ Timestamp (8 bytes)                                    │
├────────────────────────────────────────────────────────┤
│ Sender ID (4 bytes)                                    │
├────────────────────────────────────────────────────────┤
│ Payload Length (4 bytes)                               │
├────────────────────────────────────────────────────────┤
│ Payload (variable, encrypted)                          │
├────────────────────────────────────────────────────────┤
│ Signature (64 bytes)                                   │
└────────────────────────────────────────────────────────┘
```

**Message Types**:
- `0x01`: HANDSHAKE
- `0x02`: HEARTBEAT
- `0x03`: ACK
- `0x04`: DATA
- `0x05`: PAYMENT (future)

---

### Connection Lifecycle

```
┌─────────────┐
│ DISCOVERED  │ (Device found during scan)
└──────┬──────┘
       │ connectToPeer()
       ▼
┌─────────────┐
│ CONNECTING  │ (BLE connection establishing)
└──────┬──────┘
       │ connection success
       ▼
┌─────────────┐
│  HANDSHAKE  │ (Exchange device info)
└──────┬──────┘
       │ handshake complete
       ▼
┌─────────────┐
│  CONNECTED  │ (Active session)
└──────┬──────┘
       │ heartbeat monitoring
       │ message exchange
       │
       │ disconnect() or connection lost
       ▼
┌─────────────┐
│DISCONNECTED │
└──────┬──────┘
       │ autoReconnect enabled?
       │
       ├─ Yes & Trusted ──> CONNECTING
       │
       └─ No ──> DISCOVERED
```

---

### Message Flow

**Sending a Message**:
```
1. App calls MessageProtocol.sendMessage(deviceId, data)
2. MessageProtocol creates message with UUID
3. Message added to queue
4. Connection Manager checks connection status
5. If connected:
   - Encrypt payload with recipient's public key
   - Sign message with sender's private key
   - Send via BLECentralService or BLEPeripheralService
6. Wait for ACK (configurable timeout)
7. On ACK: Mark as delivered
8. On timeout: Retry (up to max attempts)
9. Return message ID to caller
```

**Receiving a Message**:
```
1. BLE characteristic notification received
2. BLECentralService/BLEPeripheralService extracts data
3. BLEProtocol decodes message
4. BLEEncryption verifies signature
5. BLEEncryption decrypts payload
6. MessageProtocol checks for duplicates
7. Send ACK to sender
8. Trigger registered handler for message type
9. Update message statistics
```

---

### Security Implementation

#### Encryption (BLEEncryption)

**Key Exchange**:
1. Each device has an RSA keypair (from KeyManagementService)
2. Public keys exchanged during handshake
3. Stored in peer metadata

**Message Encryption**:
```typescript
// Sender side
const encrypted = await BLEEncryption.encryptMessage(
  messageData,
  recipientPublicKey
);

// Receiver side
const decrypted = await BLEEncryption.decryptMessage(
  encryptedData,
  ownPrivateKey
);
```

**Signing**:
```typescript
// Sign
const signature = await BLEEncryption.signData(messageData, privateKey);

// Verify
const isValid = await BLEEncryption.verifySignature(
  messageData,
  signature,
  senderPublicKey
);
```

**Algorithms**:
- Asymmetric: RSA-2048
- Symmetric: AES-256-GCM (for large payloads)
- Hashing: SHA-256
- Signing: RSA-PSS

---

### Session Management

**Session Creation**:
```typescript
// After successful handshake
const session = SessionManager.createSession({
  deviceId: peer.deviceId,
  publicKey: peer.publicKey,
  establishedAt: Date.now(),
  expiresAt: Date.now() + SESSION_DURATION_MS
});
```

**Session Properties**:
- `sessionId`: Unique identifier (UUID)
- `deviceId`: Peer device ID
- `publicKey`: Peer's public key
- `establishedAt`: Creation timestamp
- `expiresAt`: Expiration timestamp
- `lastActivity`: Last message time
- `messageCount`: Messages exchanged
- `encryptionKey`: Session key (optional)

**Session Expiry**:
- Default: 1 hour
- Renewed on message exchange
- Auto-disconnected on expiry
- Re-handshake required after expiry

---

## API Reference

### BLEManager API

```typescript
class BLEManager {
  static initialize(): Promise<void>
  static destroy(): Promise<void>
  static getManager(): BleManager
  static isBluetoothEnabled(): Promise<boolean>
  static requestPermissions(): Promise<boolean>
  static getPlatformInfo(): PlatformInfo
}

interface PlatformInfo {
  platform: 'ios' | 'android'
  apiLevel?: number
}
```

---

### ConnectionManager API

```typescript
class ConnectionManager {
  static initialize(): Promise<void>
  static connectToPeer(deviceId: string): Promise<void>
  static disconnectFromPeer(deviceId: string): Promise<void>
  static disconnectAll(): Promise<void>
  static getConnection(deviceId: string): BLEConnection | undefined
  static getAllConnections(): BLEConnection[]
  static getConnectionHealth(deviceId: string): ConnectionHealth
  static updateConfig(config: Partial<ConnectionConfig>): void
  static getConfig(): ConnectionConfig
}

interface ConnectionConfig {
  maxConnections: number
  autoReconnect: boolean
  connectionTimeoutMs: number
  heartbeatIntervalMs: number
  maxReconnectAttempts: number
  reconnectDelayMs: number
}

interface ConnectionHealth {
  deviceId: string
  isConnected: boolean
  messagesSent: number
  messagesReceived: number
  errors: number
  lastHeartbeat: number
  missedHeartbeats: number
  signalStrength: number
}
```

---

### MessageProtocol API

```typescript
class MessageProtocol {
  static initialize(): Promise<void>
  static destroy(): void

  static sendMessage(
    deviceId: string,
    data: any,
    options?: MessageOptions
  ): Promise<string> // Returns message ID

  static registerHandler(
    messageType: string,
    handler: MessageHandler
  ): void

  static unregisterHandler(messageType: string): void

  static getQueueStats(): QueueStats
  static clearQueue(): void
}

interface MessageOptions {
  priority?: 'high' | 'normal' | 'low'
  retryAttempts?: number
  timeout?: number
  requireAck?: boolean
}

type MessageHandler = (
  message: BLEMessage,
  fromDeviceId: string
) => Promise<void>

interface QueueStats {
  queueSize: number
  pendingAcks: number
  totalSent: number
  totalReceived: number
  errors: number
}
```

---

### PeerDiscoveryService API

```typescript
class PeerDiscoveryService {
  static initialize(): Promise<void>

  static startDiscovery(options?: DiscoveryOptions): Promise<void>
  static stopDiscovery(): void
  static isDiscovering(): boolean

  static getDiscoveredPeers(): PeerDevice[]
  static getPeer(deviceId: string): PeerDevice | undefined
  static clearDiscovered(): void

  static on(event: string, handler: Function): void
  static off(event: string, handler: Function): void
}

interface DiscoveryOptions {
  durationMs?: number
  filterByServiceUUID?: boolean
  allowDuplicates?: boolean
}
```

---

### BLEStore API

```typescript
// State interface
interface BLEState {
  isInitialized: boolean
  isBluetoothEnabled: boolean
  isScanning: boolean
  isAdvertising: boolean
  connections: Map<string, BLEConnection>
  messageQueue: QueuedMessage[]
  pendingAcks: Map<string, QueuedMessage>
}

// Actions
interface BLEActions {
  initialize(): Promise<void>
  destroy(): Promise<void>
  connectToPeer(deviceId: string): Promise<void>
  disconnectFromPeer(deviceId: string): Promise<void>
  sendMessage(deviceId: string, data: any): Promise<string>
  refreshStats(): void
}

// Usage
const store = useBLEStore()
await store.initialize()
await store.connectToPeer('device-id')
const msgId = await store.sendMessage('device-id', { hello: 'world' })
```

---

### PeerStore API

```typescript
// State interface
interface PeerState {
  discoveredPeers: Map<string, PeerDevice>
  trustedPeers: Set<string>
  blockedPeers: Set<string>
  sessions: Map<string, PeerSession>
  selectedPeerId: string | null
}

// Actions
interface PeerActions {
  addPeer(peer: PeerDevice): void
  updatePeer(deviceId: string, updates: Partial<PeerDevice>): void
  removePeer(deviceId: string): void
  trustPeer(deviceId: string): Promise<void>
  untrustPeer(deviceId: string): Promise<void>
  blockPeer(deviceId: string): Promise<void>
  selectPeer(deviceId: string): void
  clearDiscovered(): void
  refreshPeers(): void
}

// Usage
const store = usePeerStore()
store.addPeer(peerDevice)
await store.trustPeer('device-id')
const peer = store.discoveredPeers.get('device-id')
```

---

## Integration Guide

### Adding BLE to Your App

#### 1. Install Dependencies

```bash
npm install react-native-ble-plx
cd ios && pod install
```

#### 2. Configure Permissions

**iOS (`Info.plist`)**:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>We need Bluetooth to discover and connect to nearby devices for offline payments.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>We need Bluetooth to advertise your device for peer-to-peer payments.</string>
```

**Android (`AndroidManifest.xml`)**:
```xml
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
```

#### 3. Initialize in App.tsx

```typescript
import {useBLEStore} from './src/store/bleStore';
import {initializePeerStoreListeners} from './src/store/peerStore';

function App() {
  const initializeBLE = useBLEStore(state => state.initialize);

  useEffect(() => {
    const initApp = async () => {
      // ... other initialization

      // Initialize BLE
      setTimeout(() => {
        initializeBLE()
          .then(() => {
            initializePeerStoreListeners();
            console.log('BLE initialized');
          })
          .catch(error => {
            console.warn('BLE init failed:', error);
          });
      }, 100);
    };

    initApp();
  }, []);

  return <YourApp />;
}
```

#### 4. Add Navigation Routes

```typescript
// navigation/types.ts
export type RootStackParamList = {
  // ... existing routes
  PeerDiscovery: undefined;
  Connection: {deviceId: string};
  BLESettings: undefined;
};

// navigation/RootNavigator.tsx
import {
  PeerDiscoveryScreen,
  ConnectionScreen,
  BLESettingsScreen
} from '../screens';

<Stack.Screen name="PeerDiscovery" component={PeerDiscoveryScreen} />
<Stack.Screen name="Connection" component={ConnectionScreen} />
<Stack.Screen name="BLESettings" component={BLESettingsScreen} />
```

#### 5. Add Entry Points

```typescript
// In your Settings screen or menu
<TouchableOpacity
  onPress={() => navigation.navigate('PeerDiscovery')}
>
  <Text>Peer Discovery</Text>
</TouchableOpacity>

<TouchableOpacity
  onPress={() => navigation.navigate('BLESettings')}
>
  <Text>BLE Settings</Text>
</TouchableOpacity>
```

---

### Custom Message Types

#### Register a Handler

```typescript
import {MessageProtocol} from '../services/ble/MessageProtocol';

// Register handler for payment messages
MessageProtocol.registerHandler('payment', async (message, fromDeviceId) => {
  const {amount, recipient} = message.payload;

  // Validate payment
  if (!isValidPayment(message)) {
    console.error('Invalid payment');
    return;
  }

  // Process payment
  await processPayment({
    amount,
    from: fromDeviceId,
    to: recipient,
    timestamp: message.timestamp
  });

  // Send confirmation
  await MessageProtocol.sendMessage(fromDeviceId, {
    type: 'payment_confirmation',
    messageId: message.id,
    status: 'success'
  });
});
```

#### Send Custom Message

```typescript
const messageId = await MessageProtocol.sendMessage(
  recipientDeviceId,
  {
    type: 'payment',
    amount: 100,
    currency: 'USD',
    recipient: recipientPublicKey,
    timestamp: Date.now()
  },
  {
    priority: 'high',
    requireAck: true,
    timeout: 30000
  }
);

console.log('Payment sent:', messageId);
```

---

## Security Model

### Threat Model

**Protected Against**:
- Eavesdropping (encryption)
- Message tampering (signatures)
- Replay attacks (message IDs, timestamps)
- Man-in-the-middle (public key pinning)
- Unauthorized connections (trust system)

**Not Protected Against** (Future Phases):
- Device impersonation (needs device attestation)
- Quantum attacks (needs post-quantum crypto)
- Physical device compromise
- Side-channel attacks

---

### Security Best Practices

#### 1. Key Management

```typescript
// Use hardware-backed keys when available
const publicKey = await KeyManagementService.getPublicKey(
  KeyIds.TRANSACTION_SIGNING
);

// Rotate session keys periodically
if (Date.now() - session.establishedAt > SESSION_KEY_ROTATION_MS) {
  await SessionManager.rotateSessionKey(deviceId);
}
```

#### 2. Message Validation

```typescript
// Always validate messages before processing
function validateMessage(message: BLEMessage): boolean {
  // Check signature
  if (!BLEEncryption.verifySignature(...)) return false;

  // Check timestamp (prevent replay)
  if (Date.now() - message.timestamp > MAX_MESSAGE_AGE_MS) return false;

  // Check message ID (prevent duplicates)
  if (isMessageProcessed(message.id)) return false;

  // Validate payload structure
  if (!isValidPayload(message.payload)) return false;

  return true;
}
```

#### 3. Trust Management

```typescript
// Only trust verified devices
async function trustDevice(deviceId: string) {
  // Verify device identity
  const deviceInfo = await verifyDeviceIdentity(deviceId);

  // Check certificate (future)
  // await verifyCertificate(deviceInfo.certificate);

  // Add to trusted set
  await usePeerStore.getState().trustPeer(deviceId);
}
```

#### 4. Secure Sessions

```typescript
// Create session with proper expiry
const session = SessionManager.createSession({
  deviceId,
  publicKey,
  establishedAt: Date.now(),
  expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
  encryptionKey: await generateSessionKey()
});

// Monitor for expiry
setInterval(() => {
  if (Date.now() > session.expiresAt) {
    ConnectionManager.disconnectFromPeer(deviceId);
  }
}, 60000); // Check every minute
```

---

## Testing

### Unit Tests

```typescript
// services/ble/__tests__/BLEManager.test.ts
describe('BLEManager', () => {
  it('should initialize successfully', async () => {
    await BLEManager.initialize();
    expect(BLEManager.getManager()).toBeDefined();
  });

  it('should check Bluetooth state', async () => {
    const isEnabled = await BLEManager.isBluetoothEnabled();
    expect(typeof isEnabled).toBe('boolean');
  });
});

// services/ble/__tests__/MessageProtocol.test.ts
describe('MessageProtocol', () => {
  it('should queue messages when offline', async () => {
    const msgId = await MessageProtocol.sendMessage('device-id', {
      test: 'data'
    });

    const stats = MessageProtocol.getQueueStats();
    expect(stats.queueSize).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/ble-flow.test.ts
describe('BLE Flow', () => {
  it('should complete full connection flow', async () => {
    // Initialize
    await BLEManager.initialize();
    await ConnectionManager.initialize();

    // Start discovery
    await PeerDiscoveryService.startDiscovery();

    // Wait for device
    const peer = await waitForPeer();

    // Connect
    await ConnectionManager.connectToPeer(peer.deviceId);

    // Send message
    const msgId = await MessageProtocol.sendMessage(peer.deviceId, {
      type: 'test',
      data: 'hello'
    });

    // Wait for ACK
    await waitForAck(msgId);

    expect(msgId).toBeDefined();
  });
});
```

### Manual Testing Checklist

**Discovery**:
- [ ] Scan discovers nearby devices
- [ ] RSSI updates in real-time
- [ ] Devices removed when out of range

**Connection**:
- [ ] Can connect to discovered device
- [ ] Handshake completes successfully
- [ ] Connection shows in list
- [ ] Can disconnect manually

**Messaging**:
- [ ] Test message sends successfully
- [ ] Message received on other device
- [ ] ACK returned within timeout
- [ ] Queue handles offline messages

**Trust**:
- [ ] Can mark device as trusted
- [ ] Trusted badge appears
- [ ] Auto-reconnect works for trusted
- [ ] Can remove trust

**Settings**:
- [ ] Statistics update in real-time
- [ ] Can change max connections
- [ ] Can toggle auto-reconnect
- [ ] Clear actions work correctly

**Error Handling**:
- [ ] Handles Bluetooth disabled
- [ ] Handles permission denied
- [ ] Handles connection timeout
- [ ] Handles message send failure

---

## Troubleshooting

### Common Issues

#### "BLE not initialized"

**Cause**: BLE services not initialized before use

**Solution**:
```typescript
if (!useBLEStore.getState().isInitialized) {
  await useBLEStore.getState().initialize();
}
```

#### "Cannot read property 'BLEManager' of undefined"

**Cause**: Native module not linked

**Solution**:
```bash
cd ios && pod install
# Rebuild app
```

#### "Permission denied"

**Cause**: Bluetooth permissions not granted

**Solution**:
```typescript
const granted = await BLEManager.requestPermissions();
if (!granted) {
  Alert.alert('Bluetooth permission required');
}
```

#### "Connection timeout"

**Cause**: Device out of range or unresponsive

**Solution**:
- Move devices closer
- Check signal strength
- Increase timeout in config

#### "Message send failed"

**Cause**: Not connected or queue full

**Solution**:
```typescript
const connection = ConnectionManager.getConnection(deviceId);
if (!connection || connection.status !== 'connected') {
  await ConnectionManager.connectToPeer(deviceId);
}

const stats = MessageProtocol.getQueueStats();
if (stats.queueSize > MAX_QUEUE_SIZE) {
  MessageProtocol.clearQueue();
}
```

---

## Performance Considerations

### Optimization Tips

1. **Limit Scanning**:
   ```typescript
   // Don't scan continuously
   await PeerDiscoveryService.startDiscovery({ durationMs: 10000 });
   // Stop when done
   PeerDiscoveryService.stopDiscovery();
   ```

2. **Connection Pooling**:
   ```typescript
   // Reuse connections instead of creating new ones
   const existing = ConnectionManager.getConnection(deviceId);
   if (existing) {
     return existing;
   }
   ```

3. **Message Batching**:
   ```typescript
   // Batch multiple messages
   const messages = [msg1, msg2, msg3];
   await MessageProtocol.sendBatch(deviceId, messages);
   ```

4. **Lazy Initialization**:
   ```typescript
   // Initialize BLE only when needed
   useEffect(() => {
     if (needsBLE && !isInitialized) {
       initialize();
     }
   }, [needsBLE]);
   ```

5. **Memory Management**:
   ```typescript
   // Clear old peers periodically
   const peers = PeerDiscoveryService.getDiscoveredPeers();
   const stale = peers.filter(p =>
     Date.now() - p.lastSeen > STALE_PEER_MS
   );
   stale.forEach(p => PeerDiscoveryService.removePeer(p.deviceId));
   ```

---

## Future Enhancements

### Phase 6 (Planned)
- Payment transaction protocol
- Multi-hop message routing
- Offline transaction signing
- Transaction history sync

### Phase 7 (Planned)
- Device attestation
- Certificate-based trust
- Revocation lists
- Key escrow

### Phase 8 (Planned)
- Mesh networking
- Store-and-forward messaging
- Opportunistic routing
- Network topology visualization

---

## References

- [react-native-ble-plx Documentation](https://github.com/Polidea/react-native-ble-plx)
- [Bluetooth Core Specification](https://www.bluetooth.com/specifications/bluetooth-core-specification/)
- [GATT Services](https://www.bluetooth.com/specifications/gatt/)
- [Zustand State Management](https://github.com/pmndrs/zustand)

---

## Version History

- **v1.0.0** (Nov 2025) - Initial Phase 5 implementation
  - BLE discovery and connection
  - Peer management
  - Message protocol
  - Security foundation

---

## Support

For technical support:
- Check troubleshooting section
- Review error logs
- Contact development team
- File issues on GitHub
