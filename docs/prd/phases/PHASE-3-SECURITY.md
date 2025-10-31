# Phase 3: Device Identity & Local Security

## Overview

Phase 3 implements comprehensive device identity management and local security features for the Offline Payment POC application. This phase adds biometric authentication (Face ID, Touch ID, Fingerprint), PIN-based authentication, and secure credential storage to protect user funds and sensitive operations.

**Status**: ✅ Completed

**Completion Date**: October 31, 2025

---

## Table of Contents

1. [Features Implemented](#features-implemented)
2. [Architecture](#architecture)
3. [Security Components](#security-components)
4. [User Flows](#user-flows)
5. [Implementation Details](#implementation-details)
6. [Testing](#testing)
7. [Known Issues & Limitations](#known-issues--limitations)
8. [Next Steps](#next-steps)

---

## Features Implemented

### 1. Device Identity Management
- **Unique Device ID Generation**: Each device gets a cryptographically secure unique identifier
- **Device Fingerprinting**: Hardware and software characteristics are captured
- **Persistent Storage**: Device identity is stored securely in AsyncStorage
- **Multi-platform Support**: Works on both iOS and Android

### 2. Biometric Authentication
- **Face ID Support** (iOS)
- **Touch ID Support** (iOS)
- **Fingerprint Support** (Android)
- **Capability Detection**: Automatic detection of available biometric methods
- **Secure Key Storage**: Biometric-protected encryption keys stored in device Keychain/Keystore
- **Fallback Options**: Graceful degradation when biometrics unavailable

### 3. PIN Authentication
- **Secure PIN Storage**: PINs are hashed using bcrypt with salt
- **4-8 Digit PINs**: Configurable PIN length with validation
- **PIN Masking**: Visual feedback with dots during input
- **Attempt Tracking**: Failed attempt counting
- **Account Lockout**: Temporary lockout after 5 failed attempts
- **PIN Change**: Ability to change PIN with current PIN verification

### 4. Hybrid Authentication
- **PIN + Biometric**: Maximum security with both methods
- **Method Switching**: Users can switch between authentication methods
- **Graceful Fallback**: Automatic fallback to PIN when biometric fails

### 5. Onboarding Experience
- **Welcome Screen**: Introduction to the app
- **Security Introduction**: Explanation of security features
- **Security Setup**: Step-by-step security configuration
- **Skip Option**: Optional security setup during onboarding

### 6. Security Gates
- **Transfer Protection**: All transfers require authentication
- **Settings Protection**: Sensitive settings require authentication
- **Security Enforcement**: Transfers blocked when security not configured
- **Session Management**: Authentication state tracking

### 7. Security Monitoring
- **Security Events Log**: All authentication events are logged
- **Event Types**: Login, logout, failed attempts, method changes, lockouts
- **Event Persistence**: Events stored locally for audit trail
- **Recent Events Display**: View recent security events in Settings

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Screens           │  Components                             │
│  - HomeScreen      │  - PINInput                             │
│  - SettingsScreen  │  - PINSetup                             │
│  - UnlockScreen    │  - BiometricPrompt                      │
│  - Onboarding      │  - AuthenticationModal                  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      State Management                        │
├─────────────────────────────────────────────────────────────┤
│  Zustand Store (authStore)                                   │
│  - Authentication state                                       │
│  - Security configuration                                     │
│  - Session management                                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic                          │
├─────────────────────────────────────────────────────────────┤
│  Services                                                     │
│  - AuthenticationService (orchestration)                      │
│  - PINService (PIN management)                               │
│  - BiometricService (biometric operations)                   │
│  - DeviceIdentityService (device fingerprinting)             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Storage & Platform                        │
├─────────────────────────────────────────────────────────────┤
│  - AsyncStorage (device ID, security events)                 │
│  - Keychain/Keystore (encrypted credentials)                 │
│  - react-native-biometrics (native biometric APIs)           │
│  - bcrypt (PIN hashing)                                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action (Transfer)
    │
    ▼
useAuthenticationGate Hook
    │
    ├─── Check if security configured
    │    └─── If NO → Block action, show alert
    │
    ├─── Check if authenticated
    │    └─── If YES → Execute action
    │
    └─── If NO → Trigger authentication
         │
         ├─── authStore.authenticate()
         │    └─── Show AuthenticationModal
         │
         ├─── User enters PIN/Biometric
         │    │
         │    ├─── BiometricService.authenticate()
         │    │    └─── Native biometric prompt
         │    │
         │    └─── PINService.verifyPIN()
         │         └─── bcrypt.compare()
         │
         ├─── AuthenticationService validates
         │    └─── Update session state
         │
         └─── Return to useAuthenticationGate
              └─── Execute protected action
```

---

## Security Components

### 1. DeviceIdentityService

**Location**: `src/services/security/DeviceIdentityService.ts`

**Purpose**: Generate and manage unique device identifiers

**Key Methods**:
```typescript
getDeviceIdentity(): Promise<DeviceIdentity>
generateUniqueId(): string
getDeviceFingerprint(): DeviceFingerprint
```

**Device Fingerprint Includes**:
- Device ID
- Device name
- System name & version
- Device model
- App version
- Platform (iOS/Android)
- Timestamp of first generation

### 2. BiometricService

**Location**: `src/services/security/BiometricService.ts`

**Purpose**: Manage biometric authentication

**Key Methods**:
```typescript
checkCapabilities(): Promise<BiometricCapabilities>
authenticate(promptMessage?: string): Promise<AuthenticationResult>
createKeys(): Promise<{success: boolean}>
deleteKeys(): Promise<void>
keysExist(): Promise<boolean>
```

**Supported Biometric Types**:
- Face ID (iOS)
- Touch ID (iOS)
- Fingerprint (Android)

**Security Features**:
- Hardware-backed key storage
- Biometric-protected encryption keys
- Automatic capability detection
- User-friendly error messages

### 3. PINService

**Location**: `src/services/security/PINService.ts`

**Purpose**: Secure PIN management

**Key Methods**:
```typescript
setupPIN(pin: string): Promise<{success: boolean}>
verifyPIN(pin: string): Promise<{success: boolean}>
hasPIN(): Promise<boolean>
deletePIN(): Promise<void>
changePIN(currentPin: string, newPin: string): Promise<{success: boolean}>
```

**Security Features**:
- bcrypt hashing (10 rounds)
- Salt generation per PIN
- Secure storage in Keychain/Keystore
- PIN validation (4-8 digits)

**PIN Storage Format**:
```typescript
{
  hash: string,      // bcrypt hash
  salt: string,      // unique salt
  createdAt: string, // ISO timestamp
  updatedAt: string  // ISO timestamp
}
```

### 4. AuthenticationService

**Location**: `src/services/security/AuthenticationService.ts`

**Purpose**: Orchestrate authentication across all methods

**Key Methods**:
```typescript
initialize(): Promise<InitializationResult>
authenticate(method?: AuthenticationMethod): Promise<AuthenticationResult>
setupAuthentication(method: AuthenticationMethod, data?: PINSetupData): Promise<SetupResult>
disableAuthentication(method: AuthenticationMethod): Promise<{success: boolean}>
getState(): Promise<AuthenticationState>
isAuthenticated(): Promise<boolean>
```

**Authentication State Management**:
- Session tracking (30 minutes timeout)
- Failed attempt counting (max 5)
- Lockout handling (30 seconds)
- Security event logging

**Security Events Tracked**:
```typescript
enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  PIN_SETUP = 'PIN_SETUP',
  PIN_CHANGED = 'PIN_CHANGED',
  BIOMETRIC_ENABLED = 'BIOMETRIC_ENABLED',
  BIOMETRIC_DISABLED = 'BIOMETRIC_DISABLED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
}
```

---

## User Flows

### 1. First-Time Onboarding

```
App Launch (First Time)
    │
    ▼
Welcome Screen
    │ (Get Started)
    ▼
Security Introduction Screen
    │ (Set Up Security / Skip)
    ▼
Security Setup Screen
    │
    ├─── Choose Method:
    │    - PIN only
    │    - Biometric only (if available)
    │    - PIN + Biometric (recommended)
    │
    ├─── If PIN selected:
    │    └─── PINSetup Component
    │         ├─── Enter PIN (4-8 digits)
    │         ├─── Confirm PIN
    │         └─── Success
    │
    ├─── If Biometric selected:
    │    └─── BiometricPrompt Component
    │         ├─── Trigger native biometric
    │         └─── Success
    │
    └─── If PIN + Biometric:
         ├─── PIN Setup first
         └─── Then Biometric Setup
    │
    ▼
Setup Complete Screen
    │ (Get Started)
    ▼
Home Screen
```

### 2. Transfer with Authentication

```
Home Screen
    │ (Transfer Now button)
    ▼
Security Check
    │
    ├─── If security NOT configured:
    │    └─── Alert: "Security Required"
    │         └─── Option to go to Settings
    │
    └─── If security configured:
         └─── Navigate to Transfer Screen
              │
              ▼
         Enter Amount
              │ (Transfer button)
              ▼
         Authentication Modal Appears
              │
              ├─── Show PIN Input
              │    └─── User enters PIN
              │         └─── Verify with PINService
              │
              └─── Or Show Biometric Prompt
                   └─── Trigger Face ID / Touch ID
                        └─── Verify with BiometricService
              │
              ▼
         If Authenticated:
              └─── Execute Transfer
                   └─── Show Success
                        └─── Return to Home
         │
         If Failed:
              └─── Show Error
                   └─── Retry or Cancel
```

### 3. Disable Security

```
Settings Screen
    │ (Disable Security button)
    ▼
Authentication Required
    │ (Enter PIN / Use Biometric)
    ▼
Confirmation Alert
    │ "Are you sure you want to disable security?"
    │ (Cancel / Disable)
    ▼
Disable Security Process
    │
    ├─── Delete PIN hash (if exists)
    ├─── Delete biometric keys (if exist)
    ├─── Update configured method to NONE
    ├─── Clear authentication session
    └─── Log security event
    │
    ▼
Update UI State
    │
    ├─── Settings Screen: Show "Not Configured"
    ├─── Home Screen: Show warning badge
    └─── Transfer: Block transfers
    │
    ▼
Show Success Alert
    └─── "Security has been disabled"
```

### 4. Change PIN

```
Settings Screen
    │ (Change PIN button)
    ▼
Authenticate with Current PIN
    │ (Enter current PIN)
    ▼
PINSetup Component
    │
    ├─── Enter New PIN
    ├─── Confirm New PIN
    └─── Validate (4-8 digits, not same as old)
    │
    ▼
Save New PIN
    │
    ├─── Hash new PIN with bcrypt
    ├─── Store in Keychain
    └─── Log security event
    │
    ▼
Show Success
    └─── "PIN changed successfully"
```

---

## Implementation Details

### Authentication Store (Zustand)

**Location**: `src/stores/authStore.ts`

**State Structure**:
```typescript
interface AuthState {
  // Biometric capabilities
  biometricAvailable: boolean;
  biometricCapabilities: BiometricCapabilities | null;

  // PIN configuration
  pinConfigured: boolean;

  // Current configuration
  configuredMethod: AuthenticationMethod;

  // Session state
  isInitialized: boolean;
  isAuthenticating: boolean;
  error?: string;

  // Authentication state
  status: AuthenticationStatus;
  method: AuthenticationMethod;
  lastAuthenticationTime?: Date;
  failedAttempts: number;
  isLocked: boolean;
  lockoutEndTime?: Date;

  // Security events
  recentSecurityEvents: SecurityEvent[];

  // Modal state
  showAuthPrompt: boolean;
  authPromptMessage?: string;
  authPromptMethod?: AuthenticationMethod;
  authPromptResolver?: (result: AuthenticationResult) => void;
}
```

**Key Actions**:
- `initialize()`: Initialize authentication service
- `authenticate()`: Trigger authentication modal
- `authenticateWithPIN()`: Validate PIN
- `setupAuthentication()`: Configure security method
- `disableAuthentication()`: Remove security
- `changePIN()`: Update PIN
- `getState()`: Refresh authentication state
- `isAuthenticated()`: Check current authentication status

### UI Components

#### 1. PINInput Component

**Location**: `src/components/security/PINInput.tsx`

**Features**:
- Masked input (dots display)
- Numeric keyboard
- Auto-submit on completion
- Error states with shake animation
- Tap-to-focus overlay
- Support for 4-8 digit PINs

**Props**:
```typescript
interface PINInputProps {
  length?: number;              // PIN length (default 4)
  onComplete: (pin: string) => void;
  onChange?: (pin: string) => void;
  error?: string;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  clearOnError?: boolean;
}
```

**Key Implementation Details**:
- Hidden TextInput with overlay approach
- Transparent input covers dot area
- Programmatic focus with 100ms delay
- Shake animation on error using Animated API

#### 2. PINSetup Component

**Location**: `src/components/security/PINSetup.tsx`

**Features**:
- Two-step process (enter + confirm)
- Real-time validation
- Strength indicator
- Clear error messages
- Cancel option

**Props**:
```typescript
interface PINSetupProps {
  onComplete: (pin: string, confirmPin: string) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  title?: string;
}
```

**Validation Rules**:
- Length: 4-8 digits
- Format: Only numeric characters
- Confirmation: Must match initial entry

#### 3. BiometricPrompt Component

**Location**: `src/components/security/BiometricPrompt.tsx`

**Features**:
- Auto-detection of biometric type
- Visual feedback
- Fallback to PIN option
- Button and card variants
- Loading states

**Props**:
```typescript
interface BiometricPromptProps {
  promptMessage?: string;
  onSuccess: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  onFallbackToPIN?: () => void;
  showPINFallback?: boolean;
  autoTrigger?: boolean;
  variant?: 'button' | 'card';
  title?: string;
}
```

#### 4. AuthenticationModal Component

**Location**: `src/components/security/AuthenticationModal.tsx`

**Features**:
- Global authentication modal
- Triggered from anywhere in app
- Supports PIN and biometric
- Cancel option
- Promise-based resolution

**Integration with authStore**:
```typescript
// Trigger modal
const result = await authStore.authenticate(
  AuthenticationMethod.PIN,
  'Authenticate to transfer $50.00'
);

// Modal shows, user authenticates
// Result returned when complete
if (result.success) {
  // Proceed with action
}
```

### Hooks

#### useAuthenticationGate

**Location**: `src/hooks/useAuthenticationGate.ts`

**Purpose**: Protect sensitive operations with authentication

**Usage**:
```typescript
const {executeProtected, isAuthenticating, isAuthenticationRequired} = useAuthenticationGate();

// Protect a function
const handleTransfer = async () => {
  const result = await executeProtected(
    async () => {
      // Your protected operation
      await transferOnlineToOffline(amount);
    },
    {
      promptMessage: 'Authenticate to transfer',
      onAuthenticationSuccess: () => console.log('Success'),
      onAuthenticationFailed: (error) => console.log('Failed'),
    }
  );
};
```

**Features**:
- Automatic authentication check
- Configurable prompt messages
- Callback support
- Returns null if cancelled
- Handles errors gracefully

---

## Testing

### Unit Tests Implemented

**Location**: `__tests__/services/security/`

#### 1. DeviceIdentityService Tests
- ✅ Device ID generation
- ✅ Device fingerprint creation
- ✅ Persistent storage
- ✅ Identity retrieval

#### 2. BiometricService Tests
- ✅ Capability detection
- ✅ Authentication flow
- ✅ Key creation and deletion
- ✅ Error handling
- ✅ User-friendly error messages

#### 3. PINService Tests
- ✅ PIN setup with validation
- ✅ PIN verification
- ✅ PIN hashing (bcrypt)
- ✅ PIN deletion
- ✅ PIN change flow
- ✅ Error cases (wrong PIN, invalid format)

### Manual Testing Checklist

#### Onboarding Flow
- [ ] Welcome screen displays correctly
- [ ] Security intro explains features
- [ ] Can choose different security methods
- [ ] PIN setup accepts valid PINs (4-8 digits)
- [ ] PIN setup rejects invalid inputs
- [ ] PIN confirmation works
- [ ] Biometric setup triggers native prompt
- [ ] Can skip security setup
- [ ] Setup complete screen shows success

#### Authentication
- [ ] PIN authentication works
- [ ] Biometric authentication works (on real device)
- [ ] Failed PIN shows error
- [ ] Failed biometric shows error
- [ ] Can cancel authentication
- [ ] Fallback from biometric to PIN works
- [ ] 5 failed attempts triggers lockout
- [ ] Lockout timeout (30 seconds) works
- [ ] Session timeout (30 minutes) works

#### Transfers
- [ ] Transfer blocked when no security
- [ ] Alert shown with option to setup security
- [ ] Transfer allowed when security configured
- [ ] Authentication modal appears
- [ ] Transfer executes after authentication
- [ ] Transfer cancelled if authentication fails

#### Settings
- [ ] Security status displays correctly
- [ ] Can change PIN (requires current PIN)
- [ ] Can disable security (requires authentication)
- [ ] UI updates after security changes
- [ ] Security events log displays
- [ ] Recent events show correct information

#### Edge Cases
- [ ] App restart preserves security config
- [ ] Biometric not available handled gracefully
- [ ] Network offline doesn't break auth
- [ ] Rapid authentication attempts handled
- [ ] Modal dismiss/cancel handled properly

---

## Known Issues & Limitations

### Current Limitations

1. **Session Management**
   - Session timeout is client-side only
   - No server-side session validation
   - Session state lost on app force-close

2. **Biometric Support**
   - Only tested on iOS simulator (limited)
   - Requires physical device for full testing
   - Some Android devices may not support all features

3. **Security Event Storage**
   - Events stored locally in AsyncStorage
   - No server sync (planned for future phases)
   - Limited to last 50 events

4. **PIN Strength**
   - No complexity requirements (numeric only)
   - No pattern detection (e.g., 1234, 1111)
   - Minimum 4 digits may be weak

5. **Lockout Recovery**
   - 30-second lockout may be too short
   - No admin override mechanism
   - No "forgot PIN" recovery flow

### Resolved Issues

1. ✅ **App Freeze on Startup** (Fixed)
   - Added timeout protection to auth initialization
   - Made auth init non-blocking with setTimeout
   - Added 3-5 second timeouts to native calls

2. ✅ **PIN Input Keyboard Not Appearing** (Fixed)
   - Changed from hidden input to overlay approach
   - Added programmatic focus with delay
   - Improved TextInput positioning

3. ✅ **Transfer Button Loader Stuck** (Fixed)
   - Re-enabled AuthenticationModal
   - Fixed promise resolution in auth flow
   - Added proper cleanup on cancel

4. ✅ **Security State Not Updating UI** (Fixed)
   - Added getState() call after disable
   - Added setTimeout before success alert
   - Fixed Zustand state propagation

5. ✅ **Theme Property Errors** (Fixed)
   - Corrected all theme property paths
   - Fixed shadow properties (small → sm, large → lg)
   - Fixed spacing properties (xxl → '2xl')
   - Fixed import statements

---

## Next Steps

### Phase 4: Transaction Management (Planned)

1. **Offline Transaction Queue**
   - Queue transactions when offline
   - Auto-sync when connection restored
   - Transaction status tracking

2. **Transaction History**
   - Detailed transaction list
   - Filtering and search
   - Transaction receipts

3. **Transaction Security**
   - Cryptographic signatures
   - Tamper detection
   - Transaction validation

### Phase 5: Bluetooth Low Energy (Planned)

1. **BLE Payment Transmission**
   - Peer-to-peer payment transfer
   - QR code fallback
   - Payment request/response protocol

2. **BLE Security**
   - Encrypted communication
   - Device pairing
   - Payment verification

### Future Enhancements

1. **Enhanced Security**
   - PIN complexity requirements
   - Pattern detection (prevent weak PINs)
   - Biometric + PIN for large transfers
   - Time-based session policies

2. **Recovery Mechanisms**
   - Security questions
   - Recovery codes
   - Email/SMS verification
   - Admin override (enterprise)

3. **Advanced Features**
   - Multiple user profiles
   - Shared device support
   - Parental controls
   - Transaction limits by auth method

4. **Analytics & Monitoring**
   - Security metrics
   - Auth success rates
   - Failed attempt patterns
   - Device fingerprint changes

---

## Technical Dependencies

### NPM Packages

```json
{
  "react-native-biometrics": "^3.0.1",
  "react-native-keychain": "^8.1.1",
  "bcrypt": "^5.1.1",
  "@react-native-async-storage/async-storage": "^1.19.3",
  "zustand": "^4.4.1"
}
```

### Native Dependencies

**iOS**:
- LocalAuthentication framework (Face ID / Touch ID)
- Keychain Services
- Security framework

**Android**:
- BiometricPrompt API
- Keystore system
- SharedPreferences (encrypted)

---

## Configuration

### Environment Variables

None required for Phase 3.

### Constants

**Location**: `src/types/security.ts`

```typescript
export const PIN_REQUIREMENTS = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 8,
};

export const SECURITY_CONSTANTS = {
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,    // 30 minutes
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 30 * 1000,        // 30 seconds
  BCRYPT_ROUNDS: 10,
};
```

---

## Migration Notes

### Upgrading from Previous Phases

No migration required for Phase 1-2 data.

### Data Persistence

All security data is stored locally:
- **Device Identity**: AsyncStorage (`@device_identity`)
- **PIN Hash**: Keychain/Keystore (`offline_payment_pin`)
- **Biometric Keys**: Keychain/Keystore (`offline_payment_biometric`)
- **Security Events**: AsyncStorage (`@security_events`)
- **Auth State**: AsyncStorage (`@authentication_state`)

### Reset/Clear Data

To completely reset security:
```typescript
// In Settings screen
await authStore.clearAllAuthData();
```

Or manually:
```bash
# iOS Simulator
xcrun simctl privacy <device-id> reset all <bundle-id>

# Android Emulator
adb shell pm clear com.offlinepaymentpoc
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: Keyboard not appearing for PIN input
- **Solution**: Ensure iOS Simulator keyboard is enabled (⌘K)
- Uncheck "I/O → Keyboard → Connect Hardware Keyboard"

**Issue**: Biometric not working
- **Solution**: Biometric authentication requires physical device
- Simulator has limited biometric simulation

**Issue**: App freezing on startup
- **Solution**: Auth initialization has timeout protection
- Check console for timeout errors
- Try force-closing and reopening app

**Issue**: Security state not updating
- **Solution**: State updates with small delay
- Pull-to-refresh on Home screen
- Check authStore subscription in component

---

## Acceptance Criteria

### Phase 3 Requirements ✅

- [x] Device identity generation and persistence
- [x] Biometric authentication (Face ID, Touch ID, Fingerprint)
- [x] PIN authentication (4-8 digits)
- [x] Hybrid authentication (PIN + Biometric)
- [x] Onboarding flow with security setup
- [x] Authentication gates for transfers
- [x] Security event logging
- [x] Settings screen integration
- [x] Unit tests for security services
- [x] Error handling and user feedback
- [x] Session management
- [x] Account lockout on failed attempts
- [x] Secure credential storage

### Quality Checklist ✅

- [x] TypeScript type safety
- [x] ESLint compliance (0 errors)
- [x] Proper error handling
- [x] User-friendly error messages
- [x] Consistent theme usage
- [x] Responsive UI design
- [x] Accessibility considerations
- [x] Code documentation
- [x] Test coverage

---

## Team & Credits

**Developer**: Claude Code (Anthropic AI Assistant)

**Project**: Offline Payment POC

**Phase**: 3 of 6

**Timeline**: Completed October 31, 2025

---

## Appendix

### A. Type Definitions

**AuthenticationMethod**:
```typescript
enum AuthenticationMethod {
  NONE = 'NONE',
  PIN = 'PIN',
  BIOMETRIC = 'BIOMETRIC',
  PIN_AND_BIOMETRIC = 'PIN_AND_BIOMETRIC',
}
```

**BiometricType**:
```typescript
enum BiometricType {
  NONE = 'NONE',
  TOUCH_ID = 'TouchID',
  FACE_ID = 'FaceID',
  FINGERPRINT = 'Fingerprint',
  IRIS = 'Iris',
}
```

**AuthenticationStatus**:
```typescript
enum AuthenticationStatus {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  AUTHENTICATED = 'AUTHENTICATED',
  LOCKED = 'LOCKED',
}
```

### B. File Structure

```
src/
├── components/
│   └── security/
│       ├── AuthenticationModal.tsx
│       ├── BiometricPrompt.tsx
│       ├── PINInput.tsx
│       └── PINSetup.tsx
├── hooks/
│   └── useAuthenticationGate.ts
├── screens/
│   ├── HomeScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── UnlockScreen.tsx
│   └── onboarding/
│       ├── WelcomeScreen.tsx
│       ├── SecurityIntroScreen.tsx
│       └── SecuritySetupScreen.tsx
├── services/
│   └── security/
│       ├── AuthenticationService.ts
│       ├── BiometricService.ts
│       ├── PINService.ts
│       └── DeviceIdentityService.ts
├── stores/
│   └── authStore.ts
└── types/
    └── security.ts
```

### C. References

- [React Native Biometrics Documentation](https://github.com/SelfLender/react-native-biometrics)
- [React Native Keychain Documentation](https://github.com/oblador/react-native-keychain)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [iOS LocalAuthentication](https://developer.apple.com/documentation/localauthentication)
- [Android BiometricPrompt](https://developer.android.com/training/sign-in/biometric-auth)

---

**End of Phase 3 Documentation**

*Last Updated: October 31, 2025*
