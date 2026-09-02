import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migration = readFileSync(join(root, 'supabase/migrations/20260903010000_trend_lab_v1.sql'), 'utf8');
const library = readFileSync(join(root, 'src/components/TrendLibrary.jsx'), 'utf8');
const admin = readFileSync(join(root, 'src/components/AdminTrendLab.jsx'), 'utf8');
const adminRoute = readFileSync(join(root, 'src/app/api/v1/admin/trends/route.ts'), 'utf8');
const templatesPage = readFileSync(join(root, 'src/app/templates/page.jsx'), 'utf8');
const trendPage = readFileSync(join(root, 'src/app/templates/trends/page.jsx'), 'utf8');
const adminPage = readFileSync(join(root, 'src/app/admin/page.jsx'), 'utf8');

assert.ok(migration.includes('create table if not exists public.trend_templates'));
assert.ok(migration.includes("status in ('published','evergreen')"), 'public RLS must expose only approved public statuses');
assert.ok(migration.includes('revoke insert, update, delete on public.trend_templates from anon, authenticated'));
assert.ok(migration.includes('increment_trend_template_usage'));
assert.ok(migration.includes('security definer'));
assert.ok(migration.includes('revoke all on function public.increment_trend_template_usage(uuid) from public'));
assert.ok(migration.includes("'phrase-to-visual'"), 'Evergreen Arabic phrase visualizer seed must exist');
assert.ok(migration.includes("'product-giant-world'"), 'commercial CGI seed must exist');
assert.ok(migration.includes("'tiny-self-big-head'"), 'surreal scale-play seed must exist');

assert.ok(trendPage.includes('<TrendLibrary />'));
assert.ok(templatesPage.includes('href="/templates/trends"'));
assert.ok(templatesPage.includes('Trend Lab'));
assert.ok(library.includes('bb-app-canvas'));
assert.ok(library.includes('bb-dashboard-hero'));
assert.ok(library.includes('bb-card'));
assert.ok(library.includes('bb-input'));
assert.ok(library.includes(".from('trend_templates')"));
assert.ok(library.includes(".in('status', ['published', 'evergreen'])"));
assert.ok(library.includes("router.push('/auth?next=%2Ftemplates%2Ftrends')"));
assert.ok(library.includes("createUserProject({"));
assert.ok(library.includes("'/projects/images/workspace'"));
assert.ok(library.includes("'/projects/video/workspace'"));
assert.ok(library.includes("supabase.rpc('increment_trend_template_usage'"));
assert.ok(library.includes('trend.requires_reference'), 'reference-required trends must be capability-gated');
assert.ok(library.includes('لن نعرض قدرة وهمية'), 'UI must not pretend image-to-image exists before provider support');

assert.ok(adminPage.includes('href="/admin/trends"'));
assert.ok(admin.includes('Discover → Review → Design → Approve → Publish → Measure'));
assert.ok(admin.includes('الباحث لا ينشر تلقائيًا'));
assert.ok(admin.includes("fetch('/api/v1/admin/trends'"));
assert.ok(admin.includes("method: form.id ? 'PATCH' : 'POST'"));
assert.ok(admin.includes("quickStatus(item,'review')"));
assert.ok(admin.includes("quickStatus(item,'designing')"));
assert.ok(admin.includes("quickStatus(item,'approved')"));
assert.ok(admin.includes("quickStatus(item,'published')"));
assert.ok(admin.includes("quickStatus(item,'evergreen')"));
assert.ok(admin.includes("quickStatus(item,'archived')"));

assert.ok(adminRoute.includes("const MUTATING_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN']"));
assert.ok(adminRoute.includes("if (!MUTATING_ROLES.includes(actor.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })"));
assert.ok(adminRoute.includes(".from('trend_templates')"));
assert.ok(adminRoute.includes("action: 'ADMIN_CREATED_TREND_TEMPLATE'"));
assert.ok(adminRoute.includes("action: 'ADMIN_UPDATED_TREND_TEMPLATE'"));
assert.ok(!adminRoute.includes('DELETE('), 'Trend Lab v1 must archive, not hard-delete, templates');

console.log('Trend Lab v1 regression guard passed.');
