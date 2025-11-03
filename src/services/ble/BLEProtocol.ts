/**
 * BLEProtocol - Message Format and Fragmentation
 * Phase 5: BLE Communication Foundation
 *
 * Handles message serialization, deserialization, and fragmentation
 * BLE has a 512-byte MTU limit, so large messages must be split
 */

import {Buffer} from 'buffer';
import {BLEMessage, BLEProtocolMessage, MessageType} from '../../types/ble';

/**
 * Protocol constants
 */
const PROTOCOL_VERSION = 1;
const MAX_PAYLOAD_SIZE = 450; // Leave room for protocol overhead (512 - 62 bytes overhead)
const MESSAGE_DELIMITER = '|||';

/**
 * BLE Protocol Service
 */
class BLEProtocolService {
  /**
   * Serialize a BLE message to wire format
   */
  serialize(message: BLEMessage): string {
    const protocolMessage: BLEProtocolMessage = {
      version: PROTOCOL_VERSION,
      type: message.type,
      sequence: message.sequence || 0,
      totalFragments: message.totalFragments || 1,
      payload: message.payload,
      signature: message.signature,
      timestamp: message.timestamp,
      from: message.from,
      to: message.to,
    };

    return JSON.stringify(protocolMessage);
  }

  /**
   * Deserialize wire format to BLE message
   */
  deserialize(data: string): BLEMessage {
    try {
      const protocolMessage: BLEProtocolMessage = JSON.parse(data);

      // Validate protocol version
      if (protocolMessage.version !== PROTOCOL_VERSION) {
        throw new Error(
          `Unsupported protocol version: ${protocolMessage.version}. Expected: ${PROTOCOL_VERSION}`
        );
      }

      const message: BLEMessage = {
        id: this.generateMessageId(protocolMessage),
        type: protocolMessage.type,
        payload: protocolMessage.payload,
        signature: protocolMessage.signature,
        timestamp: protocolMessage.timestamp,
        from: protocolMessage.from,
        to: protocolMessage.to,
        sequence: protocolMessage.sequence,
        totalFragments: protocolMessage.totalFragments,
      };

      return message;
    } catch (error) {
      console.error('[BLEProtocol] Deserialization error:', error);
      throw new Error(`Failed to deserialize message: ${(error as Error).message}`);
    }
  }

  /**
   * Fragment a large message into smaller chunks
   */
  fragment(message: BLEMessage): BLEMessage[] {
    const serialized = this.serialize(message);

    // Check if fragmentation is needed
    if (Buffer.byteLength(serialized, 'utf8') <= MAX_PAYLOAD_SIZE) {
      // No fragmentation needed
      return [message];
    }

    console.log(
      `[BLEProtocol] Fragmenting message (size: ${Buffer.byteLength(serialized, 'utf8')} bytes)`
    );

    // Split payload into chunks
    const payloadBuffer = Buffer.from(message.payload, 'base64');
    const fragments: BLEMessage[] = [];
    const chunkSize = Math.floor(MAX_PAYLOAD_SIZE * 0.6); // Conservative chunk size
    const totalFragments = Math.ceil(payloadBuffer.length / chunkSize);

    for (let i = 0; i < totalFragments; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, payloadBuffer.length);
      const chunk = payloadBuffer.slice(start, end);

      const fragment: BLEMessage = {
        ...message,
        id: `${message.id}_frag_${i}`,
        payload: chunk.toString('base64'),
        sequence: i,
        totalFragments,
      };

      fragments.push(fragment);
    }

    console.log(`[BLEProtocol] Created ${fragments.length} fragments`);
    return fragments;
  }

  /**
   * Reassemble fragmented messages
   */
  reassemble(fragments: BLEMessage[]): BLEMessage {
    if (fragments.length === 0) {
      throw new Error('No fragments to reassemble');
    }

    if (fragments.length === 1 && (!fragments[0].totalFragments || fragments[0].totalFragments === 1)) {
      // Not a fragmented message
      return fragments[0];
    }

    // Sort fragments by sequence number
    const sortedFragments = fragments.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    // Validate we have all fragments
    const totalFragments = sortedFragments[0].totalFragments || 1;
    if (sortedFragments.length !== totalFragments) {
      throw new Error(
        `Missing fragments. Expected: ${totalFragments}, Got: ${sortedFragments.length}`
      );
    }

    // Validate sequence numbers
    for (let i = 0; i < sortedFragments.length; i++) {
      if (sortedFragments[i].sequence !== i) {
        throw new Error(`Invalid sequence. Expected: ${i}, Got: ${sortedFragments[i].sequence}`);
      }
    }

    console.log(`[BLEProtocol] Reassembling ${sortedFragments.length} fragments`);

    // Combine payloads
    const payloadBuffers = sortedFragments.map((frag) => Buffer.from(frag.payload, 'base64'));
    const combinedPayload = Buffer.concat(payloadBuffers);

    // Create reassembled message
    const reassembled: BLEMessage = {
      ...sortedFragments[0],
      id: sortedFragments[0].id.replace(/_frag_\d+$/, ''), // Remove fragment suffix
      payload: combinedPayload.toString('base64'),
      sequence: undefined,
      totalFragments: undefined,
    };

    console.log(
      `[BLEProtocol] Reassembled message (size: ${combinedPayload.length} bytes)`
    );

    return reassembled;
  }

  /**
   * Generate unique message ID
   */
  generateMessageId(message?: Partial<BLEProtocolMessage>): string {
    const timestamp = message?.timestamp || Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const from = message?.from || 'unknown';

    return `msg_${from}_${timestamp}_${random}`;
  }

  /**
   * Create a handshake message
   */
  createHandshakeMessage(from: string, to: string, devicePublicKey: string): BLEMessage {
    const payload = Buffer.from(
      JSON.stringify({
        type: 'handshake',
        publicKey: devicePublicKey,
        timestamp: Date.now(),
      })
    ).toString('base64');

    return {
      id: this.generateMessageId(),
      type: MessageType.HANDSHAKE,
      payload,
      signature: '', // Will be signed by BLEEncryption service
      timestamp: Date.now(),
      from,
      to,
    };
  }

  /**
   * Create a key exchange message
   */
  createKeyExchangeMessage(
    from: string,
    to: string,
    ephemeralPublicKey: string
  ): BLEMessage {
    const payload = Buffer.from(
      JSON.stringify({
        type: 'key_exchange',
        ephemeralPublicKey,
        timestamp: Date.now(),
      })
    ).toString('base64');

    return {
      id: this.generateMessageId(),
      type: MessageType.KEY_EXCHANGE,
      payload,
      signature: '', // Will be signed
      timestamp: Date.now(),
      from,
      to,
    };
  }

  /**
   * Create an acknowledgment message
   */
  createAckMessage(from: string, to: string, originalMessageId: string): BLEMessage {
    const payload = Buffer.from(
      JSON.stringify({
        type: 'ack',
        originalMessageId,
        timestamp: Date.now(),
      })
    ).toString('base64');

    return {
      id: this.generateMessageId(),
      type: MessageType.ACK,
      payload,
      signature: '',
      timestamp: Date.now(),
      from,
      to,
    };
  }

  /**
   * Create an error message
   */
  createErrorMessage(from: string, to: string, error: string): BLEMessage {
    const payload = Buffer.from(
      JSON.stringify({
        type: 'error',
        error,
        timestamp: Date.now(),
      })
    ).toString('base64');

    return {
      id: this.generateMessageId(),
      type: MessageType.ERROR,
      payload,
      signature: '',
      timestamp: Date.now(),
      from,
      to,
    };
  }

  /**
   * Create a data message
   */
  createDataMessage(from: string, to: string, data: any): BLEMessage {
    const payload = Buffer.from(
      JSON.stringify({
        type: 'data',
        data,
        timestamp: Date.now(),
      })
    ).toString('base64');

    return {
      id: this.generateMessageId(),
      type: MessageType.DATA,
      payload,
      signature: '',
      timestamp: Date.now(),
      from,
      to,
    };
  }

  /**
   * Parse message payload
   */
  parsePayload(message: BLEMessage): any {
    try {
      const payloadBuffer = Buffer.from(message.payload, 'base64');
      const payloadString = payloadBuffer.toString('utf8');
      return JSON.parse(payloadString);
    } catch (error) {
      console.error('[BLEProtocol] Error parsing payload:', error);
      throw new Error(`Failed to parse payload: ${(error as Error).message}`);
    }
  }

  /**
   * Validate message structure
   */
  validateMessage(message: BLEMessage): boolean {
    if (!message.id || !message.type || !message.from || !message.to) {
      console.error('[BLEProtocol] Invalid message: missing required fields');
      return false;
    }

    if (!message.payload || !message.signature) {
      console.error('[BLEProtocol] Invalid message: missing payload or signature');
      return false;
    }

    if (!message.timestamp || message.timestamp <= 0) {
      console.error('[BLEProtocol] Invalid message: invalid timestamp');
      return false;
    }

    // Check if message is too old (replay attack prevention)
    const messageAge = Date.now() - message.timestamp;
    const MAX_MESSAGE_AGE = 5 * 60 * 1000; // 5 minutes

    if (messageAge > MAX_MESSAGE_AGE) {
      console.warn(`[BLEProtocol] Message is too old: ${messageAge}ms`);
      return false;
    }

    return true;
  }

  /**
   * Calculate message size in bytes
   */
  getMessageSize(message: BLEMessage): number {
    const serialized = this.serialize(message);
    return Buffer.byteLength(serialized, 'utf8');
  }

  /**
   * Check if message needs fragmentation
   */
  needsFragmentation(message: BLEMessage): boolean {
    return this.getMessageSize(message) > MAX_PAYLOAD_SIZE;
  }

  /**
   * Get protocol version
   */
  getProtocolVersion(): number {
    return PROTOCOL_VERSION;
  }

  /**
   * Get max payload size
   */
  getMaxPayloadSize(): number {
    return MAX_PAYLOAD_SIZE;
  }
}

// Export singleton instance
export const BLEProtocol = new BLEProtocolService();
