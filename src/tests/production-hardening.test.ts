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

function verifyPublicServicesContract() {
  const repoRoot = process.cwd();
  const templatesPath = join(repoRoot, 'src/app/templates/page.jsx');
  const marketingPath = join(repoRoot, 'src/app/marketing-plans/page.jsx');
  const printPath = join(repoRoot, 'src/app/print/page.jsx');
  const aboutPath = join(repoRoot, 'src/app/about/page.jsx');
  const contactPath = join(repoRoot, 'src/app/contact/page.jsx');
  const projectServicePath = join(repoRoot, 'src/lib/projects/projects-service.js');
  const adminSupportApiPath = join(repoRoot, 'src/app/api/v1/admin/support-requests/route.ts');
  const adminSupportPagePath = join(repoRoot, 'src/app/admin/support/page.jsx');
  const adminSupportComponentPath = join(repoRoot, 'src/components/AdminSupportRequests.jsx');
  const obsoleteSectionLandingPath = join(repoRoot, 'src/components/SectionLanding.jsx');
  const supportMigrationPath = join(repoRoot, 'supabase/migrations/20260825210035_support_requests.sql');
  const supportSecurityMigrationPath = join(repoRoot, 'supabase/migrations/20260825225945_support_requests_column_security.sql');

  const requiredPaths = [
    templatesPath,
    marketingPath,
    printPath,
    aboutPath,
    contactPath,
    projectServicePath,
    adminSupportApiPath,
    adminSupportPagePath,
    adminSupportComponentPath,
    supportMigrationPath,
    supportSecurityMigrationPath,
  ];
  if (!requiredPaths.every((path) => existsSync(path))) return false;

  const templatesSource = readFileSync(templatesPath, 'utf8');
  const marketingSource = readFileSync(marketingPath, 'utf8');
  const printSource = readFileSync(printPath, 'utf8');
  const aboutSource = readFileSync(aboutPath, 'utf8');
  const contactSource = readFileSync(contactPath, 'utf8');
  const projectServiceSource = readFileSync(projectServicePath, 'utf8');
  const adminSupportApiSource = readFileSync(adminSupportApiPath, 'utf8');
  const adminSupportComponentSource = readFileSync(adminSupportComponentPath, 'utf8');
  const supportSecuritySource = readFileSync(supportSecurityMigrationPath, 'utf8');

  const placeholdersRemoved =
    !existsSync(obsoleteSectionLandingPath) &&
    ![templatesSource, marketingSource, printSource, aboutSource, contactSource].some((source) => source.includes('SectionLanding'));

  const templatesUseImageProjects =
    templatesSource.includes("type: 'صورة'") &&
    templatesSource.includes('/projects/images/workspace?project=') &&
    !templatesSource.includes("type: 'صورة + نص'");

  const defaultProjectTypeIsCanonical =
    projectServiceSource.includes("type: input.type || 'صورة'") &&
    !projectServiceSource.includes("input.type || 'صورة + نص'");

  const marketingCreatesChatProject =
    marketingSource.includes("type: 'محادثة'") &&
    marketingSource.includes('/projects/chat/workspace?project=');

  const printRoutesToRealWorkflows =
    printSource.includes('/contact?category=print') &&
    printSource.includes('/projects/images');

  const aboutHasProductNavigation =
    aboutSource.includes('href="/projects"') &&
    aboutSource.includes('href="/pricing"') &&
    aboutSource.includes('href="/contact"');

  const supportWorkflowIsReal =
    contactSource.includes("from('support_requests')") &&
    contactSource.includes('const userId = user?.id || null') &&
    contactSource.includes('user_id: userId') &&
    adminSupportApiSource.includes("from('support_requests')") &&
    adminSupportApiSource.includes('ADMIN_UPDATED_SUPPORT_REQUEST') &&
    adminSupportComponentSource.includes('/api/v1/admin/support-requests');

  const internalNotesAreColumnRestricted =
    supportSecuritySource.includes('grant select (') &&
    !supportSecuritySource.match(/grant select \([^)]*admin_note/s) &&
    supportSecuritySource.includes('grant insert (');

  return (
    placeholdersRemoved &&
    templatesUseImageProjects &&
    defaultProjectTypeIsCanonical &&
    marketingCreatesChatProject &&
    printRoutesToRealWorkflows &&
    aboutHasProductNavigation &&
    supportWorkflowIsReal &&
    internalNotesAreColumnRestricted
  );
}

function verifyProjectRetentionContract() {
  const repoRoot = process.cwd();
  const projectServicePath = join(repoRoot, 'src/lib/projects/projects-service.js');
  const projectTrashPath = join(repoRoot, 'src/components/ProjectTrashWorkspace.jsx');
  const projectTrashRoutePath = join(repoRoot, 'src/app/projects/trash/page.jsx');
  const projectHubPath = join(repoRoot, 'src/components/ProjectsToolHub.jsx');
  const retentionMigrationPath = join(repoRoot, 'supabase/migrations/20260901160129_project_retention_and_trash.sql');

  const requiredPaths = [projectServicePath, projectTrashPath, projectTrashRoutePath, projectHubPath, retentionMigrationPath];
  if (!requiredPaths.every((path) => existsSync(path))) return false;

  const serviceSource = readFileSync(projectServicePath, 'utf8');
  const trashSource = readFileSync(projectTrashPath, 'utf8');
  const trashRouteSource = readFileSync(projectTrashRoutePath, 'utf8');
  const hubSource = readFileSync(projectHubPath, 'utf8');
  const migrationSource = readFileSync(retentionMigrationPath, 'utf8');

  const activeProjectsAreRetainedAndTrashFiltered =
    serviceSource.includes(".is('deleted_at', null)") &&
    serviceSource.includes('listDeletedUserProjects');

  const userDeleteIsRecoverable =
    serviceSource.includes('.update({ deleted_at: deletedAt, updated_at: deletedAt })') &&
    serviceSource.includes('restoreUserProject') &&
    serviceSource.includes(".update({ deleted_at: null, purge_after: null, updated_at: restoredAt })") &&
    !serviceSource.includes('.delete()');

  const databaseEnforcesThirtyDayWindow =
    migrationSource.includes("INTERVAL '30 days'") &&
    migrationSource.includes('SECURITY INVOKER') &&
    migrationSource.includes('trg_project_retention_window') &&
    migrationSource.includes('Admins can permanently delete projects');

  const trashUiIsReachableAndRestorable =
    trashSource.includes('listDeletedUserProjects') &&
    trashSource.includes('restoreUserProject') &&
    trashSource.includes('30 يومًا') &&
    trashRouteSource.includes('<ProjectTrashWorkspace />') &&
    hubSource.includes('href="/projects/trash"');

  return (
    activeProjectsAreRetainedAndTrashFiltered &&
    userDeleteIsRecoverable &&
    databaseEnforcesThirtyDayWindow &&
    trashUiIsReachableAndRestorable
  );
}

export async function runProductionHardeningTests() {
  const health = await HealthCheckEngine.runFullHealthCheck();
  const databaseConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  );

  const nonDatabaseHealthy = health.components
    .filter((component) => component.name !== 'Database (PostgreSQL)')
    .every((component) => component.status !== 'unhealthy');

  const adminControlCenterContract = verifyAdminControlCenterContract();
  const navigationCommerceContract = verifyNavigationCommerceContract();
  const publicServicesContract = verifyPublicServicesContract();
  const projectRetentionContract = verifyProjectRetentionContract();

  return {
    allPassed:
      health.liveness === true &&
      nonDatabaseHealthy &&
      (!databaseConfigured || health.readiness === true) &&
      adminControlCenterContract &&
      navigationCommerceContract &&
      publicServicesContract &&
      projectRetentionContract,
    databaseConfigured,
    adminControlCenterContract,
    navigationCommerceContract,
    publicServicesContract,
    projectRetentionContract,
    health,
  };
}

runProductionHardeningTests()
  .then((result) => {
    if (!result.allPassed) {
      if (!result.adminControlCenterContract) throw new Error('Admin control center regression guard failed.');
      if (!result.navigationCommerceContract) throw new Error('Navigation and commerce regression guard failed.');
      if (!result.publicServicesContract) throw new Error('Public services regression guard failed.');
      if (!result.projectRetentionContract) throw new Error('Project retention regression guard failed.');
      throw new Error('Production hardening health check failed.');
    }

    console.log('Admin control center regression guard passed.');
    console.log('Navigation and commerce regression guard passed.');
    console.log('Public services regression guard passed.');
    console.log('Project retention regression guard passed.');
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
