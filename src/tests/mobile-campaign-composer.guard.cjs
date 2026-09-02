const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const compose = read('src/app/api/v1/mobile/campaigns/compose/route.ts');
const batch = read('src/app/api/v1/social/posts/batch/route.ts');
const mobile = read('apps/mobile/src/app/campaign.tsx');
const migration = read('supabase/migrations/202609030003_social_draft_idempotency.sql');

assert.match(compose, /authenticateActiveUser\(request\)/, 'campaign composition must require active authentication');
assert.match(compose, /\.eq\('owner_id', auth\.user\.id\)/, 'campaign composition must enforce project ownership');
assert.match(compose, /\.from\('ai_model_catalog'\)/, 'campaign model must come from the server catalog');
assert.match(compose, /minimum_credits/, 'campaign credits must come from trusted server pricing');
assert.match(compose, /GenerationEngine\.executeGeneration/, 'campaign composition must reuse the authoritative generation engine');
assert.match(compose, /parseStatus: 'needs_review'/, 'invalid structured AI output must fail into human review');
assert.doesNotMatch(compose, /status:\s*'published'/, 'composer must never publish content');

assert.match(batch, /authenticateActiveUser\(request\)/, 'draft batch save must require active authentication');
assert.match(batch, /\.eq\('owner_id', auth\.user\.id\)/, 'draft batch save must enforce project ownership');
assert.match(batch, /status:\s*'draft'/, 'batch save must create drafts only');
assert.match(batch, /client_request_id/, 'draft batch save must carry an idempotency key');
assert.doesNotMatch(batch, /status:\s*'scheduled'/, 'batch save must not schedule content');
assert.doesNotMatch(batch, /status:\s*'published'/, 'batch save must not publish content');

assert.match(migration, /UNIQUE INDEX[\s\S]*user_id, client_request_id/i, 'draft idempotency must be unique per user');
assert.match(mobile, /\/api\/v1\/mobile\/campaigns\/compose/, 'mobile UI must call the server composer');
assert.match(mobile, /\/api\/v1\/social\/posts\/batch/, 'mobile UI must save drafts through the authenticated server route');
assert.match(mobile, /الحفظ لا يعني النشر/, 'mobile UI must make the review/publish boundary explicit');

console.log('Brand Box Mobile Campaign Composer security guard passed.');
