/**
 * MessageProtocol - High-Level Messaging API
 * Phase 5: BLE Communication Foundation
 *
 * Provides simple API for sending and receiving messages
 * Handles message queuing, delivery confirmations, and retry logic
 * Main interface for application-level communication
 */

import {Buffer} from 'buffer';
import {ConnectionManager} from './ConnectionManager';
import {BLECentralService} from './BLECentralService';
import {BLEPeripheralService} from './BLEPeripheralService';
import {BLEProtocol} from './BLEProtocol';
import {DeviceIdentityService} from '../security/DeviceIdentityService';
import {
  BLEMessage,
  MessageType,
  MessageDeliveryStatus,
  QueuedMessage,
} from '../../types/ble';

/**
 * Message handler callback
 */
type MessageHandler = (message: any, from: string, messageType: MessageType) => Promise<void>;

/**
 * Delivery status callback
 */
type DeliveryStatusHandler = (
  messageId: string,
  status: MessageDeliveryStatus,
  error?: string
) => void;

/**
 * Message options
 */
interface MessageOptions {
  expectAck?: boolean; // Wait for acknowledgment
  timeout?: number; // Timeout in ms
  retries?: number; // Number of retry attempts
}

/**
 * Default message options
 */
const DEFAULT_OPTIONS: MessageOptions = {
  expectAck: true,
  timeout: 5000, // 5 seconds
  retries: 3,
};

/**
 * Message Protocol Service
 */
class MessageProtocolClass {
  private isInitialized: boolean = false;
  private messageQueue: Map<string, QueuedMessage> = new Map();
  private messageHandlers: Map<MessageType, MessageHandler[]> = new Map();
  private deliveryStatusHandlers: DeliveryStatusHandler[] = [];
  private pendingAcks: Map<string, {resolve: () => void; reject: (error: Error) => void; timeout: NodeJS.Timeout}> = new Map();
  private ourDeviceId: string = '';
  private fragmentBuffers: Map<string, Map<number, BLEMessage>> = new Map();

  /**
   * Initialize message protocol
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('[MessageProtocol] Already initialized');
        return;
      }

      console.log('[MessageProtocol] Initializing...');

      // Get our device ID
      const identity = await DeviceIdentityService.getDeviceIdentity();
      this.ourDeviceId = identity.deviceId;

      // Ensure connection manager is initialized
      await ConnectionManager.initialize();

      // Set up message handlers
      this.setupMessageHandlers();

      this.isInitialized = true;
      console.log('[MessageProtocol] Initialized successfully');
    } catch (error) {
      console.error('[MessageProtocol] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up message handlers for BLE services
   */
  private setupMessageHandlers(): void {
    // Handle messages from central service
    BLECentralService.onMessage(async (message, from) => {
      await this.handleIncomingMessage(message, from);
    });

    // Handle messages from peripheral service
    BLEPeripheralService.onMessage(async (message, from) => {
      await this.handleIncomingMessage(message, from);
    });
  }

  /**
   * Send a data message to a peer
   */
  async sendData(toDeviceId: string, data: any, options?: MessageOptions): Promise<string> {
    return await this.sendMessage(toDeviceId, MessageType.DATA, data, options);
  }

  /**
   * Send a generic message to a peer
   */
  async sendMessage(
    toDeviceId: string,
    type: MessageType,
    data: any,
    options?: MessageOptions
  ): Promise<string> {
    try {
      const opts = {...DEFAULT_OPTIONS, ...options};

      console.log(`[MessageProtocol] Sending ${type} message to: ${toDeviceId}`);

      // Check if connected
      if (!ConnectionManager.isConnected(toDeviceId)) {
        throw new Error(`Not connected to device: ${toDeviceId}`);
      }

      // Create message
      const message = BLEProtocol.createDataMessage(this.ourDeviceId, toDeviceId, data);
      message.type = type;

      // Add to queue
      const queuedMessage: QueuedMessage = {
        message,
        status: MessageDeliveryStatus.PENDING,
        attempts: 0,
        lastAttempt: undefined,
        error: undefined,
      };

      this.messageQueue.set(message.id, queuedMessage);

      // Attempt to send
      await this.attemptSend(message.id, opts);

      return message.id;
    } catch (error) {
      console.error('[MessageProtocol] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Attempt to send a queued message
   */
  private async attemptSend(messageId: string, options: MessageOptions): Promise<void> {
    try {
      const queuedMessage = this.messageQueue.get(messageId);
      if (!queuedMessage) {
        throw new Error(`Message not found in queue: ${messageId}`);
      }

      const {message} = queuedMessage;

      // Update status
      queuedMessage.status = MessageDeliveryStatus.SENDING;
      queuedMessage.attempts++;
      queuedMessage.lastAttempt = new Date();

      this.notifyDeliveryStatus(messageId, MessageDeliveryStatus.SENDING);

      // Determine if we're sending via central or peripheral
      const isConnectedViaCentral = BLECentralService.isConnectedTo(message.to);
      const isConnectedViaPeripheral = BLEPeripheralService.isConnectedTo(message.to);

      if (isConnectedViaCentral) {
        await BLECentralService.sendMessage(message.to, message);
      } else if (isConnectedViaPeripheral) {
        await BLEPeripheralService.sendMessage(message.to, message);
      } else {
        throw new Error(`No connection to device: ${message.to}`);
      }

      // Update status
      queuedMessage.status = MessageDeliveryStatus.SENT;
      this.notifyDeliveryStatus(messageId, MessageDeliveryStatus.SENT);

      // Wait for ACK if requested
      if (options.expectAck) {
        await this.waitForAck(messageId, options.timeout || DEFAULT_OPTIONS.timeout!);
      } else {
        // Consider delivered immediately
        queuedMessage.status = MessageDeliveryStatus.DELIVERED;
        this.notifyDeliveryStatus(messageId, MessageDeliveryStatus.DELIVERED);
        this.messageQueue.delete(messageId);
      }

      console.log(`[MessageProtocol] Message sent successfully: ${messageId}`);
    } catch (error) {
      console.error('[MessageProtocol] Send attempt failed:', error);

      const queuedMessage = this.messageQueue.get(messageId);
      if (!queuedMessage) return;

      queuedMessage.error = (error as Error).message;

      // Retry if attempts remaining
      if (queuedMessage.attempts < (options.retries || DEFAULT_OPTIONS.retries!)) {
        console.log(`[MessageProtocol] Retrying message (${queuedMessage.attempts}/${options.retries})...`);

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Retry
        await this.attemptSend(messageId, options);
      } else {
        // Failed permanently
        queuedMessage.status = MessageDeliveryStatus.FAILED;
        this.notifyDeliveryStatus(messageId, MessageDeliveryStatus.FAILED, queuedMessage.error);
        this.messageQueue.delete(messageId);
      }
    }
  }

  /**
   * Wait for ACK message
   */
  private async waitForAck(messageId: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingAcks.delete(messageId);
        reject(new Error(`ACK timeout for message: ${messageId}`));
      }, timeout);

      this.pendingAcks.set(messageId, {
        resolve: () => {
          clearTimeout(timeoutHandle);
          this.pendingAcks.delete(messageId);

          // Update message status
          const queuedMessage = this.messageQueue.get(messageId);
          if (queuedMessage) {
            queuedMessage.status = MessageDeliveryStatus.DELIVERED;
            this.notifyDeliveryStatus(messageId, MessageDeliveryStatus.DELIVERED);
            this.messageQueue.delete(messageId);
          }

          resolve();
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          this.pendingAcks.delete(messageId);
          reject(error);
        },
        timeout: timeoutHandle,
      });
    });
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(message: BLEMessage, from: string): Promise<void> {
    try {
      console.log(`[MessageProtocol] Received ${message.type} message from: ${from}`);

      // Handle fragmented messages
      if (message.totalFragments && message.totalFragments > 1) {
        const reassembled = await this.handleFragmentedMessage(message, from);
        if (!reassembled) {
          // Still collecting fragments
          return;
        }
        message = reassembled;
      }

      // Handle different message types
      switch (message.type) {
        case MessageType.ACK:
          await this.handleAckMessage(message, from);
          break;

        case MessageType.DATA:
        case MessageType.PAYMENT:
        case MessageType.HANDSHAKE:
        case MessageType.KEY_EXCHANGE:
          // Parse payload
          const payload = BLEProtocol.parsePayload(message);

          // Send ACK
          await this.sendAck(from, message.id);

          // Notify handlers
          await this.notifyMessageHandlers(message.type, payload, from);
          break;

        case MessageType.ERROR:
          console.error('[MessageProtocol] Received error message:', message.payload);
          break;

        default:
          console.warn('[MessageProtocol] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[MessageProtocol] Error handling incoming message:', error);
    }
  }

  /**
   * Handle fragmented message
   */
  private async handleFragmentedMessage(
    fragment: BLEMessage,
    from: string
  ): Promise<BLEMessage | null> {
    try {
      const baseId = fragment.id.replace(/_frag_\d+$/, '');

      // Get or create fragment buffer
      let fragmentMap = this.fragmentBuffers.get(from);
      if (!fragmentMap) {
        fragmentMap = new Map();
        this.fragmentBuffers.set(from, fragmentMap);
      }

      // Store fragment
      fragmentMap.set(fragment.sequence || 0, fragment);

      console.log(
        `[MessageProtocol] Fragment ${(fragment.sequence || 0) + 1}/${fragment.totalFragments} received`
      );

      // Check if we have all fragments
      if (fragmentMap.size === fragment.totalFragments) {
        const fragments = Array.from(fragmentMap.values());
        const reassembled = BLEProtocol.reassemble(fragments);

        // Clear fragment buffer
        this.fragmentBuffers.delete(from);

        console.log('[MessageProtocol] Message reassembled successfully');
        return reassembled;
      }

      // Still waiting for more fragments
      return null;
    } catch (error) {
      console.error('[MessageProtocol] Error handling fragmented message:', error);
      return null;
    }
  }

  /**
   * Handle ACK message
   */
  private async handleAckMessage(message: BLEMessage, from: string): Promise<void> {
    try {
      const payload = BLEProtocol.parsePayload(message);
      const originalMessageId = payload.originalMessageId;

      console.log(`[MessageProtocol] Received ACK for message: ${originalMessageId}`);

      // Resolve pending ACK
      const pending = this.pendingAcks.get(originalMessageId);
      if (pending) {
        pending.resolve();
      }
    } catch (error) {
      console.error('[MessageProtocol] Error handling ACK:', error);
    }
  }

  /**
   * Send ACK message
   */
  private async sendAck(toDeviceId: string, originalMessageId: string): Promise<void> {
    try {
      console.log(`[MessageProtocol] Sending ACK for message: ${originalMessageId}`);

      const ackMessage = BLEProtocol.createAckMessage(
        this.ourDeviceId,
        toDeviceId,
        originalMessageId
      );

      // Send without expecting ACK (to avoid infinite loop)
      const isConnectedViaCentral = BLECentralService.isConnectedTo(toDeviceId);
      const isConnectedViaPeripheral = BLEPeripheralService.isConnectedTo(toDeviceId);

      if (isConnectedViaCentral) {
        await BLECentralService.sendMessage(toDeviceId, ackMessage);
      } else if (isConnectedViaPeripheral) {
        await BLEPeripheralService.sendMessage(toDeviceId, ackMessage);
      }
    } catch (error) {
      console.error('[MessageProtocol] Failed to send ACK:', error);
    }
  }

  /**
   * Register message handler for a specific message type
   */
  onMessage(type: MessageType, handler: MessageHandler): () => void {
    let handlers = this.messageHandlers.get(type);
    if (!handlers) {
      handlers = [];
      this.messageHandlers.set(type, handlers);
    }

    handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Register delivery status handler
   */
  onDeliveryStatus(handler: DeliveryStatusHandler): () => void {
    this.deliveryStatusHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.deliveryStatusHandlers.indexOf(handler);
      if (index > -1) {
        this.deliveryStatusHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Notify message handlers
   */
  private async notifyMessageHandlers(
    type: MessageType,
    data: any,
    from: string
  ): Promise<void> {
    const handlers = this.messageHandlers.get(type);
    if (!handlers || handlers.length === 0) {
      console.log(`[MessageProtocol] No handlers registered for type: ${type}`);
      return;
    }

    for (const handler of handlers) {
      try {
        await handler(data, from, type);
      } catch (error) {
        console.error('[MessageProtocol] Error in message handler:', error);
      }
    }
  }

  /**
   * Notify delivery status handlers
   */
  private notifyDeliveryStatus(
    messageId: string,
    status: MessageDeliveryStatus,
    error?: string
  ): void {
    for (const handler of this.deliveryStatusHandlers) {
      try {
        handler(messageId, status, error);
      } catch (err) {
        console.error('[MessageProtocol] Error in delivery status handler:', err);
      }
    }
  }

  /**
   * Get message queue
   */
  getMessageQueue(): QueuedMessage[] {
    return Array.from(this.messageQueue.values());
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): QueuedMessage | undefined {
    return this.messageQueue.get(messageId);
  }

  /**
   * Get message status
   */
  getMessageStatus(messageId: string): MessageDeliveryStatus | undefined {
    return this.messageQueue.get(messageId)?.status;
  }

  /**
   * Cancel a pending message
   */
  cancelMessage(messageId: string): boolean {
    const message = this.messageQueue.get(messageId);
    if (!message) {
      return false;
    }

    // Cancel pending ACK
    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Message cancelled'));
      this.pendingAcks.delete(messageId);
    }

    // Remove from queue
    this.messageQueue.delete(messageId);

    console.log(`[MessageProtocol] Message cancelled: ${messageId}`);
    return true;
  }

  /**
   * Retry a failed message
   */
  async retryMessage(messageId: string): Promise<void> {
    const queuedMessage = this.messageQueue.get(messageId);
    if (!queuedMessage) {
      throw new Error(`Message not found: ${messageId}`);
    }

    if (queuedMessage.status !== MessageDeliveryStatus.FAILED) {
      throw new Error('Only failed messages can be retried');
    }

    console.log(`[MessageProtocol] Retrying message: ${messageId}`);

    // Reset attempts
    queuedMessage.attempts = 0;
    queuedMessage.error = undefined;
    queuedMessage.status = MessageDeliveryStatus.PENDING;

    // Attempt to send
    await this.attemptSend(messageId, DEFAULT_OPTIONS);
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    // Cancel all pending ACKs
    for (const [messageId, pending] of this.pendingAcks.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Queue cleared'));
    }

    this.messageQueue.clear();
    this.pendingAcks.clear();
    this.fragmentBuffers.clear();

    console.log('[MessageProtocol] Message queue cleared');
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.messageQueue.size;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    queueSize: number;
    pendingAcks: number;
    fragmentBuffers: number;
  } {
    return {
      queueSize: this.messageQueue.size,
      pendingAcks: this.pendingAcks.size,
      fragmentBuffers: this.fragmentBuffers.size,
    };
  }

  /**
   * Clean up and destroy service
   */
  async destroy(): Promise<void> {
    try {
      console.log('[MessageProtocol] Destroying...');

      // Clear queue
      this.clearQueue();

      // Clear handlers
      this.messageHandlers.clear();
      this.deliveryStatusHandlers = [];

      this.isInitialized = false;

      console.log('[MessageProtocol] Destroyed successfully');
    } catch (error) {
      console.error('[MessageProtocol] Error during destroy:', error);
    }
  }
}

// Export singleton instance
export const MessageProtocol = new MessageProtocolClass();
