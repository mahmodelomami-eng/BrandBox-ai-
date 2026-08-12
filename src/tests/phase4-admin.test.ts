import { AdminService } from '../lib/admin/admin-service';
import { AuthContext } from '../lib/auth/rbac-engine';
import { InMemoryAuditStore } from '../lib/audit/audit-logger';

export async function runPhase4AdminTests(): Promise<{
  allPassed: boolean;
  results: { testName: string; passed: boolean; details?: string }[];
}> {
  const results: { testName: string; passed: boolean; details?: string }[] = [];

  const superAdminCtx: AuthContext = { userId: 'usr_super', email: 'super@brandbox.ai', role: 'SUPER_ADMIN' };
  const adminCtx: AuthContext = { userId: 'usr_admin', email: 'admin@brandbox.ai', role: 'ADMIN' };
  const supportCtx: AuthContext = { userId: 'usr_support', email: 'support@brandbox.ai', role: 'SUPPORT' };
  const userCtx: AuthContext = { userId: 'usr_user', email: 'user@brandbox.ai', role: 'USER' };

  try {
    let denied = false;
    try {
      await AdminService.getDashboardMetrics(userCtx);
    } catch {
      denied = true;
    }
    results.push({ testName: 'USER role rejected from Admin Dashboard', passed: denied });
  } catch (err: any) {
    results.push({ testName: 'USER role rejected from Admin Dashboard', passed: false, details: err.message });
  }

  try {
    const users = await AdminService.getUsers(supportCtx);
    let suspendDenied = false;
    try {
      await AdminService.suspendUser(supportCtx, 'usr_target', 'Violation');
    } catch {
      suspendDenied = true;
    }
    const passed = users.users !== undefined && suspendDenied;
    results.push({ testName: 'SUPPORT role can read users but cannot suspend users', passed });
  } catch (err: any) {
    results.push({ testName: 'SUPPORT role can read users but cannot suspend users', passed: false, details: err.message });
  }

  try {
    const creditRes = await AdminService.adjustUserCredits(adminCtx, 'usr_supabase_981240', 100, 'Test adjustment');
    let planDenied = false;
    try {
      await AdminService.updatePlan(adminCtx, 'pro', { priceMonthlyLYD: 200 });
    } catch {
      planDenied = true;
    }
    const passed = creditRes.success && planDenied;
    results.push({ testName: 'ADMIN allowed credit adjustments but denied plan price changes', passed });
  } catch (err: any) {
    results.push({ testName: 'ADMIN allowed credit adjustments but denied plan price changes', passed: false, details: err.message });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}