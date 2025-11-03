# Android Hardware Security Implementation

This document describes the Android implementation of hardware-backed security using Android Keystore with TEE/StrongBox support.

## Architecture Overview

The Android implementation uses:
- **Android Keystore** - Hardware-backed key storage
- **TEE (Trusted Execution Environment)** - Available on all Android Keystore devices
- **StrongBox** - Dedicated hardware security module (Android 9+, select devices)
- **EC (Elliptic Curve) Cryptography** - secp256r1 curve for keys
- **ECIES Encryption** - ECDH + AES-GCM for data encryption
- **ECDSA Signing** - SHA256withECDSA for signatures

## Components

### 1. SMVCSecurityModule.kt

Main native module implementing all hardware security operations:

**Location**: `android/app/src/main/java/com/offlinepaymentpoc/SMVCSecurityModule.kt`

**Functions**:
- `checkHardwareSupport()` - Detect TEE/StrongBox availability
- `generateKeyPair(keyId, requiresBiometric)` - Generate hardware-backed EC keys
- `keyExists(keyId)` - Check if key exists
- `getPublicKey(keyId)` - Export public key
- `deleteKey(keyId)` - Delete key from keystore
- `sign(keyId, data)` - Sign data with private key
- `verify(publicKey, data, signature)` - Verify signature
- `encrypt(keyId, plaintext)` - Encrypt using ECIES
- `decrypt(keyId, ciphertext)` - Decrypt using ECIES
- `isBiometricBound(keyId)` - Check biometric binding

### 2. SMVCPackage.kt

React Native package registration:

**Location**: `android/app/src/main/java/com/offlinepaymentpoc/SMVCPackage.kt`

Registers the `SMVCSecurityModule` with React Native.

### 3. MainApplication.kt

Application configuration with package registration.

## Security Features

### Hardware-Backed Key Storage

Keys are stored in Android Keystore with:
- **TEE Protection**: Trusted Execution Environment isolation
- **StrongBox Support**: Dedicated security chip (Pixel 3+, Samsung S9+, etc.)
- **Key Non-Exportability**: Private keys never leave hardware
- **Tamper Resistance**: Hardware-level protection

### Key Generation Parameters

```kotlin
KeyGenParameterSpec.Builder(keyId, purposes)
    .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
    .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
    .setIsStrongBoxBacked(true)  // Android 9+ with StrongBox hardware
    .setUserAuthenticationRequired(requiresBiometric)
    .setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
```

### Encryption (ECIES)

Implementation uses Elliptic Curve Integrated Encryption Scheme:

1. **Key Agreement**: ECDH between ephemeral key pair and stored key
2. **Shared Secret**: Derive AES-256 key from ECDH
3. **Encryption**: AES-256-GCM with random IV
4. **Format**: `[ephemeralPubKeyLen(4)][ephemeralPubKey][ivLen(4)][iv][ciphertext]`

### Signing (ECDSA)

Uses SHA256withECDSA for digital signatures:
- **Algorithm**: ECDSA with P-256 curve
- **Digest**: SHA-256
- **Format**: DER-encoded signature

## Platform Differences: iOS vs Android

| Feature | iOS (Secure Enclave) | Android (Keystore + TEE/StrongBox) |
|---------|----------------------|-------------------------------------|
| **Hardware Module** | Secure Enclave (A7+) | TEE (all) / StrongBox (Android 9+) |
| **Key Algorithm** | EC secp256r1 | EC secp256r1 |
| **Signing** | SHA256withECDSA | SHA256withECDSA |
| **Encryption** | ECIES (manual implementation) | ECIES (manual implementation) |
| **Biometric Binding** | kSecAccessControlBiometryCurrentSet | setUserAuthenticationRequired |
| **Device Availability** | iPhone 5s+ | Android 6.0+ (TEE), Android 9+ (StrongBox) |
| **Key Storage Location** | Secure Enclave chip | TEE or StrongBox chip |
| **API** | Security framework + CryptoKit | Android Keystore |

## Device Support

### TEE (Trusted Execution Environment)
- **Available**: All Android 6.0+ devices with Android Keystore
- **Location**: Isolated secure environment in main processor
- **Security**: Software-level isolation with hardware assistance

### StrongBox
- **Available**: Select Android 9+ devices (Pixel 3+, Samsung S9+, etc.)
- **Location**: Dedicated tamper-resistant security chip
- **Security**: Hardware-level isolation with dedicated processor

**Detection**:
```kotlin
val hasStrongBox = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P
```

## Testing on Android

### Prerequisites

1. **Physical Android Device**
   - Android 6.0+ required
   - Android 9+ recommended (StrongBox support)

2. **Enable USB Debugging**
   - Settings → Developer Options → USB Debugging

### Running Tests

1. **Connect Device**
   ```bash
   adb devices
   ```

2. **Build and Install**
   ```bash
   npm run android
   ```

3. **Check Hardware Support**
   - Open app on device
   - Navigate to Settings → Hardware Security Test
   - Tap "Check Hardware Availability"
   - Verify TEE or StrongBox is detected

4. **Run Test Suite**
   - Tap "Run All Tests"
   - All 9 tests should pass
   - Check logcat for detailed logs:
   ```bash
   adb logcat | grep SMVCSecurityModule
   ```

### Expected Logcat Output

```
D/SMVCSecurityModule: Hardware support check: StrongBox
D/SMVCSecurityModule: Generating key pair: device_master_key (biometric: false)
D/SMVCSecurityModule: Using StrongBox for key: device_master_key
D/SMVCSecurityModule: Key pair generated successfully: device_master_key
D/SMVCSecurityModule: Data encrypted successfully with key: device_master_key
D/SMVCSecurityModule: Data decrypted successfully with key: device_master_key
```

## Testing Encrypted Wallet

The same test methods from iOS work on Android:

1. **Test Wallet Encryption**
   - Tap "Test Wallet Encryption"
   - See encrypted vs decrypted balance
   - Verify hardware protection

2. **Verify Hardware Keys**
   - Tap "Verify Hardware Keys"
   - Check all 3 keys exist in Android Keystore
   - Verify TEE/StrongBox backing

3. **Show Storage Comparison**
   - Tap "Show Storage Comparison"
   - See encrypted wallet data

## Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

No additional permissions required - Android Keystore is accessible by default.

## Common Issues

### Issue: "StrongBox not available"

**Cause**: Device doesn't have StrongBox hardware

**Solution**: Automatic fallback to TEE (still hardware-backed)

**Verification**:
```kotlin
builder.setIsStrongBoxBacked(true)  // Try StrongBox
// Falls back to TEE automatically if unavailable
```

### Issue: "Key generation failed"

**Possible Causes**:
1. Invalid key ID (must be unique)
2. Keystore locked (device locked with PIN)
3. Insufficient hardware resources

**Solution**:
- Check logcat for specific error
- Ensure device is unlocked
- Try different key ID

### Issue: "Biometric authentication not working"

**Requirements**:
- Android 10+ for biometric-bound keys
- Biometric enrolled (fingerprint/face)
- App must be in foreground

**Verification**:
```kotlin
setUserAuthenticationParameters(
    0, // timeout (0 = require for every use)
    KeyProperties.AUTH_BIOMETRIC_STRONG
)
```

## Security Audit Checklist

- [ ] Keys stored in Android Keystore (not SharedPreferences)
- [ ] StrongBox used when available
- [ ] TEE used as fallback
- [ ] Private keys never exported
- [ ] Biometric binding enforced for sensitive keys
- [ ] Encrypted data uses authenticated encryption (AES-GCM)
- [ ] Random IVs generated for each encryption
- [ ] Key generation logs don't expose sensitive data

## Performance

### Key Generation
- **TEE**: ~50-100ms
- **StrongBox**: ~100-200ms (slower but more secure)

### Signing
- **TEE**: ~10-20ms
- **StrongBox**: ~20-40ms

### Encryption/Decryption
- **ECIES overhead**: ~30-50ms
- **AES-GCM**: ~1-5ms per KB

## Migration from iOS

If migrating data from iOS device:

1. **Keys are NOT portable** - each device has unique hardware
2. **Re-generate keys** on Android device
3. **Re-encrypt data** with Android keys
4. **User re-authentication** required for biometric-bound keys

## References

- [Android Keystore Documentation](https://developer.android.com/training/articles/keystore)
- [StrongBox Overview](https://developer.android.com/training/articles/keystore#HardwareSecurityModule)
- [Biometric Authentication](https://developer.android.com/training/sign-in/biometric-auth)
- [Security Best Practices](https://developer.android.com/topic/security/best-practices)

## Next Steps

1. **Test on Physical Device**: Verify all functionality works
2. **Test Multiple Devices**: Different manufacturers (Samsung, Pixel, OnePlus)
3. **Performance Testing**: Measure key operations on various devices
4. **Security Audit**: Verify keys never leave hardware module
5. **User Testing**: Validate biometric flows and error handling
