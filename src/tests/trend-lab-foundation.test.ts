import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migration = readFileSync(join(root, 'supabase/migrations/20260902215000_trend_lab_foundation.sql'), 'utf8');
const counterMigration = readFileSync(join(root, 'supabase/migrations/20260902215100_trend_usage_atomic_counter.sql'), 'utf8');
const publicApi = readFileSync(join(root, 'src/app/api/v1/trends/route.ts'), 'utf8');
const adminApi = readFileSync(join(root, 'src/app/api/v1/admin/trends/route.ts'), 'utf8');
const publicComponent = readFileSync(join(root, 'src/components/TrendLabLibrary.jsx'), 'utf8');
const adminComponent = readFileSync(join(root, 'src/components/AdminTrendLabPanel.jsx'), 'utf8');
const templatesPage = readFileSync(join(root, 'src/app/templates/page.jsx'), 'utf8');
const adminPage = readFileSync(join(root, 'src/app/admin/page.jsx'), 'utf8');
const agentContract = readFileSync(join(root, 'docs/AI_TREND_INTELLIGENCE_AGENT.md'), 'utf8');

for (const table of ['trend_briefs', 'trend_templates', 'trend_usage_events']) {
  assert.ok(migration.includes(`public.${table}`), `missing ${table}`);
  assert.ok(migration.includes(`alter table public.${table} enable row level security`), `${table} must keep RLS enabled`);
  assert.ok(migration.includes(`revoke all on public.${table} from anon, authenticated`), `${table} must not expose direct browser writes`);
}

assert.ok(migration.includes("workflow_status in ('discovered','shortlisted','designing','testing','approved','rejected','published')"));
assert.ok(migration.includes("readiness in ('live','requires_reference','draft')"));
assert.ok(migration.includes("lifecycle in ('trending','evergreen','archived')"));
assert.ok(migration.includes("'mini-me-reference'"));
assert.ok(migration.includes("'requires_reference'"), 'reference-image concepts must not pretend to be live');
assert.ok(!migration.toLowerCase().includes('araby'), 'Trend Lab seed data must not copy competitor branding');

assert.ok(counterMigration.includes('increment_trend_use_count_from_event'));
assert.ok(counterMigration.includes('use_count = use_count + 1'));
assert.ok(counterMigration.includes("if new.event_type = 'use'"));
assert.ok(counterMigration.includes('revoke all on function public.increment_trend_use_count_from_event() from public, anon, authenticated'));

assert.ok(publicApi.includes(".eq('is_published', true)"));
assert.ok(publicApi.includes(".in('lifecycle', ['trending', 'evergreen'])"));
assert.ok(publicApi.includes('authenticateActiveUser(request)'));
assert.ok(publicApi.includes(".eq('user_id', auth.user.id)"), 'usage project ownership must be checked server-side');
assert.ok(publicApi.includes("event_type: eventType"));
assert.ok(!publicApi.includes('use_count: Number(current.use_count'), 'use counts must not use a read-modify-write race');

assert.ok(adminApi.includes("checkPermission(actor.role, 'settings.read')"));
assert.ok(adminApi.includes("checkPermission(actor.role, 'settings.manage')"));
assert.ok(adminApi.includes('weightedScore'));
assert.ok(adminApi.includes('viral * 0.25'));
assert.ok(adminApi.includes("action: 'createBrief'"));
assert.ok(adminApi.includes("action: 'createTemplate'"));
assert.ok(adminApi.includes("action: 'updateBriefStatus'"));
assert.ok(adminApi.includes("action: 'updateTemplate'"));
assert.ok(adminApi.includes("'ADMIN_CREATED_TREND_BRIEF'"));
assert.ok(adminApi.includes("'ADMIN_CREATED_TREND_TEMPLATE'"));
assert.ok(adminApi.includes('Cache-Control'), 'admin GET must be no-store');

assert.ok(templatesPage.includes("import TrendLabLibrary from '../../components/TrendLabLibrary'"));
assert.ok(templatesPage.includes('<TrendLabLibrary />'));
assert.ok(publicComponent.includes('BRAND BOX TREND LAB'));
assert.ok(publicComponent.includes("fetch('/api/v1/trends?limit=30'"));
assert.ok(publicComponent.includes('createUserProject'));
assert.ok(publicComponent.includes("source: 'trend-lab'"));
assert.ok(publicComponent.includes("selected.readiness !== 'live'"));
assert.ok(publicComponent.includes('Image-to-Image حقيقي'));
assert.ok(publicComponent.includes('bb-dashboard-hero'));
assert.ok(publicComponent.includes('bb-card'));
assert.ok(publicComponent.includes('bb-media-canvas'));
assert.ok(!publicComponent.toLowerCase().includes('araby'));

assert.ok(adminPage.includes('href="/admin/trends"'));
assert.ok(adminComponent.includes('Brand Box Trend Lab'));
assert.ok(adminComponent.includes('Trend Intelligence Pipeline'));
assert.ok(adminComponent.includes("action: 'createBrief'"));
assert.ok(adminComponent.includes("action: 'createTemplate'"));
assert.ok(agentContract.includes('Trend Intelligence & Prompt Research Agent'));
assert.ok(agentContract.includes('Discover -> Evidence -> Score -> Deduplicate -> Localize -> Brief -> Design -> Test -> Approve -> Publish -> Measure -> Refresh/Archive'));
assert.ok(agentContract.includes('75+'));
assert.ok(agentContract.includes('must not store or reproduce third-party proprietary prompts'));

console.log('Trend Lab foundation regression guard passed.');
