import type { ReactNode } from 'react';
import { useRoleCheck } from '../hooks/useRoleCheck';

export interface RoleBasedGuardProps {
  children: ReactNode;
  roles?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  renderFallback?: boolean;
}

export const RoleBasedGuard: React.FC<RoleBasedGuardProps> = ({
  children,
  roles = [],
  requireAll = false,
  fallback = null,
  renderFallback = true
}) => {
  const { canAccess } = useRoleCheck();

  const hasAccess = roles.length === 0 || canAccess(roles, requireAll);

  if (!hasAccess) {
    return renderFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

export const AdminOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedGuard roles={['Admin']} fallback={fallback}>
    {children}
  </RoleBasedGuard>
);

export const ManagerOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedGuard roles={['Manager', 'Admin']} fallback={fallback}>
    {children}
  </RoleBasedGuard>
);

export const ManagerOrAdmin: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedGuard roles={['Manager', 'Admin']} fallback={fallback}>
    {children}
  </RoleBasedGuard>
);

export const ManagerOrAbove: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedGuard roles={['Manager', 'Admin']} fallback={fallback}>
    {children}
  </RoleBasedGuard>
);

export const MerchandiserOrAbove: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedGuard roles={['Merchandiser', 'Manager', 'Admin']} fallback={fallback}>
    {children}
  </RoleBasedGuard>
);
