/**
 * SettlementService
 * Phase 6: Offline Payment Protocol
 *
 * Handles settlement calculations and reconciliation between peers
 * Calculates net balances and provides settlement summary
 */

import {OfflineTransaction, OfflineTransactionStatus} from '../types/payment';

/**
 * Settlement summary for a peer
 */
export interface PeerSettlement {
  deviceId: string;
  deviceName?: string;
  totalSent: number;
  totalReceived: number;
  netBalance: number; // Positive = they owe you, Negative = you owe them
  transactionCount: number;
  lastTransaction?: number;
}

/**
 * Overall settlement summary
 */
export interface SettlementSummary {
  totalSent: number;
  totalReceived: number;
  netBalance: number;
  peers: Map<string, PeerSettlement>;
  transactionsProcessed: number;
  lastSettlementDate: Date;
}

/**
 * Settlement conflict
 */
export interface SettlementConflict {
  transactionId: string;
  deviceId: string;
  issue: string;
  suggestedResolution: string;
}

class SettlementServiceClass {
  /**
   * Calculate settlement summary from transactions
   */
  calculateSettlement(transactions: OfflineTransaction[]): SettlementSummary {
    console.log('[SettlementService] Calculating settlement from', transactions.length, 'transactions');

    const peers = new Map<string, PeerSettlement>();
    let totalSent = 0;
    let totalReceived = 0;

    // Process only confirmed transactions
    const confirmedTransactions = transactions.filter(
      tx => tx.status === OfflineTransactionStatus.CONFIRMED
    );

    for (const tx of confirmedTransactions) {
      const deviceId = tx.type === 'sent' ? tx.to : tx.from;

      // Get or create peer settlement
      let peerSettlement = peers.get(deviceId);
      if (!peerSettlement) {
        peerSettlement = {
          deviceId,
          totalSent: 0,
          totalReceived: 0,
          netBalance: 0,
          transactionCount: 0,
        };
        peers.set(deviceId, peerSettlement);
      }

      // Update peer settlement
      if (tx.type === 'sent') {
        peerSettlement.totalSent += tx.amount;
        totalSent += tx.amount;
      } else {
        peerSettlement.totalReceived += tx.amount;
        totalReceived += tx.amount;
      }

      peerSettlement.transactionCount++;
      peerSettlement.lastTransaction = tx.timestamp;

      // Calculate net balance (positive = they owe you)
      peerSettlement.netBalance = peerSettlement.totalReceived - peerSettlement.totalSent;
    }

    const summary: SettlementSummary = {
      totalSent,
      totalReceived,
      netBalance: totalReceived - totalSent,
      peers,
      transactionsProcessed: confirmedTransactions.length,
      lastSettlementDate: new Date(),
    };

    console.log('[SettlementService] Settlement calculated:', {
      totalSent: totalSent / 100,
      totalReceived: totalReceived / 100,
      netBalance: summary.netBalance / 100,
      peers: peers.size,
    });

    return summary;
  }

  /**
   * Get settlement with a specific peer
   */
  getPeerSettlement(
    transactions: OfflineTransaction[],
    deviceId: string
  ): PeerSettlement | null {
    const settlement = this.calculateSettlement(transactions);
    return settlement.peers.get(deviceId) || null;
  }

  /**
   * Detect settlement conflicts
   */
  detectConflicts(transactions: OfflineTransaction[]): SettlementConflict[] {
    const conflicts: SettlementConflict[] = [];

    // Check for duplicate nonces
    const nonces = new Map<string, string>();
    for (const tx of transactions) {
      if (nonces.has(tx.nonce)) {
        conflicts.push({
          transactionId: tx.id,
          deviceId: tx.type === 'sent' ? tx.to : tx.from,
          issue: 'Duplicate nonce detected - possible replay attack',
          suggestedResolution: 'Reject duplicate transaction',
        });
      }
      nonces.set(tx.nonce, tx.id);
    }

    // Check for inconsistent timestamps
    const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sortedTxs.length - 1; i++) {
      const current = sortedTxs[i];
      const next = sortedTxs[i + 1];

      if (current.timestamp > next.timestamp) {
        conflicts.push({
          transactionId: next.id,
          deviceId: next.type === 'sent' ? next.to : next.from,
          issue: 'Timestamp inconsistency detected',
          suggestedResolution: 'Use server timestamp for ordering',
        });
      }
    }

    // Check for negative balances
    let runningBalance = 0;
    for (const tx of sortedTxs) {
      if (tx.type === 'sent') {
        runningBalance -= tx.amount;
      } else {
        runningBalance += tx.amount;
      }

      if (runningBalance < 0 && tx.balanceBefore >= 0) {
        conflicts.push({
          transactionId: tx.id,
          deviceId: tx.type === 'sent' ? tx.to : tx.from,
          issue: 'Transaction would result in negative balance',
          suggestedResolution: 'Reject transaction or wait for settlement',
        });
      }
    }

    if (conflicts.length > 0) {
      console.warn('[SettlementService] Detected', conflicts.length, 'conflicts');
    }

    return conflicts;
  }

  /**
   * Generate settlement report
   */
  generateReport(transactions: OfflineTransaction[]): string {
    const summary = this.calculateSettlement(transactions);
    const conflicts = this.detectConflicts(transactions);

    let report = '=== SETTLEMENT REPORT ===\n\n';
    report += `Date: ${summary.lastSettlementDate.toLocaleString()}\n`;
    report += `Transactions Processed: ${summary.transactionsProcessed}\n\n`;

    report += '--- TOTALS ---\n';
    report += `Total Sent: $${(summary.totalSent / 100).toFixed(2)}\n`;
    report += `Total Received: $${(summary.totalReceived / 100).toFixed(2)}\n`;
    report += `Net Balance: $${(summary.netBalance / 100).toFixed(2)}\n\n`;

    report += '--- PEER SETTLEMENTS ---\n';
    summary.peers.forEach((peer, deviceId) => {
      report += `\nPeer: ${deviceId.substring(0, 12)}...\n`;
      report += `  Sent: $${(peer.totalSent / 100).toFixed(2)}\n`;
      report += `  Received: $${(peer.totalReceived / 100).toFixed(2)}\n`;
      report += `  Net Balance: $${(peer.netBalance / 100).toFixed(2)}`;
      report += peer.netBalance > 0 ? ' (owes you)\n' : ' (you owe)\n';
      report += `  Transactions: ${peer.transactionCount}\n`;
    });

    if (conflicts.length > 0) {
      report += '\n--- CONFLICTS ---\n';
      conflicts.forEach((conflict, index) => {
        report += `\n${index + 1}. ${conflict.issue}\n`;
        report += `   Transaction: ${conflict.transactionId.substring(0, 12)}...\n`;
        report += `   Suggested: ${conflict.suggestedResolution}\n`;
      });
    }

    return report;
  }

  /**
   * Suggest settlements to balance out debts
   */
  suggestSettlements(transactions: OfflineTransaction[]): Array<{
    from: string;
    to: string;
    amount: number;
    reason: string;
  }> {
    const summary = this.calculateSettlement(transactions);
    const suggestions: Array<{from: string; to: string; amount: number; reason: string}> = [];

    // Find peers with significant imbalances
    summary.peers.forEach((peer, deviceId) => {
      if (Math.abs(peer.netBalance) >= 1000) {
        // $10 or more
        if (peer.netBalance > 0) {
          // They owe you
          suggestions.push({
            from: deviceId,
            to: 'current-device',
            amount: peer.netBalance,
            reason: `Settle outstanding balance of $${(peer.netBalance / 100).toFixed(2)}`,
          });
        } else {
          // You owe them
          suggestions.push({
            from: 'current-device',
            to: deviceId,
            amount: Math.abs(peer.netBalance),
            reason: `Settle outstanding debt of $${(Math.abs(peer.netBalance) / 100).toFixed(2)}`,
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Reconcile two sets of transactions (from different devices)
   * Used when syncing with another device to find discrepancies
   */
  reconcileTransactions(
    localTransactions: OfflineTransaction[],
    remoteTransactions: OfflineTransaction[]
  ): {
    matching: OfflineTransaction[];
    localOnly: OfflineTransaction[];
    remoteOnly: OfflineTransaction[];
    conflicts: SettlementConflict[];
  } {
    const matching: OfflineTransaction[] = [];
    const localOnly: OfflineTransaction[] = [];
    const remoteOnly: OfflineTransaction[] = [];
    const conflicts: SettlementConflict[] = [];

    const localMap = new Map(localTransactions.map(tx => [tx.id, tx]));
    const remoteMap = new Map(remoteTransactions.map(tx => [tx.id, tx]));

    // Find matching and local-only
    localTransactions.forEach(localTx => {
      const remoteTx = remoteMap.get(localTx.id);
      if (remoteTx) {
        // Check if they match
        if (localTx.amount === remoteTx.amount && localTx.nonce === remoteTx.nonce) {
          matching.push(localTx);
        } else {
          conflicts.push({
            transactionId: localTx.id,
            deviceId: localTx.type === 'sent' ? localTx.to : localTx.from,
            issue: 'Transaction mismatch between devices',
            suggestedResolution: 'Use transaction with earlier timestamp',
          });
        }
      } else {
        localOnly.push(localTx);
      }
    });

    // Find remote-only
    remoteTransactions.forEach(remoteTx => {
      if (!localMap.has(remoteTx.id)) {
        remoteOnly.push(remoteTx);
      }
    });

    console.log('[SettlementService] Reconciliation complete:', {
      matching: matching.length,
      localOnly: localOnly.length,
      remoteOnly: remoteOnly.length,
      conflicts: conflicts.length,
    });

    return {matching, localOnly, remoteOnly, conflicts};
  }
}

// Export singleton instance
export const SettlementService = new SettlementServiceClass();
