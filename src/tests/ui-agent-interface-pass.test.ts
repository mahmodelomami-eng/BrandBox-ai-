import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dashboard = readFileSync(join(root, 'src/components/StableUserDashboard.jsx'), 'utf8');
const navigation = readFileSync(join(root, 'src/components/GlobalNavigation.jsx'), 'utf8');

// Monitoring & Maintenance: stale-user and degraded-state protection.
assert.ok(dashboard.includes('const [businessLoading, setBusinessLoading]'));
assert.ok(dashboard.includes('const [dataOwnerId, setDataOwnerId]'));
assert.ok(dashboard.includes('dataOwnerId === authUser.id'));
assert.ok(dashboard.includes('setProjects([])'));
assert.ok(dashboard.includes('setGenerations([])'));
assert.ok(dashboard.includes(".is('deleted_at', null)"), 'deleted projects must not appear in the active dashboard');
assert.ok(dashboard.includes(".eq('status', 'active')"), 'dashboard must only treat active subscriptions as current');
assert.ok(dashboard.includes('hasPartialFailure'));
assert.ok(dashboard.includes('إعادة المحاولة'));
assert.ok(dashboard.includes('function LoadingRows'));
assert.ok(dashboard.includes('aria-busy={!businessReady}'));
assert.ok(dashboard.includes('جار تجهيز حسابك'));

// Product & Business: clearer labels and actionable empty states.
assert.ok(dashboard.includes("const planAction = subscription ? 'عرض الباقات' : 'استكشف الباقات'"));
assert.ok(dashboard.includes('ابدأ أول توليد'));
assert.ok(dashboard.includes('فتح المساحة'));
assert.ok(dashboard.includes('المشاريع النشطة فقط'));

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

console.log('Product/Monitoring interface pass guard passed.');
