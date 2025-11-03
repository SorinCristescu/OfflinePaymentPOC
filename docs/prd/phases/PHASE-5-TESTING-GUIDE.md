# Phase 5 Testing Guide: BLE Communication

## Overview

Phase 5 implements **Bluetooth Low Energy (BLE)** peer-to-peer communication with:
- **Peer Discovery** - Find nearby devices using BLE advertising
- **Connections** - Establish and manage BLE connections
- **Messaging** - Send and receive messages over BLE

## Testing Requirements

### Single Device Testing (Limited)
- ✅ Test UI and navigation
- ✅ Test BLE initialization
- ✅ Test permissions
- ❌ Cannot test peer discovery (no peers to find)
- ❌ Cannot test connections
- ❌ Cannot test messaging

### Two Device Testing (Full)
- ✅ Test complete BLE functionality
- ✅ Test peer discovery and advertising
- ✅ Test connection establishment
- ✅ Test message exchange
- ✅ Test trust/block features

**Recommended**: Use **two physical iPhones** for complete testing.

---

## Prerequisites

### 1. Install App on Device(s)

```bash
# On your Mac, deploy to iPhone
npm run ios -- --device "Your iPhone Name"
```

### 2. Ensure Bluetooth is Enabled

On each iPhone:
1. Settings → Bluetooth → Enable
2. Ensure Bluetooth is "On"

### 3. Grant Permissions

The app will request:
- Bluetooth permissions
- Location permissions (required for BLE scanning on iOS)

---

## Test Plan: Single Device

### Test 1: Navigation and UI

**Steps**:
1. Launch app on iPhone
2. From Home Screen, tap **"Peer Discovery"** button
3. Verify you see the Peer Discovery screen

**Expected Result**:
```
┌─────────────────────────────┐
│  Peer Discovery             │
├─────────────────────────────┤
│                             │
│  [BLE Status Card]          │
│  Status: Initializing       │
│                             │
│  [Connection Indicator]     │
│  No devices connected       │
│                             │
│  [Device Scanner]           │
│  [Start Discovery] button   │
│                             │
│  [Peer Device List]         │
│  "No devices found..."      │
│                             │
└─────────────────────────────┘
```

### Test 2: BLE Initialization

**Steps**:
1. On Peer Discovery screen, wait 2-3 seconds
2. Observe BLE Status card

**Expected Result**:
- Status changes to: "Ready" or "Bluetooth Enabled"
- Green indicator shows BLE is working
- Console log: `[BLEStore] Initialized successfully`

**If Permission Prompt Appears**:
```
"OfflinePaymentPOC Would Like to Use Bluetooth"
[Don't Allow] [OK]
```
- Tap **OK** to grant permission

### Test 3: Start Discovery (No Peers)

**Steps**:
1. Tap **"Start Discovery"** button
2. Observe scanning state

**Expected Result**:
- Button changes to **"Stop Discovery"**
- Scanning indicator shows active
- Device List remains empty (no peers nearby)
- Console log: `[BLEStore] Starting discovery...`

### Test 4: Settings Navigation

**Steps**:
1. From Peer Discovery screen, look for settings button (if available)
2. Or navigate via React Navigation DevTools

**Expected Result**:
- Can access BLE Settings screen
- Shows BLE configuration options

### Test 5: Connection Screen (No Connection)

**Steps**:
1. Try to access Connection screen (via deep link or direct navigation)

**Expected Result**:
- Shows "No connection" or "Not connected" state

---

## Test Plan: Two Devices (RECOMMENDED)

### Setup

**Device A** (Sender): Your primary iPhone
**Device B** (Receiver): Your secondary iPhone

Both devices must:
- Have app installed
- Have Bluetooth enabled
- Be physically near each other (within 10 meters)

---

### Test 6: Peer Discovery (Two Devices)

**Steps on Device A**:
1. Launch app → Tap "Peer Discovery"
2. Wait for BLE to initialize (2-3 seconds)
3. Tap **"Start Discovery"** button
4. Observe device list

**Steps on Device B**:
1. Launch app → Tap "Peer Discovery"
2. Wait for BLE to initialize
3. Tap **"Start Discovery"** button
4. Observe device list

**Expected Result**:

**Device A shows**:
```
┌─────────────────────────────┐
│  Nearby Devices (1)         │
├─────────────────────────────┤
│  📱 iPhone (Device B)       │
│     Last seen: Just now     │
│     Signal: Strong          │
│     [Connect]               │
└─────────────────────────────┘
```

**Device B shows**:
```
┌─────────────────────────────┐
│  Nearby Devices (1)         │
├─────────────────────────────┤
│  📱 iPhone (Device A)       │
│     Last seen: Just now     │
│     Signal: Strong          │
│     [Connect]               │
└─────────────────────────────┘
```

**Verification**:
- ✅ Both devices appear in each other's list
- ✅ Device names are shown
- ✅ Signal strength indicator shows
- ✅ "Connect" button is available

**Console Logs**:
```
[BLEStore] Starting discovery...
[BLEStore] Discovered device: <peer-device-id>
[PeerStore] Added new peer: <peer-name>
```

### Test 7: Device Connection

**Steps on Device A**:
1. In device list, tap on "iPhone (Device B)"
2. In alert dialog, tap **"Connect"**
3. Observe connection status

**Steps on Device B**:
1. Watch for connection notification or status change
2. Verify device appears as connected

**Expected Result**:

**Device A shows**:
```
Alert: "Success"
Message: "Connected to iPhone (Device B)"

Device List:
┌─────────────────────────────┐
│  📱 iPhone (Device B)       │
│     ✅ Connected            │
│     Signal: Strong          │
└─────────────────────────────┘

Connection Indicator (top):
"1 device connected"
```

**Device B shows**:
```
Device List:
┌─────────────────────────────┐
│  📱 iPhone (Device A)       │
│     ✅ Connected            │
│     Signal: Strong          │
└─────────────────────────────┘

Connection Indicator (top):
"1 device connected"
```

**Verification**:
- ✅ Alert confirms connection
- ✅ Device shows "Connected" status
- ✅ Connection indicator updates
- ✅ Green checkmark or indicator shows

**Console Logs**:
```
[BLEStore] Connecting to peer: <device-id>
[BLEStore] Connected to peer: <device-id>
[PeerStore] Peer connected: <device-id>
```

### Test 8: View Connection Details

**Steps on Device A**:
1. Tap on connected device "iPhone (Device B)"
2. In alert dialog, tap **"View Connection"**
3. Observe Connection screen

**Expected Result**:
```
┌─────────────────────────────┐
│  Connection                 │
│  iPhone (Device B)          │
├─────────────────────────────┤
│                             │
│  [Connection Info]          │
│  Status: Connected          │
│  Signal Strength: -45 dBm   │
│  Connection Time: 00:01:23  │
│                             │
│  [Message Input]            │
│  [Type message...]          │
│  [Send]                     │
│                             │
│  [Message History]          │
│  (No messages yet)          │
│                             │
└─────────────────────────────┘
```

**Verification**:
- ✅ Connection screen loads
- ✅ Shows connection details
- ✅ Message input is available
- ✅ Can return to Peer Discovery

### Test 9: Send Message

**Steps on Device A** (Connection Screen):
1. In message input field, type: "Hello from Device A"
2. Tap **"Send"** button
3. Observe message in history

**Steps on Device B**:
1. Navigate to Connection screen with Device A
2. Or observe message notification
3. Check message history

**Expected Result**:

**Device A shows**:
```
Message History:
┌─────────────────────────────┐
│  You (12:34 PM)             │
│  Hello from Device A        │
│                             │
└─────────────────────────────┘
```

**Device B shows**:
```
Message History:
┌─────────────────────────────┐
│  iPhone (Device A)          │
│  12:34 PM                   │
│  Hello from Device A        │
│                             │
└─────────────────────────────┘
```

**Verification**:
- ✅ Message appears in sender's history
- ✅ Message appears in receiver's history
- ✅ Timestamp shows correctly
- ✅ Message content is correct

**Console Logs**:
```
[BLEStore] Sending message to: <device-id>
[BLEStore] Message sent: <message-id>
[BLEStore] Message received from: <device-id>
```

### Test 10: Bidirectional Messaging

**Steps**:
1. **Device B**: Reply with "Hello from Device B"
2. **Device A**: Send another message
3. **Device B**: Send another message
4. Verify both devices show complete conversation

**Expected Result**:
```
Message History (Both Devices):
┌─────────────────────────────┐
│  Device A (12:34 PM)        │
│  Hello from Device A        │
│                             │
│  Device B (12:35 PM)        │
│  Hello from Device B        │
│                             │
│  Device A (12:36 PM)        │
│  Got it!                    │
│                             │
│  Device B (12:37 PM)        │
│  Great!                     │
└─────────────────────────────┘
```

**Verification**:
- ✅ Messages appear in chronological order
- ✅ Sender identification is correct
- ✅ All messages delivered successfully
- ✅ No message loss or duplication

### Test 11: Trust Device

**Steps on Device A**:
1. From Peer Discovery screen, tap on "iPhone (Device B)"
2. In alert dialog, tap **"Trust Device"**
3. Confirm trust action

**Expected Result**:
```
Alert: "Success"
Message: "iPhone (Device B) is now trusted"

Device List:
┌─────────────────────────────┐
│  📱 iPhone (Device B)       │
│     ✅ Connected            │
│     🔒 Trusted              │
│     Signal: Strong          │
└─────────────────────────────┘
```

**Verification**:
- ✅ Trust indicator shows (lock icon or badge)
- ✅ Alert confirms trust
- ✅ Device remains in trusted state after reconnect

### Test 12: Disconnect

**Steps on Device A**:
1. From Peer Discovery screen, tap on "iPhone (Device B)"
2. In alert dialog, tap **"Disconnect"**
3. Observe disconnection

**Expected Result**:

**Device A shows**:
```
Alert: "Success"
Message: "Disconnected from iPhone (Device B)"

Device List:
┌─────────────────────────────┐
│  📱 iPhone (Device B)       │
│     🔒 Trusted              │
│     Signal: Strong          │
│     [Connect]               │
└─────────────────────────────┘

Connection Indicator:
"No devices connected"
```

**Device B shows**:
```
Device List:
┌─────────────────────────────┐
│  📱 iPhone (Device A)       │
│     Signal: Strong          │
│     [Connect]               │
└─────────────────────────────┘

Connection Indicator:
"No devices connected"
```

**Verification**:
- ✅ Alert confirms disconnection
- ✅ Connection indicator updates
- ✅ Device still appears in discovery list
- ✅ Can reconnect

**Console Logs**:
```
[BLEStore] Disconnecting from peer: <device-id>
[BLEStore] Disconnected from peer: <device-id>
[PeerStore] Peer disconnected: <device-id>
```

### Test 13: Reconnect

**Steps on Device A**:
1. Tap on "iPhone (Device B)" again
2. Tap **"Connect"**
3. Verify connection re-establishes

**Expected Result**:
- ✅ Connection successful
- ✅ Trust status preserved
- ✅ Previous message history available
- ✅ Can send new messages

### Test 14: Block Device

**Steps on Device A**:
1. From Peer Discovery screen, tap on "iPhone (Device B)"
2. Tap **"Block Device"**
3. Confirm block action

**Expected Result**:
```
Alert: "Block Device"
Message: "Are you sure you want to block iPhone (Device B)?"
[Cancel] [Block]

After confirming:

Alert: "Success"
Message: "iPhone (Device B) has been blocked"

Device List:
(Device B no longer appears)
```

**Verification**:
- ✅ Device disappears from list
- ✅ Device cannot reconnect
- ✅ Block status persists after app restart

### Test 15: Distance Testing

**Steps**:
1. Start with both devices close (1 meter)
2. Verify connection is stable
3. Move devices apart gradually (5m, 10m, 15m)
4. Observe signal strength and connection status

**Expected Result**:
- ✅ Signal strength decreases with distance
- ✅ Connection maintained up to ~10 meters
- ✅ Connection drops beyond BLE range
- ✅ Auto-reconnect when devices come back in range

### Test 16: Background Testing

**Steps**:
1. Establish connection between devices
2. **Device A**: Switch to background (home button/swipe up)
3. **Device B**: Send message
4. **Device A**: Return to app
5. Verify message received

**Expected Result**:
- ✅ Message delivered while app in background
- ✅ Message appears when app returns to foreground
- ⚠️ Note: iOS limits background BLE operations

### Test 17: App Restart

**Steps**:
1. Establish connection and trust between devices
2. Close app completely (force quit)
3. Relaunch app
4. Navigate to Peer Discovery
5. Start discovery

**Expected Result**:
- ✅ Trusted devices remembered
- ✅ Can reconnect to previously trusted devices
- ✅ Message history preserved (if stored)
- ✅ Block list persists

---

## Error Scenarios

### Error Test 1: Bluetooth Disabled

**Steps**:
1. Disable Bluetooth in iOS Settings
2. Launch app and navigate to Peer Discovery

**Expected Result**:
```
[BLE Status Card]
⚠️ Bluetooth Disabled
"Please enable Bluetooth to discover devices"
[Open Settings] button
```

### Error Test 2: Permissions Denied

**Steps**:
1. Deny Bluetooth permission when prompted
2. Try to start discovery

**Expected Result**:
```
Alert: "Permission Required"
Message: "Bluetooth permission is required for peer discovery"
[Cancel] [Open Settings]
```

### Error Test 3: Connection Timeout

**Steps**:
1. Start connection to a device
2. Move device out of range immediately
3. Observe connection failure

**Expected Result**:
```
Alert: "Error"
Message: "Connection timeout - device out of range"
```

### Error Test 4: Message Send Failure

**Steps**:
1. Establish connection
2. Send message
3. Immediately move devices far apart
4. Observe message send failure

**Expected Result**:
- ❌ Message marked as failed
- 🔄 Retry option available
- ⚠️ Error notification shown

---

## Performance Testing

### Performance Test 1: Multiple Devices

**Requirements**: 3+ devices

**Steps**:
1. Set up 3 or more devices running the app
2. Start discovery on all devices
3. Verify all devices appear in each other's lists

**Expected Result**:
- ✅ All devices discovered
- ✅ Discovery time < 10 seconds
- ✅ No crashes or freezes

### Performance Test 2: Message Throughput

**Steps**:
1. Establish connection
2. Send 50 messages rapidly
3. Verify all messages delivered

**Expected Result**:
- ✅ All messages delivered
- ✅ Messages appear in correct order
- ✅ No message loss
- ⚠️ Some delay acceptable for large batches

### Performance Test 3: Battery Usage

**Steps**:
1. Start discovery and leave running for 30 minutes
2. Monitor battery usage in iOS Settings

**Expected Result**:
- ⚠️ Expected battery drain: 5-10% per hour during active discovery
- ✅ Battery usage should be acceptable for normal use

---

## Troubleshooting

### Issue: No Devices Found

**Possible Causes**:
- Bluetooth disabled on one or both devices
- Devices too far apart (> 10 meters)
- App not initialized properly
- Permissions not granted

**Solutions**:
1. Verify Bluetooth is enabled on both devices
2. Move devices closer (< 5 meters)
3. Restart app on both devices
4. Check permission settings

### Issue: Connection Fails

**Possible Causes**:
- Device out of range
- BLE connection limit reached (iOS limit: ~8 connections)
- Bluetooth interference

**Solutions**:
1. Move devices closer
2. Disconnect from other BLE devices
3. Restart Bluetooth
4. Restart both devices

### Issue: Messages Not Delivered

**Possible Causes**:
- Connection dropped
- App in background
- Message too large

**Solutions**:
1. Verify connection is still active
2. Bring app to foreground
3. Reduce message size
4. Reconnect devices

### Issue: Excessive Battery Drain

**Possible Causes**:
- Discovery running continuously
- Too many active connections

**Solutions**:
1. Stop discovery when not needed
2. Disconnect from unused devices
3. Limit active connections to 2-3

---

## Test Results Template

Use this template to record your test results:

```markdown
## Phase 5 Test Results

**Date**: ___________
**Tester**: ___________
**Devices Used**:
- Device A: iPhone ___ (iOS ___)
- Device B: iPhone ___ (iOS ___)

### Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Navigation and UI | ⚠️ / ✅ / ❌ | |
| 2 | BLE Initialization | ⚠️ / ✅ / ❌ | |
| 3 | Start Discovery | ⚠️ / ✅ / ❌ | |
| 6 | Peer Discovery (2 devices) | ⚠️ / ✅ / ❌ | |
| 7 | Device Connection | ⚠️ / ✅ / ❌ | |
| 8 | View Connection | ⚠️ / ✅ / ❌ | |
| 9 | Send Message | ⚠️ / ✅ / ❌ | |
| 10 | Bidirectional Messaging | ⚠️ / ✅ / ❌ | |
| 11 | Trust Device | ⚠️ / ✅ / ❌ | |
| 12 | Disconnect | ⚠️ / ✅ / ❌ | |
| 13 | Reconnect | ⚠️ / ✅ / ❌ | |
| 14 | Block Device | ⚠️ / ✅ / ❌ | |
| 15 | Distance Testing | ⚠️ / ✅ / ❌ | |
| 16 | Background Testing | ⚠️ / ✅ / ❌ | |
| 17 | App Restart | ⚠️ / ✅ / ❌ | |

### Issues Found

1.
2.
3.

### Overall Assessment

Phase 5 BLE Communication: ⚠️ / ✅ / ❌

**Summary**: ___________________________________________
```

---

## Quick Start Checklist

For quick testing, follow this minimal checklist:

**Single Device** (5 minutes):
- [ ] Navigate to Peer Discovery
- [ ] Verify BLE initializes
- [ ] Start/stop discovery
- [ ] Check permissions granted

**Two Devices** (15 minutes):
- [ ] Both devices discover each other
- [ ] Connect devices
- [ ] Send message from A to B
- [ ] Reply from B to A
- [ ] Disconnect and reconnect
- [ ] Test trust feature

**Complete Testing** (1-2 hours):
- [ ] Run all 17 tests
- [ ] Test all error scenarios
- [ ] Complete performance tests
- [ ] Document results

---

## Next Steps

After completing Phase 5 testing:

1. **Document Issues** - Record any bugs or issues found
2. **Test Phase 6** - Move on to offline payment testing
3. **Integration Testing** - Test BLE + Payments together
4. **Real-World Testing** - Test in various environments (outdoor, indoor, crowded areas)

For Phase 6 testing, see: [PHASE-6-TESTING-GUIDE.md](./PHASE-6-TESTING-GUIDE.md) (to be created)
