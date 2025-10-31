# Deploy to iPhone - Complete Guide

**Last Updated**: October 31, 2025
**Status**: ✅ Ready to Deploy

---

## Prerequisites ✅

- ✅ Xcode installed (26.0.1 - Confirmed)
- ✅ iOS pods installed successfully
- ✅ iPhone with Lightning/USB-C cable
- ✅ Apple ID (free account works)

---

## Quick Start (5 Steps)

If you want to jump straight in:

```bash
# 1. Connect your iPhone via USB
# 2. Unlock your iPhone
# 3. Trust the computer on iPhone when prompted
# 4. Run this command:
npm run ios -- --device "Your iPhone Name"

# Or let React Native auto-detect:
npm run ios -- --device
```

**If this works**, you're done! If you get errors, follow the detailed guide below.

---

## Detailed Step-by-Step Guide

### Step 1: Prepare Your iPhone

1. **Enable Developer Mode** (iOS 16+)
   - On your iPhone: **Settings** → **Privacy & Security** → **Developer Mode**
   - Toggle **Developer Mode** to **ON**
   - iPhone will restart
   - After restart, confirm you want to enable Developer Mode

2. **Connect iPhone to Mac**
   - Use a Lightning or USB-C cable
   - **Unlock your iPhone**
   - If prompted "Trust This Computer?", tap **Trust**
   - Enter your iPhone passcode

3. **Verify Connection**
   ```bash
   # Check if your iPhone is detected
   xcrun devicectl list devices

   # Or with older Xcode:
   xcrun xctrace list devices
   ```

   You should see your iPhone listed with its name and identifier.

---

### Step 2: Configure Code Signing in Xcode

#### Option A: Automatic (Recommended - Easiest)

1. **Open the Xcode workspace**:
   ```bash
   open ios/OfflinePaymentPOC.xcworkspace
   ```

   ⚠️ **Important**: Open the `.xcworkspace` file, NOT the `.xcodeproj` file!

2. **In Xcode**, select the project:
   - Click **OfflinePaymentPOC** in the left sidebar (blue icon at top)
   - Select **OfflinePaymentPOC** under TARGETS

3. **Go to Signing & Capabilities tab**:
   - You'll see "Signing for 'OfflinePaymentPOC' requires a development team"

4. **Select Your Team**:
   - Click the **Team** dropdown
   - If you see your Apple ID, select it
   - If not, click **Add an Account...**

5. **Add Apple ID** (if needed):
   - Click **Add an Account**
   - Sign in with your Apple ID
   - Password may be required
   - Two-factor authentication if enabled

6. **Let Xcode Handle Everything**:
   - Once team is selected, Xcode will:
     - ✅ Create a provisioning profile automatically
     - ✅ Register your iPhone
     - ✅ Create necessary certificates
     - ✅ Set up bundle identifier

7. **Verify**:
   - ✅ Team: Your Name (Personal Team) or your organization
   - ✅ Signing Certificate: "Apple Development"
   - ✅ Provisioning Profile: Automatically managed
   - ✅ No errors or warnings in yellow/red

#### Option B: Manual (Advanced)

If automatic signing doesn't work, you can configure manually in Xcode:

1. Uncheck **Automatically manage signing**
2. Select your team
3. Choose or create a provisioning profile
4. Select a signing certificate

**Most users should use Option A (Automatic)**.

---

### Step 3: Change Bundle Identifier (If Needed)

If you get "identifier already in use" error:

1. In Xcode, go to **Signing & Capabilities**
2. Change **Bundle Identifier** from:
   ```
   com.offlinepaymentpoc
   ```

   To something unique:
   ```
   com.yourname.offlinepaymentpoc
   ```

   For example:
   ```
   com.sorin.offlinepaymentpoc
   ```

3. Save (⌘S)

---

### Step 4: Build and Deploy

#### Method 1: Using React Native CLI (Recommended)

1. **Start Metro Bundler**:
   ```bash
   npm start
   ```

   Keep this running in one terminal.

2. **In a new terminal**, deploy to your iPhone:
   ```bash
   # Let React Native auto-detect your device
   npm run ios -- --device

   # Or specify your iPhone name explicitly:
   npm run ios -- --device "Sorin's iPhone"

   # Or use the device ID:
   npm run ios -- --udid 00008030-001234567890ABCD
   ```

3. **Wait for build** (first time takes 3-5 minutes):
   - Xcode will compile the app
   - Install on your iPhone
   - Launch automatically

#### Method 2: Using Xcode (Alternative)

1. **Open Xcode workspace**:
   ```bash
   open ios/OfflinePaymentPOC.xcworkspace
   ```

2. **Select your iPhone**:
   - Top bar: Click the device dropdown (next to "OfflinePaymentPOC")
   - Select your iPhone from the list

3. **Click ▶ (Play button)** or press **⌘R**

4. **Xcode will**:
   - Build the app
   - Install on iPhone
   - Launch automatically

---

### Step 5: Trust Developer on iPhone

**First time only**, when app tries to launch:

1. You'll see: **"Untrusted Developer"**

2. **On your iPhone**:
   - Go to **Settings**
   - Scroll to **General**
   - Tap **VPN & Device Management** (or **Device Management**)
   - Under **Developer App**, tap your Apple ID
   - Tap **Trust "Your Name"**
   - Confirm by tapping **Trust**

3. **Return to home screen** and launch the app again
   - App icon will be on your home screen
   - Or it may launch automatically

---

## Troubleshooting

### Error: "No devices found"

**Solution**:
```bash
# Check devices are detected
xcrun devicectl list devices

# Or
instruments -s devices

# Make sure your iPhone is:
# - Connected via USB
# - Unlocked
# - Trusted the computer
```

### Error: "Could not find an iPhone device"

**Solution**:
```bash
# Specify device explicitly by name
npm run ios -- --device "iPhone 14 Pro"

# Or get the exact name:
xcrun devicectl list devices
# Copy the name exactly as shown
```

### Error: "Code signing is required"

**Solution**:
1. Open Xcode workspace: `open ios/OfflinePaymentPOC.xcworkspace`
2. Follow Step 2 above to configure code signing
3. Make sure you selected a Team
4. Try building again

### Error: "Failed to create provisioning profile"

**Solutions**:
1. **Check Apple ID**: Make sure you're signed in
2. **Try a different Bundle ID**: Change `com.offlinepaymentpoc` to something unique
3. **Clean and retry**:
   ```bash
   cd ios
   rm -rf ~/Library/Developer/Xcode/DerivedData/*
   xcodebuild clean
   cd ..
   npm run ios -- --device
   ```

### Error: "Untrusted Developer" (won't open)

**Solution**: Follow Step 5 above - Trust developer in iPhone Settings

### Error: Metro bundler connection failed

**Solution**:
1. Make sure Metro is running: `npm start`
2. On iPhone, shake device (or ⌘D in simulator)
3. Tap "Configure Bundler"
4. Enter your Mac's IP address (find with `ifconfig | grep inet`)

### App installs but shows blank white screen

**Solutions**:
1. Check Metro bundler is running
2. Restart Metro: Stop it (Ctrl+C) and run `npm start` again
3. In the app, shake iPhone → Reload
4. Check for errors in Metro bundler terminal

### Build takes too long / hangs

**Solutions**:
```bash
# Clean everything and rebuild
cd ios
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf Pods Podfile.lock build
bundle exec pod install
cd ..

# Try again
npm run ios -- --device
```

---

## Verifying Installation

Once the app launches on your iPhone:

### ✅ Checklist

1. **App launches** without crashing
2. **You see three tabs** at the bottom: Home, Transactions, Settings
3. **Home screen shows**:
   - Total Balance: $1000.00
   - Online Balance: $1000.00
   - Offline Balance: $0.00
   - Transfer form
4. **Try a transfer**:
   - Enter "50" in amount field
   - Tap "Transfer" button
   - See success message
   - Balances update (Online: $950, Offline: $50)
5. **Navigate to Transactions tab**:
   - See your transfer in history
6. **Navigate to Settings tab**:
   - See device information

### 🎯 Test Key Features

1. **Pull to Refresh** (works on all screens)
2. **Smooth animations** when switching tabs
3. **Transfer money** from online to offline
4. **View transaction history**
5. **Filter transactions** (All/Received/Sent)
6. **Toggle settings** (Haptic Feedback, etc.)

---

## Useful Commands

```bash
# List all available devices
xcrun devicectl list devices

# Clean build
cd ios && xcodebuild clean && cd ..

# Clean pods and reinstall
cd ios && rm -rf Pods Podfile.lock && bundle exec pod install && cd ..

# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Kill Metro bundler
lsof -ti:8081 | xargs kill

# View app logs (while app is running)
xcrun devicectl device monitor logs --device <device-id>
```

---

## Development Tips

### Hot Reloading

- **Shake iPhone** to open Developer Menu
- Enable **Fast Refresh** (should be on by default)
- Changes to JS/TS files reload automatically
- Native changes (Swift/Kotlin) require rebuild

### Developer Menu

Shake your iPhone (or press ⌘D) to access:
- **Reload**: Restart the app
- **Debug**: Open Chrome debugger
- **Show Inspector**: Inspect element layout
- **Performance Monitor**: Check FPS
- **Settings**: Configure fast refresh, debugging

### Debugging

1. **Chrome DevTools**:
   - Shake device → Debug
   - Opens Chrome at `http://localhost:8081/debugger-ui`
   - Use Console, Sources, Network tabs

2. **Safari Web Inspector** (for JSC):
   - Safari → Develop → [Your iPhone] → JSContext
   - Better for iOS-specific debugging

3. **Xcode Console**:
   - In Xcode: View → Debug Area → Show Debug Area (⌘⇧Y)
   - See native logs and errors

---

## Next Steps

### Once App is Running on iPhone

1. **Test all Phase 1 features** (see PHASE_1_COMPLETE.md)
2. **Get user feedback** on UX/performance
3. **Start Phase 2** when ready

### For Future Phases

- **Phase 4** (TEE/SE): Physical iPhone required for Secure Enclave testing
- **Phase 5** (BLE): Need two physical devices for testing
- **Phase 7** (NFC): iPhone 7+ required

---

## FAQ

**Q: Do I need a paid Apple Developer account?**
A: No! Free Apple ID works for development and testing on your own devices.

**Q: Can I keep the app installed without a computer?**
A: Yes, but it expires after 7 days with free account (re-install required). Paid account ($99/year) = no expiration.

**Q: Will this work on iOS simulator?**
A: Yes! Run `npm run ios` without `--device` flag to use simulator. But some features (SE/TEE, NFC, BLE) need physical device.

**Q: Can I test on multiple iPhones?**
A: Yes! Just connect each iPhone and run `npm run ios -- --device` for each.

**Q: How do I update the app after making changes?**
A: Metro will auto-reload for JS changes. For native changes, rebuild: `npm run ios -- --device`

---

## Summary

| Step | Command | Duration |
|------|---------|----------|
| 1. Connect iPhone | Via USB | 10 sec |
| 2. Configure Xcode | Open workspace, select team | 2 min |
| 3. Build & Deploy | `npm run ios -- --device` | 3-5 min (first time) |
| 4. Trust Developer | iPhone Settings | 30 sec |
| **Total** | | **~8 minutes** |

After first setup, subsequent deploys take only **30-60 seconds**.

---

## Getting Help

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review Metro bundler output for errors
3. Check Xcode console for native errors
4. Review `docs/IOS_SETUP_FIX.md` for dependency issues

---

**You're now ready to run the SMVC Offline Payment app on your iPhone!** 🎉📱

---

*Document Version: 1.0*
*Last Updated: October 31, 2025*
