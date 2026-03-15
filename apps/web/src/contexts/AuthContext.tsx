import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../api/auth';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  showSessionWarning: boolean;
  
  login: (email: string, password: string, mfaCode?: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<any>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  extendSession: () => Promise<void>;
  setShowSessionWarning: (show: boolean) => void;
  
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  
  isTokenExpired: () => boolean;
  isRefreshTokenExpired: () => boolean;
  getTimeUntilExpiry: () => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
  onAuthenticationChange?: (isAuthenticated: boolean, user: User | null) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  fallback = null,
  onAuthenticationChange 
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized && onAuthenticationChange) {
      onAuthenticationChange(auth.isAuthenticated, auth.user);
    }
  }, [auth.isAuthenticated, auth.user, isInitialized, onAuthenticationChange]);

  if (!isInitialized) {
    return <>{fallback}</>;
  }

  const contextValue: AuthContextType = {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    showSessionWarning: auth.showSessionWarning,
    
    login: auth.login,
    logout: auth.logout,
    refreshAccessToken: auth.refreshAccessToken,
    updateUser: auth.updateUser,
    clearError: auth.clearError,
    extendSession: auth.extendSession,
    setShowSessionWarning: auth.setShowSessionWarning,
    
    hasRole: auth.hasRole,
    hasPermission: auth.hasPermission,
    hasAnyRole: auth.hasAnyRole,
    hasAllRoles: auth.hasAllRoles,
    
    isTokenExpired: auth.isTokenExpired,
    isRefreshTokenExpired: auth.isRefreshTokenExpired,
    getTimeUntilExpiry: auth.getTimeUntilExpiry
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const useAuthUser = (): User | null => {
  const { user } = useAuthContext();
  return user;
};

export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
};

export const useAuthLoading = (): boolean => {
  const { isLoading } = useAuthContext();
  return isLoading;
};

export const useAuthError = (): string | null => {
  const { error } = useAuthContext();
  return error;
};

export const useAuthActions = () => {
  const { login, logout, refreshAccessToken, updateUser, clearError, extendSession, setShowSessionWarning } = useAuthContext();
  return {
    login,
    logout,
    refreshAccessToken,
    updateUser,
    clearError,
    extendSession,
    setShowSessionWarning
  };
};

export const useAuthPermissions = () => {
  const { hasRole, hasPermission, hasAnyRole, hasAllRoles } = useAuthContext();
  return {
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles
  };
};

export const useAuthSession = () => {
  const { showSessionWarning, isTokenExpired, isRefreshTokenExpired, getTimeUntilExpiry } = useAuthContext();
  return {
    showSessionWarning,
    isTokenExpired,
    isRefreshTokenExpired,
    getTimeUntilExpiry
  };
};

export default AuthContext;