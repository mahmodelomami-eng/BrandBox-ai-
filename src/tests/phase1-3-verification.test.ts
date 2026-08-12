import { checkPermission } from '../lib/auth/rbac-engine';

export async function runPhase1To3Tests(): Promise<{ allPassed: boolean; results: any[] }> {
  const results: any[] = [];

  const superAdminOk = checkPermission('SUPER_ADMIN', 'SECURITY_MANAGE');
  results.push({ name: 'SUPER_ADMIN has SECURITY_MANAGE', passed: superAdminOk });

  const adminBlocked = !checkPermission('ADMIN', 'SECURITY_MANAGE');
  results.push({ name: 'ADMIN blocked from SECURITY_MANAGE', passed: adminBlocked });

  const supportBlocked = !checkPermission('SUPPORT', 'CREDITS_MANAGE');
  results.push({ name: 'SUPPORT blocked from CREDITS_MANAGE', passed: supportBlocked });

  const userBlocked = !checkPermission('USER', 'USERS_READ');
  results.push({ name: 'USER blocked from USERS_READ', passed: userBlocked });

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}