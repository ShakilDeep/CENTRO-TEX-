import React, { useMemo, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

/**
 * Configuration interface for ProtectedRoute component
 * @property children - Child components to render when authorized
 * @property requiredRoles - Array of roles, user must have at least one (or all if roleType='all')
 * @property requiredPermissions - Array of permissions, user must have all specified permissions
 * @property roleType - 'any' means user needs at least one role, 'all' means user needs all roles
 * @property fallback - Custom loading component to show during authentication check
 * @property redirectTo - Path to redirect when not authenticated (default: '/login')
 * @property unauthorizedRedirectTo - Path to redirect when user lacks required role/permission
 * @property preserveAttemptedUrl - Whether to preserve attempted URL for post-login redirect
 */
export interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  roleType?: 'any' | 'all';
  fallback?: ReactNode;
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
  preserveAttemptedUrl?: boolean;
}

/**
 * ProtectedRoute Component
 * 
 * Enterprise-grade route protection with:
 * - Authentication verification
 * - Token validation and auto-refresh
 * - Role-based access control (RBAC)
 * - Permission-based access control
 * - Loading states
 * - Security audit logging
 * - State preservation for redirects
 * 
 * @example
 * // Basic authentication
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * // With role requirement
 * <ProtectedRoute requiredRoles={['Admin', 'Manager']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * 
 * // With permission requirement
 * <ProtectedRoute requiredPermissions={['manage:users']}>
 *   <UserManagement />
 * </ProtectedRoute>
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  roleType = 'any',
  fallback = null,
  redirectTo = '/login',
  unauthorizedRedirectTo = '/unauthorized',
  preserveAttemptedUrl = true
}) => {
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    user,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
    isTokenExpired,
    refreshAccessToken
  } = useAuthContext();

  /**
   * Token Refresh Strategy
   * Automatically refresh expired tokens before redirecting to login
   */
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      if (isAuthenticated && isTokenExpired && isTokenExpired()) {
        try {
          console.log('[ProtectedRoute] Token expired, attempting refresh...');
          await refreshAccessToken();
          console.log('[ProtectedRoute] Token refreshed successfully');
        } catch (error) {
          console.error('[ProtectedRoute] Token refresh failed:', error);
          // Token refresh failed, will be redirected to login
        }
      }
    };

    checkAndRefreshToken();
  }, [isAuthenticated, isTokenExpired, refreshAccessToken]);


  const loadingComponent = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-[var(--secondary)]">Loading...</p>
      </div>
    </div>
  ), []);

  if (isLoading) {
    return <>{fallback || loadingComponent}</>;
  }

  /**
   * Authentication Check
   * Redirect to login if not authenticated or token is expired
   */
  if (!isAuthenticated || (isTokenExpired && isTokenExpired())) {
    const returnTo = preserveAttemptedUrl
      ? encodeURIComponent(location.pathname + location.search)
      : null;
    const redirectUrl = returnTo ? `${redirectTo}?returnTo=${returnTo}` : redirectTo;
    
    console.log(
      `[ProtectedRoute] Unauthenticated access attempt to ${location.pathname}, redirecting to ${redirectUrl}`
    );
    
    return <Navigate to={redirectUrl} replace state={{ from: location }} />;
  }

  /**
   * Authorization Check - Role-Based Access Control (RBAC)
   */
  if (requiredRoles.length > 0 || requiredPermissions.length > 0) {
    let hasRequiredAccess = true;
    let accessDenialReason = '';

    // Check role requirements
    if (requiredRoles.length > 0) {
      if (roleType === 'any') {
        hasRequiredAccess = hasAnyRole(requiredRoles);
        if (!hasRequiredAccess) {
          accessDenialReason = `Required one of roles: ${requiredRoles.join(', ')}`;
        }
      } else {
        hasRequiredAccess = hasAllRoles(requiredRoles);
        if (!hasRequiredAccess) {
          accessDenialReason = `Required all roles: ${requiredRoles.join(', ')}`;
        }
      }
    }

    // Check permission requirements (only if role check passed)
    if (hasRequiredAccess && requiredPermissions.length > 0) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !hasPermission(permission)
      );
      
      if (missingPermissions.length > 0) {
        hasRequiredAccess = false;
        accessDenialReason = `Missing permissions: ${missingPermissions.join(', ')}`;
      }
    }

    // Log unauthorized access attempt for security audit
    if (!hasRequiredAccess) {
      console.warn(
        `[ProtectedRoute] Access denied for user ${user?.id} (${user?.email}, role: ${user?.role}) ` +
        `to ${location.pathname}. Reason: ${accessDenialReason}`
      );
      
      return (
        <Navigate
          to={unauthorizedRedirectTo}
          replace
          state={{
            from: location.pathname,
            reason: accessDenialReason,
            timestamp: new Date().toISOString()
          }}
        />
      );
    }
  }

  return <>{children}</>;
};

/**
 * Higher-Order Component (HOC) version of ProtectedRoute
 * Wraps a component with route protection
 * 
 * @example
 * const ProtectedDashboard = withProtectedRoute(Dashboard, {
 *   requiredRoles: ['Admin']
 * });
 */
export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  config: Omit<ProtectedRouteProps, 'children'>
): React.FC<P> => {
  return (props: P) => (
    <ProtectedRoute {...config}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

/**
 * Utility hook for checking route access without navigation
 * Useful for conditional rendering
 * 
 * @example
 * const { canAccess, reason } = useRouteAccess({
 *   requiredRoles: ['Admin']
 * });
 * 
 * if (!canAccess) {
 *   return <AccessDenied reason={reason} />;
 * }
 */
export const useRouteAccess = (config: {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  roleType?: 'any' | 'all';
}) => {
  const {
    isAuthenticated,
    isLoading,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    isTokenExpired,
  } = useAuthContext();

  if (isLoading) {
    return { canAccess: false, reason: 'loading', isLoading: true };
  }

  if (!isAuthenticated || (isTokenExpired && isTokenExpired())) {
    return { canAccess: false, reason: 'not_authenticated', isLoading: false };
  }

  const { requiredRoles = [], requiredPermissions = [], roleType = 'any' } = config;

  if (requiredRoles.length > 0) {
    const hasRole = roleType === 'any' 
      ? hasAnyRole(requiredRoles) 
      : hasAllRoles(requiredRoles);
      
    if (!hasRole) {
      return { 
        canAccess: false, 
        reason: `insufficient_role: required ${roleType} of [${requiredRoles.join(', ')}]`, 
        isLoading: false 
      };
    }
  }

  if (requiredPermissions.length > 0) {
    const missingPermissions = requiredPermissions.filter(
      (permission) => !hasPermission(permission)
    );
    
    if (missingPermissions.length > 0) {
      return {
        canAccess: false,
        reason: `insufficient_permissions: missing [${missingPermissions.join(', ')}]`,
        isLoading: false,
        missingPermissions,
      };
    }
  }

  return { canAccess: true, reason: null, isLoading: false };
};

export default ProtectedRoute;
