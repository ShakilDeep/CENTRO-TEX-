import { useAuthStore } from '../stores/authStore';

export type UserRole = 'Admin' | 'Manager' | 'Merchandiser';

interface RoleCheckContext {
  userRoles: string[];
  userRole?: string;
}

interface RoleCheckStrategy {
  check(roles: string[], context: RoleCheckContext): boolean;
}

class SingleRoleStrategy implements RoleCheckStrategy {
  check(roles: string[], context: RoleCheckContext): boolean {
    return roles.some(role => 
      context.userRoles.includes(role) || context.userRole === role
    );
  }
}

class AnyRoleStrategy implements RoleCheckStrategy {
  check(roles: string[], context: RoleCheckContext): boolean {
    return roles.some(role => 
      context.userRoles.includes(role) || context.userRole === role
    );
  }
}

class AllRolesStrategy implements RoleCheckStrategy {
  check(roles: string[], context: RoleCheckContext): boolean {
    return roles.every(role => 
      context.userRoles.includes(role) || context.userRole === role
    );
  }
}

class RoleCheckFacade {
  private strategies: Record<string, RoleCheckStrategy>;

  constructor() {
    this.strategies = {
      single: new SingleRoleStrategy(),
      any: new AnyRoleStrategy(),
      all: new AllRolesStrategy()
    };
  }

  private getContext(): RoleCheckContext {
    const userRoles = useAuthStore.getState().roles;
    const userRole = useAuthStore.getState().user?.role;
    return { userRoles, userRole };
  }

  checkRole(role: string): boolean {
    const context = this.getContext();
    return this.strategies.single.check([role], context);
  }

  checkAnyRole(roles: string[]): boolean {
    const context = this.getContext();
    return this.strategies.any.check(roles, context);
  }

  checkAllRoles(roles: string[]): boolean {
    const context = this.getContext();
    return this.strategies.all.check(roles, context);
  }

  canAccess(requiredRoles: string[], requireAll: boolean = false): boolean {
    return requireAll 
      ? this.checkAllRoles(requiredRoles)
      : this.checkAnyRole(requiredRoles);
  }

  isAdmin(): boolean {
    return this.checkRole('Admin');
  }

  isManager(): boolean {
    return this.checkRole('Manager');
  }

  isMerchandiser(): boolean {
    return this.checkRole('Merchandiser');
  }

  canManageUsers(): boolean {
    return this.checkAnyRole(['Admin']);
  }

  canManageLocations(): boolean {
    return this.checkAnyRole(['Admin', 'Manager']);
  }

  canManageSamples(): boolean {
    return this.checkAnyRole(['Admin', 'Manager', 'Merchandiser']);
  }

  canApproveSamples(): boolean {
    return this.checkAnyRole(['Admin', 'Manager']);
  }

  canViewReports(): boolean {
    return this.checkAnyRole(['Admin', 'Manager']);
  }

  canDeleteSamples(): boolean {
    return this.checkAnyRole(['Admin']);
  }
}

const roleCheckFacade = new RoleCheckFacade();

export const checkRole = (role: string): boolean => {
  return roleCheckFacade.checkRole(role);
};

export const checkAnyRole = (roles: string[]): boolean => {
  return roleCheckFacade.checkAnyRole(roles);
};

export const checkAllRoles = (roles: string[]): boolean => {
  return roleCheckFacade.checkAllRoles(roles);
};

export const canAccess = (requiredRoles: string[], requireAll: boolean = false): boolean => {
  return roleCheckFacade.canAccess(requiredRoles, requireAll);
};

export const isAdmin = (): boolean => roleCheckFacade.isAdmin();
export const isManager = (): boolean => roleCheckFacade.isManager();
export const isMerchandiser = (): boolean => roleCheckFacade.isMerchandiser();

export const canManageUsers = (): boolean => roleCheckFacade.canManageUsers();
export const canManageLocations = (): boolean => roleCheckFacade.canManageLocations();
export const canManageSamples = (): boolean => roleCheckFacade.canManageSamples();
export const canApproveSamples = (): boolean => roleCheckFacade.canApproveSamples();
export const canViewReports = (): boolean => roleCheckFacade.canViewReports();
export const canDeleteSamples = (): boolean => roleCheckFacade.canDeleteSamples();

export default roleCheckFacade;
