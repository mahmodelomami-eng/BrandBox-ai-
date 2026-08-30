import assert from 'node:assert/strict';
import {
  ASSIGNABLE_ADMIN_ROLES,
  ROLE_DEFINITIONS,
  ROLE_PERMISSIONS,
} from '../lib/auth/rbac-engine';
import {
  assertRoleChangePolicy,
  canAssignRoles,
  isRoleAssignable,
} from '../lib/admin/admin-user-policy';
import { ROLE_GUIDANCE } from '../lib/admin/role-guidance';

assert.equal(canAssignRoles('SUPER_ADMIN'), true);
assert.equal(canAssignRoles('PLATFORM_ADMIN'), false);
assert.equal(canAssignRoles('USER_MANAGER'), false);
assert.equal(canAssignRoles('SUPPORT_AGENT'), false);
assert.equal(canAssignRoles('ANALYST'), false);
assert.equal(canAssignRoles('SECURITY_AUDITOR'), false);

assert.equal(isRoleAssignable('USER'), true);
assert.equal(isRoleAssignable('SUPER_ADMIN'), true);
assert.equal(isRoleAssignable('PLATFORM_ADMIN'), true);
assert.equal(isRoleAssignable('ADMIN'), false);
assert.equal(isRoleAssignable('SUPPORT'), false);
assert.equal(isRoleAssignable('OWNER'), false);

for (const role of Object.keys(ROLE_DEFINITIONS) as Array<keyof typeof ROLE_DEFINITIONS>) {
  assert.ok(Array.isArray(ROLE_GUIDANCE[role].responsibilitiesAr));
  assert.ok(ROLE_GUIDANCE[role].responsibilitiesAr.length > 0, `${role} must document responsibilities`);
  assert.ok(Array.isArray(ROLE_GUIDANCE[role].restrictionsAr));
  assert.ok(ROLE_GUIDANCE[role].restrictionsAr.length > 0, `${role} must document restrictions`);
  assert.ok(ROLE_PERMISSIONS[role] instanceof Set, `${role} must have a permission set`);
}

for (const role of ASSIGNABLE_ADMIN_ROLES) {
  assert.equal(ROLE_DEFINITIONS[role].assignable, true);
  assert.notEqual(role, 'USER');
  assert.notEqual(role, 'ADMIN');
  assert.notEqual(role, 'SUPPORT');
}

assert.throws(
  () => assertRoleChangePolicy({
    actorRole: 'PLATFORM_ADMIN',
    actorUserId: 'platform-1',
    targetUserId: 'user-1',
    currentRole: 'USER',
    nextRole: 'SUPER_ADMIN',
    activeSuperAdminCount: 1,
  }),
  /Only SUPER_ADMIN/,
);

assert.throws(
  () => assertRoleChangePolicy({
    actorRole: 'USER_MANAGER',
    actorUserId: 'manager-1',
    targetUserId: 'user-1',
    currentRole: 'USER',
    nextRole: 'SUPPORT_AGENT',
    activeSuperAdminCount: 1,
  }),
  /Only SUPER_ADMIN/,
);

assert.throws(
  () => assertRoleChangePolicy({
    actorRole: 'SUPER_ADMIN',
    actorUserId: 'root-1',
    targetUserId: 'root-1',
    currentRole: 'SUPER_ADMIN',
    nextRole: 'USER',
    activeSuperAdminCount: 2,
  }),
  /Self-demotion/,
);

assert.doesNotThrow(() => assertRoleChangePolicy({
  actorRole: 'SUPER_ADMIN',
  actorUserId: 'root-1',
  targetUserId: 'admin-2',
  currentRole: 'PLATFORM_ADMIN',
  nextRole: 'USER',
  activeSuperAdminCount: 1,
}));

assert.doesNotThrow(() => assertRoleChangePolicy({
  actorRole: 'SUPER_ADMIN',
  actorUserId: 'root-1',
  targetUserId: 'user-2',
  currentRole: 'USER',
  nextRole: 'FINANCE_MANAGER',
  activeSuperAdminCount: 1,
}));

console.log('Admin roles management tests passed.');
