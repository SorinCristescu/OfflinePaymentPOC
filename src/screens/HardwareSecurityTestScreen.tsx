/**
 * HardwareSecurityTestScreen
 *
 * Test screen for Phase 4 Hardware Security features
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button, Card} from '../components';
import {
  KeyManagementService,
  EncryptionService,
  SigningService,
} from '../services/security';
import {useTheme} from '../contexts/ThemeContext';
import {theme as staticTheme} from '../theme';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export const HardwareSecurityTestScreen: React.FC = () => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  const [hardwareInfo, setHardwareInfo] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (
    index: number,
    status: TestResult['status'],
    message?: string,
    duration?: number
  ) => {
    setTestResults(prev => {
      const updated = [...prev];
      updated[index] = {...updated[index], status, message, duration};
      return updated;
    });
  };

  const runTest = async (
    index: number,
    name: string,
    testFn: () => Promise<string>,
    resultsArray?: TestResult[]
  ) => {
    updateTestResult(index, 'running');
    const startTime = Date.now();

    try {
      const message = await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(index, 'success', message, duration);
      if (resultsArray) {
        resultsArray[index] = {
          ...resultsArray[index],
          status: 'success',
          message,
          duration,
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(index, 'error', error.message || String(error), duration);
      if (resultsArray) {
        resultsArray[index] = {
          ...resultsArray[index],
          status: 'error',
          message: error.message || String(error),
          duration,
        };
      }
    }
  };

  const checkHardware = async () => {
    try {
      const info = await KeyManagementService.checkHardwareSupport();
      const infoText = `Available: ${info.available}\nType: ${info.type}`;
      setHardwareInfo(infoText);

      if (!info.available) {
        Alert.alert(
          'Hardware Not Available',
          'Secure Enclave/TEE is not available on this device. Running on simulator or older device.',
          [{text: 'OK'}]
        );
      } else {
        Alert.alert(
          'Hardware Available! ',
          `Hardware security is available:\n${info.type}\n\nYou can run all tests.`,
          [{text: 'OK'}]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check hardware');
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);

    const tests: TestResult[] = [
      {name: 'Hardware Detection', status: 'pending'},
      {name: 'Key Generation', status: 'pending'},
      {name: 'Key Existence Check', status: 'pending'},
      {name: 'Public Key Export', status: 'pending'},
      {name: 'Encryption', status: 'pending'},
      {name: 'Decryption', status: 'pending'},
      {name: 'Data Signing', status: 'pending'},
      {name: 'Signature Verification', status: 'pending'},
      {name: 'Key Deletion', status: 'pending'},
    ];

    setTestResults(tests);

    // Track results in local variable for final check
    const results = [...tests];

    const testKeyId = 'test_key_' + Date.now();
    let publicKey = '';
    let encryptedData = '';
    let signature = '';
    const testData = 'Hello from Secure Enclave!';

    // Test 0: Hardware Detection
    await runTest(0, 'Hardware Detection', async () => {
      const info = await KeyManagementService.checkHardwareSupport();
      setHardwareInfo(`${info.type} (${info.available ? 'Available' : 'Not Available'})`);

      if (!info.available) {
        throw new Error(
          'Hardware security not available. Tests will fail on simulator.'
        );
      }

      return `Hardware: ${info.type}`;
    }, results);

    // Test 1: Key Generation
    await runTest(1, 'Key Generation', async () => {
      const result = await KeyManagementService.generateKeyPair(testKeyId, false);
      publicKey = result.publicKey;
      return `Key generated: ${testKeyId}\nPublic key: ${publicKey.substring(0, 40)}...`;
    }, results);

    // Test 2: Key Existence
    await runTest(2, 'Key Existence', async () => {
      const exists = await KeyManagementService.keyExists(testKeyId);
      if (!exists) {
        throw new Error('Key should exist but does not');
      }
      return 'Key exists in Secure Enclave ';
    }, results);

    // Test 3: Public Key Export
    await runTest(3, 'Public Key Export', async () => {
      const exportedKey = await KeyManagementService.getPublicKey(testKeyId);
      if (exportedKey !== publicKey) {
        throw new Error('Exported key does not match generated key');
      }
      return `Public key exported: ${exportedKey.substring(0, 40)}...`;
    }, results);

    // Test 4: Encryption
    await runTest(4, 'Encryption', async () => {
      encryptedData = await EncryptionService.encrypt(testKeyId, testData);
      return `Encrypted: ${testData}\nCiphertext: ${encryptedData.substring(0, 40)}...`;
    }, results);

    // Test 5: Decryption
    await runTest(5, 'Decryption', async () => {
      const decrypted = await EncryptionService.decrypt(testKeyId, encryptedData);
      if (decrypted !== testData) {
        throw new Error(
          `Decryption failed. Expected: ${testData}, Got: ${decrypted}`
        );
      }
      return `Decrypted correctly: "${decrypted}" `;
    }, results);

    // Test 6: Signing
    await runTest(6, 'Data Signing', async () => {
      signature = await SigningService.sign(testKeyId, testData);
      return `Signed data: ${testData}\nSignature: ${signature.substring(0, 40)}...`;
    }, results);

    // Test 7: Verification
    await runTest(7, 'Signature Verification', async () => {
      const valid = await SigningService.verify(publicKey, testData, signature);
      if (!valid) {
        throw new Error('Signature verification failed');
      }
      return 'Signature is valid ';
    }, results);

    // Test 8: Key Deletion
    await runTest(8, 'Key Deletion', async () => {
      await KeyManagementService.deleteKey(testKeyId);
      const exists = await KeyManagementService.keyExists(testKeyId);
      if (exists) {
        throw new Error('Key still exists after deletion');
      }
      return 'Key deleted successfully ';
    }, results);

    setIsRunning(false);

    // Check overall results using the tracked results array
    const allPassed = results.every(t => t.status === 'success');
    const passedCount = results.filter(t => t.status === 'success').length;

    Alert.alert(
      allPassed ? 'All Tests Passed!' : 'Some Tests Failed',
      `${passedCount}/${tests.length} tests passed`,
      [{text: 'OK'}]
    );
  };

  const initializeDeviceKeys = async () => {
    try {
      Alert.alert(
        'Initialize Device Keys',
        'This will generate hardware-backed keys for:\n\n" Device Master Key\n" Transaction Signing Key\n\nThis may trigger biometric authentication.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Initialize',
            onPress: async () => {
              try {
                const keys = await KeyManagementService.initializeAllKeys();
                Alert.alert(
                  'Keys Initialized! ',
                  `Device Master Key: ${keys.deviceMasterKey.substring(0, 30)}...\n\nTransaction Key: ${keys.transactionKey.substring(0, 30)}...`,
                  [{text: 'OK'}]
                );
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to initialize keys');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '';
      case 'error':
        return 'L';
      case 'running':
        return '�';
      default:
        return '�';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return theme.success.main;
      case 'error':
        return theme.error.main;
      case 'running':
        return theme.warning.main;
      default:
        return theme.text.secondary;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.headerCard}>
          <Text style={styles.title}>Hardware Security Test</Text>
          <Text style={styles.subtitle}>Secure Enclave/TEE</Text>
        </Card>

        {/* Hardware Info */}
        <Card>
          <Text style={styles.sectionTitle}>Hardware Status</Text>
          <Button
            title="Check Hardware Availability"
            onPress={checkHardware}
            variant="outline"
            style={styles.button}
          />
          {hardwareInfo ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{hardwareInfo}</Text>
            </View>
          ) : null}
        </Card>

        {/* Test Actions */}
        <Card>
          <Text style={styles.sectionTitle}>Test Actions</Text>

          <Button
            title="Run All Tests"
            onPress={runAllTests}
            disabled={isRunning}
            loading={isRunning}
            variant="primary"
            style={styles.button}
          />

          <Button
            title="Initialize Device Keys"
            onPress={initializeDeviceKeys}
            disabled={isRunning}
            variant="outline"
            style={styles.button}
          />
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Test Results</Text>

            {testResults.map((test, index) => (
              <View key={index} style={styles.testItem}>
                <View style={styles.testHeader}>
                  <Text style={styles.testIcon}>{getStatusIcon(test.status)}</Text>
                  <Text style={styles.testName}>{test.name}</Text>
                  {test.duration && (
                    <Text style={styles.testDuration}>{test.duration}ms</Text>
                  )}
                </View>

                {test.status === 'running' && (
                  <ActivityIndicator
                    size="small"
                    color={theme.primary.main}
                    style={styles.testLoader}
                  />
                )}

                {test.message && (
                  <Text
                    style={[
                      styles.testMessage,
                      {color: getStatusColor(test.status)},
                    ]}>
                    {test.message}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>9 Testing Information</Text>
          <Text style={styles.infoText}>
            " Tests require Secure Enclave (iPhone 5s+){'\n'}
            " Simulator will show "Hardware Not Available"{'\n'}
            " Tests create and delete temporary keys{'\n'}
            " Biometric prompt may appear{'\n'}
            " Check console for detailed logs
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (themeColors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: themeColors.background.primary,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: staticTheme.spacing.lg,
      paddingBottom: staticTheme.spacing['4xl'],
    },
    headerCard: {
      alignItems: 'center',
      marginBottom: staticTheme.spacing.lg,
    },
    title: {
      ...staticTheme.typography.h2,
      color: themeColors.text.primary,
      marginBottom: staticTheme.spacing.xs,
    },
    subtitle: {
      ...staticTheme.typography.body,
      color: themeColors.text.secondary,
    },
    sectionTitle: {
      ...staticTheme.typography.h3,
      color: themeColors.text.primary,
      marginBottom: staticTheme.spacing.md,
    },
    button: {
      marginBottom: staticTheme.spacing.sm,
    },
    infoBox: {
      marginTop: staticTheme.spacing.md,
      padding: staticTheme.spacing.md,
      backgroundColor: themeColors.primary.light + '15',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.primary.light,
    },
    infoText: {
      ...staticTheme.typography.body,
      color: themeColors.text.primary,
    },
    testItem: {
      paddingVertical: staticTheme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border.light,
    },
    testHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    testIcon: {
      fontSize: 18,
      marginRight: staticTheme.spacing.sm,
    },
    testName: {
      ...staticTheme.typography.body,
      color: themeColors.text.primary,
      fontWeight: '600',
      flex: 1,
    },
    testDuration: {
      ...staticTheme.typography.caption,
      color: themeColors.text.secondary,
    },
    testLoader: {
      marginLeft: staticTheme.spacing['2xl'],
      marginTop: staticTheme.spacing.xs,
    },
    testMessage: {
      ...staticTheme.typography.caption,
      marginLeft: staticTheme.spacing['2xl'],
      marginTop: staticTheme.spacing.xs,
    },
    infoCard: {
      backgroundColor: themeColors.background.secondary,
    },
    infoTitle: {
      ...staticTheme.typography.body,
      fontWeight: '600',
      color: themeColors.text.primary,
      marginBottom: staticTheme.spacing.sm,
    },
  });
