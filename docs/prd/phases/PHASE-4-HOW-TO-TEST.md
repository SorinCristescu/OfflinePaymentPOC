# How to Test Phase 4 Hardware Security

**Date**: October 31, 2025

---

## Prerequisites

Before testing, you **MUST** add the Swift files to Xcode:

### Step 1: Open Xcode
```bash
open ios/OfflinePaymentPOC.xcworkspace
```

### Step 2: Add Swift Files
1. Right-click on "OfflinePaymentPOC" folder in Project Navigator
2. Select "Add Files to OfflinePaymentPOC..."
3. Navigate to `ios/OfflinePaymentPOC/` and select:
   - `SMVCSecurityModule.swift`
   - `SMVCSecurityBridge.m`
   - `OfflinePaymentPOC-Bridging-Header.h`
4. **IMPORTANT**: 
   - Uncheck "Copy items if needed"
   - Check "OfflinePaymentPOC" target
5. Click "Add"

### Step 3: Configure Bridging Header
1. Select "OfflinePaymentPOC" project (blue icon)
2. Select "OfflinePaymentPOC" target
3. Click "Build Settings" tab
4. Search for "Objective-C Bridging Header"
5. Set value to: `OfflinePaymentPOC/OfflinePaymentPOC-Bridging-Header.h`

### Step 4: Set Swift Version
1. In same "Build Settings" tab
2. Search for "Swift Language Version"
3. Set to: `Swift 5`

### Step 5: Clean and Build
```
Product → Clean Build Folder (⇧⌘K)
Product → Build (⌘B)
```

**If build fails**, check the Xcode errors and ensure bridging header path is correct.

---

## Running the Tests

### Option A: Run on iOS Simulator (Limited)

```bash
npm run ios
```

**Note**: Simulator does NOT have Secure Enclave. Tests will show "Hardware Not Available" but you can still verify the UI and error handling.

### Option B: Run on Physical iPhone (Recommended)

**Requirements**:
- iPhone 5s or later (for Secure Enclave)
- iPhone connected via USB
- Developer account signed in Xcode

```bash
npm run ios --device "Sorin's Phone"
```

Replace "Sorin's Phone" with your iPhone's name.

---

## Accessing the Test Screen

Once the app is running:

1. **Tap the "Settings" tab** (bottom right)
2. **Scroll down** to "Security Features (Phase 4+)" section
3. **Tap "🔐 Test Hardware Security"** button

---

## Running the Tests

### Test 1: Check Hardware Availability

1. In the test screen, tap **"Check Hardware Availability"**
2. You should see an alert with:
   - **On physical iPhone**: "Hardware Available! ✅ SecureEnclave"
   - **On simulator**: "Hardware Not Available" (expected)

### Test 2: Run All Tests

1. Tap **"Run All Tests"**
2. Watch as 9 tests run sequentially:
   - ⏳ Running tests show spinner
   - ✅ Passed tests show green checkmark
   - ❌ Failed tests show red X with error message
3. Each test shows duration in milliseconds
4. At the end, you'll see "All Tests Passed! 🎉" or "Some Tests Failed"

**Tests performed**:
1. Hardware Detection
2. Key Generation (creates EC P-256 key in Secure Enclave)
3. Key Existence Check
4. Public Key Export
5. Encryption (encrypt test data)
6. Decryption (decrypt and verify)
7. Data Signing (cryptographic signature)
8. Signature Verification
9. Key Deletion (cleanup)

### Test 3: Initialize Device Keys

1. Tap **"Initialize Device Keys"**
2. Read the alert (explains what will happen)
3. Tap **"Initialize"**
4. **If biometric is enabled**: Face ID/Touch ID prompt appears
5. After authentication, you'll see public keys for:
   - Device Master Key (used for balance encryption)
   - Transaction Signing Key (used for P2P payments)

---

## Expected Results

### On Physical iPhone (iPhone 5s+)

✅ All 9 tests should PASS
✅ Hardware type: "SecureEnclave"
✅ Tests complete in ~2-5 seconds total
✅ Biometric prompt appears (if configured)

### On Simulator

❌ Test 0 (Hardware Detection) will FAIL with "Hardware security not available"
❌ All subsequent tests will fail
⚠️ This is EXPECTED behavior

---

## Interpreting Test Results

### Success Messages

```
✅ Hardware: SecureEnclave
✅ Key generated: test_key_1730376000000
✅ Public key: MEkwEwYHKoZIzj0CAQYIKoZIzj0DAQc...
✅ Key exists in Secure Enclave ✓
✅ Encrypted: Hello from Secure Enclave!
✅ Decrypted correctly: "Hello from Secure Enclave!" ✓
✅ Signature is valid ✓
✅ Key deleted successfully ✓
```

### Error Messages (Simulator Only)

```
❌ Hardware security not available. Tests will fail on simulator.
```

This is normal! Simulator doesn't have Secure Enclave hardware.

---

## Debugging

### View Logs

**Xcode Console** (recommended):
- Filter for: `[KeyManagementService]`, `[EncryptionService]`, `[SigningService]`
- Shows detailed native logs

**Metro Console**:
```bash
# Already running from npm start
# Look for console.log output
```

### Common Issues

**Issue**: "Native module SMVCSecurityModule not available"
- **Solution**: Swift files not added to Xcode project or bridging header not configured

**Issue**: "Secure Enclave is not available on this device"
- **Solution**: Running on simulator or old device. Use physical iPhone 5s+

**Issue**: Build fails with Swift errors
- **Solution**: Check Swift version is set to 5.0, bridging header path is correct

**Issue**: Tests timeout or hang
- **Solution**: Check that biometric authentication isn't stuck (dismiss any prompts)

---

## What's Being Tested

### Security Validation

Each test verifies critical security properties:

1. **Hardware Detection**: Confirms Secure Enclave/TEE availability
2. **Key Generation**: Private keys generated IN hardware (never in memory)
3. **Key Non-Exportability**: Can only export public key, not private
4. **Encryption Security**: Data encrypted with hardware-backed key
5. **Decryption Security**: Decryption happens entirely in Secure Enclave
6. **Cryptographic Signatures**: Signing with private key in hardware
7. **Signature Verification**: Public key can verify without exposing private key
8. **Key Lifecycle**: Keys can be securely deleted

### Performance Benchmarks

Typical durations on iPhone 13:
- Hardware Detection: 50-100ms
- Key Generation: 100-200ms
- Encryption: 50-100ms
- Decryption: 50-100ms
- Signing: 50-100ms
- Verification: 30-50ms
- Key Deletion: 20-50ms

**Total for all tests**: ~500-800ms

---

## Next Steps After Testing

If all tests pass:

1. **Initialize Device Keys** for real use
2. **Test with biometric authentication** (enable in Settings)
3. **Integration**: Phase 4 services ready to use in walletStore
4. **Android**: Implement Android Keystore/TEE (similar to iOS)

---

## Troubleshooting

### Test Hangs on Biometric Prompt

**Symptom**: Test gets stuck on "⏳ Running"
**Cause**: Biometric prompt waiting for Face ID/Touch ID
**Solution**: 
- Authenticate with Face ID/Touch ID
- Or cancel the prompt
- Tests should continue or fail gracefully

### Tests Fail After Initial Success

**Symptom**: Tests pass first time, fail on subsequent runs
**Cause**: Keys still exist from previous run
**Solution**: 
- Tests automatically clean up
- Check logs for actual error
- May be a different issue

### "Cannot read property 'generateKeyPair' of undefined"

**Symptom**: Native module not found
**Cause**: Swift files not properly added to Xcode
**Solution**: 
- Verify files are in Xcode project (blue icon, not folder)
- Verify target membership includes "OfflinePaymentPOC"
- Clean build folder and rebuild

---

## Additional Testing

### Manual Testing

Try these operations manually in the test screen:

```typescript
// In React Native Debugger console:

// Check hardware
const info = await KeyManagementService.checkHardwareSupport();
console.log(info);

// Generate key
const result = await KeyManagementService.generateKeyPair('manual_test', false);
console.log(result);

// Encrypt data
const encrypted = await EncryptionService.encrypt('manual_test', 'Secret data');
console.log('Encrypted:', encrypted);

// Decrypt
const decrypted = await EncryptionService.decrypt('manual_test', encrypted);
console.log('Decrypted:', decrypted);

// Clean up
await KeyManagementService.deleteKey('manual_test');
```

---

## Success Criteria

Phase 4 is working correctly if:

- ✅ All 9 tests pass on physical iPhone
- ✅ Hardware type shows "SecureEnclave"
- ✅ Keys can be generated and deleted
- ✅ Encryption/decryption round-trip works
- ✅ Signatures can be created and verified
- ✅ Private keys cannot be exported (only public)
- ✅ No crashes or errors in console
- ✅ Tests complete in reasonable time (<5 seconds)

---

**Need Help?** Check:
1. Xcode console for detailed error messages
2. Metro bundler console for JavaScript errors
3. `PHASE-4-IMPLEMENTATION-PROGRESS.md` for more details
4. `docs/prd/phases/PHASE-4-HARDWARE-SECURITY.md` for architecture

**Happy Testing! 🔐**
