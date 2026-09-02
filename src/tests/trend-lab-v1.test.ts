import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const foundation = readFileSync(join(root, 'supabase/migrations/20260902225915_trend_lab_foundation.sql'), 'utf8');
const counter = readFileSync(join(root, 'supabase/migrations/20260902225922_trend_usage_atomic_counter.sql'), 'utf8');
const library = readFileSync(join(root, 'src/components/TrendLibrary.jsx'), 'utf8');
const publicRoute = readFileSync(join(root, 'src/app/api/v1/trends/route.ts'), 'utf8');
const admin = readFileSync(join(root, 'src/components/AdminTrendLab.jsx'), 'utf8');
const adminRoute = readFileSync(join(root, 'src/app/api/v1/admin/trends/route.ts'), 'utf8');
const templatesPage = readFileSync(join(root, 'src/app/templates/page.jsx'), 'utf8');
const trendPage = readFileSync(join(root, 'src/app/templates/trends/page.jsx'), 'utf8');
const adminPage = readFileSync(join(root, 'src/app/admin/page.jsx'), 'utf8');

assert.ok(foundation.includes('create table if not exists public.trend_briefs'));
assert.ok(foundation.includes('create table if not exists public.trend_templates'));
assert.ok(foundation.includes('create table if not exists public.trend_usage_events'));
assert.ok(foundation.includes('revoke all on public.trend_briefs from anon, authenticated'));
assert.ok(foundation.includes('revoke all on public.trend_templates from anon, authenticated'));
assert.ok(foundation.includes('revoke all on public.trend_usage_events from anon, authenticated'));
assert.ok(foundation.includes("'mini-me-reference'"), 'reference-image trend must be explicitly capability-gated');
assert.ok(foundation.includes("'arabic-idiom-literal-world'"));
assert.ok(foundation.includes("'giant-product-city'"));
assert.ok(foundation.includes("'cinematic-motion-reveal'"));
assert.ok(counter.includes("if new.event_type = 'use'"));
assert.ok(counter.includes('set use_count = use_count + 1'));
assert.ok(counter.includes('revoke all on function public.increment_trend_use_count_from_event() from public, anon, authenticated'));

assert.ok(trendPage.includes('<TrendLibrary />'));
assert.ok(templatesPage.includes('href="/templates/trends"'));
assert.ok(library.includes('bb-app-canvas'));
assert.ok(library.includes('bb-dashboard-hero'));
assert.ok(library.includes("fetch('/api/v1/trends')"), 'browser must use controlled API instead of direct privileged table access');
assert.ok(!library.includes(".from('trend_templates')"), 'Trend tables are server-only');
assert.ok(library.includes("router.push('/auth?next=%2Ftemplates%2Ftrends')"));
assert.ok(library.includes('createUserProject({'));
assert.ok(library.includes("'/projects/images/workspace'"));
assert.ok(library.includes("'/projects/video/workspace'"));
assert.ok(library.includes("readiness !== 'live'"));
assert.ok(library.includes('لن نعرض تنفيذًا وهميًا'), 'reference-image capability must not be faked');

assert.ok(publicRoute.includes(".eq('is_published', true)"));
assert.ok(publicRoute.includes(".neq('lifecycle', 'archived')"));
assert.ok(publicRoute.includes("database.from('trend_usage_events').insert"));
assert.ok(publicRoute.includes(".eq('user_id', authData.user.id)"), 'usage event must bind to an owned project');
assert.ok(publicRoute.includes("event_type: 'use'"));

assert.ok(adminPage.includes('href="/admin/trends"'));
assert.ok(admin.includes('Discover → Shortlist → Design → Test → Approve → Publish → Measure'));
assert.ok(admin.includes('Research Briefs'));
assert.ok(admin.includes('Trend Templates'));
assert.ok(admin.includes('Trend Score يُحسب في الخادم'));
assert.ok(admin.includes("fetch('/api/v1/admin/trends'"));
assert.ok(admin.includes("quickBriefStatus"));
assert.ok(admin.includes("turnIntoTemplate"));
assert.ok(admin.includes("lifecycle:'archived'"));

assert.ok(adminRoute.includes("const MUTATING_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN']"));
assert.ok(adminRoute.includes("if (!MUTATING_ROLES.includes(actor.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })"));
assert.ok(adminRoute.includes(".from('trend_briefs')"));
assert.ok(adminRoute.includes(".from('trend_templates')"));
assert.ok(adminRoute.includes("action: 'ADMIN_CREATED_TREND_BRIEF'"));
assert.ok(adminRoute.includes("action: 'ADMIN_UPDATED_TREND_BRIEF'"));
assert.ok(adminRoute.includes("action: 'ADMIN_CREATED_TREND_TEMPLATE'"));
assert.ok(adminRoute.includes("action: 'ADMIN_UPDATED_TREND_TEMPLATE'"));
assert.ok(adminRoute.includes("score(body.scoreViral) * .25"), 'server must own weighted Trend Score formula');
assert.ok(!adminRoute.includes('export async function DELETE'), 'Trend Lab archives instead of hard-deleting');

console.log('Trend Lab v1 regression guard passed.');
