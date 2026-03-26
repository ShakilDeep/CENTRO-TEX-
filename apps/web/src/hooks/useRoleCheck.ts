import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * Role-checking hook using the custom SQLite-backed auth store.
 * Provides granular permission helpers for UI-level access control.
 */
export const useRoleCheck = () => {
  const user = useAuthStore(state => state.user);
  const userRoles = useAuthStore(state => state.roles);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const isLoaded = true; // Custom auth is synchronous from Zustand

  const checkRole = useCallback((role: string): boolean => {
    // Admin has implicit access to all roles
    if (user?.role?.toUpperCase() === 'ADMIN') {
      return true;
    }

    // Check against the user's assigned role (case-insensitive)
    if (user?.role && user.role.toUpperCase() === role.toUpperCase()) {
      return true;
    }

    // Check against the roles array in the store
    return userRoles.some(r => r.toUpperCase() === role.toUpperCase());
  }, [userRoles, user]);

  const checkAnyRole = useCallback((roles: string[]): boolean => {
    return roles.some(role => checkRole(role));
  }, [checkRole]);

  const checkAllRoles = useCallback((roles: string[]): boolean => {
    return roles.every(role => checkRole(role));
  }, [checkRole]);

  const canAccess = useCallback((requiredRoles: string[], requireAll: boolean = false): boolean => {
    return requireAll ? checkAllRoles(requiredRoles) : checkAnyRole(requiredRoles);
  }, [checkAnyRole, checkAllRoles]);

  return useMemo(() => ({
    isLoaded,
    isAdmin: () => checkRole('ADMIN'),
    isDispatch: () => checkRole('DISPATCH'),
    isMerchandiser: () => checkRole('MERCHANDISER'),
    canManageUsers: () => checkRole('ADMIN'),
    canManageLocations: () => checkAnyRole(['ADMIN', 'DISPATCH']),
    canManageSamples: () => checkAnyRole(['ADMIN', 'DISPATCH', 'MERCHANDISER']),
    canApproveSamples: () => checkAnyRole(['ADMIN', 'DISPATCH']),
    canViewReports: () => checkAnyRole(['ADMIN', 'DISPATCH']),
    canDeleteSamples: () => checkRole('ADMIN'),
    checkRole,
    checkAnyRole,
    checkAllRoles,
    canAccess,
  }), [isLoaded, checkRole, checkAnyRole, checkAllRoles, canAccess]);
};

export const useRequireRole = (requiredRoles: string[], requireAll: boolean = false, redirectTo: string = '/unauthorized') => {
  const { canAccess, isLoaded } = useRoleCheck();
  const navigate = useNavigate();

  const hasAccess = isLoaded ? canAccess(requiredRoles, requireAll) : null;

  const redirectIfNoAccess = useCallback(() => {
    if (!isLoaded) return;
    if (!hasAccess) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoaded, hasAccess, navigate, redirectTo]);

  return {
    hasAccess,
    isLoaded,
    redirectIfNoAccess,
    requiredRoles,
    requireAll,
  };
};

export default useRoleCheck;
