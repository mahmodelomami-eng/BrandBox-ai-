export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'USER';

export type AdminPermission =
  | 'USERS_READ' | 'USERS_MANAGE'
  | 'PROJECTS_READ' | 'PROJECTS_MANAGE'
  | 'SUBSCRIPTIONS_READ' | 'SUBSCRIPTIONS_MANAGE'
  | 'PAYMENTS_READ' | 'PAYMENTS_MANAGE'
  | 'CREDITS_READ' | 'CREDITS_MANAGE'
  | 'PLANS_READ' | 'PLANS_MANAGE'
  | 'PACKAGES_READ' | 'PACKAGES_MANAGE'
  | 'PROVIDERS_READ' | 'PROVIDERS_MANAGE'
  | 'MODELS_READ' | 'MODELS_MANAGE'
  | 'GENERATIONS_READ' | 'GENERATIONS_MANAGE'
  | 'ASSETS_READ' | 'ASSETS_MANAGE'
  | 'AUDIT_LOGS_READ' | 'ERRORS_READ'
  | 'ANALYTICS_READ' | 'SETTINGS_READ' | 'SETTINGS_MANAGE'
  | 'ADMIN_MANAGE' | 'SECURITY_MANAGE';

export const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  SUPER_ADMIN: new Set<AdminPermission>([
    'USERS_READ', 'USERS_MANAGE', 'PROJECTS_READ', 'PROJECTS_MANAGE',
    'SUBSCRIPTIONS_READ', 'SUBSCRIPTIONS_MANAGE', 'PAYMENTS_READ', 'PAYMENTS_MANAGE',
    'CREDITS_READ', 'CREDITS_MANAGE', 'PLANS_READ', 'PLANS_MANAGE',
    'PACKAGES_READ', 'PACKAGES_MANAGE', 'PROVIDERS_READ', 'PROVIDERS_MANAGE',
    'MODELS_READ', 'MODELS_MANAGE', 'GENERATIONS_READ', 'GENERATIONS_MANAGE',
    'ASSETS_READ', 'ASSETS_MANAGE', 'AUDIT_LOGS_READ', 'ERRORS_READ',
    'ANALYTICS_READ', 'SETTINGS_READ', 'SETTINGS_MANAGE', 'ADMIN_MANAGE', 'SECURITY_MANAGE'
  ]),
  ADMIN: new Set<AdminPermission>([
    'USERS_READ', 'USERS_MANAGE', 'PROJECTS_READ', 'PROJECTS_MANAGE',
    'SUBSCRIPTIONS_READ', 'SUBSCRIPTIONS_MANAGE', 'PAYMENTS_READ', 'PAYMENTS_MANAGE',
    'CREDITS_READ', 'CREDITS_MANAGE', 'GENERATIONS_READ', 'GENERATIONS_MANAGE',
    'ASSETS_READ', 'ASSETS_MANAGE', 'AUDIT_LOGS_READ', 'ERRORS_READ', 'ANALYTICS_READ',
    'PLANS_READ', 'PACKAGES_READ', 'PROVIDERS_READ', 'MODELS_READ', 'SETTINGS_READ'
  ]),
  SUPPORT: new Set<AdminPermission>([
    'USERS_READ', 'PROJECTS_READ', 'SUBSCRIPTIONS_READ', 'PAYMENTS_READ',
    'GENERATIONS_READ', 'ASSETS_READ'
  ]),
  USER: new Set<AdminPermission>([])
};

export interface AuthContext {
  userId: string;
  email: string;
  role: AdminRole;
}

export function checkPermission(role: AdminRole, permission: AdminPermission): boolean {
  if (!role || role === 'USER') return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

export function assertPermission(role: AdminRole, permission: AdminPermission): void {
  if (!checkPermission(role, permission)) {
    throw new Error(`FORBIDDEN: Missing required permission '${permission}' for role '${role}'.`);
  }
}

export function assertSuperAdmin(role: AdminRole): void {
  if (role !== 'SUPER_ADMIN') {
    throw new Error(`FORBIDDEN: Operation restricted strictly to SUPER_ADMIN. Current role: '${role}'.`);
  }
}