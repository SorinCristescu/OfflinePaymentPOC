/**
 * Authentication store for managing authentication state
 * Uses Zustand for state management and integrates with AuthenticationService
 */

import {create} from 'zustand';
import {
  AuthenticationService,
  BiometricService,
  PINService,
} from '../services/security';
import {
  AuthenticationMethod,
  AuthenticationStatus,
  AuthenticationResult,
  BiometricCapabilities,
  PINSetupData,
  PINChangeData,
  SecurityEvent,
} from '../types';

/**
 * Authentication store state
 */
interface AuthState {
  // Current authentication status
  status: AuthenticationStatus;
  method: AuthenticationMethod;
  lastAuthenticationTime?: Date;
  failedAttempts: number;
  isLocked: boolean;
  lockoutEndTime?: Date;

  // Capabilities and configuration
  biometricAvailable: boolean;
  biometricCapabilities?: BiometricCapabilities;
  pinConfigured: boolean;
  configuredMethod: AuthenticationMethod;

  // Session state
  isInitialized: boolean;
  isAuthenticating: boolean;
  error?: string;

  // Security events
  recentSecurityEvents: SecurityEvent[];

  // Authentication prompt state
  showAuthPrompt: boolean;
  authPromptMessage?: string;
  authPromptMethod?: AuthenticationMethod;
  authPromptResolver?: (result: AuthenticationResult) => void;
}

/**
 * Authentication store actions
 */
interface AuthActions {
  // Initialization
  initialize: () => Promise<void>;

  // Authentication
  authenticate: (
    preferredMethod?: AuthenticationMethod,
    promptMessage?: string,
  ) => Promise<AuthenticationResult>;
  authenticateWithPIN: (pin: string) => Promise<AuthenticationResult>;
  authenticateWithBiometric: (promptMessage?: string) => Promise<AuthenticationResult>;
  logout: () => Promise<void>;

  // Authentication prompt management
  completeAuthenticationPrompt: (result: AuthenticationResult) => Promise<void>;
  cancelAuthenticationPrompt: () => void;

  // Setup and configuration
  setupAuthentication: (
    method: AuthenticationMethod,
    pinData?: PINSetupData,
  ) => Promise<{success: boolean; error?: string}>;
  disableAuthentication: (
    method: AuthenticationMethod,
  ) => Promise<{success: boolean; error?: string}>;
  changePIN: (changeData: PINChangeData) => Promise<{success: boolean; error?: string}>;

  // Capabilities
  checkBiometricCapabilities: () => Promise<BiometricCapabilities>;
  refreshCapabilities: () => Promise<void>;

  // Security events
  loadSecurityEvents: (limit?: number) => Promise<void>;

  // State checks
  isAuthenticated: () => Promise<boolean>;
  getState: () => Promise<void>;

  // Testing and reset
  clearAllAuthData: () => Promise<void>;
  reset: () => void;
}

/**
 * Combined auth store interface
 */
interface AuthStore extends AuthState, AuthActions {}

/**
 * Initial state
 */
const initialState: AuthState = {
  status: AuthenticationStatus.UNAUTHENTICATED,
  method: AuthenticationMethod.NONE,
  failedAttempts: 0,
  isLocked: false,
  biometricAvailable: false,
  pinConfigured: false,
  configuredMethod: AuthenticationMethod.NONE,
  isInitialized: false,
  isAuthenticating: false,
  recentSecurityEvents: [],
  showAuthPrompt: false,
  authPromptMessage: undefined,
  authPromptMethod: undefined,
  authPromptResolver: undefined,
};

/**
 * Auth store with Zustand
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  /**
   * Initialize authentication service
   * Should be called on app startup
   */
  initialize: async () => {
    try {
      console.log('[authStore] Initializing authentication service...');

      // Add timeout to prevent indefinite hanging
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Initialization timeout')), 5000)
      );

      const initPromise = (async () => {
        const initResult = await AuthenticationService.initialize();
        const capabilities = await BiometricService.checkCapabilities();

        set({
          biometricAvailable: initResult.biometricAvailable,
          biometricCapabilities: capabilities,
          pinConfigured: initResult.pinConfigured,
          configuredMethod: initResult.currentMethod,
          isInitialized: true,
        });

        // Load current authentication state
        await get().getState();

        // Load recent security events
        await get().loadSecurityEvents(10);

        console.log('[authStore] Initialization complete:', {
          biometricAvailable: initResult.biometricAvailable,
          pinConfigured: initResult.pinConfigured,
          currentMethod: initResult.currentMethod,
        });
      })();

      await Promise.race([initPromise, timeout]);
    } catch (error) {
      console.error('[authStore] Initialization error:', error);
      set({
        isInitialized: true,
        biometricAvailable: false,
        pinConfigured: false,
        configuredMethod: AuthenticationMethod.NONE,
        error: 'Failed to initialize authentication',
      });
    }
  },

  /**
   * Authenticate user
   * Shows authentication modal and waits for result
   */
  authenticate: async (
    preferredMethod?: AuthenticationMethod,
    promptMessage?: string,
  ): Promise<AuthenticationResult> => {
    return new Promise((resolve) => {
      console.log('[authStore] Requesting authentication via modal');

      set({
        showAuthPrompt: true,
        authPromptMessage: promptMessage || 'Authentication required',
        authPromptMethod: preferredMethod,
        authPromptResolver: resolve,
        isAuthenticating: true,
      });
    });
  },

  /**
   * Called by AuthenticationModal when authentication completes
   */
  completeAuthenticationPrompt: async (result: AuthenticationResult) => {
    const {authPromptResolver} = get();

    // Clear prompt state
    set({
      showAuthPrompt: false,
      authPromptMessage: undefined,
      authPromptMethod: undefined,
      authPromptResolver: undefined,
      isAuthenticating: false,
    });

    // Update state from AuthenticationService
    if (result.success) {
      await get().getState();
      await get().loadSecurityEvents(10);
    } else {
      set({error: result.error});
      await get().getState();
    }

    // Resolve the promise
    if (authPromptResolver) {
      authPromptResolver(result);
    }
  },

  /**
   * Cancel authentication prompt
   */
  cancelAuthenticationPrompt: () => {
    const {authPromptResolver} = get();

    // Clear prompt state
    set({
      showAuthPrompt: false,
      authPromptMessage: undefined,
      authPromptMethod: undefined,
      authPromptResolver: undefined,
      isAuthenticating: false,
    });

    // Resolve with failure
    if (authPromptResolver) {
      authPromptResolver({
        success: false,
        method: AuthenticationMethod.NONE,
        error: 'Authentication cancelled',
        timestamp: new Date(),
      });
    }
  },

  /**
   * Authenticate with PIN
   * Used by UI components after collecting PIN input
   */
  authenticateWithPIN: async (pin: string) => {
    set({isAuthenticating: true, error: undefined});

    try {
      console.log('[authStore] Authenticating with PIN');

      const result = await AuthenticationService.authenticateWithPIN(pin);

      if (result.success) {
        await get().getState();
        await get().loadSecurityEvents(10);
      } else {
        set({error: result.error});
        await get().getState();
      }

      set({isAuthenticating: false});
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'PIN authentication failed';
      set({
        isAuthenticating: false,
        error: errorMessage,
      });

      return {
        success: false,
        method: AuthenticationMethod.PIN,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  },

  /**
   * Logout user
   * Clears authentication session
   */
  logout: async () => {
    try {
      console.log('[authStore] Logging out');

      await AuthenticationService.logout();
      await get().getState();

      set({
        error: undefined,
      });
    } catch (error) {
      console.error('[authStore] Logout error:', error);
      set({
        error: 'Failed to logout',
      });
    }
  },

  /**
   * Setup authentication method
   * Configures PIN, biometric, or both
   */
  setupAuthentication: async (
    method: AuthenticationMethod,
    pinData?: PINSetupData,
  ) => {
    try {
      console.log('[authStore] Setting up authentication method:', method);

      const result = await AuthenticationService.setupAuthentication(
        method,
        pinData,
      );

      if (result.success) {
        // Refresh capabilities and state
        await get().refreshCapabilities();
        await get().loadSecurityEvents(10);
      } else {
        set({error: result.error});
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to setup authentication';
      set({error: errorMessage});
      return {success: false, error: errorMessage};
    }
  },

  /**
   * Disable authentication method
   */
  disableAuthentication: async (method: AuthenticationMethod) => {
    try {
      console.log('[authStore] Disabling authentication method:', method);

      const result = await AuthenticationService.disableAuthentication(method);

      if (result.success) {
        await get().refreshCapabilities();
        await get().getState();
        await get().loadSecurityEvents(10);
      }

      return result;
    } catch (error: any) {
      console.error('[authStore] Error disabling authentication:', error);
      return {success: false, error: error?.message || 'Failed to disable authentication'};
    }
  },

  /**
   * Change PIN
   */
  changePIN: async (changeData: PINChangeData) => {
    try {
      console.log('[authStore] Changing PIN');

      const result = await PINService.changePIN(changeData);

      if (result.isValid) {
        await get().loadSecurityEvents(10);
        return {success: true};
      } else {
        set({error: result.error});
        return {success: false, error: result.error};
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to change PIN';
      set({error: errorMessage});
      return {success: false, error: errorMessage};
    }
  },

  /**
   * Check biometric capabilities
   */
  checkBiometricCapabilities: async () => {
    const capabilities = await BiometricService.checkCapabilities();
    set({
      biometricCapabilities: capabilities,
      biometricAvailable: capabilities.isAvailable,
    });
    return capabilities;
  },

  /**
   * Refresh capabilities
   * Checks current authentication configuration
   */
  refreshCapabilities: async () => {
    try {
      const [capabilities, hasPIN, configuredMethod] = await Promise.all([
        BiometricService.checkCapabilities(),
        PINService.hasPIN(),
        AuthenticationService.getConfiguredMethod(),
      ]);

      set({
        biometricAvailable: capabilities.isAvailable,
        biometricCapabilities: capabilities,
        pinConfigured: hasPIN,
        configuredMethod,
      });
    } catch (error) {
      console.error('[authStore] Error refreshing capabilities:', error);
    }
  },

  /**
   * Load security events
   */
  loadSecurityEvents: async (limit = 10) => {
    try {
      const events = await AuthenticationService.getSecurityEvents(limit);
      set({recentSecurityEvents: events});
    } catch (error) {
      console.error('[authStore] Error loading security events:', error);
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async () => {
    const authenticated = await AuthenticationService.isAuthenticated();
    if (!authenticated && get().status === AuthenticationStatus.AUTHENTICATED) {
      // Session expired, update state
      await get().getState();
    }
    return authenticated;
  },

  /**
   * Get current authentication state
   * Syncs with AuthenticationService
   */
  getState: async () => {
    try {
      const state = await AuthenticationService.getState();

      set({
        status: state.status,
        method: state.method,
        lastAuthenticationTime: state.lastAuthenticationTime,
        failedAttempts: state.failedAttempts,
        isLocked: state.isLocked,
        lockoutEndTime: state.lockoutEndTime,
      });
    } catch (error) {
      console.error('[authStore] Error getting state:', error);
    }
  },

  /**
   * Clear all authentication data
   * WARNING: This will delete all PINs, biometric keys, and security data
   */
  clearAllAuthData: async () => {
    try {
      console.warn('[authStore] Clearing all authentication data');
      await AuthenticationService.clearAllData();
      await get().refreshCapabilities();
      await get().getState();
      set({
        error: undefined,
        recentSecurityEvents: [],
      });
    } catch (error) {
      console.error('[authStore] Error clearing auth data:', error);
      set({error: 'Failed to clear authentication data'});
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      ...initialState,
    });
  },
}));
