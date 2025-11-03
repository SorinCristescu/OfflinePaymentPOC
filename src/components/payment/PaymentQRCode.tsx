/**
 * PaymentQRCode Component
 * Phase 6: Offline Payment Protocol
 *
 * Displays a QR code for receiving payments
 * Encodes device information and optional payment details
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface PaymentQRData {
  deviceId: string;
  deviceName?: string;
  amount?: number;
  currency?: string;
  memo?: string;
  timestamp: number;
}

interface PaymentQRCodeProps {
  deviceId: string;
  deviceName?: string;
  amount?: number;
  currency?: string;
  memo?: string;
  size?: number;
  logo?: any;
}

export const PaymentQRCode: React.FC<PaymentQRCodeProps> = ({
  deviceId,
  deviceName,
  amount,
  currency = 'USD',
  memo,
  size = 200,
  logo,
}) => {
  // Generate QR code data
  const qrData: PaymentQRData = {
    deviceId,
    deviceName,
    amount,
    currency,
    memo,
    timestamp: Date.now(),
  };

  // Encode as JSON string
  const qrValue = JSON.stringify(qrData);

  return (
    <View style={styles.container}>
      <View style={styles.qrContainer}>
        <QRCode
          value={qrValue}
          size={size}
          backgroundColor="white"
          color="black"
          logo={logo}
          logoSize={size * 0.2}
          logoBackgroundColor="white"
          logoMargin={2}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Device ID</Text>
        <Text style={styles.infoValue}>
          {deviceId.substring(0, 12)}...{deviceId.substring(deviceId.length - 4)}
        </Text>

        {deviceName && (
          <>
            <Text style={styles.infoLabel}>Device Name</Text>
            <Text style={styles.infoValue}>{deviceName}</Text>
          </>
        )}

        {amount !== undefined && (
          <>
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={styles.infoValue}>
              {currency} {(amount / 100).toFixed(2)}
            </Text>
          </>
        )}

        {memo && (
          <>
            <Text style={styles.infoLabel}>Memo</Text>
            <Text style={styles.infoValue}>{memo}</Text>
          </>
        )}
      </View>

      <Text style={styles.instruction}>
        Scan this QR code to send a payment to this device
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  instruction: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
