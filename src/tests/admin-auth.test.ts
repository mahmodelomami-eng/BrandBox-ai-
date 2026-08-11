import { hasPermission } from '../lib/auth/admin-auth';

export async function runAdminAuthTests() {
  const superAdminPassed = hasPermission('SUPER_ADMIN', 'SECURITY_MANAGE');
  const userBlocked = !hasPermission('USER', 'USERS_READ');
  return { allPassed: superAdminPassed && userBlocked };
}
