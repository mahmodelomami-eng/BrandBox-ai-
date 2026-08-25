import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HealthCheckEngine } from '../lib/observability/telemetry';

function verifyAdminControlCenterContract() {
  const repoRoot = process.cwd();
  const adminRoutePath = join(repoRoot, 'src/app/admin/page.jsx');
  const controlCenterPath = join(repoRoot, 'src/components/AdminControlCenter.jsx');
  const obsoleteDepartmentDashboardPath = join(repoRoot, 'src/components/AdminDepartmentDashboard.jsx');

  if (!existsSync(adminRoutePath) || !existsSync(controlCenterPath)) return false;

  const adminRouteSource = readFileSync(adminRoutePath, 'utf8');
  const controlCenterSource = readFileSync(controlCenterPath, 'utf8');

  const routeUsesCanonicalControlCenter =
    adminRouteSource.includes("import AdminControlCenter from '../../components/AdminControlCenter'") &&
    adminRouteSource.includes('<AdminControlCenter />');

  const routeDoesNotContainLegacyPlaceholder = ![
    'حالة النظام',
    'بوابة الدفع Ezone',
    'مزود الذكاء OpenRouter',
    'المؤشرات العامة',
  ].some((token) => adminRouteSource.includes(token));

  const userManagementIsPresent =
    controlCenterSource.includes("['users', 'المستخدمون والصلاحيات'") &&
    controlCenterSource.includes("section === 'users'") &&
    controlCenterSource.includes("fetch('/api/v1/admin/users'");

  const obsoletePlaceholderRemoved = !existsSync(obsoleteDepartmentDashboardPath);

  return (
    routeUsesCanonicalControlCenter &&
    routeDoesNotContainLegacyPlaceholder &&
    userManagementIsPresent &&
    obsoletePlaceholderRemoved
  );
}

export async function runProductionHardeningTests() {
  const health = await HealthCheckEngine.runFullHealthCheck();
  const databaseConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  );

  // CI must be deterministic even when deployment secrets are intentionally not
  // exposed to pull-request jobs. When database credentials are present we still
  // require full readiness; otherwise we require application liveness and no
  // unhealthy non-database components.
  const nonDatabaseHealthy = health.components
    .filter((component) => component.name !== 'Database (PostgreSQL)')
    .every((component) => component.status !== 'unhealthy');

  const adminControlCenterContract = verifyAdminControlCenterContract();

  return {
    allPassed:
      health.liveness === true &&
      nonDatabaseHealthy &&
      (!databaseConfigured || health.readiness === true) &&
      adminControlCenterContract,
    databaseConfigured,
    adminControlCenterContract,
    health,
  };
}

runProductionHardeningTests()
  .then((result) => {
    if (!result.allPassed) {
      if (!result.adminControlCenterContract) {
        throw new Error('Admin control center regression guard failed.');
      }
      throw new Error('Production hardening health check failed.');
    }

    console.log('Admin control center regression guard passed.');
    console.log(
      result.databaseConfigured
        ? 'Production hardening health check passed with database readiness.'
        : 'Production hardening health check passed; external database readiness is deferred to deployment health checks.',
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
