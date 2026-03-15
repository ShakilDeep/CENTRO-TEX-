import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore, useAuthUser, useIsAuthenticated, useAuthLoading, useAuthError, usePermissions, useSessionWarning, useMobileTimeoutActions } from '../stores/authStore';
import { apiClient } from '../api/client';

/**
 * Authentication hook - Manages user authentication state and operations
 * Includes login, logout, token refresh, and permission checking
 * 
 * @returns {Object} Auth context with user, auth state, and actions
 */
export const useAuth = () => {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const error = useAuthError();
  const { hasRole, hasPermission, hasAnyRole, hasAllRoles } = usePermissions();
  const showSessionWarning = useSessionWarning();

  const login = useAuthStore(state => state.login);
  const logout = useAuthStore(state => state.logout);
  const refreshAccessToken = useAuthStore(state => state.refreshAccessToken);
  const updateUser = useAuthStore(state => state.updateUser);
  const clearError = useAuthStore(state => state.clearError);
  const updateLastActivity = useAuthStore(state => state.updateLastActivity);
  const extendSession = useAuthStore(state => state.extendSession);
  const setShowSessionWarning = useAuthStore(state => state.setShowSessionWarning);
  const checkSessionTimeout = useAuthStore(state => state.checkSessionTimeout);
  const getTimeUntilExpiry = useAuthStore(state => state.getTimeUntilExpiry);
  const isTokenExpired = useAuthStore(state => state.isTokenExpired);
  const isRefreshTokenExpired = useAuthStore(state => state.isRefreshTokenExpired);

  const updateMobileTimeout = useAuthStore(state => state.updateMobileTimeout);
  const cleanupIdleTimer = useAuthStore(state => state.cleanupIdleTimer);

  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityListenerRef = useRef<(() => void) | null>(null);

  /**
   * Handle user login with email and password
   */
  const handleLogin = useCallback(
    async (email: string, password: string, mfaCode?: string) => {
      try {
        const response = await login(email, password, mfaCode);
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Login failed';
        throw new Error(errorMessage);
      }
    },
    [login]
  );

  /**
   * Handle user logout
   */
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      await logout(true);
    }
  }, [logout]);

  /**
   * Handle session extension
   */
  const handleExtendSession = useCallback(async () => {
    try {
      await extendSession();
      setShowSessionWarning(false);
    } catch (err) {
      console.error('Failed to extend session:', err);
      await handleLogout();
    }
  }, [extendSession, setShowSessionWarning, handleLogout]);

  /**
   * Activity listener setup - Update last activity on user interactions
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleActivity = () => {
      updateLastActivity();
      // Dismiss warning if dismissed while extending
      if (showSessionWarning) {
        setShowSessionWarning(false);
      }
    };

    activityListenerRef.current = handleActivity;

    // Add event listeners for user activity
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [isAuthenticated, updateLastActivity, showSessionWarning, setShowSessionWarning]);

  /**
   * Session timeout checker - Runs every minute
   */
  useEffect(() => {
    if (!isAuthenticated) {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
      return;
    }

    sessionCheckIntervalRef.current = setInterval(async () => {
      const hasTimedOut = checkSessionTimeout();
      const timeUntilExpiry = getTimeUntilExpiry();
      const warningThreshold = 5 * 60 * 1000; // 5 minutes

      if (hasTimedOut) {
        // Session timed out, logout
        setShowSessionWarning(false);
        await handleLogout();
      } else if (timeUntilExpiry > 0 && timeUntilExpiry <= warningThreshold && !showSessionWarning) {
        // Show warning before timeout
        setShowSessionWarning(true);
      }
    }, 60000); // Check every minute

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [isAuthenticated, checkSessionTimeout, getTimeUntilExpiry, handleLogout, showSessionWarning, setShowSessionWarning]);

  /**
   * Token expiry check - Set up warning timeout
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const timeUntilExpiry = getTimeUntilExpiry();
    const warningThreshold = 5 * 60 * 1000; // 5 minutes

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    if (timeUntilExpiry > warningThreshold) {
      // Schedule warning for 5 minutes before expiry
      const delayUntilWarning = timeUntilExpiry - warningThreshold;
      warningTimeoutRef.current = setTimeout(() => {
        if (!showSessionWarning) {
          setShowSessionWarning(true);
        }
      }, delayUntilWarning);
    }

    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [isAuthenticated, getTimeUntilExpiry, showSessionWarning, setShowSessionWarning]);

  /**
   * Token refresh on unmount/logout
   */
  useEffect(() => {
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Mobile auto-timeout initialization
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    updateMobileTimeout();

    return () => {
      cleanupIdleTimer();
    };
  }, [isAuthenticated, updateMobileTimeout, cleanupIdleTimer]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    showSessionWarning,

    // Actions
    login: handleLogin,
    logout: handleLogout,
    refreshAccessToken,
    updateUser,
    clearError,
    extendSession: handleExtendSession,
    setShowSessionWarning,

    // Permissions
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,

    // Token info
    isTokenExpired,
    isRefreshTokenExpired,
    getTimeUntilExpiry
  };
};

export default useAuth;
