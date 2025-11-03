# Phase 5: BLE Communication Foundation - User Guide

## Overview

Phase 5 introduces peer-to-peer Bluetooth Low Energy (BLE) communication, enabling your device to discover, connect to, and exchange messages with nearby devices running the same app. This is the foundation for offline payment capabilities.

## Features

### 1. Peer Discovery
Discover nearby devices that are running the Offline Payment app.

### 2. Device Connection
Connect to discovered devices to establish secure peer-to-peer communication.

### 3. Trust Management
Mark devices as trusted for easier reconnection and enhanced security.

### 4. Message Exchange
Send and receive encrypted messages with connected peers.

### 5. Connection Health Monitoring
View real-time connection statistics and signal strength.

---

## Getting Started

### Prerequisites

**Bluetooth Permissions**
The app requires Bluetooth permissions to function. When you first launch the app:

1. iOS will prompt you to allow Bluetooth access
2. Tap "Allow" to enable BLE features
3. If you denied permission, go to Settings > Offline Payment > Bluetooth and enable it

**Location Permissions (Android)**
Android requires location permission for BLE scanning:
1. Grant "Location" permission when prompted
2. This is required by Android for BLE discovery (not used for actual location tracking)

---

## Using BLE Features

### Accessing Peer Discovery

1. Open the app
2. Navigate to **Settings** tab
3. Tap **"Peer Discovery"** or **"BLE Settings"** (depending on where you've added the navigation)

### Discovering Nearby Devices

**From the Peer Discovery Screen:**

1. The app automatically starts scanning when you open the screen
2. Nearby devices appear in the **"Discovered Devices"** list
3. Each device shows:
   - Device name
   - Signal strength (RSSI in dBm)
   - Proximity indicator (Excellent, Good, Weak, Poor)
   - Connection status

**Device Scanner Controls:**

- **Start Discovery**: Begin scanning for nearby devices
- **Stop Discovery**: Stop the scanning process
- **Scan Duration**: Default 10 seconds per scan

### Connecting to a Device

**Quick Connect (Long Press):**
1. Long-press on any discovered device
2. The app will connect or disconnect automatically

**Full Options (Single Tap):**
1. Tap on a device to see options:
   - **Connect**: Establish a BLE connection
   - **View Connection**: See detailed connection info (if already connected)
   - **Trust Device**: Mark as trusted for auto-reconnect
   - **Block Device**: Prevent future connections

### Managing Trusted Devices

**Trust a Device:**
1. Tap on a device
2. Select **"Trust Device"**
3. Trusted devices show a ★ (star) badge

**Remove Trust:**
1. Tap on a trusted device
2. Select **"Remove Trust"**

**Benefits of Trusting:**
- Auto-reconnect when in range
- Priority in connection queue
- Faster handshake process

### Viewing Connection Details

**Access Connection Screen:**
1. Tap on a connected device
2. Select **"View Connection"**

**Connection Information:**

- **Device Information**
  - Device name
  - Device ID (unique identifier)
  - Connection status

- **Signal Strength**
  - RSSI value in dBm
  - Proximity level (color-coded)
  - Visual signal bar

- **Session Information**
  - Session ID
  - Established time
  - Expiration time
  - Message count

- **Connection Health**
  - Messages sent
  - Messages received
  - Error count
  - Last heartbeat time
  - Missed heartbeats

**Actions:**
- **Send Test Message**: Test the connection
- **Trust/Untrust Device**: Toggle trust status
- **Disconnect**: End the connection
- **Block Device**: Prevent future connections

### Sending Test Messages

1. Open a device's Connection screen
2. Tap **"Send Test Message"**
3. A success notification confirms delivery
4. Message count increments in session info

---

## BLE Settings

### Accessing Settings

1. Navigate to Peer Discovery screen
2. Tap the settings icon or "BLE Settings"

### Statistics Dashboard

**View Real-Time Stats:**
- **Discovered**: Total discovered devices
- **Trusted**: Number of trusted devices
- **Connected**: Currently connected devices
- **Queue**: Pending messages in queue
- **Pending**: Messages awaiting acknowledgment

### Connection Settings

**Configurable Parameters:**

- **Max Connections**: 1-10 devices (default: 3)
  - Tap to edit
  - Enter new value (1-10)
  - Save changes

- **Connection Timeout**: 30 seconds (fixed)
- **Heartbeat Interval**: 10 seconds (fixed)
- **Reconnect Attempts**: 3 (fixed)
- **Reconnect Delay**: 5 seconds (fixed)
- **Auto-Reconnect**: Toggle on/off
  - Automatically reconnect to trusted devices
  - Reconnect after connection loss

### Platform Information

View your device's BLE capabilities:
- Platform (iOS/Android)
- API Level (Android only)

### Actions

**Clear Discovered Devices:**
1. Tap **"Clear Discovered Devices"**
2. Confirm the action
3. Clears non-trusted, non-connected devices

**Clear Message Queue:**
1. Tap **"Clear Message Queue"**
2. Confirm the action
3. Removes all pending messages (not sent)

**Disconnect All Devices:**
1. Tap **"Disconnect All Devices"**
2. Confirm the action
3. Disconnects from all connected devices

---

## Understanding Signal Strength

### RSSI Values (Received Signal Strength Indicator)

BLE signal strength is measured in dBm (decibel-milliwatts):

| RSSI Range | Proximity Level | Color | Distance |
|------------|----------------|-------|----------|
| > -50 dBm  | Excellent      | Green | < 1 meter |
| -50 to -70 dBm | Good      | Blue  | 1-3 meters |
| -70 to -90 dBm | Weak      | Orange | 3-10 meters |
| < -90 dBm  | Poor           | Red   | > 10 meters |

**Signal Strength Tips:**
- Closer proximity = stronger signal = better connection
- Obstacles (walls, metal) reduce signal strength
- Keep devices within 3-5 meters for optimal performance

---

## Connection States

### Device States

**Discovered:**
- Device found during scan
- Not connected
- Available for connection

**Connected:**
- Active BLE connection established
- Can exchange messages
- Session active

**Trusted:**
- Marked as trusted by user
- Auto-reconnect enabled (if setting is on)
- Higher connection priority

**Blocked:**
- Prevented from connecting
- Will not appear in device list
- Can be unblocked in settings (future feature)

---

## Troubleshooting

### BLE Not Working

**Check Bluetooth:**
1. Ensure Bluetooth is enabled in device settings
2. Toggle Bluetooth off and on
3. Restart the app

**Check Permissions:**
1. iOS: Settings > Offline Payment > Bluetooth
2. Android: Settings > Apps > Offline Payment > Permissions > Location

**Restart BLE Services:**
1. Force close the app
2. Reopen the app
3. BLE services reinitialize automatically

### No Devices Discovered

**Possible Causes:**
1. No nearby devices running the app
2. Other devices have Bluetooth disabled
3. Devices are out of range (> 10 meters)
4. Interference from other BLE devices

**Solutions:**
1. Move closer to other devices
2. Ensure other devices have the app open
3. Wait for scan to complete (10 seconds)
4. Tap "Start Discovery" to scan again

### Connection Fails

**Common Issues:**
1. Device moved out of range
2. Connection limit reached (max 3 by default)
3. Bluetooth interference
4. Device Bluetooth was disabled

**Solutions:**
1. Move closer to the device
2. Disconnect from other devices first
3. Increase max connections in settings
4. Retry the connection

### Messages Not Sending

**Check:**
1. Device is connected (green status)
2. Signal strength is Good or better
3. Message queue isn't full (check settings)

**Fix:**
1. Clear message queue if full
2. Disconnect and reconnect
3. Send test message to verify connection

### Auto-Reconnect Not Working

**Ensure:**
1. Device is marked as Trusted (★ badge)
2. Auto-Reconnect is enabled in settings
3. Device is within range
4. App is running (foreground or background)

**Note:** iOS may limit background BLE operations

---

## Best Practices

### For Optimal Performance

1. **Stay Within Range**
   - Keep devices within 3-5 meters
   - Avoid obstacles between devices

2. **Trust Regular Contacts**
   - Mark frequently used devices as trusted
   - Enables auto-reconnect

3. **Manage Connections**
   - Disconnect when not in use
   - Don't exceed max connection limit
   - Monitor connection health

4. **Monitor Signal Strength**
   - Check signal bars in connection view
   - Move closer if signal is Weak or Poor

5. **Keep App Updated**
   - New versions may improve BLE stability
   - Update when prompted

### Security Best Practices

1. **Only Trust Known Devices**
   - Verify device identity before trusting
   - Don't trust unknown devices

2. **Block Suspicious Devices**
   - Block devices attempting unwanted connections
   - Review blocked devices periodically

3. **Monitor Connection Activity**
   - Check connection health regularly
   - Watch for unusual message counts

4. **Use Test Messages**
   - Verify connections before important transactions
   - Test connectivity in new environments

---

## Privacy & Security

### What Data is Shared

**Device Information:**
- Device ID (cryptographic hash, not personal info)
- Device name (can be set by user)
- Public key (for encryption)

**Connection Metadata:**
- RSSI (signal strength)
- Connection timestamps
- Message counts

**NOT Shared:**
- Personal information
- Location data
- Contacts or other app data
- Device identifiers (IMEI, phone number)

### Encryption

- All messages are encrypted end-to-end
- Uses public key cryptography
- Session keys rotated regularly
- Messages signed for authenticity

### Bluetooth Privacy

- Device ID is pseudonymous
- Changing device ID available in future updates
- BLE advertising data is minimal
- No personal identifiers in BLE packets

---

## Limitations

### Current Limitations (Phase 5)

1. **Message Types:**
   - Currently supports test messages only
   - Payment messages coming in future phases

2. **Connection Limits:**
   - Maximum 10 simultaneous connections
   - Default: 3 connections

3. **Range:**
   - Typical BLE range: 10-30 meters
   - Reduced by obstacles and interference

4. **Battery Impact:**
   - Active scanning uses battery
   - Multiple connections drain battery faster
   - Background operation limited by OS

5. **Platform Differences:**
   - iOS limits background BLE
   - Android requires location permission
   - Feature parity across platforms ongoing

---

## FAQ

**Q: Why does the app need Bluetooth permission?**
A: Bluetooth is required for peer-to-peer device discovery and communication for offline payments.

**Q: Why does Android need location permission?**
A: Android requires location permission for BLE scanning. We don't actually access your location.

**Q: How many devices can I connect to?**
A: Default is 3 devices, configurable up to 10 in BLE Settings.

**Q: Will this work without internet?**
A: Yes! BLE works completely offline, no internet required.

**Q: Does this drain my battery?**
A: Active scanning uses battery. Minimize by stopping discovery when not needed.

**Q: Can I rename my device?**
A: Device naming customization coming in future updates.

**Q: How secure is the connection?**
A: All communications are end-to-end encrypted using public key cryptography.

**Q: What happens if connection is lost?**
A: If auto-reconnect is enabled and device is trusted, the app automatically reconnects when in range.

**Q: Can I see message history?**
A: Message history and logging coming in future phases.

---

## Support

For issues or questions:
1. Check this guide
2. Review troubleshooting section
3. Check app logs for error messages
4. Contact support with:
   - Device model and OS version
   - Steps to reproduce issue
   - Error messages or screenshots

---

## Version Information

- **Phase**: 5 - BLE Communication Foundation
- **Version**: 1.0.0
- **Last Updated**: November 2025
- **Compatibility**: iOS 13+, Android 8.0+
