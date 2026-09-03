const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const editRoute = fs.readFileSync(path.join(root, 'src/app/api/v1/social/posts/[postId]/route.ts'), 'utf8');
const createRoute = fs.readFileSync(path.join(root, 'src/app/api/v1/social/posts/route.ts'), 'utf8');
const scheduleRoute = fs.readFileSync(path.join(root, 'src/app/api/v1/social/posts/[postId]/schedule/route.ts'), 'utf8');
const planner = fs.readFileSync(path.join(root, 'apps/mobile/src/app/planner.tsx'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'docs/mobile-social-draft-review-plan.md'), 'utf8');

assert.ok(editRoute.includes('export async function PATCH('), 'draft edit route must be PATCH-only');
assert.ok(editRoute.includes('authenticateActiveUser(request)'), 'draft edit must require active-user auth');
assert.ok(editRoute.includes(".eq('user_id', auth.user.id)"), 'draft edit must be owner-scoped');
assert.ok(editRoute.includes("const EDITABLE_STATUSES = ['draft', 'cancelled', 'failed'] as const"), 'only reviewable states may be edited');
assert.ok(editRoute.includes(".in('status', [...EDITABLE_STATUSES])"), 'editable-state check must be part of the atomic update');
assert.ok(editRoute.includes("status: 'draft'"), 'edited cancelled/failed content must return to draft review state');
assert.ok(editRoute.includes('scheduled_at: null'), 'editing must not preserve a schedule');
assert.ok(editRoute.includes('published_at: null'), 'editing must not create published state');
assert.ok(editRoute.includes('error_summary: null'), 'a reviewed draft should clear old failure summary');
assert.ok(editRoute.includes("const ALLOWED_BODY_KEYS = new Set(['content', 'targetProviders'])"), 'edit body must use a strict allowlist');
assert.ok(editRoute.includes("error: 'PROTECTED_SOCIAL_POST_FIELD'"), 'protected edit fields must be rejected explicitly');
assert.ok(editRoute.includes("error: existing.status === 'scheduled'"), 'scheduled posts must produce a specific cancel-first error');
assert.ok(editRoute.includes("'CANCEL_SOCIAL_SCHEDULE_BEFORE_EDIT'"), 'scheduled edit must require explicit cancellation');
assert.ok(editRoute.includes("'SOCIAL_POST_NOT_EDITABLE'"), 'publishing/published states must fail closed');
assert.ok(!editRoute.includes('scheduleSocialPostForUser'), 'draft edit must not schedule');
assert.ok(!editRoute.includes('claimDueSocialPublishJobs'), 'draft edit must not invoke worker claim');
assert.ok(!editRoute.includes('credential_ciphertext'), 'draft edit must not touch provider credentials');
assert.ok(!editRoute.includes('access_token'), 'draft edit must not handle provider access tokens');
assert.ok(!editRoute.includes('process.env'), 'draft edit route must not depend on publishing secrets');

assert.ok(createRoute.includes("status: 'draft'"), 'new social posts must remain drafts');
assert.ok(createRoute.includes('USE_SOCIAL_SCHEDULE_ENDPOINT'), 'creation must not bypass scheduling boundary');
assert.ok(scheduleRoute.includes('scheduleSocialPostForUser'), 'scheduling must remain a separate endpoint');

assert.ok(planner.includes("method: 'PATCH'"), 'mobile Planner must save draft edits through PATCH');
assert.ok(planner.includes('مراجعة وتعديل'), 'Planner must expose explicit review/edit action');
assert.ok(planner.includes('حفظ التعديلات كمسودة'), 'edit save must be labeled as draft save');
assert.ok(planner.includes('لم تتم الجدولة أو النشر'), 'mobile copy must preserve human-review boundary');
assert.ok(planner.includes("['draft', 'cancelled', 'failed'].includes(post.status)"), 'mobile must only open editor for reviewable statuses');
assert.ok(planner.includes('ألغِ الجدولة أولًا قبل تعديل المسودة'), 'scheduled content must instruct explicit cancellation');
assert.ok(planner.includes('لا يتم الإلغاء تلقائيًا أثناء التحرير'), 'mobile must not silently cancel a schedule');
assert.ok(planner.includes('setSchedulePostId(\'\')'), 'opening edit must close scheduling UI');

assert.ok(plan.includes('Saving changes never schedules or publishes') || plan.includes('Editing never schedules, publishes'), 'documented release contract must preserve review boundary');

console.log('Mobile social draft review security guard passed.');
