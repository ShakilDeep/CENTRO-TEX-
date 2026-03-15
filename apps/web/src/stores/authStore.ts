import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '../api/auth';
import TokenRefreshService from '../services/tokenRefreshService';
import IdleTimer from '../services/idleTimer';
import MobileDetection from '../utils/mobileDetection';
import type { User, LoginResponse, RefreshTokenResponse } from '../api/auth';

// Enhanced Types
export interface AuthState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Token state
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  refreshExpiry: number | null;

  // Error state
  error: string | null;
  lastActivity: number;

  // Session management
  sessionTimeout: number; // in milliseconds
  warningThreshold: number; // warning before expiry (minutes)
  showSessionWarning: boolean;

  // Permission state
  permissions: string[];
  roles: string[];

  // Mobile auto-timeout state
  isMobile: boolean;
  mobileTimeoutEnabled: boolean;
  mobileTimeoutDuration: number; // in milliseconds
}

export interface AuthActions {
  // Authentication actions
  login: (email: string, password: string, mfaCode?: string) => Promise<LoginResponse>;
  logout: (force?: boolean) => Promise<void>;
  refreshAccessToken: () => Promise<RefreshTokenResponse | null>;

  // User management
  updateUser: (user: Partial<User>) => void;
  clearUser: () => void;

  // Token management
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number, refreshExpiresIn: number) => void;
  clearTokens: () => void;
  isTokenExpired: () => boolean;
  isRefreshTokenExpired: () => boolean;
  getTimeUntilExpiry: () => number; // returns milliseconds

  // Session management
  updateLastActivity: () => void;
  checkSessionTimeout: () => boolean;
  extendSession: () => Promise<void>;
  setSessionTimeout: (timeout: number) => void;
  setShowSessionWarning: (show: boolean) => void;

  // Permission management
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Mobile auto-timeout actions
  initializeIdleTimer: () => void;
  cleanupIdleTimer: () => void;
  updateMobileTimeout: () => void;

  // State reset
  reset: () => void;
}

export interface AuthStore extends AuthState, AuthActions { }

// Utility functions
export const getStoredTokens = () => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state;
    }
  } catch (error) {
    console.warn('Failed to parse stored auth state:', error);
  }
  return null;
};

const clearAllAuthData = () => {
  try {
    localStorage.removeItem('auth-storage');
    // Clear any other auth-related keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('auth_') || key.startsWith('token_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear auth data:', error);
  }
};

// Create the auth store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,

      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      refreshExpiry: null,

      error: null,
      lastActivity: Date.now(),

      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      warningThreshold: 5, // 5 minutes
      showSessionWarning: false,

      permissions: [],
      roles: [],

      isMobile: false,
      mobileTimeoutEnabled: true,
      mobileTimeoutDuration: 15 * 60 * 1000, // 15 minutes

      // Authentication actions
      login: async (email: string, password: string, mfaCode?: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login({ email, password, mfaCode });

          if (response.success && response.data) {
            const { user, accessToken, refreshToken, expiresIn, refreshExpiresIn } = response.data;
            const tokenExpiry = Date.now() + (expiresIn * 1000);
            const refreshExpiry = Date.now() + (refreshExpiresIn * 1000);

            set({
              user,
              accessToken,
              refreshToken,
              tokenExpiry,
              refreshExpiry,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              lastActivity: Date.now(),
              roles: user.role ? [user.role] : [],
              permissions: [] // TODO: Fetch permissions based on role
            });

            TokenRefreshService.getInstance().scheduleProactiveRefresh(expiresIn);
            get().updateMobileTimeout();

            return response.data;
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false
          });
          throw error;
        }
      },

      logout: async (force = false) => {
        const { refreshToken } = get();

        if (!force && refreshToken) {
          try {
            await authApi.logout({ refreshToken });
          } catch (error) {
            console.warn('Failed to logout from server:', error);
          }
        }

        TokenRefreshService.getInstance().clearProactiveRefreshTimer();
        get().cleanupIdleTimer();

        clearAllAuthData();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          refreshExpiry: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          permissions: [],
          roles: [],
          showSessionWarning: false,
          isMobile: false
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken, isRefreshTokenExpired } = get();

        if (!refreshToken || isRefreshTokenExpired()) {
          get().logout(true);
          return null;
        }

        try {
          const response = await authApi.refreshToken({ refreshToken });

          if (response.success && response.data) {
            const { accessToken, refreshToken: newRefreshToken, expiresIn, refreshExpiresIn } = response.data;
            const tokenExpiry = Date.now() + (expiresIn * 1000);
            const newRefreshExpiry = Date.now() + (refreshExpiresIn * 1000);

            set({
              accessToken,
              refreshToken: newRefreshToken,
              tokenExpiry,
              refreshExpiry: newRefreshExpiry,
              error: null,
              lastActivity: Date.now()
            });

            TokenRefreshService.getInstance().scheduleProactiveRefresh(expiresIn);

            return response.data;
          } else {
            throw new Error(response.message || 'Token refresh failed');
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
          get().logout(true);
          return null;
        }
      },

      // User management
      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...userData };
          set({ user: updatedUser });

          // Update roles if user role changed
          if (userData.role && userData.role !== user.role) {
            set({ roles: [userData.role] });
          }
        }
      },

      clearUser: () => {
        set({ user: null });
      },

      // Token management
      setTokens: (accessToken: string, refreshToken: string, expiresIn: number, refreshExpiresIn: number) => {
        const tokenExpiry = Date.now() + (expiresIn * 1000);
        const refreshExpiryDate = Date.now() + (refreshExpiresIn * 1000);

        set({
          accessToken,
          refreshToken,
          tokenExpiry,
          refreshExpiry: refreshExpiryDate,
          isAuthenticated: true,
          lastActivity: Date.now()
        });
      },

      clearTokens: () => {
        set({
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          refreshExpiry: null,
          isAuthenticated: false
        });
      },

      isTokenExpired: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return true;
        return Date.now() >= tokenExpiry;
      },

      isRefreshTokenExpired: () => {
        const { refreshExpiry } = get();
        if (!refreshExpiry) return true;
        return Date.now() >= refreshExpiry;
      },

      getTimeUntilExpiry: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return 0;
        return Math.max(0, tokenExpiry - Date.now());
      },

      // Session management
      updateLastActivity: () => {
        set({ lastActivity: Date.now() });
      },

      checkSessionTimeout: () => {
        const { lastActivity, sessionTimeout, getTimeUntilExpiry } = get();
        const timeSinceActivity = Date.now() - lastActivity;
        const timeUntilTokenExpiry = getTimeUntilExpiry();

        // Check if session timed out due to inactivity
        if (timeSinceActivity >= sessionTimeout) {
          return true;
        }

        // Check if token is expired or about to expire
        if (timeUntilTokenExpiry <= 60000) { // 1 minute buffer
          return true;
        }

        return false;
      },

      extendSession: async () => {
        const { refreshAccessToken, updateLastActivity } = get();

        // Try to refresh the token
        const refreshResult = await refreshAccessToken();

        if (refreshResult) {
          updateLastActivity();
          set({ showSessionWarning: false });
        } else {
          // Refresh failed, logout
          get().logout(true);
        }
      },

      setSessionTimeout: (timeout: number) => {
        set({ sessionTimeout: timeout });
      },

      setShowSessionWarning: (show: boolean) => {
        set({ showSessionWarning: show });
      },

      // Permission management
      hasPermission: (permission: string) => {
        const { permissions, user } = get();

        // Admin has all permissions
        if (user?.role === 'admin') return true;

        return permissions.includes(permission);
      },

      hasRole: (role: string) => {
        const { roles, user } = get();
        return roles.includes(role) || user?.role === role;
      },

      hasAnyRole: (roles: string[]) => {
        const { roles: userRoles, user } = get();
        return roles.some(role => userRoles.includes(role) || user?.role === role);
      },

      hasAllRoles: (roles: string[]) => {
        const { roles: userRoles, user } = get();
        return roles.every(role => userRoles.includes(role) || user?.role === role);
      },

      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Mobile auto-timeout actions
      initializeIdleTimer: () => {
        const { isMobile, mobileTimeoutEnabled, mobileTimeoutDuration } = get();

        if (isMobile && mobileTimeoutEnabled) {
          const idleTimer = IdleTimer.create(async () => {
            await get().logout(true);
          }, {
            timeout: mobileTimeoutDuration,
            events: ['mousedown', 'keydown', 'touchstart', 'touchmove', 'touchend', 'scroll', 'wheel', 'click']
          }, 'auth');

          idleTimer.start();
        }
      },

      cleanupIdleTimer: () => {
        IdleTimer.destroy('auth');
      },

      updateMobileTimeout: () => {
        const mobileDetector = MobileDetection.getInstance();
        const isMobile = mobileDetector.isMobile();

        if (get().isMobile !== isMobile) {
          set({ isMobile });
        }

        const { mobileTimeoutEnabled, mobileTimeoutDuration } = get();

        if (isMobile && mobileTimeoutEnabled) {
          get().cleanupIdleTimer();
          get().initializeIdleTimer();
        } else {
          get().cleanupIdleTimer();
        }
      },

      // State reset
      reset: () => {
        TokenRefreshService.getInstance().clearProactiveRefreshTimer();
        get().cleanupIdleTimer();
        clearAllAuthData();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          refreshExpiry: null,
          error: null,
          lastActivity: Date.now(),
          showSessionWarning: false,
          permissions: [],
          roles: [],
          isMobile: false
        });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenExpiry: state.tokenExpiry,
        refreshExpiry: state.refreshExpiry,
        isAuthenticated: state.isAuthenticated,
        roles: state.roles,
        permissions: state.permissions
      }),
      onRehydrateStorage: () => (state) => {
        // Initialize last activity on rehydrate
        if (state) {
          state.lastActivity = Date.now();

          // Check if tokens are expired on rehydrate
          // Use direct token expiry check instead of method call
          if (state.tokenExpiry && Date.now() >= state.tokenExpiry) {
            state.logout(true);
          }
        }
      }
    }
  )
);

// Selectors for optimized re-renders
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthPermissions = () => useAuthStore((state) => state.permissions);
export const useAuthRoles = () => useAuthStore((state) => state.roles);
export const useSessionWarning = () => useAuthStore((state) => state.showSessionWarning);
export const useTimeUntilExpiry = () => useAuthStore((state) => state.getTimeUntilExpiry());

// Hooks for mobile auto-timeout
export const useIsMobile = () => useAuthStore((state) => state.isMobile);
export const useMobileTimeoutEnabled = () => useAuthStore((state) => state.mobileTimeoutEnabled);
export const useMobileTimeoutDuration = () => useAuthStore((state) => state.mobileTimeoutDuration);
export const useMobileTimeoutActions = () => useAuthStore((state) => ({
  initializeIdleTimer: state.initializeIdleTimer,
  cleanupIdleTimer: state.cleanupIdleTimer,
  updateMobileTimeout: state.updateMobileTimeout
}));

// Hooks for common auth operations
export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  logout: state.logout,
  refreshAccessToken: state.refreshAccessToken,
  updateUser: state.updateUser,
  clearError: state.clearError,
  updateLastActivity: state.updateLastActivity,
  extendSession: state.extendSession,
  setShowSessionWarning: state.setShowSessionWarning
}));

// Utility hook for permission checking
export const usePermissions = () => {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);
  const hasAllRoles = useAuthStore((state) => state.hasAllRoles);

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles
  };
};

export default useAuthStore;