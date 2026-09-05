import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isActiveProfileStatus } from '../lib/auth/user-status';

const repoRoot = process.cwd();

function source(path: string) {
  const fullPath = join(repoRoot, path);
  if (!existsSync(fullPath)) throw new Error(`Missing auth policy file: ${path}`);
  return readFileSync(fullPath, 'utf8');
}

function assertContract(name: string, condition: boolean) {
  if (!condition) throw new Error(`Active-user auth policy failed: ${name}`);
  console.log(`PASS: ${name}`);
}

assertContract('active is the only allowed protected profile status',
  isActiveProfileStatus('active') &&
  !isActiveProfileStatus('suspended') &&
  !isActiveProfileStatus('pending') &&
  !isActiveProfileStatus(null) &&
  !isActiveProfileStatus(undefined),
);

const authContext = source('src/context/AuthContext.jsx');
const authGate = source('src/components/AuthGate.jsx');
const authPage = source('src/app/auth/page.jsx');
const userAuth = source('src/lib/auth/user-auth.ts');
const adminControlCenter = source('src/app/api/v1/admin/control-center/route.ts');
const adminSettings = source('src/app/api/v1/admin/settings/route.ts');
const adminAIIntegrations = source('src/app/api/v1/admin/ai-integrations/route.ts');
const adminEzonePay = source('src/app/api/v1/admin/ezonepay/route.ts');
const adminUsers = source('src/app/api/v1/admin/users/route.ts');
const adminRoles = source('src/app/api/v1/admin/roles/route.ts');
const adminSupportRequests = source('src/app/api/v1/admin/support-requests/route.ts');
const adminCreditPackage = source('src/app/api/v1/admin/credit-packages/[id]/route.ts');
const adminStoreFinance = source('src/app/api/v1/admin/store/finance/route.ts');
const adminStoreInventory = source('src/app/api/v1/admin/store/inventory/route.ts');
const mobileBootstrap = source('src/app/api/v1/mobile/bootstrap/route.ts');

assertContract('client auth resolves profile before exposing protected content',
  authContext.includes('profileResolved') &&
  authContext.includes('isActiveProfileStatus(profile?.status)') &&
  authGate.includes('!profileResolved || activeProfile') &&
  authGate.includes("accountStatus === 'suspended'") &&
  authGate.includes("accountStatus === 'pending'") &&
  authGate.includes("? 'pending'") &&
  authGate.includes("void signOut(`/auth?account=${accountReason}`)"),
);

assertContract('non-active client profiles cannot carry role or credit authority',
  authContext.includes("const activeProfile = isActiveProfileStatus(profile?.status) ? profile : null") &&
  authContext.includes("const role = activeProfile?.role || 'USER'") &&
  authContext.includes('const creditBalance = activeProfile?.credit_balance ?? 0'),
);

assertContract('sign-in verifies an active profile before redirecting',
  authPage.includes("from '../../lib/auth/user-status'") &&
  authPage.includes(".select('status')") &&
  authPage.includes('!isActiveProfileStatus(loginProfile?.status)') &&
  authPage.includes('await supabase.auth.signOut()') &&
  authPage.includes('accountAccessMessage(loginProfile?.status)'),
);

assertContract('restored and social sessions fail closed before onboarding or redirect',
  authPage.includes(".select('status,phone,whatsapp_phone,onboarding_completed_at')") &&
  authPage.includes('profileError || !isActiveProfileStatus(profile?.status)') &&
  authPage.includes("localStorage.removeItem('brandbox.oauth.onboarding')") &&
  authPage.includes('setOnboardingOpen(false)') &&
  authPage.includes('setError(accountAccessMessage(profile?.status))'),
);

assertContract('account status reasons render explicit sign-in guidance',
  authPage.includes("status === 'suspended'") &&
  authPage.includes("status === 'pending'") &&
  authPage.includes("initialParams.get('account')") &&
  authPage.includes('setError(accountAccessMessage(accountReason))'),
);

assertContract('server bearer authentication requires a matching active profile',
  userAuth.includes(".select('id,role,status')") &&
  userAuth.includes('profile.id !== data.user.id') &&
  userAuth.includes('!isActiveProfileStatus(profile.status)'),
);

const profileFailureLog = userAuth.slice(
  userAuth.indexOf("emitServerError('active user profile lookup failed'"),
  userAuth.indexOf('return null;', userAuth.indexOf("emitServerError('active user profile lookup failed'")),
);
assertContract('profile lookup operational failures emit safe correlation context only',
  profileFailureLog.includes('correlationId: getRequestCorrelationId(request.headers)') &&
  profileFailureLog.includes('route: request.nextUrl.pathname') &&
  !profileFailureLog.includes('token') &&
  !profileFailureLog.includes('authorization') &&
  !profileFailureLog.includes('profile:'),
);

assertContract('admin control center also requires an active profile before privileged reads',
  adminControlCenter.includes("from '@/lib/auth/user-status'") &&
  adminControlCenter.includes('!isActiveProfileStatus(profile.status)'),
);

assertContract('admin control center scopes sensitive datasets to their matching read permissions',
  adminControlCenter.includes("const canViewUsers = checkPermission(actor.role, 'users.read')") &&
  adminControlCenter.includes("const canViewProjects = checkPermission(actor.role, 'projects.read')") &&
  adminControlCenter.includes("const canViewSubscriptions = checkPermission(actor.role, 'subscriptions.read')") &&
  adminControlCenter.includes("const canViewPayments = checkPermission(actor.role, 'payments.read')") &&
  adminControlCenter.includes("const canViewAssets = checkPermission(actor.role, 'assets.read')") &&
  adminControlCenter.includes("canViewUsers\n      ? database\n          .from('profiles')") &&
  adminControlCenter.includes("canViewProjects\n      ? database\n          .from('projects')") &&
  adminControlCenter.includes("canViewSubscriptions\n      ? database\n          .from('subscriptions')") &&
  adminControlCenter.includes("canViewPayments\n      ? database\n          .from('payment_transactions')") &&
  adminControlCenter.includes("canViewAssets\n      ? database\n          .from('assets')"),
);

assertContract('admin settings requires an active profile before privileged reads or writes',
  adminSettings.includes("from '@/lib/auth/user-status'") &&
  adminSettings.includes('!isActiveProfileStatus(profile.status)') &&
  !adminSettings.includes("profile.status === 'suspended'"),
);

assertContract('admin AI integrations requires an active profile before privileged reads or writes',
  adminAIIntegrations.includes("from '@/lib/auth/user-status'") &&
  adminAIIntegrations.includes('!isActiveProfileStatus(profile.status)') &&
  !adminAIIntegrations.includes("profile.status === 'suspended'"),
);

assertContract('admin Ezone diagnostics requires an active profile before privileged reads',
  adminEzonePay.includes("from '@/lib/auth/user-status'") &&
  adminEzonePay.includes('!isActiveProfileStatus(profile.status)') &&
  !adminEzonePay.includes("profile.status === 'suspended'"),
);

assertContract('admin user management requires an active profile before privileged reads or mutations',
  adminUsers.includes("from '@/lib/auth/user-status'") &&
  adminUsers.includes('!isActiveProfileStatus(profile.status)') &&
  !adminUsers.includes("profile.status === 'suspended'"),
);

assertContract('admin role catalog requires an active profile before privileged reads',
  adminRoles.includes("from '@/lib/auth/user-status'") &&
  adminRoles.includes('!isActiveProfileStatus(profile.status)') &&
  !adminRoles.includes("profile.status === 'suspended'"),
);

assertContract('admin support requests requires an active profile before customer data, signed attachments, or mutations',
  adminSupportRequests.includes("from '@/lib/auth/user-status'") &&
  adminSupportRequests.includes('!isActiveProfileStatus(profile.status)') &&
  !adminSupportRequests.includes("profile.status === 'suspended'"),
);

assertContract('admin credit-package pricing mutation requires an active SUPER_ADMIN profile',
  adminCreditPackage.includes("from '@/lib/auth/user-status'") &&
  adminCreditPackage.includes(".select('role,status')") &&
  adminCreditPackage.includes("actor?.role !== 'SUPER_ADMIN' || !isActiveProfileStatus(actor.status)"),
);

assertContract('admin Store finance requires an active profile before payment and profitability reads',
  adminStoreFinance.includes("from '@/lib/auth/user-status'") &&
  adminStoreFinance.includes('!isActiveProfileStatus(profile.status)') &&
  !adminStoreFinance.includes("profile.status==='suspended'"),
);

assertContract('admin Store inventory requires an active profile before code-stock reads or imports',
  adminStoreInventory.includes("from '@/lib/auth/user-status'") &&
  adminStoreInventory.includes('!isActiveProfileStatus(profile.status)') &&
  !adminStoreInventory.includes("profile.status === 'suspended'"),
);

assertContract('mobile bootstrap remains owner-scoped and fails closed on subscription lookup errors',
  mobileBootstrap.includes('authenticateActiveUser(request)') &&
  mobileBootstrap.includes(".eq('owner_id', auth.user.id)") &&
  mobileBootstrap.includes(".eq('user_id', auth.user.id)") &&
  mobileBootstrap.includes('{ data: subscription, error: subscriptionError }') &&
  mobileBootstrap.includes("if (subscriptionError) return NextResponse.json({ error: 'SUBSCRIPTION_UNAVAILABLE' }, { status: 503 });") &&
  !mobileBootstrap.includes('subscriptionError.message'),
);

const protectedApiRoutes = [
  'src/app/api/v1/generations/route.ts',
  'src/app/api/v1/project-stats/route.ts',
  'src/app/api/v1/project-tool-items/route.ts',
  'src/app/api/v1/presence/route.ts',
  'src/app/api/v1/notifications/route.ts',
  'src/app/api/v1/profile/onboarding/route.ts',
  'src/app/api/v1/profile/avatar/route.ts',
  'src/app/api/v1/ezonepay/payment-links/route.ts',
  'src/app/api/v1/ezonepay/status/route.ts',
  'src/app/api/v1/store/checkout/route.ts',
  'src/app/api/v1/store/purchases/route.ts',
  'src/app/api/v1/store/refunds/route.ts',
  'src/app/api/v1/store/payment-status/route.ts',
  'src/app/api/v1/store/delivery/route.ts',
];

for (const routePath of protectedApiRoutes) {
  const route = source(routePath);
  assertContract(`${routePath} uses centralized active-user authentication`,
    route.includes("from '@/lib/auth/user-auth'") &&
    route.includes('authenticateActiveUser(request)'),
  );
}

console.log('Active-user authentication policy guard passed.');
