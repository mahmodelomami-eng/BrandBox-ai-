const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const projectRoute = read('src/app/api/v1/mobile/projects/route.ts');
const projects = read('apps/mobile/src/app/(tabs)/projects.tsx');
const trends = read('apps/mobile/src/app/(tabs)/trends.tsx');
const campaign = read('apps/mobile/src/app/campaign.tsx');
const store = read('apps/mobile/src/app/(tabs)/store.tsx');

assert.match(projectRoute, /authenticateActiveUser/, 'mobile project creation must require active auth');
assert.match(projectRoute, /owner_id: auth\.user\.id/, 'project owner must come from authenticated server identity');
assert.match(projectRoute, /PROTECTED_FIELDS/, 'project create route must reject protected authority fields');
assert.match(projectRoute, /ownerId/, 'owner aliases must be treated as protected input');
assert.match(projectRoute, /PROJECT_TYPES = new Set\(\['صورة', 'محادثة', 'فيديو', 'صوت'\]\)/, 'project types must preserve current platform contract');
assert.match(projectRoute, /database-authoritative defaults/, 'database must remain authoritative for generated id/default fields');
assert.doesNotMatch(projectRoute, /body\.owner|body\['owner|body\.id|body\.role|body\.credit/, 'client project authority fields must never be consumed');

assert.match(projects, /\/api\/v1\/mobile\/projects/, 'Projects screen must create through server API');
assert.match(projects, /\+ مشروع جديد/, 'Projects screen must expose native project creation');
assert.match(projects, /إعادة تحميل المشاريع/, 'Projects screen must expose a retry state');
assert.doesNotMatch(projects, /ownerId|owner_id|creditBalance|credit_balance|role:/, 'mobile project payload must not carry protected authority');

assert.match(trends, /router\.push/, 'Trend Radar must support explicit Campaign Composer handoff');
assert.match(trends, /pathname: '\/campaign'/, 'Trend handoff must target Campaign Composer');
assert.match(trends, /PREVIEW — ليس بثًا مباشرًا/, 'Trend preview must remain truthfully labeled');
assert.match(trends, /إعادة المحاولة/, 'Trend Radar must expose retry handling');
assert.doesNotMatch(trends, /api\/v1\/mobile\/campaigns\/compose/, 'Trend screen must never auto-compose a campaign');

assert.match(campaign, /useLocalSearchParams/, 'Campaign Composer must accept safe route prefill');
assert.match(campaign, /routeText\(params\.goal, 1200\)/, 'goal prefill must be length bounded');
assert.match(campaign, /routeText\(params\.trendContext, 800\)/, 'trend context prefill must be length bounded');
assert.match(campaign, /لم يتم اختيار مشروع أو تشغيل AI تلقائيًا/, 'Campaign UI must state the prefill safety boundary');
assert.match(campaign, /projectId,/, 'Campaign compose must still require an explicit selected project');
assert.match(campaign, /\/api\/v1\/mobile\/campaigns\/compose/, 'campaign generation must remain server-authoritative');

assert.match(store, /تعذر تحميل الكتالوج الرقمي/, 'Store must fail explicitly when current catalog cannot be loaded');
assert.match(store, /إعادة تحميل الكتالوج/, 'Store must expose retry handling');
assert.match(store, /السعر يأتيان من الخادم/, 'Store UI must preserve server-authoritative catalog pricing');
assert.match(store, /الشراء الرقمي داخل iOS\/Android سيبقى غير مفعّل/, 'native digital checkout must remain gated');

console.log('Brand Box Mobile product QA guard passed.');
