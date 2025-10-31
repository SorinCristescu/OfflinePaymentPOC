# Testing Hardware Encryption

This guide explains how to test and verify that your wallet balance and transaction data are encrypted and protected by hardware (iOS Secure Enclave).

## Prerequisites

- Physical iOS device with Secure Enclave (iPhone 5s or newer)
- App installed on device
- Some wallet balance (transfer funds online to offline)

## Test Methods

### Method 1: Using the Hardware Security Test Screen

The app includes a dedicated test screen to verify hardware encryption:

1. **Navigate to Hardware Test Screen**
   - Open the app
   - Go to Settings → Hardware Security Test

2. **Initialize Hardware Keys**
   - Tap "Initialize Device Keys"
   - Confirm biometric authentication if prompted
   - Verify you see confirmation of key generation

3. **Test Wallet Encryption**
   - Tap "Test Wallet Encryption"
   - This will:
     - Read raw encrypted data from storage
     - Decrypt it using the hardware key
     - Show both encrypted and decrypted values

   **What you'll see:**
   ```
   ENCRYPTED STORAGE (unreadable):
   eyJhbGc...random characters...

   DECRYPTED WITH HARDWARE KEY:
   Online: $100.00
   Offline: $50.00

   This proves:
   1. Data is encrypted in storage
   2. Only readable with Secure Enclave key
   3. Hardware-backed protection active
   ```

4. **Verify Hardware Keys**
   - Tap "Verify Hardware Keys"
   - Check that all three keys exist in Secure Enclave:
     - Device Master Key (used for wallet encryption)
     - Transaction Signing Key
     - Payment Encryption Key

   **Expected output:**
   ```
   Device Master:
   Exists: Yes
   Biometric: No
   Key: MIIBIjANBgkq...

   Transaction Signing:
   Exists: Yes
   Biometric: Yes
   Key: MIIBIjANBgkq...
   ```

5. **Show Storage Comparison**
   - Tap "Show Storage Comparison"
   - See all storage keys and their contents
   - Verify "Encrypted Wallet" contains encrypted data

### Method 2: Using Console Logs

The app logs detailed encryption operations to the console:

1. **Connect Device to Mac**
   - Open Xcode
   - Window → Devices and Simulators
   - Select your device
   - Click "Open Console"

2. **Look for Encryption Logs**

   When wallet initializes:
   ```
   [BalanceService] Initializing wallet...
   [BalanceService] Found encrypted wallet, decrypting...
   [BalanceService] Wallet decrypted successfully
   ```

   When wallet is saved:
   ```
   [BalanceService] Saving wallet with hardware encryption...
   [BalanceService] Wallet encrypted and saved successfully
   ```

   When biometric auth happens:
   ```
   [BiometricService] Authenticating with hardware key: DEVICE_MASTER
   [BiometricService] Hardware-verified authentication successful
   ```

3. **Verify Hardware Key Operations**
   ```
   [KeyManagementService] Generating key pair: DEVICE_MASTER
   [SMVCSecurityModule] Generated key in Secure Enclave
   [KeyManagementService] Key exists: DEVICE_MASTER = true
   ```

### Method 3: Direct Storage Inspection

You can manually inspect the encrypted storage:

1. **Install React Native Debugger or Flipper**

2. **Inspect AsyncStorage**
   - Open debugger
   - Find AsyncStorage entries
   - Look for key: `@smvc_encrypted_wallet`

3. **Verify Encryption**
   - The value should look like: `eyJhbGciOiJFQ0RILVBTK0EyNTZLVyIs...`
   - This is Base64-encoded encrypted data
   - **It should NOT be readable JSON**
   - If you see plain JSON like `{"onlineBalance":100000}`, encryption is NOT working

4. **Compare with Legacy Storage**
   - Old plaintext key: `@smvc_wallet` should be empty or deleted
   - New encrypted key: `@smvc_encrypted_wallet` should have encrypted data

## What Each Test Proves

### Test Wallet Encryption Proves:
1. ✅ Wallet balance is encrypted before storage
2. ✅ Encrypted data is unreadable without hardware key
3. ✅ Only the Secure Enclave key can decrypt the data
4. ✅ Balance values are protected at rest

### Verify Hardware Keys Proves:
1. ✅ Keys exist in iOS Secure Enclave
2. ✅ Keys are hardware-backed (not software keys)
3. ✅ Some keys are biometric-bound (require Face ID/Touch ID)
4. ✅ Public keys can be exported, private keys cannot

### Storage Comparison Proves:
1. ✅ Legacy plaintext storage is migrated
2. ✅ New storage contains encrypted data
3. ✅ Multiple keys use hardware encryption
4. ✅ Data format is correct (Base64 encrypted)

## Common Verification Steps

### Step 1: Verify Encrypted Storage Format
**Expected:** Base64-encoded encrypted data
```
eyJhbGciOiJFQ0RILVBTK0EyNTZLVyIsImVuYyI6IkEyNTZHQ00iLCJlcGsiOnsia3R5IjoiRUMiLCJ4IjoiV2d...
```

**NOT Expected:** Plain JSON
```json
{"onlineBalance":100000,"offlineBalance":0}
```

### Step 2: Verify Hardware Key Access
- Biometric authentication required for sensitive operations
- Keys cannot be exported from Secure Enclave
- Decryption fails if keys are deleted

### Step 3: Verify Data Migration
- Old `@smvc_wallet` key should be empty
- New `@smvc_encrypted_wallet` key should have data
- Balance values should match after migration

## Security Properties Verified

When all tests pass, you have verified:

1. **Encryption at Rest**
   - All wallet balance data is encrypted before storage
   - Storage uses ECIES (Elliptic Curve Integrated Encryption Scheme)

2. **Hardware Key Protection**
   - Encryption keys stored in iOS Secure Enclave
   - Private keys never leave secure hardware
   - Keys cannot be extracted or backed up

3. **Biometric Binding**
   - Some operations require biometric authentication
   - Biometric prompts are tied to actual hardware key access
   - Not just software-level biometric checks

4. **Data Integrity**
   - Encrypted data includes authentication tags
   - Tampering detection via ECDH + AES-GCM
   - Failed decryption if data modified

## Troubleshooting

### "Device Master Key not found"
**Solution:** Tap "Initialize Device Keys" first

### "No encrypted wallet found"
**Solution:** Transfer some funds to create wallet data

### "Failed to decrypt wallet data"
**Possible causes:**
- Hardware key was deleted
- Data was corrupted
- Running on simulator (no Secure Enclave)
- Different device (keys are device-specific)

### Plain JSON in Storage
**Issue:** Encryption not working
**Solution:**
1. Check console for encryption errors
2. Verify hardware key exists
3. Delete app and reinstall
4. Ensure running on physical device

## Testing on Simulator vs Device

### ⚠️ Simulator Limitations
- No Secure Enclave available
- Keys stored in software keychain
- Less secure, but functional for development
- "Hardware Not Available" warning expected

### ✅ Physical Device
- Full Secure Enclave support
- True hardware-backed encryption
- All security features enabled
- Required for production testing

## Next Steps

After verifying encryption:

1. **Test Phase 4 Features**
   - Run "Run All Tests" on Hardware Security Test screen
   - Verify all 9 tests pass
   - Check console logs for detailed output

2. **Test Authentication Integration**
   - Try biometric authentication
   - Verify hardware key verification
   - Test PIN fallback

3. **Test Data Persistence**
   - Restart app
   - Verify encrypted data loads correctly
   - Test with airplane mode

4. **Test Error Handling**
   - Try with deleted keys
   - Test with corrupted storage
   - Verify graceful fallback

## Report Format

When reporting test results, include:

```
Device: iPhone 14 Pro (iOS 17.2)
Test Date: 2025-01-31
App Version: 1.0.0

✅ Hardware Detection: Secure Enclave Available
✅ Key Generation: DEVICE_MASTER, TRANSACTION_SIGNING, PAYMENT_ENCRYPTION
✅ Wallet Encryption: Data encrypted with hardware key
✅ Storage Format: Base64 ECIES encrypted data
✅ Decryption: Successfully decrypted with hardware key
✅ Biometric Binding: Face ID required for sensitive operations
✅ Migration: Legacy plaintext data migrated to encrypted storage

All hardware encryption tests passed.
```
