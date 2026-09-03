import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const route = readFileSync(join(root, 'src/app/api/v1/admin/ai-team/route.ts'), 'utf8');
const mobileRoute = readFileSync(join(root, 'src/app/api/v1/admin/mobile-ai-team/route.ts'), 'utf8');
const component = readFileSync(join(root, 'src/components/AdminAITeamControlCenter.jsx'), 'utf8');
const mobileComponent = readFileSync(join(root, 'src/components/AdminMobileAITeamPanel.jsx'), 'utf8');
const page = readFileSync(join(root, 'src/app/admin/ai-team/page.jsx'), 'utf8');
const adminPage = readFileSync(join(root, 'src/app/admin/page.jsx'), 'utf8');
const agentContract = readFileSync(join(root, 'AGENTS.md'), 'utf8');
const mobileAgentContract = readFileSync(join(root, 'apps/mobile/AGENTS.md'), 'utf8');
const uiDesignRoles = readFileSync(join(root, 'docs/AI_UI_DESIGN_AGENTS.md'), 'utf8');
const productMonitoringRoles = readFileSync(join(root, 'docs/AI_PRODUCT_MONITORING_AGENTS.md'), 'utf8');

assert.ok(route.includes("from '@/lib/auth/user-auth'"));
assert.ok(route.includes('authenticateActiveUser(request)'));
assert.ok(route.includes("checkPermission(role, 'audit.read')"));
assert.ok(route.includes("checkPermission(role, 'settings.read')"));
assert.ok(route.includes("if (!canView) return NextResponse.json({ error: 'FORBIDDEN' }"));
assert.ok(route.includes("/pulls?state=open"));
assert.ok(route.includes("/issues?state=all"));
assert.ok(route.includes("/actions/runs?per_page=30"));
assert.ok(route.includes("/commits/${currentPull.head.sha}/status"));
assert.ok(route.includes("statusSource: 'GitHub activity inference'"));
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

assert.ok(route.includes('function uiAuditPullMatch'));
assert.ok(route.includes('const uiAuditIssue = issues.find'));
assert.ok(route.includes('issue.number === 114'));
assert.ok(route.includes('const uiAuditPull = openPulls.find(uiAuditPullMatch)'));
assert.ok(route.includes('uiAuditIssue, uiAuditPull, storePull, releaseRun'));
assert.ok(route.includes('const uiWorkActive = Boolean(uiTask)'));
assert.ok(route.includes("type: 'ui_audit_issue'"));
assert.ok(route.includes('uiAudit: {'));
assert.ok(route.includes('نشط على مسار UI Audit'));

assert.ok(route.includes('function storePullMatch'));
assert.ok(route.includes('const storePull = openPulls.find(storePullMatch)'));
assert.ok(route.includes('const storeWorkActive = Boolean(storeTask)'));
assert.ok(route.includes("id: 'store'"));
assert.ok(route.includes("name: 'Store Agent'"));
assert.ok(route.includes("specialty: 'Catalog · Checkout · Orders · Fulfillment'"));
assert.ok(route.includes('بانتظار مهمة متجر'));
assert.ok(route.includes('store: {'));
assert.ok(agentContract.includes('### Store Agent'));
assert.ok(agentContract.includes('catalog, checkout, order lifecycle, fulfillment'));

const agentIds = [...route.matchAll(/id: '([a-z-]+)'/g)].map((match) => match[1]);
assert.equal(new Set(agentIds).size, 12, 'Core AI Team Control Center must expose exactly 12 unique permanent agents');

assert.ok(mobileRoute.includes("from '@/lib/auth/user-auth'"));
assert.ok(mobileRoute.includes('authenticateActiveUser(request)'));
assert.ok(mobileRoute.includes("checkPermission(role, 'audit.read')"));
assert.ok(mobileRoute.includes("checkPermission(role, 'settings.read')"));
assert.ok(mobileRoute.includes('function isMobilePull'));
assert.ok(mobileRoute.includes('function isMobileIssue'));
assert.ok(mobileRoute.includes('issue.number === 159'));
assert.ok(mobileRoute.includes('issue.number >= 163 && issue.number <= 172'));
assert.ok(mobileRoute.includes("run.name === 'mobile-ci'"));
assert.ok(mobileRoute.includes("statusSource: 'GitHub mobile work inference'"));
assert.ok(!mobileRoute.includes('GITHUB_TOKEN'));
assert.ok(!mobileRoute.includes('process.env.'));

const expectedMobileAgents = [
  ['mobile-product-ux', 'Mobile Product/UX Lead'],
  ['mobile-expo-engineer', 'Expo/React Native Engineer'],
  ['mobile-ai-integration', 'Mobile AI Integration Engineer'],
  ['mobile-trends', 'Trends Intelligence Engineer'],
  ['mobile-social', 'Social OAuth & Publishing Engineer'],
  ['mobile-commerce', 'Digital Commerce Engineer'],
  ['mobile-backend-db', 'Mobile Backend/Database Engineer'],
  ['mobile-security', 'Mobile Security Reviewer'],
  ['mobile-qa-release', 'Mobile QA/Release Engineer'],
] as const;
for (const [id, name] of expectedMobileAgents) {
  assert.ok(mobileRoute.includes(`id: '${id}'`), `missing mobile agent ${id}`);
  assert.ok(mobileRoute.includes(`name: '${name}'`), `missing mobile agent name ${name}`);
}
const mobileAgentIds = [...mobileRoute.matchAll(/id: '(mobile-[a-z-]+)'/g)].map((match) => match[1]);
assert.equal(new Set(mobileAgentIds).size, 9, 'Mobile App Team must expose exactly 9 specialist agents');
assert.equal(new Set(agentIds).size + new Set(mobileAgentIds).size, 21, 'AI Control Center must expose 21 visible roles across core and mobile teams');

assert.ok(mobileAgentContract.includes('Mobile Product/UX Lead'));
assert.ok(mobileAgentContract.includes('Expo/React Native Engineer'));
assert.ok(mobileAgentContract.includes('AI Integration Engineer'));
assert.ok(mobileAgentContract.includes('Trends Intelligence Engineer'));
assert.ok(mobileAgentContract.includes('Social OAuth & Publishing Engineer'));
assert.ok(mobileAgentContract.includes('Digital Commerce Engineer'));
assert.ok(mobileAgentContract.includes('Backend/Database Engineer'));
assert.ok(mobileAgentContract.includes('Security Reviewer'));
assert.ok(mobileAgentContract.includes('QA/Release Engineer'));

assert.ok(page.includes('<AuthGate>'));
assert.ok(page.includes('<AdminAITeamControlCenter />'));
assert.ok(page.includes('<AdminMobileAITeamPanel />'));
assert.ok(adminPage.includes('href="/admin/ai-team"'));
assert.ok(component.includes("fetch(`/api/v1/admin/ai-team${fresh ? '?fresh=1' : ''}`"));
assert.ok(component.includes('window.setInterval'));
assert.ok(component.includes('GitHub activity inference') === false, 'The status source should come from the server payload, not a client-side hardcoded GitHub fetch.');
assert.ok(!component.includes('api.github.com'));
assert.ok(component.includes('الحالة مستنتجة من GitHub Issues وPull Requests وActions وVercel'));
assert.ok(component.includes('AI TEAM CONTROL CENTER'));

assert.ok(mobileComponent.includes("fetch(`/api/v1/admin/mobile-ai-team${fresh ? '?fresh=1' : ''}`"));
assert.ok(mobileComponent.includes('window.setInterval'));
assert.ok(!mobileComponent.includes('api.github.com'));
assert.ok(mobileComponent.includes('MOBILE APP TEAM'));
assert.ok(mobileComponent.includes('فريق تطوير وتصميم تطبيق Brand Box'));
assert.ok(mobileComponent.includes('الإجمالي المرئي بعد هذا التحديث: 21 دورًا آليًا'));

console.log('AI Team Control Center regression guard passed.');
