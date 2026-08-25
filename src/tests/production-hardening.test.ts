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

function verifyNavigationCommerceContract() {
  const repoRoot = process.cwd();
  const specialtyPath = join(repoRoot, 'src/components/DashboardSpecialtyPage.jsx');
  const pricingPath = join(repoRoot, 'src/app/pricing/page.jsx');
  const storePagePath = join(repoRoot, 'src/app/store/page.tsx');
  const storeClientPath = join(repoRoot, 'src/components/StoreCatalogClient.tsx');
  const purchasesPath = join(repoRoot, 'src/app/store/purchases/page.jsx');
  const obsoletePricingEnhancerPath = join(repoRoot, 'src/components/PricingRouteIntentEnhancer.jsx');
  const obsoleteProjectDeleteEnhancerPath = join(repoRoot, 'src/components/ProjectDeleteEnhancer.jsx');

  const requiredPaths = [specialtyPath, pricingPath, storePagePath, storeClientPath, purchasesPath];
  if (!requiredPaths.every((path) => existsSync(path))) return false;

  const specialtySource = readFileSync(specialtyPath, 'utf8');
  const pricingSource = readFileSync(pricingPath, 'utf8');
  const storePageSource = readFileSync(storePagePath, 'utf8');
  const storeClientSource = readFileSync(storeClientPath, 'utf8');
  const purchasesSource = readFileSync(purchasesPath, 'utf8');

  const dashboardUsesCanonicalToolRoutes =
    ['/projects/images', '/projects/video', '/projects/chat', '/projects/audio'].every((route) => specialtySource.includes(route)) &&
    !['/images-ai', '/video-ai', '/chat-ai', '/audio-ai'].some((route) => specialtySource.includes(route));

  const obsoleteDomEnhancersRemoved =
    !existsSync(obsoletePricingEnhancerPath) &&
    !existsSync(obsoleteProjectDeleteEnhancerPath);

  const pricingUsesRealBalanceOnly =
    pricingSource.includes('رصيدك الحالي المتاح') &&
    !pricingSource.includes('monthlyLimit = 10000') &&
    !pricingSource.includes('الرصيد المستخدم');

  const storeCheckoutIsInteractive =
    storePageSource.includes('StoreCatalogClient') &&
    storeClientSource.includes("fetch('/api/v1/store/checkout'") &&
    storeClientSource.includes('عرض الخطط') &&
    storeClientSource.includes('paymentUrl');

  const purchasesAreAuthAware =
    purchasesSource.includes('/auth?next=%2Fstore%2Fpurchases') &&
    purchasesSource.includes('الخدمات والاستحقاقات المفعلة');

  return (
    dashboardUsesCanonicalToolRoutes &&
    obsoleteDomEnhancersRemoved &&
    pricingUsesRealBalanceOnly &&
    storeCheckoutIsInteractive &&
    purchasesAreAuthAware
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
  const navigationCommerceContract = verifyNavigationCommerceContract();

  return {
    allPassed:
      health.liveness === true &&
      nonDatabaseHealthy &&
      (!databaseConfigured || health.readiness === true) &&
      adminControlCenterContract &&
      navigationCommerceContract,
    databaseConfigured,
    adminControlCenterContract,
    navigationCommerceContract,
    health,
  };
}

runProductionHardeningTests()
  .then((result) => {
    if (!result.allPassed) {
      if (!result.adminControlCenterContract) {
        throw new Error('Admin control center regression guard failed.');
      }
      if (!result.navigationCommerceContract) {
        throw new Error('Navigation and commerce regression guard failed.');
      }
      throw new Error('Production hardening health check failed.');
    }

    console.log('Admin control center regression guard passed.');
    console.log('Navigation and commerce regression guard passed.');
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
