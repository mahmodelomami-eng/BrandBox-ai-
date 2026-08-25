import assert from 'node:assert/strict';
import {
  assertRoleChangePolicy,
  assertSuspendPolicy,
  canAdjustCredits,
  isRoleAssignable,
} from '../lib/admin/admin-user-policy';

assert.equal(isRoleAssignable('PLATFORM_ADMIN'), true);
assert.equal(isRoleAssignable('ADMIN'), false);
assert.equal(isRoleAssignable('OWNER'), false);
assert.equal(isRoleAssignable('USER'), true);

assert.equal(canAdjustCredits('SUPER_ADMIN', 1_000_000), true);
assert.equal(canAdjustCredits('PLATFORM_ADMIN', 100_000), true);
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

assert.doesNotThrow(() => assertRoleChangePolicy({
  actorRole: 'SUPER_ADMIN',
  actorUserId: 'root-2',
  targetUserId: 'user-1',
  currentRole: 'USER',
  nextRole: 'USER_MANAGER',
  activeSuperAdminCount: 2,
}));

assert.throws(
  () => assertSuspendPolicy({ actorRole: 'USER_MANAGER', actorUserId: 'a', targetUserId: 'a', targetRole: 'USER' }),
  /Self-suspension/,
);
assert.throws(
  () => assertSuspendPolicy({ actorRole: 'PLATFORM_ADMIN', actorUserId: 'a', targetUserId: 'b', targetRole: 'SUPER_ADMIN' }),
  /SUPER_ADMIN accounts cannot be suspended/,
);

console.log('Admin user policy tests passed.');
