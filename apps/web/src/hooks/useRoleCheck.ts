import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUser, useAuth } from '@clerk/clerk-react';

export const useRoleCheck = () => {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isAuthLoaded } = useAuth();
  const user = useAuthStore(state => state.user);
  const userRoles = useAuthStore(state => state.roles);

  // Derived loading state — true only when Clerk has fully resolved
  const isLoaded = isAuthLoaded && isUserLoaded;

  const checkRole = useCallback((role: string): boolean => {
    // 1. Clerk Authentication checks
    if (clerkUser) {
      // Superadmin fallback exceptions for local testing
      const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase();
      if (email === 'shakil.uddin@yahoo.com' || email === 'admin@centrotex.com') {
        return true; // Superadmins inherently possess all queried roles
      }

      // Read from Clerk publicMetadata seamlessly
      const clerkRole = clerkUser.publicMetadata?.role as string | undefined;
      if (clerkRole && clerkRole.toLowerCase() === role.toLowerCase()) {
        return true;
      }
    }

    // 2. Legacy authStore checks
    return userRoles.includes(role) || user?.role === role;
  }, [userRoles, user, clerkUser]);

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
    isAdmin: () => checkRole('Admin'),
    isManager: () => checkRole('Manager'),
    isMerchandiser: () => checkRole('Merchandiser'),
    canManageUsers: () => checkRole('Admin'),
    canManageLocations: () => checkAnyRole(['Admin', 'Manager']),
    canManageSamples: () => checkAnyRole(['Admin', 'Manager', 'Merchandiser']),
    canApproveSamples: () => checkAnyRole(['Admin', 'Manager']),
    canViewReports: () => checkAnyRole(['Admin', 'Manager']),
    canDeleteSamples: () => checkRole('Admin'),
    checkRole,
    checkAnyRole,
    checkAllRoles,
    canAccess
  }), [isLoaded, checkRole, checkAnyRole, checkAllRoles, canAccess]);
};

export const useRequireRole = (requiredRoles: string[], requireAll: boolean = false, redirectTo: string = '/unauthorized') => {
  const { canAccess, isLoaded } = useRoleCheck();
  const navigate = useNavigate();

  // Only evaluate access after Clerk has fully loaded user data
  const hasAccess = isLoaded ? canAccess(requiredRoles, requireAll) : null;

  const redirectIfNoAccess = useCallback(() => {
    // Guard: never redirect while auth data is still loading
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
    requireAll
  };
};

export default useRoleCheck;
