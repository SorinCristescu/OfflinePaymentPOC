/**
 * BLEManager - Core BLE Infrastructure
 * Phase 5: BLE Communication Foundation
 *
 * Manages BLE lifecycle, permissions, and state
 */

import {BleManager, State as BleState} from 'react-native-ble-plx';
import {PermissionsAndroid, Platform} from 'react-native';
import {BLEConfig, BLEError, BLEErrorType, DEFAULT_BLE_CONFIG} from '../../types/ble';

class BLEManagerService {
  private manager: BleManager;
  private config: BLEConfig;
  private isInitialized: boolean = false;
  private stateChangeListeners: Array<(state: BleState) => void> = [];

  constructor() {
    this.manager = new BleManager();
    this.config = DEFAULT_BLE_CONFIG;
  }

  /**
   * Initialize BLE Manager
   */
  async initialize(config?: Partial<BLEConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('[BLEManager] Already initialized');
      return;
    }

    try {
      console.log('[BLEManager] Initializing...');

      // Merge custom config with defaults
      if (config) {
        this.config = {...DEFAULT_BLE_CONFIG, ...config};
      }

      // Check permissions
      await this.checkAndRequestPermissions();

      // Subscribe to BLE state changes
      this.manager.onStateChange((state) => {
        console.log(`[BLEManager] BLE state changed: ${state}`);
        this.notifyStateChange(state);
      }, true);

      this.isInitialized = true;
      console.log('[BLEManager] Initialized successfully');
    } catch (error) {
      console.error('[BLEManager] Initialization failed:', error);
      throw this.createBLEError(BLEErrorType.UNKNOWN, 'Failed to initialize BLE', error as Error);
    }
  }

  /**
   * Check if BLE is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get BLE Manager instance
   */
  getManager(): BleManager {
    if (!this.isInitialized) {
      throw new Error('BLE Manager not initialized. Call initialize() first.');
    }
    return this.manager;
  }

  /**
   * Get current BLE state
   */
  async getState(): Promise<BleState> {
    return await this.manager.state();
  }

  /**
   * Check if Bluetooth is enabled
   */
  async isBluetoothEnabled(): Promise<boolean> {
    const state = await this.getState();
    return state === BleState.PoweredOn;
  }

  /**
   * Wait for Bluetooth to be enabled
   * @param timeoutMs Maximum time to wait
   */
  async waitForBluetoothEnabled(timeoutMs: number = 10000): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      const subscription = this.manager.onStateChange((state) => {
        if (state === BleState.PoweredOn) {
          clearTimeout(timeout);
          subscription.remove();
          resolve(true);
        }
      }, true);
    });
  }

  /**
   * Check and request necessary permissions
   */
  async checkAndRequestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return await this.checkAndroidPermissions();
    } else {
      return await this.checkiOSPermissions();
    }
  }

  /**
   * Check Android permissions
   */
  private async checkAndroidPermissions(): Promise<boolean> {
    try {
      const apiLevel = Platform.Version;

      // Android 12+ (API 31+) requires new permissions
      if (apiLevel >= 31) {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.warn('[BLEManager] Some Android permissions not granted:', granted);
          return false;
        }

        console.log('[BLEManager] All Android permissions granted');
        return true;
      } else {
        // Android 11 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[BLEManager] Location permission not granted');
          return false;
        }

        console.log('[BLEManager] Android permissions granted');
        return true;
      }
    } catch (error) {
      console.error('[BLEManager] Error requesting Android permissions:', error);
      return false;
    }
  }

  /**
   * Check iOS permissions
   */
  private async checkiOSPermissions(): Promise<boolean> {
    // iOS permissions are handled automatically by Info.plist
    // Just check if Bluetooth is available
    const state = await this.manager.state();

    switch (state) {
      case BleState.PoweredOn:
        console.log('[BLEManager] iOS Bluetooth is powered on');
        return true;
      case BleState.Unauthorized:
        console.warn('[BLEManager] iOS Bluetooth is unauthorized');
        throw this.createBLEError(
          BLEErrorType.UNAUTHORIZED,
          'Bluetooth permission not granted. Please enable in Settings.'
        );
      case BleState.Unsupported:
        console.error('[BLEManager] iOS Bluetooth is unsupported');
        throw this.createBLEError(
          BLEErrorType.UNSUPPORTED,
          'Bluetooth is not supported on this device'
        );
      case BleState.PoweredOff:
        console.warn('[BLEManager] iOS Bluetooth is powered off');
        return false;
      default:
        console.log(`[BLEManager] iOS Bluetooth state: ${state}`);
        return false;
    }
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: (state: BleState) => void): () => void {
    this.stateChangeListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all state change listeners
   */
  private notifyStateChange(state: BleState): void {
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('[BLEManager] Error in state change listener:', error);
      }
    });
  }

  /**
   * Get configuration
   */
  getConfig(): BLEConfig {
    return {...this.config};
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BLEConfig>): void {
    this.config = {...this.config, ...config};
    console.log('[BLEManager] Configuration updated:', this.config);
  }

  /**
   * Create a standardized BLE error
   */
  private createBLEError(type: BLEErrorType, message: string, originalError?: Error): BLEError {
    return {
      type,
      message,
      originalError,
    };
  }

  /**
   * Cleanup and destroy BLE Manager
   */
  async destroy(): Promise<void> {
    try {
      console.log('[BLEManager] Destroying...');

      // Clear listeners
      this.stateChangeListeners = [];

      // Destroy manager
      await this.manager.destroy();

      this.isInitialized = false;
      console.log('[BLEManager] Destroyed successfully');
    } catch (error) {
      console.error('[BLEManager] Error during destroy:', error);
    }
  }

  /**
   * Enable Bluetooth (Android only)
   */
  async enableBluetooth(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.warn('[BLEManager] enableBluetooth() is only supported on Android');
      return;
    }

    const state = await this.getState();
    if (state === BleState.PoweredOff) {
      // Note: Automatic Bluetooth enabling is not possible on modern Android
      // User must manually enable it in settings
      throw this.createBLEError(
        BLEErrorType.BLUETOOTH_OFF,
        'Bluetooth is off. Please enable it in device settings.'
      );
    }
  }

  /**
   * Check if BLE is supported on this device
   */
  async isSupported(): Promise<boolean> {
    try {
      const state = await this.getState();
      return state !== BleState.Unsupported;
    } catch (error) {
      console.error('[BLEManager] Error checking support:', error);
      return false;
    }
  }

  /**
   * Get platform-specific information
   */
  getPlatformInfo(): {platform: string; apiLevel?: number} {
    return {
      platform: Platform.OS,
      apiLevel: Platform.OS === 'android' ? (Platform.Version as number) : undefined,
    };
  }
}

// Export singleton instance
export const BLEManager = new BLEManagerService();
