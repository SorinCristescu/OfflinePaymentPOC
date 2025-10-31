/**
 * SigningService
 *
 * Cryptographic signing for transaction non-repudiation
 * Phase 4: Hardware Security Integration (Phase 6 preparation)
 */

import {NativeModules} from 'react-native';
import {KeyIds} from './KeyManagementService';

const {SMVCSecurityModule} = NativeModules;

/**
 * Transaction data structure for signing
 */
export interface TransactionData {
  amount: number;
  fromDeviceId: string;
  toDeviceId?: string;
  timestamp: number;
  nonce?: string;
}

/**
 * Signed transaction structure
 */
export interface SignedTransaction {
  data: TransactionData;
  signature: string;
  publicKey: string;
}

/**
 * SigningService
 *
 * Provides cryptographic signing using hardware-backed keys.
 * All signing operations happen in Secure Enclave/TEE.
 * Private keys never leave the hardware.
 */
class SigningServiceClass {
  private moduleAvailable: boolean;

  constructor() {
    this.moduleAvailable = !!SMVCSecurityModule;
  }

  /**
   * Sign arbitrary data with a hardware-backed private key
   *
   * @param keyId - Key identifier to use for signing
   * @param data - Data to sign (will be stringified)
   * @returns Base64 encoded signature
   */
  async sign(keyId: string, data: string | object): Promise<string> {
    if (!this.moduleAvailable) {
      throw new Error('Signing module not available');
    }

    try {
      const dataToSign = typeof data === 'string' ? data : JSON.stringify(data);

      console.log(`[SigningService] Signing data with key: ${keyId}`);

      const signature = await SMVCSecurityModule.sign(keyId, dataToSign);

      console.log(`[SigningService] Data signed successfully`);

      return signature;
    } catch (error: any) {
      console.error(`[SigningService] Signing error:`, error);
      throw new Error(`Failed to sign data: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Verify a signature with a public key
   *
   * @param publicKey - Base64 encoded public key
   * @param data - Original data that was signed
   * @param signature - Base64 encoded signature
   * @returns True if signature is valid
   */
  async verify(
    publicKey: string,
    data: string | object,
    signature: string
  ): Promise<boolean> {
    if (!this.moduleAvailable) {
      throw new Error('Signing module not available');
    }

    try {
      const dataToVerify = typeof data === 'string' ? data : JSON.stringify(data);

      console.log(`[SigningService] Verifying signature`);

      const isValid = await SMVCSecurityModule.verify(publicKey, dataToVerify, signature);

      console.log(`[SigningService] Signature verification: ${isValid ? 'VALID' : 'INVALID'}`);

      return isValid;
    } catch (error: any) {
      console.error(`[SigningService] Verification error:`, error);
      throw new Error(`Failed to verify signature: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Sign a transaction with the transaction signing key
   *
   * This creates a cryptographically signed transaction that can be verified
   * by the recipient. Provides non-repudiation for P2P payments (Phase 6).
   *
   * @param transaction - Transaction data to sign
   * @returns Signed transaction with signature and public key
   */
  async signTransaction(transaction: TransactionData): Promise<SignedTransaction> {
    try {
      console.log('[SigningService] Signing transaction:', transaction);

      // Get the public key for verification
      const publicKey = await SMVCSecurityModule.getPublicKey(KeyIds.TRANSACTION_SIGNING);

      // Sign the transaction data
      const signature = await this.sign(KeyIds.TRANSACTION_SIGNING, transaction);

      const signedTransaction: SignedTransaction = {
        data: transaction,
        signature,
        publicKey,
      };

      console.log('[SigningService] Transaction signed successfully');

      return signedTransaction;
    } catch (error: any) {
      console.error('[SigningService] Transaction signing error:', error);
      throw new Error(`Failed to sign transaction: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Verify a signed transaction
   *
   * @param signedTransaction - Signed transaction to verify
   * @returns True if signature is valid
   */
  async verifyTransaction(signedTransaction: SignedTransaction): Promise<boolean> {
    try {
      console.log('[SigningService] Verifying transaction signature');

      const isValid = await this.verify(
        signedTransaction.publicKey,
        signedTransaction.data,
        signedTransaction.signature
      );

      console.log(`[SigningService] Transaction signature: ${isValid ? 'VALID' : 'INVALID'}`);

      return isValid;
    } catch (error: any) {
      console.error('[SigningService] Transaction verification error:', error);
      return false;
    }
  }

  /**
   * Create a transaction proof (signature + public key)
   *
   * This can be stored as proof that a transaction was authorized.
   *
   * @param transaction - Transaction data
   * @returns Transaction proof object
   */
  async createTransactionProof(transaction: TransactionData): Promise<{
    transactionHash: string;
    signature: string;
    publicKey: string;
    timestamp: number;
  }> {
    try {
      const signedTx = await this.signTransaction(transaction);

      // Create a hash of the transaction data for quick reference
      const transactionHash = Buffer.from(JSON.stringify(transaction)).toString('base64');

      return {
        transactionHash,
        signature: signedTx.signature,
        publicKey: signedTx.publicKey,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('[SigningService] Error creating transaction proof:', error);
      throw new Error(`Failed to create transaction proof: ${error.message || 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const SigningService = new SigningServiceClass();
