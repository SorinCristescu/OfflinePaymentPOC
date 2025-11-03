# Transaction Lifecycle and Balance Updates

## Overview

This document explains what happens when you make a peer-to-peer offline payment transaction in the Offline Payment POC app, including how balances are tracked, updated, and securely stored using hardware encryption.

## Table of Contents

1. [Quick Answer](#quick-answer)
2. [Complete Payment Flow](#complete-payment-flow)
3. [Balance Update Mechanism](#balance-update-mechanism)
4. [Transaction Storage and Security](#transaction-storage-and-security)
5. [Code Implementation Walkthrough](#code-implementation-walkthrough)
6. [Current vs Future Implementation](#current-vs-future-implementation)
7. [Security Guarantees](#security-guarantees)

---

## Quick Answer

**Q: What happens when you do a transaction?**

When you send or receive a peer-to-peer payment:

1. **Transaction is Created** - A signed transaction with balance snapshots is created
2. **Transaction is Stored** - Added to the OfflineQueue (AsyncStorage)
3. **Balance is NOT Immediately Updated** - The wallet balance remains unchanged
4. **Balance Snapshots Recorded** - Transaction records before/after balance states
5. **Later Sync** - Balances will be reconciled when syncing with backend (future phase)

**Q: Is the offline balance updated and secure stored in the phone hardware?**

- **Current Implementation**: The transaction is stored, but the wallet balance is NOT automatically updated during P2P transactions
- **Balance Storage**: When balances ARE updated (via "Transfer Online to Offline"), they are encrypted with hardware-backed encryption (AES-256-GCM + Secure Enclave/TEE)
- **Transaction Storage**: Transactions are stored in AsyncStorage (NOT hardware encrypted) as they need to be synced to backend later

---

## Complete Payment Flow

### Phase 1: Payment Request

```
┌─────────────┐                                    ┌─────────────┐
│   Sender    │                                    │  Receiver   │
│  (Device A) │                                    │  (Device B) │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │ 1. User enters amount and recipient             │
       │                                                  │
       │ 2. PaymentStore.sendPaymentRequest()            │
       │    - Validates sufficient balance               │
       │    - Creates PaymentRequest message             │
       │    - Signs with device key                      │
       │                                                  │
       │ 3. Send via BLE                                 │
       ├─────────────── PaymentRequest ──────────────────>│
       │                                                  │
       │                                                  │ 4. PaymentStore.handlePaymentRequest()
       │                                                  │    - Validates request
       │                                                  │    - Shows notification to user
       │                                                  │
       │                                                  │ 5. User accepts/rejects
       │                                                  │
```

### Phase 2: Payment Response

```
       │                                                  │
       │                                                  │ 6. PaymentStore.acceptPaymentRequest()
       │                                                  │    - Validates own balance
       │                                                  │    - Creates PaymentResponse (accepted=true)
       │                                                  │
       │ 7. Receive acceptance                           │
       │<────────────── PaymentResponse ──────────────────┤
       │                                                  │
       │ 8. PaymentStore.handlePaymentResponse()         │
       │    - Reads current wallet balance               │
       │    - Creates signed transaction                 │
       │    - Records balance snapshots:                 │
       │      * balanceBefore: current offlineBalance    │
       │      * balanceAfter: offlineBalance - amount    │
       │                                                  │
```

### Phase 3: Transaction Creation

```
       │                                                  │
       │ 9. TransactionService.createTransaction()       │
       │    {                                             │
       │      id: uuid(),                                 │
       │      nonce: cryptoNonce(),                       │
       │      amount: 1000,  // $10.00 in cents          │
       │      currency: "USD",                            │
       │      balanceBefore: 5000,  // $50.00            │
       │      balanceAfter: 4000,   // $40.00            │
       │      timestamp: Date.now(),                      │
       │      signature: signWithDeviceKey(...)           │
       │    }                                             │
       │                                                  │
       │ 10. Add to OfflineQueue (sender side)           │
       │     - Type: "sent"                               │
       │     - Status: "pending"                          │
       │     - SyncStatus: "pending"                      │
       │                                                  │
       │ 11. Send transaction via BLE                    │
       ├────────────── PaymentTransaction ───────────────>│
       │                                                  │
       │                                                  │
```

### Phase 4: Transaction Validation

```
       │                                                  │
       │                                                  │ 12. PaymentStore.handlePaymentTransaction()
       │                                                  │     - Validates signature
       │                                                  │     - Checks nonce (replay protection)
       │                                                  │     - Validates amount matches request
       │                                                  │     - Checks balance consistency
       │                                                  │
       │                                                  │ 13. Add to OfflineQueue (receiver side)
       │                                                  │     - Type: "received"
       │                                                  │     - Status: "confirmed"
       │                                                  │     - Records own balance snapshots:
       │                                                  │       * balanceBefore: current balance
       │                                                  │       * balanceAfter: current + amount
       │                                                  │
       │                                                  │ 14. Send confirmation
       │<──────────── PaymentConfirmation ────────────────┤
       │                                                  │
       │                                                  │
```

### Phase 5: Confirmation

```
       │                                                  │
       │ 15. PaymentStore.handlePaymentConfirmation()    │
       │     - Updates transaction status: "confirmed"   │
       │     - Transaction remains in OfflineQueue       │
       │                                                  │
       │ 16. WALLET BALANCE NOT UPDATED!                 │
       │     ⚠️ Balance stays at $50.00                   │
       │     ⚠️ Transaction shows $10.00 sent             │
       │     ⚠️ Waiting for backend sync                  │
       │                                                  │
       │                                                  │ 17. WALLET BALANCE NOT UPDATED!
       │                                                  │     ⚠️ Balance stays unchanged
       │                                                  │     ⚠️ Transaction shows $10.00 received
       │                                                  │     ⚠️ Waiting for backend sync
       │                                                  │
       │                                                  │
```

---

## Balance Update Mechanism

### Current Implementation: Optimistic Offline-First

The current Phase 6 implementation uses an **optimistic offline-first** approach where:

1. **Transactions are Recorded** but balances are NOT immediately updated
2. **Balance Snapshots** are captured in transactions for reconciliation
3. **Backend Sync** (future phase) will reconcile and update actual balances

#### What Gets Stored

**In OfflineQueue** (AsyncStorage):
```typescript
{
  id: "tx_123",
  type: "sent",  // or "received"
  status: "confirmed",
  syncStatus: "pending",
  amount: 1000,  // $10.00
  currency: "USD",
  balanceBefore: 5000,  // What balance WAS
  balanceAfter: 4000,   // What balance SHOULD BE
  timestamp: 1234567890,
  nonce: "abc123...",
  signature: "def456...",
  // ... other fields
}
```

**In WalletStore** (Hardware Encrypted):
```typescript
{
  deviceId: "device_abc",
  onlineBalance: 10000,     // Unchanged
  offlineBalance: 5000,     // ⚠️ NOT updated after transaction
  lastSyncTimestamp: Date
}
```

### When Balances ARE Updated

Balances are currently updated ONLY during:

1. **Transfer Online to Offline** (`walletStore.transferOnlineToOffline()`)
   - User explicitly transfers from mock bank
   - Online balance decremented
   - Offline balance incremented
   - Wallet saved with hardware encryption

2. **Future: Backend Sync** (not yet implemented)
   - Process all pending transactions
   - Reconcile balances with backend
   - Update wallet with final balances
   - Save with hardware encryption

---

## Transaction Storage and Security

### OfflineQueue Storage

**Location**: `src/services/payment/OfflineQueue.ts`

**Storage Mechanism**: AsyncStorage (NOT hardware encrypted)

**Why Not Encrypted?**
- Transactions need to be synced to backend server
- Backend needs to read and verify transactions
- Transactions contain signatures for integrity
- Balances are tracked but not applied locally

**Storage Format**:
```typescript
AsyncStorage.setItem('offline_queue', JSON.stringify([
  {
    id: "tx_001",
    type: "sent",
    status: "confirmed",
    syncStatus: "pending",
    amount: 1000,
    balanceBefore: 5000,
    balanceAfter: 4000,
    signature: "...",  // Cryptographic signature for integrity
    // ... other fields
  },
  // ... more transactions
]))
```

### Wallet Balance Storage

**Location**: `src/services/wallet/BalanceService.ts`

**Storage Mechanism**: AsyncStorage with hardware-backed encryption

**Storage Format**:
```typescript
// Before encryption:
const walletData = {
  onlineBalance: 10000,
  offlineBalance: 5000,
  deviceId: "device_abc",
  lastSyncTimestamp: "2025-11-03T..."
};

// After encryption (stored in AsyncStorage):
AsyncStorage.setItem('encrypted_wallet',
  "base64_encrypted_data_with_ECIES_AES256GCM"
)
```

**Encryption Process**: See [HARDWARE_ENCRYPTION_SECURITY.md](./HARDWARE_ENCRYPTION_SECURITY.md) for complete details.

---

## Code Implementation Walkthrough

### 1. Sending a Payment (Sender Side)

**File**: `src/store/paymentStore.ts:144-190`

```typescript
sendPaymentRequest: async (options: CreatePaymentOptions) => {
  try {
    set({isLoading: true, error: null});

    console.log('[PaymentStore] Sending payment request:', options);

    // Get current balance (reads from walletStore)
    const walletState = useWalletStore.getState();
    const currentBalance = walletState.offlineBalance;

    // Validate payment request
    const validation = ValidationService.validatePaymentRequest(
      {
        id: '',
        type: 'payment_request' as any,
        timestamp: Date.now(),
        from: '',
        to: options.deviceId,
        amount: options.amount,
        currency: options.currency || 'USD',
        memo: options.memo,
        expiresAt: Date.now() + (options.timeout || 300000),
        signature: '',
      },
      currentBalance  // ← Validates against current balance
    );

    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Send payment request via BLE
    const requestId = await PaymentProtocol.sendPaymentRequest(options);

    // Update sessions
    const sessions = PaymentProtocol.getAllSessions();
    set({activeSessions: sessions, isLoading: false});

    return requestId;
  } catch (error) {
    // ... error handling
  }
}
```

### 2. Handling Payment Response (Sender Creates Transaction)

**File**: `src/store/paymentStore.ts:443-478`

```typescript
handlePaymentResponse: async (response: PaymentResponse, from: string) => {
  try {
    console.log('[PaymentStore] Handling payment response:', response.id);

    if (response.accepted) {
      // Create and send transaction
      const session = PaymentProtocol.getSession(response.requestId);
      if (session) {
        // ⚠️ Read current wallet balance (NOT updated yet)
        const walletState = useWalletStore.getState();

        // Create transaction with balance snapshots
        const transaction = await TransactionService.createTransaction({
          requestId: response.requestId,
          toDeviceId: session.deviceId,
          amount: session.amount,
          currency: session.currency,
          memo: session.memo,
          currentBalance: walletState.offlineBalance,  // ← Balance BEFORE
        });

        // Transaction includes:
        // - balanceBefore: current offlineBalance
        // - balanceAfter: current offlineBalance - amount
        // - signature: signed with device key

        await PaymentProtocol.sendPaymentTransaction(response.requestId, transaction);

        // Add to offline queue (NOT encrypted)
        const offlineTx = TransactionService.createOfflineTransaction(transaction, 'sent');
        await OfflineQueue.addTransaction(offlineTx);

        // ⚠️ WALLET BALANCE NOT UPDATED!
        // walletStore.offlineBalance still unchanged
      }
    }

    // Update sessions
    const sessions = PaymentProtocol.getAllSessions();
    set({activeSessions: sessions});

    await get().refreshTransactions();
  } catch (error) {
    console.error('[PaymentStore] Error handling payment response:', error);
  }
}
```

**Key Transaction Service Function**:

**File**: `src/services/payment/TransactionService.ts:createTransaction()`

```typescript
async createTransaction(options: {
  requestId: string;
  toDeviceId: string;
  amount: number;
  currency: string;
  memo?: string;
  currentBalance: number;
}): Promise<PaymentTransaction> {
  try {
    // Generate unique nonce for replay protection
    const nonce = await this.generateNonce();

    // Create transaction payload
    const transaction: PaymentTransaction = {
      id: uuid.v4(),
      type: 'payment_transaction',
      requestId: options.requestId,
      from: await this.getDeviceId(),
      to: options.toDeviceId,
      amount: options.amount,
      currency: options.currency,
      memo: options.memo,
      timestamp: Date.now(),
      nonce,
      balanceBefore: options.currentBalance,
      balanceAfter: options.currentBalance - options.amount,  // ← Calculated
      signature: '',  // Will be signed below
    };

    // Sign transaction with device key
    const signature = await KeyManagementService.sign(
      KeyIds.DEVICE_MASTER,
      JSON.stringify({
        id: transaction.id,
        amount: transaction.amount,
        from: transaction.from,
        to: transaction.to,
        nonce: transaction.nonce,
        timestamp: transaction.timestamp,
      })
    );

    transaction.signature = signature;

    return transaction;
  } catch (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
}
```

### 3. Receiving a Transaction (Receiver Side)

**File**: `src/store/paymentStore.ts:483-513`

```typescript
handlePaymentTransaction: async (transaction: PaymentTransaction, from: string) => {
  try {
    console.log('[PaymentStore] Handling payment transaction:', transaction.id);

    // Validate transaction
    const walletState = useWalletStore.getState();
    const usedNonces = get().offlineTransactions.map(tx => tx.nonce);

    const validation = await ValidationService.validatePaymentTransaction(
      transaction,
      walletState.offlineBalance,  // ← Current balance for validation
      usedNonces
    );

    if (validation.valid) {
      // Add to offline queue with receiver's balance snapshots
      const offlineTx = TransactionService.createOfflineTransaction(transaction, 'received');
      await OfflineQueue.addTransaction(offlineTx);

      // ⚠️ WALLET BALANCE NOT UPDATED!
      // walletStore.offlineBalance still unchanged

      // Send confirmation
      await PaymentProtocol.sendPaymentConfirmation(transaction.id, true, from);
    } else {
      // Send rejection
      await PaymentProtocol.sendPaymentConfirmation(transaction.id, false, from);
    }

    await get().refreshTransactions();
  } catch (error) {
    console.error('[PaymentStore] Error handling payment transaction:', error);
  }
}
```

### 4. Balance Update (Transfer Online to Offline)

**File**: `src/stores/walletStore.ts:80-159`

This is the ONLY place where balance is currently updated and hardware encrypted:

```typescript
transferOnlineToOffline: async (amount: number) => {
  const state = get();

  try {
    set({ isLoading: true, error: null });

    // Validate transfer
    const validation = validateTransfer(
      amount,
      state.onlineBalance,
      state.offlineBalance,
      BALANCE_LIMITS.MAX_OFFLINE_BALANCE
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check daily limit
    const withinLimit = await transactionService.checkDailyLimit(amount);
    if (!withinLimit) {
      throw new Error(`Daily transfer limit exceeded`);
    }

    // Create pending transaction
    const transaction = await transactionService.createTransaction(
      TransactionType.ONLINE_TO_OFFLINE,
      amount
    );

    try {
      // Call mock bank API to withdraw
      const bankAccount = await bankMockService.getAccount();
      const withdrawal = await bankMockService.withdraw({
        amount,
        accountNumber: bankAccount.accountNumber,
      });

      if (!withdrawal.success) {
        throw new Error(withdrawal.errorMessage || 'Bank withdrawal failed');
      }

      // ✅ UPDATE BALANCES
      const newOnlineBalance = state.onlineBalance - amount;
      const newOfflineBalance = state.offlineBalance + amount;

      const updatedWallet: WalletState = {
        ...state,
        onlineBalance: newOnlineBalance,
        offlineBalance: newOfflineBalance,
        lastSyncTimestamp: new Date(),
      };

      // ✅ SAVE TO STORAGE WITH HARDWARE ENCRYPTION
      await balanceService.saveWallet(updatedWallet);
      //     ↓
      //     └─> Calls EncryptionService.encrypt()
      //         └─> Calls SMVCSecurityModule.encrypt()
      //             └─> Uses Secure Enclave/TEE
      //                 └─> AES-256-GCM encryption
      //                     └─> Stores encrypted data in AsyncStorage

      // Mark transaction as completed
      await transactionService.updateTransactionStatus(
        transaction.id,
        TransactionStatus.COMPLETED
      );

      // Update store
      set({
        ...updatedWallet,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // ... error handling
    }
  } catch (error) {
    // ... error handling
  }
}
```

---

## Current vs Future Implementation

### Current Implementation (Phase 6)

**Transaction Flow**:
```
User Sends $10.00
    ↓
Transaction Created (signed, with balance snapshots)
    ↓
Transaction Stored in OfflineQueue (AsyncStorage)
    ↓
Wallet Balance: UNCHANGED ($50.00 remains $50.00)
    ↓
UI Shows: "1 pending transaction, $10.00 sent"
```

**Balance Update Flow**:
```
User Transfers $20.00 from Online to Offline
    ↓
Validate Transfer
    ↓
Call Mock Bank API (withdraw $20)
    ↓
Update Balances:
  - onlineBalance: $100 → $80
  - offlineBalance: $50 → $70
    ↓
Encrypt Wallet with Hardware Security (AES-256-GCM)
    ↓
Store Encrypted Wallet in AsyncStorage
    ↓
UI Shows: Updated balances
```

### Future Implementation (Phase 7: Backend Sync)

**Planned Sync Flow**:
```
Backend Sync Triggered (when online)
    ↓
Load All Pending Transactions from OfflineQueue
    ↓
For Each Transaction:
  - Submit to Backend API
  - Backend validates signature
  - Backend records transaction
  - Backend updates balance in database
    ↓
Backend Returns Reconciled Balance
    ↓
Update Local Wallet:
  - offlineBalance = backend_balance
  - onlineBalance = backend_balance
    ↓
Encrypt Wallet with Hardware Security
    ↓
Store Encrypted Wallet in AsyncStorage
    ↓
Mark Transactions as "synced"
    ↓
UI Shows: Final balances after sync
```

**Why This Approach?**

1. **Offline-First**: Transactions work without internet
2. **Eventual Consistency**: Balances reconcile when online
3. **Double-Entry Accounting**: Both sender and receiver record transaction
4. **Backend Authority**: Backend has final say on balances
5. **Audit Trail**: All transactions preserved for sync
6. **Conflict Resolution**: Backend can detect and resolve conflicts

---

## Security Guarantees

### Transaction Security

**Cryptographic Signatures**:
- Every transaction is signed with device's private key (Secure Enclave/TEE)
- Signature covers: id, amount, from, to, nonce, timestamp
- Receiver validates signature before accepting
- Tampered transactions fail validation

**Replay Protection**:
- Each transaction has unique cryptographic nonce
- Receiver checks nonce against used nonces
- Duplicate nonces rejected
- Prevents replay attacks

**Balance Validation**:
- Sender validates sufficient balance before sending
- Receiver validates amount matches request
- Balance snapshots recorded for reconciliation
- Backend will validate balances during sync

### Storage Security

**Wallet Balance** (Hardware Encrypted):
```
Plaintext Wallet:
{
  offlineBalance: 5000,  // $50.00
  onlineBalance: 10000,  // $100.00
  deviceId: "..."
}
    ↓
Hardware Encryption (ECIES + AES-256-GCM)
    ↓
Stored in AsyncStorage:
"bXlhZXNrZXk6YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXow..."
    ↓
Cannot be decrypted without device hardware key
```

**Transactions** (Signed but Not Encrypted):
```
Transaction:
{
  id: "tx_123",
  amount: 1000,
  from: "device_abc",
  to: "device_xyz",
  signature: "MEUCIQDh..."  // Cryptographic signature
}
    ↓
Stored in AsyncStorage (JSON)
    ↓
Integrity protected by signature
Cannot be tampered without detection
```

**Why Different Approaches?**

| Aspect | Wallet Balance | Transactions |
|--------|---------------|--------------|
| **Storage** | Hardware Encrypted | Signed but Not Encrypted |
| **Why** | Sensitive current balance | Audit trail for backend |
| **Protection** | Confidentiality + Integrity | Integrity only |
| **Access** | Only this device | Backend needs to read |
| **Threat Model** | Device theft | Transaction tampering |

### Attack Resistance

**Attack**: Modify transaction amount in AsyncStorage
```
Original: { amount: 1000 }  // $10.00
Modified: { amount: 10 }    // $0.10
    ↓
Signature verification: FAIL
    ↓
Transaction rejected
```

**Attack**: Replay transaction (send same transaction twice)
```
First transaction: { nonce: "abc123" }
    ↓
Accepted and stored
    ↓
Second transaction: { nonce: "abc123" }  // Same nonce
    ↓
Nonce check: FAIL (already used)
    ↓
Transaction rejected
```

**Attack**: Steal device and read balance
```
Access AsyncStorage
    ↓
Read 'encrypted_wallet' key
    ↓
Get: "bXlhZXNrZXk6YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXow..."
    ↓
Try to decrypt
    ↓
Need: Device private key from Secure Enclave/TEE
    ↓
Private key: CANNOT EXTRACT
    ↓
Attack: FAILED
```

**Attack**: Man-in-the-middle during BLE transfer
```
Intercept PaymentTransaction over BLE
    ↓
Modify amount: 1000 → 10
    ↓
Receiver validates signature
    ↓
Signature check: FAIL (signature doesn't match modified data)
    ↓
Transaction rejected
```

---

## Summary

### What Happens During a Transaction

1. **Payment Request** - Sender creates and sends signed request
2. **Payment Response** - Receiver accepts/rejects request
3. **Transaction Creation** - Sender creates signed transaction with balance snapshots
4. **Transaction Storage** - Added to OfflineQueue (AsyncStorage, not encrypted)
5. **Transaction Validation** - Receiver validates signature, nonce, amount
6. **Confirmation** - Receiver confirms receipt
7. **Balance Update** - ⚠️ **NOT updated** - balances stay unchanged
8. **Future Sync** - Transactions will be synced to backend and balances reconciled

### Security of Offline Balances

- **Wallet balances ARE hardware encrypted** when updated (Transfer Online to Offline)
- **Encryption**: AES-256-GCM with hardware-backed keys (Secure Enclave/TEE)
- **Transactions are NOT encrypted** but are cryptographically signed
- **Protection**: Balances protected by hardware encryption, transactions protected by signatures
- **Threat Model**: Device theft won't reveal balance, transaction tampering detected

### Key Takeaway

**Balances are tracked but not immediately updated** during P2P transactions. This is an intentional design choice for an offline-first system where:
- Transactions work without internet
- Both parties record the transaction locally
- Backend sync reconciles final balances
- Hardware encryption protects actual balance when it IS updated

For complete details on hardware encryption, see [HARDWARE_ENCRYPTION_SECURITY.md](./HARDWARE_ENCRYPTION_SECURITY.md).
