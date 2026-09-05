import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const rootPage = readFileSync(join(root, 'src/app/page.jsx'), 'utf8');
const dashboard = readFileSync(join(root, 'src/components/StableUserDashboard.jsx'), 'utf8');
const navigation = readFileSync(join(root, 'src/components/GlobalNavigation.jsx'), 'utf8');
const appNavigationWrapper = readFileSync(join(root, 'src/components/layout/AppNavigationWrapper.jsx'), 'utf8');
const mobileReview = readFileSync(join(root, 'src/app/mobile-review/page.tsx'), 'utf8');
const auth = readFileSync(join(root, 'src/app/auth/page.jsx'), 'utf8');
const pricing = readFileSync(join(root, 'src/app/pricing/page.jsx'), 'utf8');
const account = readFileSync(join(root, 'src/app/dashboard/account/page.jsx'), 'utf8');
const plansApi = readFileSync(join(root, 'src/app/api/v1/plans/route.ts'), 'utf8');
const checkoutApi = readFileSync(join(root, 'src/app/api/v1/ezonepay/payment-links/route.ts'), 'utf8');
const plansAccessMigration = readFileSync(join(root, 'supabase/migrations/20260902140003_harden_public_plans_catalog_access.sql'), 'utf8');

// Monitoring & Maintenance: stale-user and degraded-state protection.
assert.ok(dashboard.includes('const [businessLoading, setBusinessLoading]'));
assert.ok(dashboard.includes('const [dataOwnerId, setDataOwnerId]'));
assert.ok(dashboard.includes('const [errorOwnerId, setErrorOwnerId]'));
assert.ok(dashboard.includes('dataOwnerId === authUser.id'));
assert.ok(dashboard.includes('errorOwnerId === authUser.id'));
assert.ok(dashboard.includes('setDataOwnerId(targetUserId)'));
assert.ok(dashboard.includes(".is('deleted_at', null)"), 'deleted projects must not appear in the active dashboard');
assert.ok(dashboard.includes(".eq('status', 'active')"), 'dashboard must only treat active subscriptions as current');
assert.ok(dashboard.includes('hasPartialFailure'));
assert.ok(dashboard.includes('retryBusinessData'));
assert.ok(dashboard.includes('إعادة المحاولة'));
assert.ok(dashboard.includes('function LoadingRows'));
assert.ok(dashboard.includes('aria-busy={!businessReady}'));
assert.ok(dashboard.includes('جار تجهيز حسابك'));

// Product & Business: clearer labels and actionable empty states.
assert.ok(dashboard.includes("const planAction = subscription ? 'عرض الباقات' : 'استكشف الباقات'"));
assert.ok(dashboard.includes('ابدأ أول توليد'));
assert.ok(dashboard.includes('فتح المساحة'));
assert.ok(dashboard.includes('المشاريع النشطة فقط'));

// Pricing/account launch truth: live subscriptions and top-ups are distinct experiences.
assert.ok(pricing.includes("fetch('/api/v1/plans'"), 'pricing must load the live plan catalog');
assert.ok(pricing.includes("startCheckout('subscription', plan.id)"), 'paid plans must use subscription checkout');
assert.ok(pricing.includes("startCheckout('purchase', pkg.id)"), 'credit top-ups must remain purchase checkout');
assert.ok(pricing.includes('الباقات الشهرية'));
assert.ok(pricing.includes('تحتاج رصيدًا إضافيًا؟'));
assert.ok(pricing.includes("result.error === 'PAYMENT_PROFILE_INCOMPLETE'"), 'checkout must route incomplete profiles to account setup');
assert.ok(account.includes(".from('subscriptions')"), 'account must resolve the active subscription');
assert.ok(account.includes(".from('plans')"), 'account must resolve a human-readable plan');
assert.ok(account.includes('إدارة الباقات والرصيد'));
assert.ok(account.includes('الخطة الحالية'));

// Never return stale hard-coded commercial pricing when the database catalog is unavailable.
assert.ok(plansApi.includes('createServerSupabaseClient'), 'public active plans should rely on RLS, not service-role access');
assert.ok(plansApi.includes("{ error: 'PLAN_CATALOG_UNAVAILABLE', plans: [] }"));
assert.ok(!plansApi.includes('FALLBACK_PLANS'), 'stale fallback pricing must not be shown to users');
assert.ok(!plansApi.includes('priceMonthlyLYD: 45'));
assert.ok(!plansApi.includes('priceMonthlyLYD: 145'));
assert.ok(!plansApi.includes('priceMonthlyLYD: 395'));
assert.ok(checkoutApi.includes('mode: getEzonePayMode()'), 'checkout response must report the actual guarded payment mode');

// Public plan catalog must be read-only and must not depend on privileged role helpers for anonymous pricing views.
assert.ok(plansAccessMigration.includes('REVOKE ALL ON TABLE public.plans FROM anon, authenticated'));
assert.ok(plansAccessMigration.includes('GRANT SELECT ON TABLE public.plans TO anon, authenticated'));
assert.ok(plansAccessMigration.includes('TO anon, authenticated'));
assert.ok(plansAccessMigration.includes('USING (is_active = TRUE)'));
assert.ok(!plansAccessMigration.includes('get_user_role'), 'anonymous pricing reads must not require privileged role helper execution');

// Mobile navigation reliability and accessibility.
assert.ok(navigation.includes("if (event.key === 'Escape') setMobileOpen(false)"));
assert.ok(navigation.includes("document.body.style.overflow = 'hidden'"));
assert.ok(navigation.includes('aria-expanded={mobileOpen}'));
assert.ok(navigation.includes('aria-controls="brandbox-mobile-navigation"'));
assert.ok(navigation.includes('id="brandbox-mobile-navigation"'));
assert.ok(navigation.includes("max-h-[calc(100dvh-5rem)]"));
assert.ok(navigation.includes("aria-current={active ? 'page' : undefined}"));
assert.ok(navigation.includes('إنشاء حساب'));
assert.ok(!navigation.includes('> اشتراك</Link>'), 'auth CTA must not be mislabeled as a paid subscription action');

// Keyboard users must be able to bypass the persistent global navigation and land on semantic main content.
assert.ok(appNavigationWrapper.includes('href="#main-content"'), 'global shell must expose a skip link');
assert.ok(appNavigationWrapper.includes('تجاوز إلى المحتوى الرئيسي'));
assert.ok(appNavigationWrapper.includes('<main id="main-content" tabIndex={-1}'), 'skip-link target must be semantic and focusable');
assert.ok(appNavigationWrapper.includes('focus:translate-y-0'), 'skip link must become visible on keyboard focus');

// Public root route should keep legacy redirects off the client to avoid an unnecessary hydration/blank-state redirect pass.
assert.ok(!rootPage.includes("'use client'"), 'root page should remain a server component');
assert.ok(rootPage.includes("import { redirect } from 'next/navigation'"), 'legacy view routing should use the server redirect primitive');
assert.ok(rootPage.includes('export default async function RootPage({ searchParams })'), 'root page should resolve query routing before rendering the client experience');
assert.ok(rootPage.includes('if (legacyTarget) redirect(legacyTarget);'), 'legacy views must redirect before the home client tree renders');
assert.ok(!rootPage.includes('useRouter'), 'root route should not ship client router logic only for legacy redirects');
assert.ok(!rootPage.includes('useSearchParams'), 'root route should not hydrate just to read the legacy view query');
assert.ok(!rootPage.includes('Suspense fallback='), 'root route should not render a blank client redirect fallback');

// Mobile review must scope responsive overrides locally and keep touch targets usable.
assert.ok(mobileReview.includes('className="mobile-review-layout"'), 'mobile review must expose a local responsive layout hook');
assert.ok(mobileReview.includes('className="mobile-review-summary"'), 'mobile review summary must use a page-local responsive hook');
assert.ok(mobileReview.includes('className="mobile-review-device-column"'), 'mobile review device column must use a page-local responsive hook');
assert.ok(mobileReview.includes('<style jsx>{`@media (max-width:850px){.mobile-review-layout'), 'responsive CSS must stay scoped to the mobile review page');
assert.ok(!mobileReview.includes('body{overflow:hidden!important}'), 'mobile review must not mutate global body overflow through CSS');
assert.ok(!mobileReview.includes('.brandbox-theme-scope>nav{display:none!important}'), 'mobile review must not hide the shared global navigation by descendant override');
assert.ok(mobileReview.includes('aria-label="التنقل الرئيسي لنسخة المراجعة"'), 'bottom navigation needs an accessible label');
assert.ok(mobileReview.includes("aria-current={active ? 'page' : undefined}"), 'active bottom-navigation item must be exposed to assistive technology');
assert.ok(mobileReview.includes('minHeight: 48'), 'bottom-navigation controls must preserve a usable touch target');
assert.ok(mobileReview.includes('minHeight: 44'), 'primary review controls must preserve a minimum touch target');

// Core auth form controls must have durable accessible names, useful browser semantics, and announced feedback.
assert.ok(auth.includes('<span className="sr-only">البريد الإلكتروني</span>'), 'email input must have an accessible label independent of its placeholder');
assert.ok(auth.includes('<span className="sr-only">كلمة المرور</span>'), 'password input must have an accessible label independent of its placeholder');
assert.ok(auth.includes('autoComplete="email"'), 'email field should expose autocomplete semantics');
assert.ok(auth.includes("autoComplete={mode === 'login' ? 'current-password' : 'new-password'}"), 'password autocomplete must match login/signup mode');
assert.ok(auth.includes('type="tel" autoComplete="tel" inputMode="tel"'), 'phone inputs must expose telephone semantics');
assert.ok(auth.includes('aria-live="polite" aria-atomic="true"'), 'auth feedback must be announced to assistive technology');
assert.ok(auth.includes('role="dialog" aria-modal="true"'), 'social onboarding must be exposed as a modal dialog');
assert.ok(auth.includes('aria-label="إغلاق نافذة إكمال الحساب"'), 'icon-only onboarding close control needs an accessible name');
assert.ok(auth.includes('min-h-11 min-w-11'), 'small icon controls must preserve a usable touch target');

console.log('Product/Monitoring interface pass guard passed.');
