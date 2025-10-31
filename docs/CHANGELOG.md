# Changelog

All notable changes to the Offline Payment POC project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Phase 3] - 2025-10-31

### 🎯 Phase 3: Device Identity & Local Security

**Status**: ✅ COMPLETED

This phase implements comprehensive device identity management and local security features including PIN, biometric, and hybrid authentication methods with secure credential storage.

### Added

#### Core Services
- **DeviceIdentityService** - Unique device ID generation and persistent storage
- **BiometricService** - Native biometric integration (Face ID, Touch ID, Fingerprint) with hardware-backed keys
- **PINService** - Secure PIN management with bcrypt hashing (10 rounds) and Keychain/Keystore storage
- **AuthenticationService** - Authentication orchestration and session management with 30-minute timeout

#### Authentication Methods
- PIN authentication (4-8 digits) with masked input
- Biometric authentication (Face ID, Touch ID, Fingerprint)
- Hybrid authentication (PIN + Biometric combined)
- Flexible authentication method switching
- Graceful fallback when biometric hardware unavailable

#### Security Features
- Secure credential storage using device Keychain (iOS) and Keystore (Android)
- bcrypt PIN hashing with salt (10 rounds)
- Session management with 30-minute automatic timeout
- Account lockout after 5 failed authentication attempts
- Security event logging for audit trail
- Device fingerprinting for identity verification

#### User Interface Components
- `PINInput` - Masked PIN entry component with shake animation
- `PINSetup` - Two-step PIN configuration with confirmation
- `BiometricPrompt` - Native biometric authentication UI
- `AuthenticationModal` - Global authentication prompt overlay
- Complete onboarding flow (Welcome → Security Intro → Setup → Complete)
- Security settings management screen
- Security status indicators throughout app

#### State Management
- `authStore` (Zustand) - Centralized authentication state management
- Automatic state synchronization across components
- Persistent session state with AsyncStorage

#### User Experience
- Seamless onboarding flow for first-time users
- Clear security status indicators on HomeScreen
- Authentication required for all transfers
- Transfers completely blocked when security not configured
- Visual warnings when security is disabled
- Settings integration for security management

### Security

#### Enhancements
- All transfers now require authentication (PIN or Biometric)
- Transfers are completely blocked when security is not configured
- Clear user messaging about security requirements
- Protected operations using `useAuthenticationGate` hook
- Automatic session timeout after 30 minutes of inactivity
- Account lockout after 5 failed authentication attempts
- Secure deletion of credentials when security is disabled

#### Vulnerabilities Fixed
- Added timeout protection (3-5 seconds) for native module calls to prevent app freezing
- Made authentication initialization non-blocking to prevent startup delays
- Implemented graceful error handling for biometric hardware failures
- Added proper state synchronization when security settings change

### Fixed

#### Critical Issues
- **App freeze on startup**: Added timeout protection for native module calls that could hang indefinitely
- **iPhone device freeze**: Made auth initialization non-blocking with setTimeout wrapper
- **PIN input keyboard not appearing**: Redesigned input approach from hidden to overlay with programmatic focus
- **Transfer button loader stuck**: Re-enabled AuthenticationModal to properly complete authentication flow
- **Security state not updating UI**: Added getState() call after disableAuthentication for proper state sync

#### Theme Property Errors
Fixed incorrect theme property paths across 6+ files:
- `theme.colors.background` → `theme.background.primary`
- `theme.colors.text` → `theme.text.primary`
- `shadows.small` → `shadows.sm`
- `shadows.large` → `shadows.lg`
- `spacing.xxl` → `spacing['2xl']`
- `staticTheme.typography.fontSize` → `staticTheme.fontSize`

#### ESLint Errors
- Fixed all missing useEffect dependencies in onboarding screens
- Removed all unused imports and variables
- Fixed React Hook ordering issues
- Fixed unnecessary undefined initializations
- Result: 0 ESLint errors in production code

### Changed

#### Architecture
- Authentication is now required before any transfer operation
- Non-blocking initialization pattern for better app startup performance
- Timeout protection on all native module calls
- Improved error handling and recovery throughout auth flow

#### User Experience
- HomeScreen now blocks navigation to transfer screen when security not configured
- TransferForm shows warning banner when security is disabled
- Transfer button disabled and text changed when security not configured
- Clear prompts to set up security before making transfers
- Alert dialogs provide option to navigate directly to Settings

### Technical Details

#### Files Created (15+)
**Services**:
- `src/services/security/DeviceIdentityService.ts`
- `src/services/security/BiometricService.ts`
- `src/services/security/PINService.ts`
- `src/services/security/AuthenticationService.ts`

**Components**:
- `src/components/security/PINInput.tsx`
- `src/components/security/PINSetup.tsx`
- `src/components/security/BiometricPrompt.tsx`
- `src/components/security/AuthenticationModal.tsx`

**Screens**:
- `src/screens/onboarding/WelcomeScreen.tsx`
- `src/screens/onboarding/SecurityIntroScreen.tsx`
- `src/screens/onboarding/SecuritySetupScreen.tsx`
- `src/screens/onboarding/SetupCompleteScreen.tsx`
- `src/screens/UnlockScreen.tsx`

**Hooks & Store**:
- `src/hooks/useAuthenticationGate.ts`
- `src/stores/authStore.ts`

**Tests**:
- `__tests__/services/BiometricService.test.ts`
- `__tests__/services/PINService.test.ts`
- `__tests__/components/PINInput.test.tsx`

#### Dependencies Added
- `react-native-biometrics` - Native biometric authentication
- `react-native-keychain` - Secure credential storage
- `bcryptjs` - PIN hashing
- `@react-native-async-storage/async-storage` - Persistent storage

#### Metrics
- **Lines of Code**: ~3,500
- **Components**: 8
- **Services**: 4
- **Screens**: 5
- **Unit Tests**: 3 test suites
- **TypeScript Errors**: 0
- **ESLint Errors**: 0

### Documentation

- Created comprehensive Phase 3 documentation: `docs/prd/phases/PHASE-3-SECURITY.md`
- Created Phase 3 summary: `PHASE-3-SUMMARY.md`
- Added architecture diagrams and security flow documentation
- Documented all APIs, components, and security implementations
- Created testing guidelines and troubleshooting guide

### Known Issues

1. **Biometric enrollment check**: Not implemented for all platforms
2. **Session timeout notification**: User not notified when session expires
3. **PIN strength indicator**: No visual feedback on PIN strength
4. **Biometric fallback**: Limited customization of system biometric UI
5. **Background authentication**: Session doesn't account for app backgrounding time

See `docs/prd/phases/PHASE-3-SECURITY.md` for detailed information on known limitations.

### Next Phase

**Phase 4: Transaction Management**
- Offline transaction queue with persistence
- Transaction history and filtering
- Cryptographic transaction signatures
- Automatic sync mechanism when connectivity restored
- Transaction conflict resolution

---

## [Phase 2] - 2025-10-30

### Added
- Offline balance management
- Online to offline balance transfers
- Basic wallet functionality
- Balance display components

---

## [Phase 1] - 2025-10-29

### Added
- Initial project setup
- React Native 0.82.1 with TypeScript
- Navigation structure
- Theme system with dark mode
- Basic project architecture
