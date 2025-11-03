# Phase 5: BLE Communication Foundation

## Phase Overview

**Duration**: 2 weeks
**Complexity**: High
**Focus**: Implement Bluetooth Low Energy (BLE) for secure device-to-device communication foundation

### Objectives

1. Implement BLE peripheral and central modes
2. Enable peer device discovery and advertisement
3. Create secure BLE channel establishment
4. Implement data transmission protocols
5. Build connection management system
6. Integrate with Phase 4 hardware security
7. Prepare foundation for Phase 6 payment protocols

### Business Value

- Enables true offline peer-to-peer communication
- Foundation for offline payment transactions (Phase 6)
- No internet/cellular dependency
- Works in remote/offline environments
- Scalable for multiple device connections

### Key Deliverables

- BLE peripheral/central implementation
- Device discovery and pairing system
- Secure channel establishment with encryption
- Message transmission protocol
- Connection state management
- Integration with hardware security (Phase 4)
- Testing infrastructure for BLE communication

---

## Technical Specifications

### Dependencies to Install

```bash
npm install react-native-ble-plx
npm install buffer
npm install --save-dev @types/buffer
```

#### iOS Permissions

Add to `ios/OfflinePaymentPOC/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth to enable offline peer-to-peer payments</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app needs Bluetooth to send and receive offline payments</string>
```

#### Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
                 android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
```

---

### File Structure Created

```
src/
├── services/
│   ├── ble/
│   │   ├── BLEManager.ts (NEW)
│   │   ├── BLEPeripheralService.ts (NEW)
│   │   ├── BLECentralService.ts (NEW)
│   │   ├── BLEProtocol.ts (NEW)
│   │   └── BLEEncryption.ts (NEW)
│   └── p2p/
│       ├── PeerDiscoveryService.ts (NEW)
│       ├── ConnectionManager.ts (NEW)
│       └── MessageProtocol.ts (NEW)
├── components/
│   ├── ble/
│   │   ├── BLEStatus.tsx (NEW)
│   │   ├── DeviceScanner.tsx (NEW)
│   │   ├── PeerDeviceList.tsx (NEW)
│   │   └── ConnectionIndicator.tsx (NEW)
├── screens/
│   ├── PeerDiscoveryScreen.tsx (NEW)
│   ├── ConnectionScreen.tsx (NEW)
│   └── BLESettingsScreen.tsx (NEW)
├── hooks/
│   ├── useBLE.ts (NEW)
│   ├── usePeerDiscovery.ts (NEW)
│   └── useConnection.ts (NEW)
├── stores/
│   ├── bleStore.ts (NEW)
│   └── peerStore.ts (NEW)
└── types/
    ├── ble.ts (NEW)
    └── p2p.ts (NEW)
```

---

## Core Type Definitions

### BLE Types

```typescript
// src/types/ble.ts

export interface BLEDevice {
  id: string; // Device MAC address
  name: string | null;
  rssi: number; // Signal strength
  deviceId: string; // Our app's device ID from Phase 3
  publicKey: string; // Hardware public key from Phase 4
  lastSeen: Date;
}

export interface BLEServiceUUID {
  service: string; // Primary service UUID
  characteristic: string; // Data characteristic UUID
  deviceIdCharacteristic: string; // Device ID characteristic
  publicKeyCharacteristic: string; // Public key characteristic
}

export enum BLEMode {
  PERIPHERAL = 'peripheral', // Advertising mode (receiver)
  CENTRAL = 'central', // Scanning mode (sender)
  BOTH = 'both', // Both modes simultaneously
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error',
}

export interface BLEConnection {
  deviceId: string;
  peripheralId: string;
  status: ConnectionStatus;
  connectedAt?: Date;
  lastMessageAt?: Date;
  encryptionKey?: string; // Shared encryption key
}

export interface BLEMessage {
  id: string;
  type: MessageType;
  payload: string; // Base64 encoded encrypted data
  signature: string; // Hardware-signed message
  timestamp: number;
  from: string; // Sender device ID
  to: string; // Recipient device ID
}

export enum MessageType {
  HANDSHAKE = 'handshake',
  KEY_EXCHANGE = 'key_exchange',
  DATA = 'data',
  PAYMENT = 'payment', // Phase 6
  ACK = 'ack',
  ERROR = 'error',
}
```

### P2P Types

```typescript
// src/types/p2p.ts

export interface PeerDevice {
  deviceId: string;
  publicKey: string;
  name: string;
  lastSeen: Date;
  rssi: number;
  isConnected: boolean;
  isTrusted: boolean; // User has approved this device
}

export interface ConnectionRequest {
  from: PeerDevice;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PeerSession {
  sessionId: string;
  peer: PeerDevice;
  sharedSecret: string; // ECDH shared secret
  establishedAt: Date;
  expiresAt: Date;
}
```

---

## Implementation Tasks

### 1. BLE Manager Service (Core Infrastructure)

**File**: `src/services/ble/BLEManager.ts`

**Purpose**: Central BLE management and lifecycle

**Key Features**:
- Initialize BLE manager
- Check BLE permissions and availability
- Manage BLE state (on/off, authorized)
- Handle BLE power state changes
- Cleanup and resource management

**Integration Points**:
- React Native BLE PLX library
- Platform permission systems
- Device hardware state

**Estimated Effort**: 6 hours

---

### 2. BLE Peripheral Service (Receiver Mode)

**File**: `src/services/ble/BLEPeripheralService.ts`

**Purpose**: Advertise device as payment receiver

**Key Features**:
- Start/stop advertising
- Define service and characteristics UUIDs
- Broadcast device ID and public key
- Handle incoming connection requests
- Manage connected centrals
- Receive and decrypt messages

**BLE Service Structure**:
```
Service UUID: "A0B1C2D3-E4F5-6789-ABCD-EF0123456789"
├── Device ID Characteristic (Read)
├── Public Key Characteristic (Read)
└── Data Characteristic (Write, Notify)
```

**Estimated Effort**: 10 hours

---

### 3. BLE Central Service (Sender Mode)

**File**: `src/services/ble/BLECentralService.ts`

**Purpose**: Scan for and connect to peer devices

**Key Features**:
- Start/stop scanning for peripherals
- Filter devices by service UUID
- Read device ID and public key from peripherals
- Initiate connections
- Send encrypted messages
- Handle connection events (connect/disconnect)

**Estimated Effort**: 10 hours

---

### 4. BLE Protocol Implementation

**File**: `src/services/ble/BLEProtocol.ts`

**Purpose**: Define message format and protocol rules

**Key Features**:
- Message serialization/deserialization
- Protocol version management
- Message type handling
- Payload size limits (BLE has 512-byte MTU)
- Message fragmentation for large payloads
- Reassembly logic

**Message Format**:
```typescript
interface BLEProtocolMessage {
  version: number; // Protocol version (1)
  type: MessageType;
  sequence: number; // For fragmented messages
  totalFragments: number;
  payload: string; // Base64 encrypted data
  signature: string; // Hardware signature
  timestamp: number;
}
```

**Estimated Effort**: 8 hours

---

### 5. BLE Encryption Service

**File**: `src/services/ble/BLEEncryption.ts`

**Purpose**: Encrypt BLE messages using Phase 4 hardware security

**Key Features**:
- ECDH key exchange using hardware keys
- Derive shared secret from ECDH
- AES-256-GCM encryption for messages
- Sign messages with hardware private key
- Verify signatures with peer public key
- Key rotation policies

**Integration with Phase 4**:
```typescript
// Use hardware keys from KeyManagementService
import { KeyManagementService, KeyIds } from '../security/KeyManagementService';
import { SigningService } from '../security/SigningService';
import { EncryptionService } from '../security/EncryptionService';

// ECDH key exchange
const myPrivateKey = await getHardwareKey(KeyIds.TRANSACTION_SIGNING);
const peerPublicKey = readFrom BLECharacteristic;
const sharedSecret = await performECDH(myPrivateKey, peerPublicKey);

// Encrypt message
const encrypted = await AES_GCM_encrypt(message, sharedSecret);

// Sign with hardware key
const signature = await SigningService.sign(KeyIds.TRANSACTION_SIGNING, encrypted);
```

**Estimated Effort**: 12 hours

---

### 6. Peer Discovery Service

**File**: `src/services/p2p/PeerDiscoveryService.ts`

**Purpose**: Discover, track, and manage peer devices

**Key Features**:
- Maintain list of discovered peers
- Track RSSI (signal strength) for proximity
- Filter by device capabilities
- Persistent peer storage (trusted devices)
- Peer reputation/trust scoring
- Remove stale peers (not seen in X minutes)

**Estimated Effort**: 6 hours

---

### 7. Connection Manager

**File**: `src/services/p2p/ConnectionManager.ts`

**Purpose**: Manage lifecycle of peer connections

**Key Features**:
- Initiate connections to peers
- Handle connection approval flow
- Maintain active connection pool
- Connection timeout handling
- Reconnection logic
- Graceful disconnection
- Connection quality monitoring

**Connection Lifecycle**:
```
1. DISCOVERED → Peer found via BLE scan
2. CONNECTING → Initiating BLE connection
3. CONNECTED → BLE link established
4. KEY_EXCHANGE → Performing ECDH
5. AUTHENTICATED → Secure channel ready
6. ACTIVE → Ready for data transfer
```

**Estimated Effort**: 10 hours

---

### 8. Message Protocol Service

**File**: `src/services/p2p/MessageProtocol.ts`

**Purpose**: High-level message sending/receiving

**Key Features**:
- Send messages to connected peers
- Receive and decrypt messages
- Message queue management
- Delivery confirmation (ACK/NACK)
- Message retry logic
- Timeout handling
- Message history persistence

**Estimated Effort**: 8 hours

---

## UI Components

### 1. BLE Status Indicator

**File**: `src/components/ble/BLEStatus.tsx`

**Purpose**: Show BLE status and permission state

**Features**:
- Bluetooth on/off indicator
- Permission status
- Active connections count
- Connection quality indicator

**Estimated Effort**: 3 hours

---

### 2. Device Scanner

**File**: `src/components/ble/DeviceScanner.tsx`

**Purpose**: Scan and display nearby devices

**Features**:
- Start/stop scanning button
- Real-time device list
- Signal strength (RSSI) bars
- Device info (ID, name, public key)
- Connect button
- Pull-to-refresh

**Estimated Effort**: 5 hours

---

### 3. Peer Device List

**File**: `src/components/ble/PeerDeviceList.tsx`

**Purpose**: Display discovered and trusted peers

**Features**:
- List of nearby devices
- Connection status for each
- Last seen timestamp
- Trust indicator (checkmark)
- Swipe actions (connect, trust, block)

**Estimated Effort**: 4 hours

---

### 4. Connection Indicator

**File**: `src/components/ble/ConnectionIndicator.tsx`

**Purpose**: Show real-time connection status

**Features**:
- Connection state animation
- Signal strength
- Encryption status
- Disconnect button

**Estimated Effort**: 3 hours

---

## Screens

### 1. Peer Discovery Screen

**File**: `src/screens/PeerDiscoveryScreen.tsx`

**Purpose**: Main screen for finding peers

**Layout**:
- Header with BLE status
- Scan button (start/stop)
- List of discovered devices
- Active connections section
- Settings button

**Estimated Effort**: 6 hours

---

### 2. Connection Screen

**File**: `src/screens/ConnectionScreen.tsx`

**Purpose**: Manage individual peer connection

**Layout**:
- Peer device info
- Connection status
- Signal strength graph
- Encryption indicator
- Test message button (for Phase 5)
- Disconnect button

**Estimated Effort**: 5 hours

---

### 3. BLE Settings Screen

**File**: `src/screens/BLESettingsScreen.tsx`

**Purpose**: Configure BLE behavior

**Settings**:
- Enable/disable BLE
- Advertising name
- Auto-accept connections toggle
- Connection timeout
- Trusted devices list
- Clear peer history

**Estimated Effort**: 4 hours

---

## State Management

### BLE Store

**File**: `src/stores/bleStore.ts`

```typescript
interface BLEState {
  isEnabled: boolean;
  isScanning: boolean;
  isAdvertising: boolean;
  mode: BLEMode;
  connections: BLEConnection[];
  error: string | null;
}

interface BLEActions {
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  startAdvertising: () => Promise<void>;
  stopAdvertising: () => void;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnect: (deviceId: string) => Promise<void>;
  sendMessage: (deviceId: string, message: BLEMessage) => Promise<void>;
}
```

**Estimated Effort**: 4 hours

---

### Peer Store

**File**: `src/stores/peerStore.ts`

```typescript
interface PeerState {
  discoveredPeers: PeerDevice[];
  trustedPeers: PeerDevice[];
  activeSessions: PeerSession[];
  pendingRequests: ConnectionRequest[];
}

interface PeerActions {
  addPeer: (peer: PeerDevice) => void;
  removePeer: (deviceId: string) => void;
  trustPeer: (deviceId: string) => void;
  untrustPeer: (deviceId: string) => void;
  approveConnection: (deviceId: string) => void;
  rejectConnection: (deviceId: string) => void;
}
```

**Estimated Effort**: 3 hours

---

## Testing Strategy

### Unit Tests

1. **BLE Protocol Tests**
   - Message serialization/deserialization
   - Fragmentation and reassembly
   - Protocol version handling

2. **Encryption Tests**
   - ECDH key exchange
   - AES-GCM encryption/decryption
   - Signature verification

3. **Message Queue Tests**
   - Message ordering
   - Retry logic
   - Timeout handling

**Estimated Effort**: 8 hours

---

### Integration Tests

1. **BLE Communication Tests**
   - Peripheral advertising
   - Central scanning
   - Connection establishment
   - Message transmission

2. **Multi-Device Tests**
   - Connect 2+ devices
   - Simultaneous connections
   - Message routing

**Estimated Effort**: 10 hours

---

### Manual Testing Checklist

#### Phase 5 Testing

- [ ] BLE permissions granted on iOS and Android
- [ ] Bluetooth can be enabled/disabled
- [ ] Device appears in scan results on peer device
- [ ] Can read device ID from peripheral
- [ ] Can read public key from peripheral
- [ ] Connection established successfully
- [ ] ECDH key exchange completes
- [ ] Messages encrypted and decrypted correctly
- [ ] Signatures verified correctly
- [ ] Can send text messages between devices
- [ ] Messages received in correct order
- [ ] Connection survives app backgrounding
- [ ] Reconnection works after disconnect
- [ ] Multiple simultaneous connections work
- [ ] Signal strength (RSSI) updates correctly
- [ ] Connection gracefully handles low signal
- [ ] Trusted devices persist across app restarts
- [ ] Can untrust and re-trust devices

---

## Security Considerations

### BLE Security

1. **Pairing and Authentication**
   - Use ECDH with hardware keys (Phase 4)
   - Verify peer public key authenticity
   - Implement challenge-response for pairing
   - Prevent MITM attacks

2. **Message Encryption**
   - AES-256-GCM for all messages
   - Hardware-signed messages
   - Replay attack prevention (timestamp + nonce)
   - Forward secrecy (rotate session keys)

3. **Privacy**
   - Randomize BLE MAC address (iOS automatic, Android needs implementation)
   - Don't broadcast sensitive data in advertisement
   - Use ephemeral identifiers for discovery

4. **Access Control**
   - Whitelist/blacklist trusted devices
   - User approval for first connection
   - Rate limiting for connection requests
   - Timeout inactive connections

---

## Performance Considerations

### BLE Optimization

1. **Battery Life**
   - Use low-power scanning intervals
   - Stop scanning when not needed
   - Limit advertising frequency
   - Batch message transmissions

2. **Connection Management**
   - Limit maximum concurrent connections (3-5)
   - Prioritize connections by signal strength
   - Disconnect idle connections
   - Use connection pooling

3. **Data Transmission**
   - Compress payloads before encryption
   - Fragment large messages efficiently
   - Use write-without-response for non-critical data
   - Batch small messages together

---

## Integration with Phase 4 (Hardware Security)

Phase 5 builds directly on Phase 4's hardware security:

### Key Usage

1. **Device Identity**
   - Use `KeyIds.DEVICE_MASTER` for device identity broadcast
   - Advertise public key via BLE characteristic

2. **Message Signing**
   - Use `KeyIds.TRANSACTION_SIGNING` for all BLE messages
   - Sign every message with hardware private key
   - Verify peer signatures with their public key

3. **Encryption**
   - Perform ECDH using hardware keys
   - Derive AES session keys from ECDH shared secret
   - Encrypt all message payloads with AES-256-GCM

### Security Flow

```
1. Device A advertises with publicKey_A
2. Device B scans and discovers Device A
3. Device B reads publicKey_A from BLE characteristic
4. Device B connects to Device A
5. Device B performs ECDH(privateKey_B, publicKey_A) → sharedSecret
6. Device A performs ECDH(privateKey_A, publicKey_B) → sharedSecret
7. Both derive sessionKey = HKDF(sharedSecret)
8. All messages encrypted with sessionKey
9. All messages signed with hardware private key
```

---

## Preparation for Phase 6 (P2P Payments)

Phase 5 provides the foundation for Phase 6:

### What Phase 6 Will Add

1. **Payment Protocol**
   - Payment request messages
   - Payment confirmation
   - Transaction receipts
   - Balance verification

2. **Payment Flow**
   ```
   Phase 5: Secure BLE channel ✓
   Phase 6: Send payment request → verify balance → sign transaction → send payment
   ```

3. **Message Types for Phase 6**
   - `PAYMENT_REQUEST`
   - `PAYMENT_RESPONSE`
   - `TRANSACTION_SIGNED`
   - `PAYMENT_COMPLETE`

---

## Effort Estimation

### Development Tasks

| Task | Hours |
|------|-------|
| BLE Manager Service | 6 |
| BLE Peripheral Service | 10 |
| BLE Central Service | 10 |
| BLE Protocol | 8 |
| BLE Encryption | 12 |
| Peer Discovery Service | 6 |
| Connection Manager | 10 |
| Message Protocol | 8 |
| **Subtotal Services** | **70** |
| BLE Status Component | 3 |
| Device Scanner Component | 5 |
| Peer Device List Component | 4 |
| Connection Indicator Component | 3 |
| **Subtotal Components** | **15** |
| Peer Discovery Screen | 6 |
| Connection Screen | 5 |
| BLE Settings Screen | 4 |
| **Subtotal Screens** | **15** |
| BLE Store | 4 |
| Peer Store | 3 |
| **Subtotal State** | **7** |
| Unit Tests | 8 |
| Integration Tests | 10 |
| **Subtotal Testing** | **18** |
| Documentation | 5 |
| **TOTAL** | **130 hours** |

### Timeline

With 1 developer working 40 hours/week:
- **Duration**: ~3.25 weeks (round to **3-4 weeks**)

With 2 developers:
- **Duration**: ~2 weeks

---

## Dependencies

### Must Complete Before Phase 5

- ✅ Phase 1: Foundation & UI
- ✅ Phase 2: Balance Management
- ✅ Phase 3: Device Identity & Security
- ✅ Phase 4: Hardware Security Integration

### Blocking for Phase 6

- ❌ Phase 5 must be complete before Phase 6 (Secure P2P Payment Protocol)

---

## Success Criteria

Phase 5 is complete when:

1. ✅ Two devices can discover each other via BLE
2. ✅ Devices can connect and establish secure channel
3. ✅ ECDH key exchange works using Phase 4 hardware keys
4. ✅ Messages are encrypted end-to-end with AES-256-GCM
5. ✅ Messages are signed with hardware private keys
6. ✅ Signature verification works correctly
7. ✅ Can send/receive text messages reliably
8. ✅ Connection survives app backgrounding
9. ✅ Multiple simultaneous connections work
10. ✅ All tests pass (unit + integration)
11. ✅ Phase 5 documentation complete
12. ✅ Ready for Phase 6 (P2P Payment Protocol)

---

## Next Steps

After Phase 5 completion:

1. Code review and security audit
2. Performance optimization
3. Battery life testing
4. Multi-device stress testing
5. Begin Phase 6: Secure P2P Payment Protocol

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| BLE range limitations (10-30m) | Use signal strength indicators, warn users |
| Connection instability | Implement robust reconnection logic |
| iOS/Android BLE behavior differences | Test on both platforms early |
| Battery drain | Use low-power modes, limit scanning |
| Message delivery failures | Implement retry logic and ACKs |
| Concurrent connection limits | Limit to 3-5 simultaneous connections |

### Security Risks

| Risk | Mitigation |
|------|------------|
| MITM attacks | Use ECDH with hardware keys, verify signatures |
| Replay attacks | Include timestamp and nonce in messages |
| Eavesdropping | Encrypt all messages with AES-256-GCM |
| Impersonation | Verify public keys, use trusted device list |

---

## References

- [React Native BLE PLX Documentation](https://github.com/dotintent/react-native-ble-plx)
- [iOS Core Bluetooth Framework](https://developer.apple.com/documentation/corebluetooth)
- [Android BLE Guide](https://developer.android.com/guide/topics/connectivity/bluetooth-le)
- [BLE GATT Services](https://www.bluetooth.com/specifications/gatt/)
- [ECDH Key Exchange](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman)
