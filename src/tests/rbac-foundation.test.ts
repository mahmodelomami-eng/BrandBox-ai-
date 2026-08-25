import assert from 'node:assert/strict';
import {
  ASSIGNABLE_ADMIN_ROLES,
  OWNER_CONCEPT,
  ROLE_DEFINITIONS,
  checkPermission,
  isAssignableAdminRole,
  isReadOnlyRole,
  normalizePermission,
} from '../lib/auth/rbac-engine';

function run() {
  assert.equal(OWNER_CONCEPT.assignable, false, 'OWNER must never be assignable');
  assert.equal(ASSIGNABLE_ADMIN_ROLES.includes('ADMIN'), false, 'legacy ADMIN must not be newly assigned');
  assert.equal(ASSIGNABLE_ADMIN_ROLES.includes('SUPPORT'), false, 'legacy SUPPORT must not be newly assigned');
  assert.equal(isAssignableAdminRole('PLATFORM_ADMIN'), true);
  assert.equal(isAssignableAdminRole('USER_MANAGER'), true);

  assert.equal(checkPermission('SUPER_ADMIN', 'roles.assign'), true);
  assert.equal(checkPermission('PLATFORM_ADMIN', 'roles.assign'), false);
  assert.equal(checkPermission('USER_MANAGER', 'users.suspend'), true);
  assert.equal(checkPermission('USER_MANAGER', 'users.delete'), false);
  assert.equal(checkPermission('SUPPORT_AGENT', 'users.manage'), false);
  assert.equal(checkPermission('FINANCE_MANAGER', 'payments.refund'), true);
  assert.equal(checkPermission('CONTENT_MANAGER', 'templates.manage'), true);
  assert.equal(checkPermission('OPERATIONS_MANAGER', 'providers.manage'), true);
  assert.equal(checkPermission('OPERATIONS_MANAGER', 'providers.secrets_manage'), false);
  assert.equal(checkPermission('SECURITY_AUDITOR', 'audit.read'), true);
  assert.equal(checkPermission('SECURITY_AUDITOR', 'settings.manage'), false);
  assert.equal(checkPermission('ANALYST', 'analytics.read'), true);
  assert.equal(checkPermission('ANALYST', 'users.manage'), false);
  assert.equal(checkPermission('USER', 'analytics.read'), false);

  assert.equal(isReadOnlyRole('SECURITY_AUDITOR'), true);
  assert.equal(isReadOnlyRole('ANALYST'), true);
  assert.equal(isReadOnlyRole('PLATFORM_ADMIN'), false);

  assert.equal(normalizePermission('USERS_READ'), 'users.read');
  assert.equal(normalizePermission('CREDITS_MANAGE'), 'credits.adjust');
  assert.equal(checkPermission('ADMIN', 'USERS_MANAGE'), true, 'legacy ADMIN permission compatibility must remain');
  assert.equal(checkPermission('SUPPORT', 'USERS_READ'), true, 'legacy SUPPORT permission compatibility must remain');

  assert.equal(ROLE_DEFINITIONS.CONTENT_MANAGER.labelAr, 'مدير المحتوى');
  assert.equal(ROLE_DEFINITIONS.SECURITY_AUDITOR.riskTier, 'READ_ONLY');

  console.log('RBAC foundation tests passed.');
}

run();
