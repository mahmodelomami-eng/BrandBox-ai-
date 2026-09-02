import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const route = readFileSync(join(root, 'src/app/api/v1/admin/ai-team/route.ts'), 'utf8');
const component = readFileSync(join(root, 'src/components/AdminAITeamControlCenter.jsx'), 'utf8');
const page = readFileSync(join(root, 'src/app/admin/ai-team/page.jsx'), 'utf8');
const adminPage = readFileSync(join(root, 'src/app/admin/page.jsx'), 'utf8');
const uiDesignRoles = readFileSync(join(root, 'docs/AI_UI_DESIGN_AGENTS.md'), 'utf8');
const productMonitoringRoles = readFileSync(join(root, 'docs/AI_PRODUCT_MONITORING_AGENTS.md'), 'utf8');

assert.ok(route.includes("from '@/lib/auth/user-auth'"));
assert.ok(route.includes('authenticateActiveUser(request)'));
assert.ok(route.includes("checkPermission(role, 'audit.read')"));
assert.ok(route.includes("checkPermission(role, 'settings.read')"));
assert.ok(route.includes("if (!canView) return NextResponse.json({ error: 'FORBIDDEN' }"));
assert.ok(route.includes("/pulls?state=all"));
assert.ok(route.includes("/issues?state=all"));
assert.ok(route.includes("/actions/runs?per_page=30"));
assert.ok(route.includes("/commits/${monitoredPull.head.sha}/status"));
assert.ok(route.includes("statusSource: 'GitHub activity inference · live + recent 7 days'"));
assert.ok(route.includes('const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000'));
assert.ok(route.includes('const monitoredPull = currentPull || recentPull'));
assert.ok(route.includes('isRecentCompletedActivity && aiActive'));
assert.ok(route.includes("name: 'Store & Backend Agent'"));
assert.ok(route.includes('recentPull: recentPull'));
assert.ok(route.includes('CACHE_SECONDS = 300'));
assert.ok(!route.includes('GITHUB_TOKEN'));
assert.ok(!route.includes('process.env.'));

assert.ok(route.includes("id: 'visual-designer'"));
assert.ok(route.includes("name: 'UI/UX & Visual Designer Agent'"));
assert.ok(route.includes("specialty: 'Design System · Layout · Typography · Brand Consistency'"));
assert.ok(route.includes('const designActive ='));
assert.ok(route.includes("name: 'Frontend & UI Engineer Agent'"));
assert.ok(route.includes("specialty: 'Next.js · React · RTL · Mobile · Motion'"));
assert.ok(uiDesignRoles.includes('UI/UX & Visual Designer Agent'));
assert.ok(uiDesignRoles.includes('Frontend & UI Engineer Agent'));
assert.ok(uiDesignRoles.includes('UI/UX & Visual Designer Agent -> Frontend & UI Engineer Agent -> QA Agent'));

assert.ok(route.includes("id: 'product-business'"));
assert.ok(route.includes("name: 'Product & Business Agent'"));
assert.ok(route.includes("specialty: 'Product Strategy · Pricing · Growth · Customer Value'"));
assert.ok(route.includes('const interfaceReviewActive ='));
assert.ok(route.includes('const productActive = interfaceReviewActive ||'));
assert.ok(route.includes("id: 'monitoring-maintenance'"));
assert.ok(route.includes("name: 'Monitoring & Maintenance Agent'"));
assert.ok(route.includes("specialty: 'Reliability · Runtime Health · Incidents · Maintenance'"));
assert.ok(route.includes('const monitoringActive = interfaceReviewActive ||'));
assert.ok(route.includes('const platformFailure ='));
assert.ok(productMonitoringRoles.includes('Review every user-facing interface for clarity'));
assert.ok(productMonitoringRoles.includes('Review user-facing interfaces for loading, empty, error, retry, stale-data'));
assert.ok(productMonitoringRoles.includes('UI/UX & Visual Designer Agent -> Product & Business Agent -> Frontend & UI Engineer Agent -> Monitoring & Maintenance Agent'));

const agentIds = [...route.matchAll(/id: '([a-z-]+)'/g)].map((match) => match[1]);
assert.equal(new Set(agentIds).size, 11, 'AI Team Control Center must expose exactly 11 unique permanent agents');

assert.ok(page.includes('<AuthGate>'));
assert.ok(page.includes('<AdminAITeamControlCenter />'));
assert.ok(adminPage.includes('href="/admin/ai-team"'));
assert.ok(component.includes("fetch(`/api/v1/admin/ai-team${fresh ? '?fresh=1' : ''}`"));
assert.ok(component.includes('window.setInterval'));
assert.ok(component.includes('GitHub activity inference') === false, 'The status source should come from the server payload, not a client-side hardcoded GitHub fetch.');
assert.ok(!component.includes('api.github.com'));
assert.ok(component.includes('تعرض اللوحة النشاط الجاري وآخر نشاط موثق خلال 7 أيام'));
assert.ok(component.includes('AI TEAM CONTROL CENTER'));
assert.ok(component.includes('آخر تنفيذ جماعي موثق'));
assert.ok(component.includes('ستظهر أدوار الإيجنتات المشاركة بحالة «مكتمل» لمدة 7 أيام بعد الدمج.'));

console.log('AI Team Control Center regression guard passed.');
