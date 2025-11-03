/**
 * PaymentProtocol - Payment Message Handling
 * Phase 6: Offline Payment Protocol
 *
 * Manages payment request/response flow over BLE
 * Orchestrates payment sessions and handles payment messages
 */

import {MessageProtocol} from '../ble/MessageProtocol';
import {MessageType} from '../../types/ble';
import {DeviceIdentityService} from '../security/DeviceIdentityService';
import {
  PaymentMessage,
  PaymentRequest,
  PaymentResponse,
  PaymentTransaction,
  PaymentConfirmation,
  PaymentCancellation,
  PaymentMessageType,
  PaymentStatus,
  PaymentSession,
  CreatePaymentOptions,
} from '../../types/payment';

/**
 * Payment message handler callback
 */
type PaymentMessageHandler = (message: PaymentMessage, from: string) => Promise<void>;

/**
 * Payment event handlers
 */
interface PaymentEventHandlers {
  onPaymentRequest?: (request: PaymentRequest, from: string) => Promise<void>;
  onPaymentResponse?: (response: PaymentResponse, from: string) => Promise<void>;
  onPaymentTransaction?: (transaction: PaymentTransaction, from: string) => Promise<void>;
  onPaymentConfirmation?: (confirmation: PaymentConfirmation, from: string) => Promise<void>;
  onPaymentCancellation?: (cancellation: PaymentCancellation, from: string) => Promise<void>;
}

/**
 * Payment timeout configuration
 */
const PAYMENT_TIMEOUT = {
  REQUEST_EXPIRY: 5 * 60 * 1000, // 5 minutes for request to be accepted
  TRANSACTION_TIMEOUT: 30 * 1000, // 30 seconds to send transaction after acceptance
  CONFIRMATION_TIMEOUT: 10 * 1000, // 10 seconds to confirm transaction
};

/**
 * Payment Protocol Service
 */
class PaymentProtocolClass {
  private isInitialized: boolean = false;
  private ourDeviceId: string = '';
  private eventHandlers: PaymentEventHandlers = {};
  private activeSessions: Map<string, PaymentSession> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize payment protocol
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('[PaymentProtocol] Already initialized');
        return;
      }

      console.log('[PaymentProtocol] Initializing...');

      // Get our device ID
      const identity = await DeviceIdentityService.getDeviceIdentity();
      this.ourDeviceId = identity.deviceId;

      // Ensure MessageProtocol is initialized
      await MessageProtocol.initialize();

      // Register payment message handler
      MessageProtocol.onMessage(
        MessageType.PAYMENT,
        async (message: any, from: string) => {
          await this.handlePaymentMessage(message, from);
        }
      );

      this.isInitialized = true;
      console.log('[PaymentProtocol] Initialized successfully');
    } catch (error) {
      console.error('[PaymentProtocol] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register event handlers
   */
  setEventHandlers(handlers: PaymentEventHandlers): void {
    this.eventHandlers = {...this.eventHandlers, ...handlers};
  }

  /**
   * Create and send payment request
   */
  async sendPaymentRequest(options: CreatePaymentOptions): Promise<string> {
    try {
      if (!this.isInitialized) {
        throw new Error('PaymentProtocol not initialized');
      }

      console.log('[PaymentProtocol] Creating payment request to:', options.deviceId);

      const requestId = this.generateId();
      const now = Date.now();
      const expiresAt = now + (options.timeout || PAYMENT_TIMEOUT.REQUEST_EXPIRY);

      // Create payment request
      const request: PaymentRequest = {
        type: PaymentMessageType.PAYMENT_REQUEST,
        id: requestId,
        timestamp: now,
        from: this.ourDeviceId,
        to: options.deviceId,
        amount: options.amount,
        currency: options.currency || 'USD',
        memo: options.memo,
        expiresAt,
        signature: '', // Will be signed before sending
      };

      // Sign the request
      request.signature = await this.signMessage(request);

      // Create payment session
      const session: PaymentSession = {
        id: requestId,
        deviceId: options.deviceId,
        deviceName: options.deviceId, // Will be updated with actual name
        role: 'sender',
        amount: options.amount,
        currency: options.currency || 'USD',
        memo: options.memo,
        status: PaymentStatus.INITIATED,
        createdAt: now,
        expiresAt,
        requestId,
      };

      this.activeSessions.set(requestId, session);

      // Set expiration timeout
      const timeout = setTimeout(() => {
        this.expireSession(requestId);
      }, expiresAt - now);

      this.sessionTimeouts.set(requestId, timeout);

      // Send payment request via BLE
      await MessageProtocol.sendMessage(options.deviceId, MessageType.PAYMENT, request);

      console.log('[PaymentProtocol] Payment request sent:', requestId);
      return requestId;
    } catch (error) {
      console.error('[PaymentProtocol] Failed to send payment request:', error);
      throw error;
    }
  }

  /**
   * Send payment response (accept/reject)
   */
  async sendPaymentResponse(
    requestId: string,
    accepted: boolean,
    reason?: string
  ): Promise<void> {
    try {
      const session = this.activeSessions.get(requestId);
      if (!session) {
        throw new Error(`Payment session not found: ${requestId}`);
      }

      console.log(
        `[PaymentProtocol] Sending payment response (${accepted ? 'accepted' : 'rejected'}):`,
        requestId
      );

      const responseId = this.generateId();

      const response: PaymentResponse = {
        type: PaymentMessageType.PAYMENT_RESPONSE,
        id: responseId,
        requestId,
        timestamp: Date.now(),
        from: this.ourDeviceId,
        to: session.deviceId,
        accepted,
        reason,
        signature: '', // Will be signed
      };

      // Sign the response
      response.signature = await this.signMessage(response);

      // Update session
      session.status = accepted ? PaymentStatus.ACCEPTED : PaymentStatus.REJECTED;

      // Send response
      await MessageProtocol.sendMessage(session.deviceId, MessageType.PAYMENT, response);

      if (!accepted) {
        // Clean up session if rejected
        this.cleanupSession(requestId);
      }

      console.log('[PaymentProtocol] Payment response sent');
    } catch (error) {
      console.error('[PaymentProtocol] Failed to send payment response:', error);
      throw error;
    }
  }

  /**
   * Send payment transaction
   */
  async sendPaymentTransaction(
    requestId: string,
    transaction: PaymentTransaction
  ): Promise<void> {
    try {
      const session = this.activeSessions.get(requestId);
      if (!session) {
        throw new Error(`Payment session not found: ${requestId}`);
      }

      console.log('[PaymentProtocol] Sending payment transaction:', transaction.id);

      // Update session
      session.status = PaymentStatus.PENDING;
      session.transactionId = transaction.id;

      // Send transaction
      await MessageProtocol.sendMessage(session.deviceId, MessageType.PAYMENT, transaction);

      console.log('[PaymentProtocol] Payment transaction sent');
    } catch (error) {
      console.error('[PaymentProtocol] Failed to send payment transaction:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    transactionId: string,
    confirmed: boolean,
    deviceId: string
  ): Promise<void> {
    try {
      console.log(
        `[PaymentProtocol] Sending payment confirmation (${confirmed ? 'confirmed' : 'rejected'}):`,
        transactionId
      );

      const confirmationId = this.generateId();

      const confirmation: PaymentConfirmation = {
        type: PaymentMessageType.PAYMENT_CONFIRMATION,
        id: confirmationId,
        transactionId,
        timestamp: Date.now(),
        from: this.ourDeviceId,
        to: deviceId,
        confirmed,
        signature: '', // Will be signed
      };

      // Sign the confirmation
      confirmation.signature = await this.signMessage(confirmation);

      // Send confirmation
      await MessageProtocol.sendMessage(deviceId, MessageType.PAYMENT, confirmation);

      console.log('[PaymentProtocol] Payment confirmation sent');
    } catch (error) {
      console.error('[PaymentProtocol] Failed to send payment confirmation:', error);
      throw error;
    }
  }

  /**
   * Cancel a payment request
   */
  async cancelPayment(requestId: string, reason: string): Promise<void> {
    try {
      const session = this.activeSessions.get(requestId);
      if (!session) {
        throw new Error(`Payment session not found: ${requestId}`);
      }

      console.log('[PaymentProtocol] Cancelling payment:', requestId);

      const cancellationId = this.generateId();

      const cancellation: PaymentCancellation = {
        type: PaymentMessageType.PAYMENT_CANCELLATION,
        id: cancellationId,
        requestId,
        timestamp: Date.now(),
        from: this.ourDeviceId,
        to: session.deviceId,
        reason,
        signature: '', // Will be signed
      };

      // Sign the cancellation
      cancellation.signature = await this.signMessage(cancellation);

      // Update session
      session.status = PaymentStatus.FAILED;
      session.error = reason;

      // Send cancellation
      await MessageProtocol.sendMessage(session.deviceId, MessageType.PAYMENT, cancellation);

      // Clean up session
      this.cleanupSession(requestId);

      console.log('[PaymentProtocol] Payment cancelled');
    } catch (error) {
      console.error('[PaymentProtocol] Failed to cancel payment:', error);
      throw error;
    }
  }

  /**
   * Handle incoming payment message
   */
  private async handlePaymentMessage(message: PaymentMessage, from: string): Promise<void> {
    try {
      console.log(`[PaymentProtocol] Received ${message.type} from:`, from);

      // Verify signature
      const isValid = await this.verifyMessageSignature(message);
      if (!isValid) {
        console.error('[PaymentProtocol] Invalid message signature');
        return;
      }

      // Route to appropriate handler
      switch (message.type) {
        case PaymentMessageType.PAYMENT_REQUEST:
          await this.handlePaymentRequest(message as PaymentRequest, from);
          break;

        case PaymentMessageType.PAYMENT_RESPONSE:
          await this.handlePaymentResponse(message as PaymentResponse, from);
          break;

        case PaymentMessageType.PAYMENT_TRANSACTION:
          await this.handlePaymentTransaction(message as PaymentTransaction, from);
          break;

        case PaymentMessageType.PAYMENT_CONFIRMATION:
          await this.handlePaymentConfirmation(message as PaymentConfirmation, from);
          break;

        case PaymentMessageType.PAYMENT_CANCELLATION:
          await this.handlePaymentCancellation(message as PaymentCancellation, from);
          break;

        default:
          console.warn('[PaymentProtocol] Unknown payment message type:', message.type);
      }
    } catch (error) {
      console.error('[PaymentProtocol] Error handling payment message:', error);
    }
  }

  /**
   * Handle payment request
   */
  private async handlePaymentRequest(request: PaymentRequest, from: string): Promise<void> {
    try {
      console.log('[PaymentProtocol] Handling payment request:', request.id);

      // Check if expired
      if (Date.now() > request.expiresAt) {
        console.log('[PaymentProtocol] Payment request expired');
        return;
      }

      // Create session as receiver
      const session: PaymentSession = {
        id: request.id,
        deviceId: from,
        deviceName: from, // Will be updated with actual name
        role: 'receiver',
        amount: request.amount,
        currency: request.currency,
        memo: request.memo,
        status: PaymentStatus.PENDING,
        createdAt: Date.now(),
        expiresAt: request.expiresAt,
        requestId: request.id,
      };

      this.activeSessions.set(request.id, session);

      // Set expiration timeout
      const timeRemaining = request.expiresAt - Date.now();
      if (timeRemaining > 0) {
        const timeout = setTimeout(() => {
          this.expireSession(request.id);
        }, timeRemaining);

        this.sessionTimeouts.set(request.id, timeout);
      }

      // Notify handler
      if (this.eventHandlers.onPaymentRequest) {
        await this.eventHandlers.onPaymentRequest(request, from);
      }
    } catch (error) {
      console.error('[PaymentProtocol] Error handling payment request:', error);
    }
  }

  /**
   * Handle payment response
   */
  private async handlePaymentResponse(response: PaymentResponse, from: string): Promise<void> {
    try {
      console.log('[PaymentProtocol] Handling payment response:', response.id);

      const session = this.activeSessions.get(response.requestId);
      if (!session) {
        console.warn('[PaymentProtocol] Session not found for response:', response.requestId);
        return;
      }

      // Update session
      session.status = response.accepted ? PaymentStatus.ACCEPTED : PaymentStatus.REJECTED;

      if (!response.accepted) {
        session.error = response.reason;
        this.cleanupSession(response.requestId);
      }

      // Notify handler
      if (this.eventHandlers.onPaymentResponse) {
        await this.eventHandlers.onPaymentResponse(response, from);
      }
    } catch (error) {
      console.error('[PaymentProtocol] Error handling payment response:', error);
    }
  }

  /**
   * Handle payment transaction
   */
  private async handlePaymentTransaction(
    transaction: PaymentTransaction,
    from: string
  ): Promise<void> {
    try {
      console.log('[PaymentProtocol] Handling payment transaction:', transaction.id);

      const session = this.activeSessions.get(transaction.requestId);
      if (!session) {
        console.warn('[PaymentProtocol] Session not found for transaction:', transaction.requestId);
        return;
      }

      // Update session
      session.status = PaymentStatus.PENDING;
      session.transactionId = transaction.id;

      // Notify handler
      if (this.eventHandlers.onPaymentTransaction) {
        await this.eventHandlers.onPaymentTransaction(transaction, from);
      }
    } catch (error) {
      console.error('[PaymentProtocol] Error handling payment transaction:', error);
    }
  }

  /**
   * Handle payment confirmation
   */
  private async handlePaymentConfirmation(
    confirmation: PaymentConfirmation,
    from: string
  ): Promise<void> {
    try {
      console.log('[PaymentProtocol] Handling payment confirmation:', confirmation.id);

      // Find session by transaction ID
      const session = Array.from(this.activeSessions.values()).find(
        s => s.transactionId === confirmation.transactionId
      );

      if (!session) {
        console.warn('[PaymentProtocol] Session not found for confirmation:', confirmation.transactionId);
        return;
      }

      // Update session
      session.status = confirmation.confirmed ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

      // Clean up session
      this.cleanupSession(session.id);

      // Notify handler
      if (this.eventHandlers.onPaymentConfirmation) {
        await this.eventHandlers.onPaymentConfirmation(confirmation, from);
      }
    } catch (error) {
      console.error('[PaymentProtocol] Error handling payment confirmation:', error);
    }
  }

  /**
   * Handle payment cancellation
   */
  private async handlePaymentCancellation(
    cancellation: PaymentCancellation,
    from: string
  ): Promise<void> {
    try {
      console.log('[PaymentProtocol] Handling payment cancellation:', cancellation.id);

      const session = this.activeSessions.get(cancellation.requestId);
      if (!session) {
        console.warn('[PaymentProtocol] Session not found for cancellation:', cancellation.requestId);
        return;
      }

      // Update session
      session.status = PaymentStatus.FAILED;
      session.error = cancellation.reason;

      // Clean up session
      this.cleanupSession(cancellation.requestId);

      // Notify handler
      if (this.eventHandlers.onPaymentCancellation) {
        await this.eventHandlers.onPaymentCancellation(cancellation, from);
      }
    } catch (error) {
      console.error('[PaymentProtocol] Error handling payment cancellation:', error);
    }
  }

  /**
   * Sign a payment message
   */
  private async signMessage(message: any): Promise<string> {
    // TODO: Implement actual hardware signing using KeyManagementService
    // For now, return a placeholder
    const payload = JSON.stringify({
      type: message.type,
      id: message.id,
      timestamp: message.timestamp,
      from: message.from,
      to: message.to,
    });

    // This should use hardware-backed keys
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Verify message signature
   */
  private async verifyMessageSignature(message: PaymentMessage): Promise<boolean> {
    // TODO: Implement actual signature verification using KeyManagementService
    // For now, return true (accept all messages)
    // This should verify the hardware signature
    return true;
  }

  /**
   * Expire a payment session
   */
  private expireSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    console.log('[PaymentProtocol] Payment session expired:', sessionId);

    session.status = PaymentStatus.EXPIRED;
    this.cleanupSession(sessionId);
  }

  /**
   * Clean up a payment session
   */
  private cleanupSession(sessionId: string): void {
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }

    // Keep session in map for history (don't delete immediately)
    // Sessions can be cleaned up later by the caller
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get active session
   */
  getSession(sessionId: string): PaymentSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): PaymentSession[] {
    return Array.from(this.activeSessions.values()).filter(
      s => s.status !== PaymentStatus.COMPLETED && s.status !== PaymentStatus.FAILED && s.status !== PaymentStatus.EXPIRED
    );
  }

  /**
   * Get all sessions (including completed)
   */
  getAllSessions(): PaymentSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Remove session
   */
  removeSession(sessionId: string): void {
    this.cleanupSession(sessionId);
    this.activeSessions.delete(sessionId);
  }

  /**
   * Clean up and destroy service
   */
  async destroy(): Promise<void> {
    try {
      console.log('[PaymentProtocol] Destroying...');

      // Clear all timeouts
      for (const timeout of this.sessionTimeouts.values()) {
        clearTimeout(timeout);
      }

      this.sessionTimeouts.clear();
      this.activeSessions.clear();
      this.eventHandlers = {};

      this.isInitialized = false;

      console.log('[PaymentProtocol] Destroyed successfully');
    } catch (error) {
      console.error('[PaymentProtocol] Error during destroy:', error);
    }
  }
}

// Export singleton instance
export const PaymentProtocol = new PaymentProtocolClass();
