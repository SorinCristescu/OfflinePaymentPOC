# SMVC Offline Payment Application - Task Assignment Matrix
## Implementation Roadmap & Sub-Agent Delegation

**Document Version:** 1.0
**Date:** October 31, 2025
**Project:** Offline Payment POC
**Status:** Ready for Implementation

---

## Executive Summary

This document provides a comprehensive task breakdown for the 7-phase implementation of the Secure Mobile Cryptographic Vault (SMVC) offline payment application. Each task has been analyzed for dependencies, effort estimation, and status assignment based on dependency logic.

### Implementation Timeline

- **Total Duration**: 12-16 weeks
- **Phases**: 7
- **Total Tasks**: 85
- **Sub-Agent Types**: 5 (Frontend, Backend/Services, Native/Platform, QA, DevOps)

### Phase Overview

| Phase | Duration | Tasks | Status |
|-------|----------|-------|--------|
| Phase 1: Foundation & Basic UI | 1.5 weeks | 15 | Ready to Start |
| Phase 2: Balance Management | 1 week | 12 | Blocked by Phase 1 |
| Phase 3: Local Security | 1 week | 13 | Blocked by Phase 2 |
| Phase 4: Hardware Security (TEE/SE) | 2.5 weeks | 16 | Blocked by Phase 3 |
| Phase 5: BLE Communication | 1.5 weeks | 12 | Blocked by Phase 4 |
| Phase 6: P2P Payment Protocol | 2 weeks | 10 | Blocked by Phase 5 |
| Phase 7: NFC & Final Hardening | 2.5 weeks | 7 | Blocked by Phase 6 |

---

## Task Assignment Legend

### Sub-Agent Types

- **FE**: Frontend Developer (React Native UI/UX)
- **BE**: Backend/Services Developer (TypeScript business logic)
- **NP**: Native Platform Developer (iOS Swift / Android Kotlin)
- **QA**: Quality Assurance Engineer (Testing & Validation)
- **DO**: DevOps Engineer (Build, deployment, tooling)

### Status Definitions

- **To Do**: No dependencies OR all dependencies are To Do/In Progress/Completed
- **In Progress**: Currently being worked on
- **Blocked**: Dependencies not started due to external constraints
- **Completed**: Task fully finished and verified

### Dependency Notation

- `P{n}-T{m}`: Phase n, Task m
- `P{n}`: All tasks in Phase n must be complete
- `None`: No dependencies

---

## Phase 1: Project Foundation & Basic UI

**Objective**: Establish development infrastructure, navigation, basic UI components
**Duration**: 1.5 weeks (60 hours)
**Prerequisites**: None - Starting phase

| ID | Task Description | Type | Assigned To | Dependencies | Effort | Status |
|----|-----------------|------|-------------|--------------|--------|--------|
| P1-T01 | Install and configure project dependencies (Zustand, React Navigation, etc.) | DO | DevOps | None | 2h | To Do |
| P1-T02 | Configure React Native Vector Icons for iOS and Android | DO | DevOps | P1-T01 | 1h | To Do |
| P1-T03 | Set up ESLint with strict TypeScript rules and Prettier integration | DO | DevOps | P1-T01 | 2h | To Do |
| P1-T04 | Create theme system (colors.ts, typography.ts, spacing.ts) | FE | Frontend | P1-T01 | 4h | To Do |
| P1-T05 | Implement Zustand walletStore with mock data and devtools | BE | Backend | P1-T01 | 3h | To Do |
| P1-T06 | Implement Zustand authStore (basic structure) | BE | Backend | P1-T01 | 2h | To Do |
| P1-T07 | Create RootNavigator with stack navigation | FE | Frontend | P1-T05, P1-T06 | 3h | To Do |
| P1-T08 | Create TabNavigator with bottom tabs and icons | FE | Frontend | P1-T07 | 2h | To Do |
| P1-T09 | Define TypeScript navigation types | FE | Frontend | P1-T07 | 1h | To Do |
| P1-T10 | Create common components (Button, Card, Input, LoadingSpinner) | FE | Frontend | P1-T04 | 8h | To Do |
| P1-T11 | Create BalanceCard component with online/offline styling | FE | Frontend | P1-T10 | 3h | To Do |
| P1-T12 | Create AmountDisplay component with currency formatting | FE | Frontend | P1-T10 | 2h | To Do |
| P1-T13 | Implement WalletHomeScreen with balance display and actions | FE | Frontend | P1-T11, P1-T08 | 4h | To Do |
| P1-T14 | Implement placeholder screens (P2PTransfer, TransactionHistory, Settings) | FE | Frontend | P1-T08 | 3h | To Do |
| P1-T15 | Update App.tsx with SafeAreaProvider and RootNavigator | FE | Frontend | P1-T07 | 1h | To Do |
| P1-T16 | Write unit tests for Zustand stores (>80% coverage) | QA | QA | P1-T05, P1-T06 | 3h | To Do |
| P1-T17 | Write unit tests for common components | QA | QA | P1-T10 | 3h | To Do |
| P1-T18 | Manual testing: navigation, UI consistency, dark mode | QA | QA | P1-T13, P1-T14 | 2h | To Do |
| P1-T19 | Create Phase 1 documentation with ADRs and lessons learned | FE | Frontend | P1-T18 | 3h | To Do |
| P1-T20 | Phase 1 code review and acceptance criteria validation | QA | QA | P1-T19 | 2h | To Do |

**Phase 1 Summary**:
- **Total Tasks**: 20
- **Frontend**: 10 tasks, 34 hours
- **Backend**: 2 tasks, 5 hours
- **DevOps**: 3 tasks, 5 hours
- **QA**: 5 tasks, 13 hours
- **Critical Path**: P1-T01 → P1-T05 → P1-T07 → P1-T08 → P1-T13 → P1-T18 → P1-T20

---

## Phase 2: Mock Balance Management & In-App Bank Simulation

**Objective**: Implement business logic for balance transfers and transaction history
**Duration**: 1 week (40 hours)
**Prerequisites**: Phase 1 completed

| ID | Task Description | Type | Assigned To | Dependencies | Effort | Status |
|----|-----------------|------|-------------|--------------|--------|--------|
| P2-T01 | Install AsyncStorage, uuid, Zod dependencies | DO | DevOps | P1 | 1h | Blocked |
| P2-T02 | Create utility files (constants.ts, validation.ts, formatting.ts) | BE | Backend | P2-T01 | 4h | Blocked |
| P2-T03 | Implement TransactionStorageService with AsyncStorage | BE | Backend | P2-T01 | 4h | Blocked |
| P2-T04 | Implement BankMockService with simulated API calls | BE | Backend | P2-T02 | 3h | Blocked |
| P2-T05 | Implement TransactionService with CRUD operations | BE | Backend | P2-T03 | 4h | Blocked |
| P2-T06 | Update walletStore with persistence and transfer logic | BE | Backend | P2-T04, P2-T05 | 4h | Blocked |
| P2-T07 | Create transactionStore with load/refresh actions | BE | Backend | P2-T05 | 2h | Blocked |
| P2-T08 | Create AmountInput component with validation | FE | Frontend | P2-T02 | 3h | Blocked |
| P2-T09 | Create TransferForm component with preview | FE | Frontend | P2-T08, P2-T06 | 5h | Blocked |
| P2-T10 | Update TransactionItem component with full details | FE | Frontend | P2-T07 | 3h | Blocked |
| P2-T11 | Update TransferOnlineToOfflineScreen with TransferForm | FE | Frontend | P2-T09 | 2h | Blocked |
| P2-T12 | Update TransactionHistoryScreen with pull-to-refresh | FE | Frontend | P2-T10, P2-T07 | 3h | Blocked |
| P2-T13 | Write unit tests for all services (>85% coverage) | QA | QA | P2-T03, P2-T04, P2-T05 | 4h | Blocked |
| P2-T14 | Write integration tests for transfer flow | QA | QA | P2-T06, P2-T07 | 3h | Blocked |
| P2-T15 | Manual testing: transfers, validation, error handling | QA | QA | P2-T11, P2-T12 | 3h | Blocked |
| P2-T16 | Create Phase 2 documentation with service architecture | BE | Backend | P2-T15 | 3h | Blocked |
| P2-T17 | Phase 2 code review and acceptance criteria validation | QA | QA | P2-T16 | 2h | Blocked |

**Phase 2 Summary**:
- **Total Tasks**: 17
- **Frontend**: 5 tasks, 16 hours
- **Backend**: 7 tasks, 24 hours
- **DevOps**: 1 task, 1 hour
- **QA**: 4 tasks, 12 hours
- **Critical Path**: P1 → P2-T01 → P2-T02 → P2-T04 → P2-T06 → P2-T09 → P2-T15 → P2-T17

---

## Phase 3: Device Identity & Local Security Foundation

**Objective**: Implement device-based identity, PIN/password security, biometric authentication UI
**Duration**: 1 week (40 hours)
**Prerequisites**: Phase 2 completed

| ID | Task Description | Type | Assigned To | Dependencies | Effort | Status |
|----|-----------------|------|-------------|--------------|--------|--------|
| P3-T01 | Install biometrics, keychain, crypto dependencies | DO | DevOps | P2 | 1h | Blocked |
| P3-T02 | Define security type definitions (DeviceIdentity, BiometricCapabilities) | BE | Backend | P3-T01 | 2h | Blocked |
| P3-T03 | Implement DeviceIdentityService (generate, persist device ID) | BE | Backend | P3-T02 | 4h | Blocked |
| P3-T04 | Implement BiometricService (capabilities check, authentication) | BE | Backend | P3-T02 | 4h | Blocked |
| P3-T05 | Implement PINService (setup, verify, hash) | BE | Backend | P3-T02 | 4h | Blocked |
| P3-T06 | Implement AuthenticationService (orchestrate biometric + PIN) | BE | Backend | P3-T04, P3-T05 | 3h | Blocked |
| P3-T07 | Update authStore with authentication state management | BE | Backend | P3-T06 | 3h | Blocked |
| P3-T08 | Create PINInput component with masked input | FE | Frontend | P3-T02 | 4h | Blocked |
| P3-T09 | Create PINSetup component with confirmation flow | FE | Frontend | P3-T08 | 3h | Blocked |
| P3-T10 | Create BiometricPrompt component | FE | Frontend | P3-T04 | 3h | Blocked |
| P3-T11 | Create onboarding flow screens (Welcome, SecurityIntro, SetupSteps) | FE | Frontend | P3-T09, P3-T10 | 6h | Blocked |
| P3-T12 | Create UnlockScreen with biometric/PIN options | FE | Frontend | P3-T08, P3-T10 | 4h | Blocked |
| P3-T13 | Add authentication gates to sensitive operations (transfers) | BE | Backend | P3-T06, P3-T07 | 3h | Blocked |
| P3-T14 | Update WalletHomeScreen with security status indicator | FE | Frontend | P3-T07 | 2h | Blocked |
| P3-T15 | Write unit tests for security services | QA | QA | P3-T03, P3-T04, P3-T05, P3-T06 | 4h | Blocked |
| P3-T16 | Write component tests for PIN and biometric UI | QA | QA | P3-T08, P3-T09, P3-T10 | 3h | Blocked |
| P3-T17 | Manual testing: onboarding, authentication, error handling | QA | QA | P3-T11, P3-T12, P3-T13 | 3h | Blocked |
| P3-T18 | Create Phase 3 documentation with authentication flows | BE | Backend | P3-T17 | 3h | Blocked |
| P3-T19 | Phase 3 code review and acceptance criteria validation | QA | QA | P3-T18 | 2h | Blocked |

**Phase 3 Summary**:
- **Total Tasks**: 19
- **Frontend**: 6 tasks, 22 hours
- **Backend**: 7 tasks, 23 hours
- **DevOps**: 1 task, 1 hour
- **QA**: 5 tasks, 15 hours
- **Critical Path**: P2 → P3-T01 → P3-T02 → P3-T04/P3-T05 → P3-T06 → P3-T07 → P3-T13 → P3-T17 → P3-T19

---

## Phase 4: Hardware Security Integration (TEE/SE)

**Objective**: Integrate Android Keystore/TEE and iOS Secure Enclave for hardware-backed security
**Duration**: 2.5 weeks (100 hours)
**Prerequisites**: Phase 3 completed

| ID | Task Description | Type | Assigned To | Dependencies | Effort | Status |
|----|-----------------|------|-------------|--------------|--------|--------|
| P4-T01 | Research iOS Secure Enclave APIs and best practices | NP | Native (iOS) | P3 | 4h | Blocked |
| P4-T02 | Research Android Keystore/TEE APIs and best practices | NP | Native (Android) | P3 | 4h | Blocked |
| P4-T03 | Design native module interfaces (key management, signing, encryption) | NP | Native (Both) | P4-T01, P4-T02 | 4h | Blocked |
| P4-T04 | Implement iOS SMVCSecurityModule (Swift) - Key Management | NP | Native (iOS) | P4-T03 | 8h | Blocked |
| P4-T05 | Implement iOS SMVCSecurityModule (Swift) - Signing | NP | Native (iOS) | P4-T04 | 6h | Blocked |
| P4-T06 | Implement iOS SMVCSecurityModule (Swift) - Encryption | NP | Native (iOS) | P4-T04 | 6h | Blocked |
| P4-T07 | Implement iOS SMVCSecurityModule (Swift) - Biometric Integration | NP | Native (iOS) | P4-T04 | 6h | Blocked |
| P4-T08 | Create iOS Objective-C bridge for SMVCSecurityModule | NP | Native (iOS) | P4-T05, P4-T06, P4-T07 | 4h | Blocked |
| P4-T09 | Implement Android SMVCSecurityModule (Kotlin) - Key Management | NP | Native (Android) | P4-T03 | 8h | Blocked |
| P4-T10 | Implement Android SMVCSecurityModule (Kotlin) - Signing | NP | Native (Android) | P4-T09 | 6h | Blocked |
| P4-T11 | Implement Android SMVCSecurityModule (Kotlin) - Encryption | NP | Native (Android) | P4-T09 | 6h | Blocked |
| P4-T12 | Implement Android SMVCSecurityModule (Kotlin) - Biometric Integration | NP | Native (Android) | P4-T09 | 6h | Blocked |
| P4-T13 | Register Android native module in SMVCPackage | NP | Native (Android) | P4-T10, P4-T11, P4-T12 | 2h | Blocked |
| P4-T14 | Create KeyManagementService (TypeScript wrapper for native) | BE | Backend | P4-T08, P4-T13 | 6h | Blocked |
| P4-T15 | Create EncryptionService (TypeScript wrapper for native) | BE | Backend | P4-T08, P4-T13 | 5h | Blocked |
| P4-T16 | Update BiometricService to use TEE/SE verification | BE | Backend | P4-T08, P4-T13 | 4h | Blocked |
| P4-T17 | Implement secure balance storage using SE/TEE encryption | BE | Backend | P4-T15 | 5h | Blocked |
| P4-T18 | Update walletStore to use SE/TEE for offline balance | BE | Backend | P4-T17 | 4h | Blocked |
| P4-T19 | Integrate hardware-backed key generation on device setup | BE | Backend | P4-T14 | 4h | Blocked |
| P4-T20 | Update authentication flows to require TEE/SE verification | BE | Backend | P4-T16 | 3h | Blocked |
| P4-T21 | Write native module tests (iOS XCTest) | QA | QA | P4-T08 | 6h | Blocked |
| P4-T22 | Write native module tests (Android Instrumented Tests) | QA | QA | P4-T13 | 6h | Blocked |
| P4-T23 | Write integration tests for TypeScript-Native bridge | QA | QA | P4-T14, P4-T15, P4-T16 | 4h | Blocked |
| P4-T24 | Manual testing on physical devices (SE/TEE verification) | QA | QA | P4-T18, P4-T19, P4-T20 | 6h | Blocked |
| P4-T25 | Security audit: verify keys never leave SE/TEE | QA | QA | P4-T24 | 4h | Blocked |
| P4-T26 | Create Phase 4 documentation with SE/TEE architecture | NP | Native (Both) | P4-T25 | 4h | Blocked |
| P4-T27 | Phase 4 code review and acceptance criteria validation | QA | QA | P4-T26 | 3h | Blocked |

**Phase 4 Summary**:
- **Total Tasks**: 27
- **Native (iOS)**: 6 tasks, 34 hours
- **Native (Android)**: 6 tasks, 34 hours
- **Backend**: 8 tasks, 31 hours
- **QA**: 7 tasks, 29 hours
- **Critical Path**: P3 → P4-T01/P4-T02 → P4-T03 → P4-T04/P4-T09 → P4-T08/P4-T13 → P4-T14 → P4-T17 → P4-T18 → P4-T24 → P4-T27

---

## Phase 5: BLE Communication Foundation

**Objective**: Implement BLE device discovery, pairing, and secure message exchange
**Duration**: 1.5 weeks (60 hours)
**Prerequisites**: Phase 4 completed

| ID | Task Description | Type | Assigned To | Dependencies | Effort | Status |
|----|-----------------|------|-------------|--------------|--------|--------|
| P5-T01 | Install react-native-ble-plx and configure permissions | DO | DevOps | P4 | 2h | Blocked |
| P5-T02 | Create BLE type definitions (BLEDevice, SecureMessage, MessageType) | BE | Backend | P5-T01 | 3h | Blocked |
| P5-T03 | Implement BLEService - device scanning and discovery | BE | Backend | P5-T02 | 6h | Blocked |
| P5-T04 | Implement BLEService - connection management | BE | Backend | P5-T03 | 5h | Blocked |
| P5-T05 | Implement BLEService - secure message protocol | BE | Backend | P5-T04 | 8h | Blocked |
| P5-T06 | Implement ProtocolService - mutual authentication flow | BE | Backend | P5-T05 | 8h | Blocked |
| P5-T07 | Integrate SE/TEE signing into authentication protocol | BE | Backend | P5-T06 | 5h | Blocked |
| P5-T08 | Create bleStore for BLE state management | BE | Backend | P5-T04 | 3h | Blocked |
| P5-T09 | Create DeviceSelector component (scan, list, connect) | FE | Frontend | P5-T08 | 6h | Blocked |
| P5-T10 | Create ConnectionStatus component with signal strength | FE | Frontend | P5-T08 | 3h | Blocked |
| P5-T11 | Update P2PTransferScreen with device discovery UI | FE | Frontend | P5-T09, P5-T10 | 4h | Blocked |
| P5-T12 | Write unit tests for BLEService and ProtocolService | QA | QA | P5-T03, P5-T04, P5-T05, P5-T06 | 6h | Blocked |
| P5-T13 | Manual testing: BLE discovery and connection (2 devices) | QA | QA | P5-T11 | 4h | Blocked |
| P5-T14 | Manual testing: mutual authentication flow | QA | QA | P5-T07 | 3h | Blocked |
| P5-T15 | Create Phase 5 documentation with protocol specifications | BE | Backend | P5-T14 | 3h | Blocked |
| P5-T16 | Phase 5 code review and acceptance criteria validation | QA | QA | P5-T15 | 2h | Blocked |

**Phase 5 Summary**:
- **Total Tasks**: 16
- **Frontend**: 3 tasks, 13 hours
- **Backend**: 8 tasks, 41 hours
- **DevOps**: 1 task, 2 hours
- **QA**: 4 tasks, 15 hours
- **Critical Path**: P4 → P5-T01 → P5-T02 → P5-T03 → P5-T04 → P5-T05 → P5-T06 → P5-T07 → P5-T14 → P5-T16

---

## Phase 6: Secure P2P Payment Protocol

**Objective**: Implement atomic value transfer protocol with SE/TEE verification
**Duration**: 2 weeks (80 hours)
**Prerequisites**: Phase 5 completed

| ID | Task Description | Type | Assigned To | Dependencies | Effort | Status |
|----|-----------------|------|-------------|--------------|--------|--------|
| P6-T01 | Design atomic transaction protocol (proposal, accept, commit) | BE | Backend | P5 | 6h | Blocked |
| P6-T02 | Implement transaction proposal with SE/TEE signature | BE | Backend | P6-T01 | 8h | Blocked |
| P6-T03 | Implement transaction acceptance with balance verification | BE | Backend | P6-T02 | 6h | Blocked |
| P6-T04 | Implement atomic commit (simultaneous increment/decrement) | BE | Backend | P6-T03 | 10h | Blocked |
| P6-T05 | Implement transaction rollback for failures | BE | Backend | P6-T04 | 6h | Blocked |
| P6-T06 | Implement transaction receipt generation | BE | Backend | P6-T04 | 4h | Blocked |
| P6-T07 | Create transferStore for P2P transfer state | BE | Backend | P6-T06 | 4h | Blocked |
| P6-T08 | Create TransactionConfirmation component with details | FE | Frontend | P6-T07 | 5h | Blocked |
| P6-T09 | Create TransactionReceipt component with signatures | FE | Frontend | P6-T06 | 4h | Blocked |
| P6-T10 | Update P2PTransferScreen with full flow (amount, device, confirm) | FE | Frontend | P6-T08, P6-T09 | 6h | Blocked |
| P6-T11 | Implement transaction timeout and cleanup | BE | Backend | P6-T05 | 4h | Blocked |
| P6-T12 | Write unit tests for transaction protocol | QA | QA | P6-T02, P6-T03, P6-T04, P6-T05 | 8h | Blocked |
| P6-T13 | Write integration tests for end-to-end P2P transfer | QA | QA | P6-T06, P6-T07 | 6h | Blocked |
| P6-T14 | Manual testing: complete P2P transfer between 2 devices | QA | QA | P6-T10 | 6h | Blocked |
| P6-T15 | Security testing: verify atomicity and non-repudiation | QA | QA | P6-T14 | 4h | Blocked |
| P6-T16 | Create Phase 6 documentation with protocol diagrams | BE | Backend | P6-T15 | 4h | Blocked |
| P6-T17 | Phase 6 code review and acceptance criteria validation | QA | QA | P6-T16 | 2h | Blocked |

**Phase 6 Summary**:
- **Total Tasks**: 17
- **Frontend**: 3 tasks, 15 hours
- **Backend**: 9 tasks, 52 hours
- **QA**: 5 tasks, 26 hours
- **Critical Path**: P5 → P6-T01 → P6-T02 → P6-T03 → P6-T04 → P6-T06 → P6-T07 → P6-T10 → P6-T14 → P6-T15 → P6-T17

---

## Phase 7: NFC Integration & Final Hardening

**Objective**: Add NFC support, comprehensive security audit, production readiness
**Duration**: 2.5 weeks (100 hours)
**Prerequisites**: Phase 6 completed

| ID | Task Description | Type | Assigned To | Dependencies | Effort | Status |
|----|-----------------|------|-------------|--------------|--------|--------|
| P7-T01 | Install react-native-nfc-manager and configure | DO | DevOps | P6 | 2h | Blocked |
| P7-T02 | Create iOS SMVCNFCModule (Swift) | NP | Native (iOS) | P7-T01 | 8h | Blocked |
| P7-T03 | Create Android SMVCNFCModule (Kotlin) | NP | Native (Android) | P7-T01 | 8h | Blocked |
| P7-T04 | Implement NFCService (TypeScript wrapper) | BE | Backend | P7-T02, P7-T03 | 6h | Blocked |
| P7-T05 | Integrate NFC into P2P transfer flow | BE | Backend | P7-T04 | 6h | Blocked |
| P7-T06 | Add channel selection UI (BLE vs NFC) | FE | Frontend | P7-T05 | 4h | Blocked |
| P7-T07 | Comprehensive threat modeling session | QA | QA | P7-T06 | 6h | Blocked |
| P7-T08 | Security audit: key management and storage | QA | QA | P7-T07 | 8h | Blocked |
| P7-T09 | Security audit: transaction protocol | QA | QA | P7-T07 | 6h | Blocked |
| P7-T10 | Security audit: communication channels (BLE/NFC) | QA | QA | P7-T07 | 6h | Blocked |
| P7-T11 | Performance optimization: app launch time | BE | Backend | P7-T08 | 6h | Blocked |
| P7-T12 | Performance optimization: transaction speed | BE | Backend | P7-T09 | 6h | Blocked |
| P7-T13 | Implement comprehensive error handling and recovery | BE | Backend | P7-T10 | 8h | Blocked |
| P7-T14 | Implement logging and monitoring framework | BE | Backend | None (parallel) | 6h | To Do |
| P7-T15 | UX polish: animations, transitions, feedback | FE | Frontend | P7-T06 | 8h | Blocked |
| P7-T16 | Accessibility audit (WCAG 2.1 Level AA) | QA | QA | P7-T15 | 6h | Blocked |
| P7-T17 | Create user documentation and help screens | FE | Frontend | P7-T16 | 6h | Blocked |
| P7-T18 | Final end-to-end testing on physical devices | QA | QA | P7-T13, P7-T15 | 8h | Blocked |
| P7-T19 | Create production build configuration | DO | DevOps | P7-T18 | 4h | Blocked |
| P7-T20 | Create deployment documentation and runbook | DO | DevOps | P7-T19 | 4h | Blocked |
| P7-T21 | Final security audit sign-off | QA | QA | P7-T08, P7-T09, P7-T10, P7-T18 | 4h | Blocked |
| P7-T22 | Phase 7 comprehensive documentation | BE | Backend | P7-T21 | 6h | Blocked |
| P7-T23 | Project completion review and retrospective | QA | QA | P7-T22 | 3h | Blocked |

**Phase 7 Summary**:
- **Total Tasks**: 23
- **Frontend**: 3 tasks, 18 hours
- **Backend**: 7 tasks, 44 hours
- **Native**: 2 tasks, 16 hours
- **DevOps**: 3 tasks, 10 hours
- **QA**: 8 tasks, 47 hours
- **Critical Path**: P6 → P7-T01 → P7-T02/P7-T03 → P7-T04 → P7-T05 → P7-T06 → P7-T07 → P7-T08/P7-T09/P7-T10 → P7-T18 → P7-T21 → P7-T23

---

## Overall Project Statistics

### Total Effort by Sub-Agent Type

| Sub-Agent Type | Total Tasks | Total Hours | Percentage |
|----------------|-------------|-------------|------------|
| Frontend (FE) | 30 | 123h | 23% |
| Backend (BE) | 46 | 194h | 36% |
| Native Platform (NP) | 16 | 84h | 16% |
| QA | 39 | 132h | 25% |
| DevOps (DO) | 9 | 23h | 4% |
| **TOTAL** | **140** | **556h** | **100%** |

### Task Distribution by Phase

| Phase | Frontend | Backend | Native | QA | DevOps | Total |
|-------|----------|---------|--------|-----|--------|-------|
| Phase 1 | 10 | 2 | 0 | 5 | 3 | 20 |
| Phase 2 | 5 | 7 | 0 | 4 | 1 | 17 |
| Phase 3 | 6 | 7 | 0 | 5 | 1 | 19 |
| Phase 4 | 0 | 8 | 12 | 7 | 0 | 27 |
| Phase 5 | 3 | 8 | 0 | 4 | 1 | 16 |
| Phase 6 | 3 | 9 | 0 | 5 | 0 | 17 |
| Phase 7 | 3 | 7 | 2 | 8 | 3 | 23 |
| **TOTAL** | **30** | **48** | **14** | **38** | **9** | **139** |

### Critical Path Analysis

**Longest dependency chain**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

**Key bottleneck phases**:
1. **Phase 4** (Hardware Security): 2.5 weeks, most complex native development
2. **Phase 6** (P2P Protocol): 2 weeks, critical transaction atomicity
3. **Phase 7** (Final Hardening): 2.5 weeks, comprehensive security audit

**Parallel work opportunities**:
- Phase 1: Frontend components can be developed in parallel with Zustand stores
- Phase 4: iOS and Android native modules can be developed in parallel
- Phase 7: Logging framework (P7-T14) can start early as it has no dependencies

---

## Dependency Graph (Critical Path)

```
P1: Foundation (1.5w)
  ↓
P2: Balance Mgmt (1w)
  ↓
P3: Local Security (1w)
  ↓
P4: Hardware Security (2.5w) ← CRITICAL: Native development
  ↓
P5: BLE Communication (1.5w)
  ↓
P6: P2P Protocol (2w) ← CRITICAL: Transaction atomicity
  ↓
P7: NFC & Hardening (2.5w) ← CRITICAL: Security audit
  ↓
✓ Production Ready
```

**Total Critical Path Duration**: 12 weeks (minimum, assuming no delays)
**Recommended Timeline with Buffer**: 14-16 weeks

---

## Risk Matrix

### High-Priority Risks

| Risk | Phase | Mitigation | Owner |
|------|-------|------------|-------|
| SE/TEE integration complexity higher than estimated | P4 | Allocate 20% buffer, early research spike | Native Platform |
| BLE reliability issues on physical devices | P5 | Test early, maintain BLE device matrix | QA |
| Transaction atomicity implementation flaws | P6 | Comprehensive testing, formal verification | Backend |
| Security audit reveals critical vulnerabilities | P7 | Continuous security review throughout | QA |

### Medium-Priority Risks

| Risk | Phase | Mitigation | Owner |
|------|-------|------------|-------|
| AsyncStorage performance bottlenecks | P2 | Monitor performance, consider alternatives | Backend |
| Biometric enrollment rate lower than expected | P3 | Ensure PIN fallback is robust | Backend |
| NFC compatibility issues across devices | P7 | Test on wide device range early | QA |

---

## Success Metrics

### Phase-Level Success Criteria

Each phase must meet these criteria before proceeding:

1. **All tasks completed**: 100% of phase tasks marked as "Completed"
2. **Tests passing**: Unit tests >80% coverage, integration tests pass
3. **Manual testing complete**: All manual test scenarios executed and documented
4. **Code review approved**: Peer review completed with no blocking issues
5. **Documentation updated**: Phase MD file created with lessons learned
6. **Demo-ready**: Can demonstrate phase deliverables to stakeholders

### Project-Level Success Criteria

**Technical Success**:
- ✅ Private keys never leave SE/TEE (verified by security audit)
- ✅ Transaction atomicity guaranteed (100% in tests)
- ✅ BLE and NFC both functional on physical devices
- ✅ App launch time <3 seconds
- ✅ Transaction completion <7 seconds (including mutual auth)

**Quality Success**:
- ✅ Overall test coverage >85%
- ✅ Zero critical security vulnerabilities
- ✅ Accessibility compliance (WCAG 2.1 Level AA)
- ✅ Zero crash rate in final testing

**User Experience Success**:
- ✅ Onboarding completion rate >80% (test users)
- ✅ Transaction success rate >95%
- ✅ User understanding of security features (survey)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| SE | Secure Element - Hardware security module for key storage |
| TEE | Trusted Execution Environment - Isolated execution environment |
| BLE | Bluetooth Low Energy - Wireless communication protocol |
| NFC | Near Field Communication - Short-range wireless technology |
| P2P | Peer-to-Peer - Direct device-to-device communication |
| ADR | Architecture Decision Record - Document explaining key technical decisions |
| Atomicity | Transaction property ensuring all-or-nothing execution |

---

## Appendix B: Tools & Resources

### Development Tools
- **IDE**: Visual Studio Code with React Native extension
- **State Management**: Zustand DevTools
- **Debugging**: Flipper with React Native debugger
- **Testing**: Jest, React Native Testing Library, Detox (optional)

### Native Development
- **iOS**: Xcode 15+, Swift 5.9+
- **Android**: Android Studio, Kotlin 2.1.20

### Physical Testing Devices Required
- **Minimum**: 1 iOS device, 1 Android device (for BLE/NFC testing)
- **Recommended**: 2 iOS devices, 2 Android devices (for cross-platform P2P testing)

### CI/CD (Future)
- GitHub Actions or Bitrise for automated builds
- Fastlane for deployment automation

---

## Appendix C: Notes for Solo Developer

### Time Management Strategies

1. **Focus on one phase at a time**: Complete each phase fully before moving to next
2. **Test incrementally**: Don't accumulate testing debt
3. **Document as you go**: Write phase MD files immediately after completion
4. **Take breaks between phases**: Prevents burnout, allows reflection
5. **Parallelize where possible**: E.g., write tests while waiting for builds

### When to Ask for Help

- **Native module implementation**: If stuck >4 hours, consult iOS/Android communities
- **BLE debugging**: Physical device issues are common, use specialized forums
- **Security review**: Consider bringing in security consultant for Phase 7 audit

### Recommended Phase Order (Priority if time-constrained)

If you need to demonstrate value early or have time constraints:

1. **Must Have**: Phases 1, 2, 3, 4 (Basic app with hardware security)
2. **Should Have**: Phase 5, 6 (BLE P2P transfers)
3. **Nice to Have**: Phase 7 (NFC, final polish)

However, for production deployment, all 7 phases are essential.

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-31 | TPM | Initial task assignment matrix |

---

**End of Task Assignment Matrix**

For detailed implementation specifications for each phase, refer to:
- `/Users/sorin/projects/OfflinePaymentPOC/docs/prd/prd_smvc_offline_payment_20251031.md`
- Individual phase documentation in `/Users/sorin/projects/OfflinePaymentPOC/docs/prd/phases/`
