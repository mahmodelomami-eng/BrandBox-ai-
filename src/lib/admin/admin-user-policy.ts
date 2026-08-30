import {
  AdminRole,
  ASSIGNABLE_ADMIN_ROLES,
  ROLE_DEFINITIONS,
  checkPermission,
} from '../auth/rbac-engine';

export const ADMIN_CREDIT_LIMITS: Partial<Record<AdminRole, number>> = {
  SUPER_ADMIN: 1_000_000,
  PLATFORM_ADMIN: 100_000,
  FINANCE_MANAGER: 100_000,
};

export function isKnownRole(role: string): role is AdminRole {
  return Object.prototype.hasOwnProperty.call(ROLE_DEFINITIONS, role);
}

export function isRoleAssignable(role: string): role is AdminRole {
  if (!isKnownRole(role)) return false;
  if (role === 'USER') return true;
  return ASSIGNABLE_ADMIN_ROLES.includes(role);
}

export function canReadUsers(role: AdminRole): boolean {
  return checkPermission(role, 'users.read');
}

export function canSuspendUsers(role: AdminRole): boolean {
  return checkPermission(role, 'users.suspend');
}

export function canDeleteUsers(role: AdminRole): boolean {
  return role === 'SUPER_ADMIN' && checkPermission(role, 'users.delete');
}

export function canAssignRoles(role: AdminRole): boolean {
  return role === 'SUPER_ADMIN' && checkPermission(role, 'roles.assign');
}

export function canAdjustCredits(role: AdminRole, amount: number): boolean {
  if (!checkPermission(role, 'credits.adjust')) return false;
  const limit = ADMIN_CREDIT_LIMITS[role];
  return Boolean(limit && Number.isInteger(amount) && amount > 0 && amount <= limit);
}

export function assertRoleChangePolicy(params: {
  actorRole: AdminRole;
  actorUserId: string;
  targetUserId: string;
  currentRole: AdminRole;
  nextRole: AdminRole;
  activeSuperAdminCount: number;
}): void {
  const { actorRole, actorUserId, targetUserId, currentRole, nextRole, activeSuperAdminCount } = params;

  if (!canAssignRoles(actorRole)) {
    throw new Error('FORBIDDEN: Only SUPER_ADMIN can assign administrative roles.');
  }
  if (!isRoleAssignable(nextRole)) {
    throw new Error(`INVALID_ROLE: Role '${nextRole}' is not assignable.`);
  }
  if (actorUserId === targetUserId && nextRole !== 'SUPER_ADMIN') {
    throw new Error('FORBIDDEN: Self-demotion is not allowed.');
  }
  if (currentRole === 'SUPER_ADMIN' && nextRole !== 'SUPER_ADMIN' && activeSuperAdminCount <= 1) {
    throw new Error('FORBIDDEN: Cannot demote the last active SUPER_ADMIN.');
  }
}

export function assertSuspendPolicy(params: {
  actorRole: AdminRole;
  actorUserId: string;
  targetUserId: string;
  targetRole: AdminRole;
}): void {
  const { actorRole, actorUserId, targetUserId, targetRole } = params;
  if (!canSuspendUsers(actorRole)) {
    throw new Error('FORBIDDEN: Missing users.suspend permission.');
  }
  if (actorUserId === targetUserId) {
    throw new Error('FORBIDDEN: Self-suspension is not allowed.');
  }
  if (targetRole === 'SUPER_ADMIN') {
    throw new Error('FORBIDDEN: SUPER_ADMIN accounts cannot be suspended.');
  }
}
