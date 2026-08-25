export type AdminRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'CONTENT_MANAGER'
  | 'USER_MANAGER'
  | 'SUPPORT_AGENT'
  | 'FINANCE_MANAGER'
  | 'MARKETING_MANAGER'
  | 'SECURITY_AUDITOR'
  | 'ANALYST'
  | 'ADMIN'
  | 'SUPPORT'
  | 'USER';

export type ResourcePermission =
  | 'users.read'
  | 'users.manage'
  | 'users.suspend'
  | 'users.delete'
  | 'roles.read'
  | 'roles.assign'
  | 'projects.read'
  | 'projects.manage'
  | 'subscriptions.read'
  | 'subscriptions.manage'
  | 'payments.read'
  | 'payments.manage'
  | 'payments.refund'
  | 'credits.read'
  | 'credits.adjust'
  | 'plans.read'
  | 'plans.manage'
  | 'packages.read'
  | 'packages.manage'
  | 'providers.read'
  | 'providers.manage'
  | 'providers.secrets_manage'
  | 'models.read'
  | 'models.manage'
  | 'models.pricing_manage'
  | 'generations.read'
  | 'generations.manage'
  | 'assets.read'
  | 'assets.manage'
  | 'content.read'
  | 'content.manage'
  | 'marketing.read'
  | 'marketing.manage'
  | 'support.read'
  | 'support.manage'
  | 'analytics.read'
  | 'finance.analytics'
  | 'audit.read'
  | 'errors.read'
  | 'settings.read'
  | 'settings.manage'
  | 'admins.read'
  | 'admins.manage'
  | 'security.manage';

export type LegacyAdminPermission =
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

export type AdminPermission = ResourcePermission | LegacyAdminPermission;

export type RoleRiskTier = 'ROOT' | 'HIGH' | 'ELEVATED' | 'LIMITED' | 'READ_ONLY' | 'STANDARD';

export interface RoleDefinition {
  role: AdminRole;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
  riskTier: RoleRiskTier;
  assignable: boolean;
  legacy?: boolean;
}

export const OWNER_CONCEPT = Object.freeze({
  key: 'OWNER',
  labelAr: 'مالك المنصة',
  labelEn: 'Platform Owner',
  descriptionAr: 'هوية ملكية محمية خارج نظام الأدوار العادي ولا يمكن منحها من واجهة الإدارة.',
  descriptionEn: 'Protected ownership identity outside normal role assignment and never exposed in admin dropdowns.',
  assignable: false,
});

export const ROLE_DEFINITIONS: Record<AdminRole, RoleDefinition> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN', labelAr: 'المدير العام', labelEn: 'Super Admin', riskTier: 'ROOT', assignable: true,
    descriptionAr: 'تحكم إداري كامل بالمنصة، بما في ذلك المستخدمون والأدوار والإعدادات الحساسة.',
    descriptionEn: 'Full administrative control including users, roles, billing, security and sensitive settings.',
  },
  PLATFORM_ADMIN: {
    role: 'PLATFORM_ADMIN', labelAr: 'مدير المنصة', labelEn: 'Platform Admin', riskTier: 'HIGH', assignable: true,
    descriptionAr: 'إدارة التشغيل اليومي للمنصة دون صلاحيات الملكية أو أسرار البنية التحتية العليا.',
    descriptionEn: 'Runs day-to-day platform operations without ownership or root infrastructure authority.',
  },
  OPERATIONS_MANAGER: {
    role: 'OPERATIONS_MANAGER', labelAr: 'مدير العمليات', labelEn: 'Operations Manager', riskTier: 'ELEVATED', assignable: true,
    descriptionAr: 'يدير مزودي ونماذج الذكاء الاصطناعي والتشغيل والأخطاء والأداء.',
    descriptionEn: 'Manages AI providers, models, generation operations, failures and service health.',
  },
  CONTENT_MANAGER: {
    role: 'CONTENT_MANAGER', labelAr: 'مدير المحتوى', labelEn: 'Content Manager', riskTier: 'ELEVATED', assignable: true,
    descriptionAr: 'يدير الأدوات والتصنيفات والقوالب والمحتوى دون صلاحيات مالية أو أسرار المزودين.',
    descriptionEn: 'Manages tools, categories, templates and content without billing or provider secret access.',
  },
  USER_MANAGER: {
    role: 'USER_MANAGER', labelAr: 'مدير المستخدمين', labelEn: 'User Manager', riskTier: 'ELEVATED', assignable: true,
    descriptionAr: 'يدير حسابات المستخدمين وحالاتهم واستخدامهم ضمن حدود الصلاحيات المحددة.',
    descriptionEn: 'Manages user accounts, status and usage within constrained administrative permissions.',
  },
  SUPPORT_AGENT: {
    role: 'SUPPORT_AGENT', labelAr: 'موظف الدعم', labelEn: 'Support Agent', riskTier: 'LIMITED', assignable: true,
    descriptionAr: 'صلاحيات دعم محدودة لعرض المستخدم والمشكلات ذات الصلة دون تغييرات إدارية حساسة.',
    descriptionEn: 'Limited support access for user troubleshooting without sensitive administrative changes.',
  },
  FINANCE_MANAGER: {
    role: 'FINANCE_MANAGER', labelAr: 'المدير المالي', labelEn: 'Finance Manager', riskTier: 'ELEVATED', assignable: true,
    descriptionAr: 'يدير الاشتراكات والمدفوعات والأرصدة والخطط والتقارير المالية.',
    descriptionEn: 'Manages subscriptions, payments, credits, plans and financial reporting.',
  },
  MARKETING_MANAGER: {
    role: 'MARKETING_MANAGER', labelAr: 'مدير التسويق', labelEn: 'Marketing Manager', riskTier: 'ELEVATED', assignable: true,
    descriptionAr: 'يدير العروض والحملات والمحتوى التسويقي دون الوصول لإعدادات الأمان أو المدفوعات الحساسة.',
    descriptionEn: 'Manages promotions and marketing content without security or sensitive payment authority.',
  },
  SECURITY_AUDITOR: {
    role: 'SECURITY_AUDITOR', labelAr: 'المدقق الأمني', labelEn: 'Security Auditor', riskTier: 'READ_ONLY', assignable: true,
    descriptionAr: 'دور قراءة فقط لمراجعة السجلات والأخطاء والأمان دون تعديل البيانات.',
    descriptionEn: 'Read-only role for audit, error and security review with no data mutation permissions.',
  },
  ANALYST: {
    role: 'ANALYST', labelAr: 'المحلل', labelEn: 'Analyst', riskTier: 'READ_ONLY', assignable: true,
    descriptionAr: 'قراءة الإحصائيات والاستخدام والتقارير فقط دون أي تعديل.',
    descriptionEn: 'Read-only access to analytics, usage and reporting.',
  },
  ADMIN: {
    role: 'ADMIN', labelAr: 'مدير قديم', labelEn: 'Legacy Admin', riskTier: 'HIGH', assignable: false, legacy: true,
    descriptionAr: 'دور توافق قديم؛ يبقى للمستخدمين الحاليين ويُستبدل تدريجياً بمدير المنصة.',
    descriptionEn: 'Legacy compatibility role retained for existing accounts and gradually replaced by Platform Admin.',
  },
  SUPPORT: {
    role: 'SUPPORT', labelAr: 'دعم قديم', labelEn: 'Legacy Support', riskTier: 'LIMITED', assignable: false, legacy: true,
    descriptionAr: 'دور توافق قديم؛ يبقى للمستخدمين الحاليين ويُستبدل تدريجياً بموظف الدعم.',
    descriptionEn: 'Legacy compatibility role retained for existing accounts and gradually replaced by Support Agent.',
  },
  USER: {
    role: 'USER', labelAr: 'مستخدم', labelEn: 'User', riskTier: 'STANDARD', assignable: true,
    descriptionAr: 'مستخدم عادي بلا صلاحيات إدارة.',
    descriptionEn: 'Standard user with no administrative permissions.',
  },
};

export const ASSIGNABLE_ADMIN_ROLES = Object.freeze(
  (Object.values(ROLE_DEFINITIONS)
    .filter((definition) => definition.assignable && definition.role !== 'USER')
    .map((definition) => definition.role)) as AdminRole[],
);

const ALL_RESOURCE_PERMISSIONS: ResourcePermission[] = [
  'users.read', 'users.manage', 'users.suspend', 'users.delete', 'roles.read', 'roles.assign',
  'projects.read', 'projects.manage', 'subscriptions.read', 'subscriptions.manage',
  'payments.read', 'payments.manage', 'payments.refund', 'credits.read', 'credits.adjust',
  'plans.read', 'plans.manage', 'packages.read', 'packages.manage', 'providers.read', 'providers.manage',
  'providers.secrets_manage', 'models.read', 'models.manage', 'models.pricing_manage',
  'generations.read', 'generations.manage', 'assets.read', 'assets.manage', 'content.read', 'content.manage',
  'marketing.read', 'marketing.manage', 'support.read', 'support.manage', 'analytics.read', 'finance.analytics',
  'audit.read', 'errors.read', 'settings.read', 'settings.manage', 'admins.read', 'admins.manage', 'security.manage',
];

const permissionSet = (...permissions: ResourcePermission[]) => new Set<ResourcePermission>(permissions);

export const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<ResourcePermission>> = {
  SUPER_ADMIN: permissionSet(...ALL_RESOURCE_PERMISSIONS),
  PLATFORM_ADMIN: permissionSet(
    'users.read', 'users.manage', 'users.suspend', 'roles.read', 'projects.read', 'projects.manage',
    'subscriptions.read', 'subscriptions.manage', 'payments.read', 'payments.manage', 'credits.read', 'credits.adjust',
    'plans.read', 'plans.manage', 'packages.read', 'packages.manage', 'providers.read', 'providers.manage',
    'models.read', 'models.manage', 'models.pricing_manage', 'generations.read', 'generations.manage',
    'assets.read', 'assets.manage', 'content.read', 'content.manage', 'marketing.read', 'marketing.manage',
    'support.read', 'support.manage', 'analytics.read', 'finance.analytics', 'audit.read', 'errors.read',
    'settings.read', 'settings.manage', 'admins.read'
  ),
  OPERATIONS_MANAGER: permissionSet(
    'providers.read', 'providers.manage', 'models.read', 'models.manage', 'generations.read', 'generations.manage',
    'errors.read', 'analytics.read', 'settings.read'
  ),
  CONTENT_MANAGER: permissionSet(
    'content.read', 'content.manage', 'assets.read', 'assets.manage', 'projects.read', 'templates.manage' as ResourcePermission,
    'analytics.read'
  ),
  USER_MANAGER: permissionSet(
    'users.read', 'users.manage', 'users.suspend', 'projects.read', 'subscriptions.read', 'credits.read', 'analytics.read'
  ),
  SUPPORT_AGENT: permissionSet(
    'users.read', 'projects.read', 'subscriptions.read', 'payments.read', 'generations.read', 'assets.read', 'support.read', 'support.manage'
  ),
  FINANCE_MANAGER: permissionSet(
    'users.read', 'subscriptions.read', 'subscriptions.manage', 'payments.read', 'payments.manage', 'payments.refund',
    'credits.read', 'credits.adjust', 'plans.read', 'plans.manage', 'packages.read', 'packages.manage',
    'analytics.read', 'finance.analytics'
  ),
  MARKETING_MANAGER: permissionSet(
    'content.read', 'content.manage', 'marketing.read', 'marketing.manage', 'analytics.read', 'plans.read', 'packages.read'
  ),
  SECURITY_AUDITOR: permissionSet('audit.read', 'errors.read', 'analytics.read', 'settings.read', 'admins.read'),
  ANALYST: permissionSet(
    'users.read', 'projects.read', 'subscriptions.read', 'payments.read', 'credits.read', 'plans.read', 'packages.read',
    'providers.read', 'models.read', 'generations.read', 'assets.read', 'analytics.read', 'finance.analytics', 'audit.read', 'errors.read'
  ),
  ADMIN: permissionSet(
    'users.read', 'users.manage', 'users.suspend', 'projects.read', 'projects.manage', 'subscriptions.read', 'subscriptions.manage',
    'payments.read', 'payments.manage', 'credits.read', 'credits.adjust', 'generations.read', 'generations.manage',
    'assets.read', 'assets.manage', 'audit.read', 'errors.read', 'analytics.read', 'plans.read', 'packages.read',
    'providers.read', 'models.read', 'settings.read'
  ),
  SUPPORT: permissionSet('users.read', 'projects.read', 'subscriptions.read', 'payments.read', 'generations.read', 'assets.read'),
  USER: permissionSet(),
};

const LEGACY_PERMISSION_MAP: Record<LegacyAdminPermission, ResourcePermission> = {
  USERS_READ: 'users.read', USERS_MANAGE: 'users.manage',
  PROJECTS_READ: 'projects.read', PROJECTS_MANAGE: 'projects.manage',
  SUBSCRIPTIONS_READ: 'subscriptions.read', SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
  PAYMENTS_READ: 'payments.read', PAYMENTS_MANAGE: 'payments.manage',
  CREDITS_READ: 'credits.read', CREDITS_MANAGE: 'credits.adjust',
  PLANS_READ: 'plans.read', PLANS_MANAGE: 'plans.manage',
  PACKAGES_READ: 'packages.read', PACKAGES_MANAGE: 'packages.manage',
  PROVIDERS_READ: 'providers.read', PROVIDERS_MANAGE: 'providers.manage',
  MODELS_READ: 'models.read', MODELS_MANAGE: 'models.manage',
  GENERATIONS_READ: 'generations.read', GENERATIONS_MANAGE: 'generations.manage',
  ASSETS_READ: 'assets.read', ASSETS_MANAGE: 'assets.manage',
  AUDIT_LOGS_READ: 'audit.read', ERRORS_READ: 'errors.read',
  ANALYTICS_READ: 'analytics.read', SETTINGS_READ: 'settings.read', SETTINGS_MANAGE: 'settings.manage',
  ADMIN_MANAGE: 'admins.manage', SECURITY_MANAGE: 'security.manage',
};

export interface AuthContext {
  userId: string;
  email: string;
  role: AdminRole;
}

export function normalizePermission(permission: AdminPermission): ResourcePermission {
  return (LEGACY_PERMISSION_MAP as Partial<Record<AdminPermission, ResourcePermission>>)[permission] || permission as ResourcePermission;
}

export function checkPermission(role: AdminRole, permission: AdminPermission): boolean {
  if (!role || role === 'USER') return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(normalizePermission(permission)) : false;
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

export function isReadOnlyRole(role: AdminRole): boolean {
  return role === 'SECURITY_AUDITOR' || role === 'ANALYST';
}

export function isAssignableAdminRole(role: AdminRole): boolean {
  return ASSIGNABLE_ADMIN_ROLES.includes(role);
}
