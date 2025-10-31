# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native proof-of-concept application for offline payment functionality. The project uses React Native 0.82.1 with TypeScript and targets both iOS and Android platforms.

## Development Commands

### Initial Setup

For iOS development (first time or after native dependency updates):
```bash
bundle install                    # Install Ruby dependencies (first time only)
bundle exec pod install           # Install CocoaPods dependencies
```

### Running the App

```bash
npm start                         # Start Metro bundler
npm run android                   # Run on Android emulator/device
npm run ios                       # Run on iOS simulator/device
```

### Code Quality

```bash
npm run lint                      # Run ESLint
npm test                          # Run Jest tests
```

### Running a Single Test

```bash
npx jest __tests__/App.test.tsx   # Run specific test file
npx jest -t "test name"           # Run test by name pattern
```

## Architecture

### Project Structure

- `App.tsx` - Main application entry point with SafeAreaProvider wrapper
- `index.js` - React Native application registration
- `__tests__/` - Jest test files
- `android/` - Android native code (Kotlin)
- `ios/` - iOS native code (Swift)

### Platform-Specific Code

**Android** (`android/app/src/main/java/com/offlinepaymentpoc/`):
- `MainActivity.kt` - Main Android activity, registers "OfflinePaymentPOC" component
- `MainApplication.kt` - Application initialization, uses New Architecture with ReactHost

**iOS** (`ios/OfflinePaymentPOC/`):
- `AppDelegate.swift` - iOS app delegate with New Architecture support
- Uses `ReactNativeDelegate` for bridge configuration
- Debug builds load from Metro bundler, release builds use main.jsbundle

### Key Technologies

- **React Native 0.82.1** with New Architecture enabled
- **TypeScript** for type safety
- **React 19.1.1** with Fast Refresh for development
- **Jest** for testing with `react-test-renderer`
- **SafeAreaProvider** from `react-native-safe-area-context` for handling safe areas
- **Kotlin** for Android native code
- **Swift** for iOS native code

### Build Configuration

**Android:**
- Min SDK: 24
- Target/Compile SDK: 36
- NDK Version: 27.1.12297006
- Kotlin: 2.1.20

**iOS:**
- Platform: iOS with minimum version from React Native support
- Uses CocoaPods for dependency management
- New Architecture enabled by default

## Development Notes

- The app uses React Native's New Architecture (Fabric renderer and TurboModules)
- Native modules can be manually added in `MainApplication.kt` for Android
- iOS uses Swift-based AppDelegate instead of Objective-C
- Both platforms support the `fabricEnabled` flag for New Architecture
- Metro bundler must be running before launching the app on either platform
- Fast Refresh is enabled for quick development iteration
