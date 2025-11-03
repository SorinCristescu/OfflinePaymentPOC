# Phase 6: Offline Payment Protocol - Implementation Plan

## Overview

Phase 6 implements the actual offline payment functionality using the BLE communication foundation from Phase 5. This phase enables secure peer-to-peer payments without internet connectivity.

## Goals

1. **Payment Protocol**: Define payment request/response messages
2. **Transaction Creation**: Create and sign offline transactions
3. **Payment Verification**: Validate payments before processing
4. **Offline Storage**: Queue offline transactions for later sync
5. **Payment UI**: User-friendly payment screens
6. **Transaction Sync**: Sync offline transactions when online

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │SendPayment   │  │ReceivePayment│  │PaymentHistory│      │
│  │   Screen     │  │   Screen     │  │   Screen     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Component Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │PaymentRequest│  │ AmountInput  │  │PaymentStatus │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       State Layer                            │
│  ┌─────────────────┐           ┌─────────────────┐          │
│  │ PaymentStore    │◄─────────►│TransactionStore │          │
│  │  (Zustand)      │           │   (Zustand)     │          │
│  └─────────────────┘           └─────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Payment    │  │ Transaction  │  │  Validation  │      │
│  │  Protocol    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Offline    │  │     Sync     │  │  Settlement  │      │
│  │    Queue     │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     BLE Layer (Phase 5)                      │
│              MessageProtocol + ConnectionManager             │
└─────────────────────────────────────────────────────────────┘
```

## Components to Build

### 1. Services (6 files)

#### `src/services/payment/PaymentProtocol.ts`
- Payment request/response messages
- Payment flow orchestration
- Message encryption/signing

#### `src/services/payment/TransactionService.ts`
- Create offline transactions
- Sign transactions with hardware keys
- Validate transaction data

#### `src/services/payment/ValidationService.ts`
- Validate payment requests
- Check balances
- Verify signatures

#### `src/services/payment/OfflineQueue.ts`
- Queue offline transactions
- Manage pending payments
- Retry logic

#### `src/services/payment/SyncService.ts`
- Sync offline transactions to backend
- Handle conflicts
- Update transaction status

#### `src/services/payment/SettlementService.ts`
- Calculate net balances
- Settlement logic
- Reconciliation

### 2. State Management (1 file)

#### `src/store/paymentStore.ts`
- Active payments state
- Payment history
- Pending transactions

### 3. Types (1 file)

#### `src/types/payment.ts`
- Payment message types
- Transaction types
- Payment status enums

### 4. Components (4 files)

#### `src/components/payment/PaymentRequest.tsx`
- Display payment request details
- Accept/Reject buttons

#### `src/components/payment/AmountInput.tsx`
- Currency input with validation
- Balance display

#### `src/components/payment/PaymentStatus.tsx`
- Payment status indicator
- Progress visualization

#### `src/components/payment/TransactionItem.tsx`
- Transaction list item
- Status indicators

### 5. Screens (3 files)

#### `src/screens/SendPaymentScreen.tsx`
- Select recipient
- Enter amount
- Confirm and send

#### `src/screens/ReceivePaymentScreen.tsx`
- Display QR code
- Show payment request
- Accept payment

#### `src/screens/PaymentHistoryScreen.tsx`
- List offline transactions
- Filter by status
- Sync controls

## Payment Flow

### Sender Flow
```
1. User selects recipient from connected peers
2. User enters payment amount
3. App creates payment request
4. App signs request with hardware key
5. App sends request via BLE
6. Wait for response
7. On accept: Create transaction
8. Sign transaction
9. Send transaction via BLE
10. Queue for sync
11. Show confirmation
```

### Receiver Flow
```
1. Receive payment request via BLE
2. Validate request (signature, amount, balance)
3. Show request to user
4. User accepts/rejects
5. Send response via BLE
6. On accept: Wait for transaction
7. Validate transaction
8. Store in offline queue
9. Update balance
10. Show confirmation
```

## Message Protocol

### Payment Request Message
```typescript
{
  type: 'payment_request',
  id: 'uuid',
  timestamp: 1234567890,
  from: 'sender-device-id',
  to: 'receiver-device-id',
  amount: 100.00,
  currency: 'USD',
  memo: 'Coffee',
  signature: 'base64-signature'
}
```

### Payment Response Message
```typescript
{
  type: 'payment_response',
  id: 'uuid',
  requestId: 'original-request-id',
  timestamp: 1234567890,
  from: 'receiver-device-id',
  to: 'sender-device-id',
  accepted: true,
  signature: 'base64-signature'
}
```

### Transaction Message
```typescript
{
  type: 'payment_transaction',
  id: 'uuid',
  requestId: 'original-request-id',
  timestamp: 1234567890,
  from: 'sender-device-id',
  to: 'receiver-device-id',
  amount: 100.00,
  currency: 'USD',
  memo: 'Coffee',
  nonce: 'unique-nonce',
  signature: 'base64-signature',
  senderSignature: 'base64-signature'
}
```

## Data Models

### OfflineTransaction
```typescript
interface OfflineTransaction {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  currency: string;
  from: string;
  to: string;
  memo?: string;
  timestamp: number;
  status: OfflineTransactionStatus;
  signatures: {
    sender: string;
    receiver?: string;
  };
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncAttempt?: number;
  error?: string;
}
```

### PaymentSession
```typescript
interface PaymentSession {
  id: string;
  deviceId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: number;
  expiresAt: number;
  requestId?: string;
  transactionId?: string;
}
```

## Security Considerations

1. **Transaction Signing**
   - Use hardware-backed keys
   - Double signature (sender + receiver)
   - Nonce to prevent replay

2. **Amount Validation**
   - Check sender balance
   - Validate amount format
   - Currency matching

3. **Identity Verification**
   - Verify device signatures
   - Check trust status
   - Validate public keys

4. **Offline Queue Security**
   - Encrypt stored transactions
   - Prevent tampering
   - Secure sync mechanism

## Implementation Steps

### Step 1: Types and Protocol (Day 1)
- [ ] Create payment types (`src/types/payment.ts`)
- [ ] Create PaymentProtocol service
- [ ] Define message formats
- [ ] Add unit tests

### Step 2: Transaction Management (Day 2)
- [ ] Create TransactionService
- [ ] Implement signing logic
- [ ] Create ValidationService
- [ ] Add validation rules
- [ ] Add unit tests

### Step 3: Offline Queue (Day 3)
- [ ] Create OfflineQueue service
- [ ] Implement storage
- [ ] Add retry logic
- [ ] Create SyncService
- [ ] Add unit tests

### Step 4: State Management (Day 4)
- [ ] Create PaymentStore
- [ ] Add payment actions
- [ ] Add selectors
- [ ] Integration with BLEStore

### Step 5: UI Components (Day 5)
- [ ] Create PaymentRequest component
- [ ] Create AmountInput component
- [ ] Create PaymentStatus component
- [ ] Create TransactionItem component
- [ ] Add styling

### Step 6: Screens (Day 6-7)
- [ ] Create SendPaymentScreen
- [ ] Create ReceivePaymentScreen
- [ ] Create PaymentHistoryScreen
- [ ] Add navigation
- [ ] Integration testing

### Step 7: Integration (Day 8)
- [ ] Integrate with BLE (Phase 5)
- [ ] Integrate with wallet
- [ ] Add error handling
- [ ] End-to-end testing

### Step 8: Documentation (Day 9)
- [ ] User guide
- [ ] API documentation
- [ ] Testing guide

## Testing Strategy

### Unit Tests
- Transaction creation
- Signature validation
- Amount validation
- Queue management
- Sync logic

### Integration Tests
- Full payment flow
- BLE integration
- Offline queue sync
- Error scenarios

### Manual Testing
- Two-device payment
- Offline to online sync
- Network interruption
- Invalid amounts
- Rejected payments

## Success Criteria

- [ ] Can send payment to connected peer
- [ ] Can receive payment from connected peer
- [ ] Transactions signed with hardware keys
- [ ] Offline transactions queued
- [ ] Queued transactions sync when online
- [ ] Balance updates correctly
- [ ] Payment history displays correctly
- [ ] Handles errors gracefully
- [ ] All tests passing
- [ ] Documentation complete

## Future Enhancements (Phase 7+)

- Multi-hop payments
- Payment splitting
- Recurring payments
- Payment requests with QR codes
- Receipt generation
- Dispute resolution
- Escrow functionality

## Estimated Timeline

- **Total**: 9-10 days
- **Core functionality**: 6 days
- **Testing & refinement**: 2-3 days
- **Documentation**: 1 day

## Dependencies

- Phase 5 (BLE Communication) ✅
- KeyManagementService ✅
- WalletStore ✅
- TransactionStore ✅

## Risks & Mitigations

**Risk**: Transaction conflicts during sync
- **Mitigation**: Use timestamps and nonces, implement conflict resolution

**Risk**: Double spending offline
- **Mitigation**: Track balances locally, validate on sync

**Risk**: Lost transactions
- **Mitigation**: Persistent queue, retry logic, transaction IDs

**Risk**: Security vulnerabilities
- **Mitigation**: Hardware key signing, encryption, thorough testing
