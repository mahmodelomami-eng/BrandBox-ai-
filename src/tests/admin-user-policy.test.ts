import assert from 'node:assert/strict';
import {
  assertRoleChangePolicy,
  assertSuspendPolicy,
  canAdjustCredits,
  canAssignRoles,
  canDeleteUsers,
  canReadUsers,
  canSuspendUsers,
  isKnownRole,
  isRoleAssignable,
} from '../lib/admin/admin-user-policy';

assert.equal(isKnownRole('SUPER_ADMIN'), true);
assert.equal(isKnownRole('PLATFORM_ADMIN'), true);
assert.equal(isKnownRole('OWNER'), false);
assert.equal(isKnownRole('NOT_A_ROLE'), false);

assert.equal(isRoleAssignable('PLATFORM_ADMIN'), true);
assert.equal(isRoleAssignable('ADMIN'), false);
assert.equal(isRoleAssignable('SUPPORT'), false);
assert.equal(isRoleAssignable('OWNER'), false);
assert.equal(isRoleAssignable('USER'), true);

assert.equal(canReadUsers('SUPER_ADMIN'), true);
assert.equal(canReadUsers('USER_MANAGER'), true);
assert.equal(canReadUsers('SUPPORT_AGENT'), true);
assert.equal(canReadUsers('USER'), false);

assert.equal(canSuspendUsers('SUPER_ADMIN'), true);
assert.equal(canSuspendUsers('PLATFORM_ADMIN'), true);
assert.equal(canSuspendUsers('USER_MANAGER'), true);
assert.equal(canSuspendUsers('SUPPORT_AGENT'), false);
assert.equal(canSuspendUsers('ANALYST'), false);

assert.equal(canDeleteUsers('SUPER_ADMIN'), true);
assert.equal(canDeleteUsers('PLATFORM_ADMIN'), false);
assert.equal(canDeleteUsers('USER_MANAGER'), false);

assert.equal(canAssignRoles('SUPER_ADMIN'), true);
assert.equal(canAssignRoles('PLATFORM_ADMIN'), false);
assert.equal(canAssignRoles('SECURITY_AUDITOR'), false);

assert.equal(canAdjustCredits('SUPER_ADMIN', 1_000_000), true);
assert.equal(canAdjustCredits('SUPER_ADMIN', 1_000_001), false);
assert.equal(canAdjustCredits('PLATFORM_ADMIN', 100_000), true);
assert.equal(canAdjustCredits('PLATFORM_ADMIN', 100_001), false);
assert.equal(canAdjustCredits('FINANCE_MANAGER', 100_000), true);
assert.equal(canAdjustCredits('FINANCE_MANAGER', 100_001), false);
assert.equal(canAdjustCredits('SUPER_ADMIN', 0), false);
assert.equal(canAdjustCredits('SUPER_ADMIN', -1), false);
assert.equal(canAdjustCredits('SUPER_ADMIN', 1.5), false);
assert.equal(canAdjustCredits('SUPPORT_AGENT', 1), false);
assert.equal(canAdjustCredits('ANALYST', 1), false);

assert.throws(
  () => assertRoleChangePolicy({
    actorRole: 'PLATFORM_ADMIN',
    actorUserId: 'a',
    targetUserId: 'b',
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
    nextRole: 'PLATFORM_ADMIN',
    activeSuperAdminCount: 2,
  }),
  /Self-demotion/,
);

assert.throws(
  () => assertRoleChangePolicy({
    actorRole: 'SUPER_ADMIN',
    actorUserId: 'root-2',
    targetUserId: 'root-1',
    currentRole: 'SUPER_ADMIN',
    nextRole: 'PLATFORM_ADMIN',
    activeSuperAdminCount: 1,
  }),
  /last active SUPER_ADMIN/,
);

assert.throws(
  () => assertRoleChangePolicy({
    actorRole: 'SUPER_ADMIN',
    actorUserId: 'root-2',
    targetUserId: 'legacy-admin',
    currentRole: 'ADMIN',
    nextRole: 'ADMIN',
    activeSuperAdminCount: 2,
  }),
  /not assignable/,
);

assert.doesNotThrow(() => assertRoleChangePolicy({
  actorRole: 'SUPER_ADMIN',
  actorUserId: 'root-2',
  targetUserId: 'user-1',
  currentRole: 'USER',
  nextRole: 'USER_MANAGER',
  activeSuperAdminCount: 2,
}));

assert.doesNotThrow(() => assertRoleChangePolicy({
  actorRole: 'SUPER_ADMIN',
  actorUserId: 'root-1',
  targetUserId: 'root-1',
  currentRole: 'SUPER_ADMIN',
  nextRole: 'SUPER_ADMIN',
  activeSuperAdminCount: 1,
}));

assert.throws(
  () => assertSuspendPolicy({ actorRole: 'SUPPORT_AGENT', actorUserId: 'a', targetUserId: 'b', targetRole: 'USER' }),
  /Missing users.suspend permission/,
);
assert.throws(
  () => assertSuspendPolicy({ actorRole: 'USER_MANAGER', actorUserId: 'a', targetUserId: 'a', targetRole: 'USER' }),
  /Self-suspension/,
);
assert.throws(
  () => assertSuspendPolicy({ actorRole: 'PLATFORM_ADMIN', actorUserId: 'a', targetUserId: 'b', targetRole: 'SUPER_ADMIN' }),
  /SUPER_ADMIN accounts cannot be suspended/,
);
assert.doesNotThrow(() => assertSuspendPolicy({
  actorRole: 'USER_MANAGER',
  actorUserId: 'manager-1',
  targetUserId: 'user-1',
  targetRole: 'USER',
}));

console.log('Admin user policy tests passed.');
