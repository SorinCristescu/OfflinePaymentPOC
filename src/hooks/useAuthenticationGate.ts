/**
 * useAuthenticationGate Hook
 *
 * Provides authentication gating for sensitive operations.
 * Checks if user is authenticated before allowing an action.
 * If not authenticated, triggers authentication flow.
 *
 * Usage:
 * const {executeProtected, isAuthenticating} = useAuthenticationGate();
 * await executeProtected(async () => {
 *   // Your sensitive operation here
 * }, 'Authenticate to transfer funds');
 */

import {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import {useAuthStore} from '../stores';
import {AuthenticationMethod} from '../types';

interface AuthenticationGateOptions {
  /**
   * Message to show in authentication prompt
   */
  promptMessage?: string;

  /**
   * Preferred authentication method
   */
  preferredMethod?: AuthenticationMethod;

  /**
   * Called when authentication is required
   * Return false to cancel the operation
   */
  onAuthenticationRequired?: () => boolean | Promise<boolean>;

  /**
   * Called when authentication succeeds
   */
  onAuthenticationSuccess?: () => void;

  /**
   * Called when authentication fails
   */
  onAuthenticationFailed?: (error: string) => void;
}

export const useAuthenticationGate = () => {
  const {
    isAuthenticated,
    authenticate,
    configuredMethod,
    status,
    isAuthenticating: storeAuthenticating,
  } = useAuthStore();

  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  /**
   * Execute a protected operation
   * Checks authentication and prompts if needed
   */
  const executeProtected = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      options?: AuthenticationGateOptions | string
    ): Promise<T | null> => {
      // Normalize options
      const opts: AuthenticationGateOptions =
        typeof options === 'string' ? {promptMessage: options} : options || {};

      const {
        promptMessage,
        preferredMethod,
        onAuthenticationRequired,
        onAuthenticationSuccess,
        onAuthenticationFailed,
      } = opts;

      try {
        setIsCheckingAuth(true);

        // Check if authentication is configured
        if (configuredMethod === AuthenticationMethod.NONE) {
          // No authentication configured, allow operation
          console.log('[AuthGate] No authentication configured, allowing operation');
          const result = await operation();
          return result;
        }

        // Check if already authenticated
        const authenticated = await isAuthenticated();

        if (authenticated) {
          // Already authenticated, execute operation
          console.log('[AuthGate] Already authenticated, executing operation');
          const result = await operation();
          return result;
        }

        // Not authenticated, need to authenticate
        console.log('[AuthGate] Not authenticated, requesting authentication');

        // Call onAuthenticationRequired callback
        if (onAuthenticationRequired) {
          const shouldContinue = await onAuthenticationRequired();
          if (!shouldContinue) {
            console.log('[AuthGate] Authentication cancelled by callback');
            return null;
          }
        }

        // Trigger authentication
        const authResult = await authenticate(
          preferredMethod,
          promptMessage || 'Authentication required'
        );

        if (authResult.success) {
          console.log('[AuthGate] Authentication successful, executing operation');
          onAuthenticationSuccess?.();

          // Execute the protected operation
          const result = await operation();
          return result;
        } else {
          // Authentication failed
          const error = authResult.error || 'Authentication failed';
          console.log('[AuthGate] Authentication failed:', error);
          onAuthenticationFailed?.(error);

          Alert.alert(
            'Authentication Required',
            error,
            [{text: 'OK'}]
          );

          return null;
        }
      } catch (error: any) {
        console.error('[AuthGate] Error during protected operation:', error);
        const errorMessage = error?.message || 'Operation failed';
        onAuthenticationFailed?.(errorMessage);
        Alert.alert('Error', errorMessage);
        return null;
      } finally {
        setIsCheckingAuth(false);
      }
    },
    [
      isAuthenticated,
      authenticate,
      configuredMethod,
    ]
  );

  /**
   * Check if authentication is required for any operation
   */
  const isAuthenticationRequired = useCallback((): boolean => {
    return configuredMethod !== AuthenticationMethod.NONE;
  }, [configuredMethod]);

  /**
   * Manually check if user is authenticated
   */
  const checkAuthentication = useCallback(async (): Promise<boolean> => {
    return await isAuthenticated();
  }, [isAuthenticated]);

  return {
    /**
     * Execute a protected operation with authentication check
     */
    executeProtected,

    /**
     * Check if authentication is required (is any method configured)
     */
    isAuthenticationRequired: isAuthenticationRequired(),

    /**
     * Check if user is currently authenticated
     */
    checkAuthentication,

    /**
     * Is currently checking authentication or authenticating
     */
    isAuthenticating: isCheckingAuth || storeAuthenticating,

    /**
     * Current authentication status
     */
    authenticationStatus: status,

    /**
     * Configured authentication method
     */
    configuredMethod,
  };
};
