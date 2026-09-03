const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const route = read('src/app/api/v1/mobile/projects/[projectId]/route.ts');
const workspace = read('apps/mobile/src/app/project/[projectId].tsx');
const projects = read('apps/mobile/src/app/(tabs)/projects.tsx');
const campaign = read('apps/mobile/src/app/campaign.tsx');
const layout = read('apps/mobile/src/app/_layout.tsx');

assert.match(route, /authenticateActiveUser\(request\)/, 'project workspace must require active-user auth');
assert.match(route, /\.eq\('owner_id', auth\.user\.id\)/, 'project must be owner-scoped before workspace data is read');
assert.match(route, /\.is\('deleted_at', null\)/, 'deleted projects must not open a live workspace');
assert.match(route, /\.eq\('user_id', auth\.user\.id\)/, 'linked workspace queries must remain user-scoped');
assert.match(route, /\.eq\('project_id', projectId\)/, 'project-linked data must be project-scoped');
assert.match(route, /scope: 'account'/, 'shared Brand Kit scope must be explicit');
assert.doesNotMatch(route, /file_path/, 'workspace response must never expose storage file paths');
assert.doesNotMatch(route, /provider_cost_usd|generation_financials/, 'workspace must not expose internal provider financials');
assert.doesNotMatch(route, /credential_ciphertext|refresh_token|access_token/, 'workspace must never expose provider credentials');
assert.doesNotMatch(route, /credit_balance|role:/, 'workspace snapshot must not expose unrelated account authority');

assert.match(projects, /pathname: '\/project\/\[projectId\]'/, 'project cards must open the dynamic workspace route');
assert.match(projects, /فتح مساحة المشروع/, 'project cards must expose clear workspace navigation');
assert.match(layout, /name="project\/\[projectId\]"/, 'root stack must register project workspace');

assert.match(workspace, /\/api\/v1\/mobile\/projects\/\$\{encodeURIComponent\(projectId\)\}/, 'workspace must load through server API');
assert.match(workspace, /لم يتم عرض بيانات قديمة أو جزئية/, 'workspace must fail explicitly instead of keeping stale partial data');
assert.match(workspace, /على مستوى الحساب/, 'Brand Kit UI must truthfully label account scope');
assert.match(workspace, /ليست Brand Kit مستقلة خاصة بهذا المشروع/, 'workspace must not misrepresent shared Brand Kit as project-specific');
assert.doesNotMatch(workspace, /filePath|file_path|providerCost|credential/, 'mobile workspace must not consume hidden storage/financial/credential data');
assert.match(workspace, /pathname: '\/campaign'/, 'workspace must hand off to Campaign Composer');
assert.match(workspace, /projectId: data\.project\.id/, 'workspace handoff should carry current project context');

assert.match(campaign, /routeText\(params\.projectId, 160\)/, 'project route prefill must be length-bounded');
assert.match(campaign, /availableProjects\.some\(\(project\) => project\.id === initialProjectId\)/, 'Campaign Composer must accept project prefill only after matching owned projects');
assert.match(campaign, /يمكنك تغييره قبل إنشاء الحملة/, 'project prefill must remain user-reviewable');
assert.match(campaign, /projectId,/, 'server compose request must still use the explicitly selected project');

console.log('Mobile project workspace guard passed.');
