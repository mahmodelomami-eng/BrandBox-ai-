const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const queue = read('supabase/migrations/202609030006_social_publish_queue.sql');
const hardening = read('supabase/migrations/202609030007_social_publish_queue_hardening.sql');
const connectionIndex = read('supabase/migrations/202609030008_social_publish_connection_index.sql');
const posts = read('src/app/api/v1/social/posts/route.ts');
const schedule = read('src/app/api/v1/social/posts/[postId]/schedule/route.ts');
const service = read('src/lib/social/publishing-service.ts');
const adapters = read('src/lib/social/publishing-adapters.ts');
const worker = read('src/app/api/internal/social/publish-due/route.ts');
const planner = read('apps/mobile/src/app/planner.tsx');
const env = read('.env.example');

assert.match(queue, /CREATE TABLE IF NOT EXISTS public\.social_publish_jobs/, 'publish queue table must exist');
assert.match(queue, /FOR UPDATE SKIP LOCKED/, 'claiming must be concurrency-safe');
assert.match(queue, /REVOKE ALL ON public\.social_publish_jobs FROM anon, authenticated/, 'publish jobs must be server-only');
assert.match(queue, /UNIQUE \(idempotency_key\)/, 'publish jobs need a stable idempotency key');

assert.match(hardening, /ALTER FUNCTION public\.schedule_social_post_jobs_atomic[\s\S]*SECURITY INVOKER/, 'schedule RPC must use invoker rights');
assert.match(hardening, /claim_due_social_publish_jobs_v2/, 'worker must use provider-filtered claim RPC');
assert.match(hardening, /j\.provider = ANY\(p_allowed_providers\)/, 'claim RPC must only lease allowed providers');
assert.match(hardening, /v_job\.worker_id IS DISTINCT FROM p_worker_id/, 'finalizer must fence stale worker leases');
assert.match(hardening, /credential_ciphertext = NULL/, 'reauth result must clear unusable encrypted credentials');
assert.match(hardening, /FROM PUBLIC, anon, authenticated/, 'new RPCs must revoke direct client execution');
assert.match(connectionIndex, /social_publish_jobs\(connection_id\)/, 'connection foreign key needs a covering index');

assert.match(posts, /USE_SOCIAL_SCHEDULE_ENDPOINT/, 'draft endpoint must reject direct scheduling');
assert.match(posts, /status: 'draft'/, 'post creation must remain draft-only');
assert.doesNotMatch(posts, /status:\s*scheduledAt\s*\?\s*'scheduled'/, 'draft endpoint must not bypass queue scheduling');
assert.match(schedule, /authenticateActiveUser/, 'schedule mutations must require active auth');
assert.match(schedule, /scheduleSocialPostForUser/, 'schedule route must use server scheduling service');
assert.match(schedule, /cancelSocialPostSchedule/, 'cancel route must use atomic cancellation service');

assert.match(service, /\.eq\('user_id', args\.userId\)/, 'schedule service must owner-scope posts and connections');
assert.match(service, /providerConnectionCapability/, 'schedule service must verify provider publishing capability');
assert.match(service, /claim_due_social_publish_jobs_v2/, 'worker service must use provider-filtered queue claim');
assert.match(service, /BRANDBOX_SOCIAL_SCHEDULER_ENABLED/, 'scheduler needs an independent feature gate');
assert.match(service, /BRANDBOX_SOCIAL_LIVE_PUBLISHING_ENABLED/, 'live publishing needs an independent global gate');

assert.match(adapters, /meta: false/, 'Meta adapter must remain uncertified until its implementation PR');
assert.match(adapters, /tiktok: false/, 'TikTok adapter must remain uncertified until its implementation PR');
assert.match(adapters, /youtube: false/, 'YouTube adapter must remain uncertified until its implementation PR');
assert.match(adapters, /linkedin: false/, 'LinkedIn adapter must remain uncertified until its implementation PR');
assert.match(adapters, /decryptSocialSecret/, 'provider credentials may only be decrypted server-side');

assert.match(worker, /timingSafeEqual/, 'worker secret comparison must be timing-safe');
assert.match(worker, /BRANDBOX_SOCIAL_WORKER_SECRET/, 'worker must require a server-only secret');
assert.match(worker, /socialLivePublishingEnabled\(\)/, 'worker must check global live publishing gate before claim');
assert.match(worker, /certifiedPublishProviders\(\)/, 'worker must restrict claims to certified adapters');
assert.doesNotMatch(worker, /credential_ciphertext|refreshToken|accessToken/, 'worker response/controller must not handle provider credential fields');

assert.match(planner, /\/api\/v1\/social\/posts\/\$\{post\.id\}\/schedule/, 'mobile planner must use dedicated schedule endpoint');
assert.match(planner, /method: 'DELETE'/, 'mobile planner must cancel through server schedule endpoint');
assert.match(planner, /الحفظ لا يعني الجدولة أو النشر/, 'mobile must preserve explicit human-review boundary');
assert.doesNotMatch(planner, /refreshToken|credential_ciphertext|clientSecret/, 'mobile must never handle provider credential material');

assert.match(env, /BRANDBOX_SOCIAL_SCHEDULER_ENABLED=false/, 'scheduler must default off');
assert.match(env, /BRANDBOX_SOCIAL_LIVE_PUBLISHING_ENABLED=false/, 'live publishing must default off');
assert.match(env, /BRANDBOX_META_PUBLISHING_ENABLED=false/, 'Meta publishing must default off');
assert.match(env, /BRANDBOX_TIKTOK_PUBLISHING_ENABLED=false/, 'TikTok publishing must default off');
assert.match(env, /BRANDBOX_YOUTUBE_PUBLISHING_ENABLED=false/, 'YouTube publishing must default off');
assert.match(env, /BRANDBOX_LINKEDIN_PUBLISHING_ENABLED=false/, 'LinkedIn publishing must default off');

console.log('Brand Box Mobile Social scheduler security guard passed.');
