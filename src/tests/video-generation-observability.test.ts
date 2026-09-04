import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const route = readFileSync(join(process.cwd(), 'src/app/api/v1/video-generations/route.ts'), 'utf8');
const post = route.slice(route.indexOf('export async function POST'), route.indexOf('export async function PATCH'));
const patch = route.slice(route.indexOf('export async function PATCH'));

assert.ok(route.includes("import { emitServerError, getRequestCorrelationId } from '@/lib/observability/telemetry';"));
assert.ok(post.includes('const correlationId = getRequestCorrelationId(request.headers);'));
assert.ok(patch.includes('const correlationId = getRequestCorrelationId(request.headers);'));
assert.ok(post.includes("operation: 'video_start'"));
assert.ok(patch.includes("operation: 'video_refresh'"));
assert.ok(post.includes("errorCode: 'VIDEO_GENERATION_FAILED'"));
assert.ok(patch.includes("errorCode: 'VIDEO_PROVIDER_TEMPORARILY_UNAVAILABLE'"));
assert.ok(patch.includes("errorCode: 'VIDEO_REFRESH_FAILED'"));
assert.ok(post.includes('generationId: result.generationId'));
assert.ok(post.includes('wasRefunded: result.wasRefunded === true'));

const emittedContexts = [...route.matchAll(/emitServerError\([\s\S]*?\{([\s\S]*?)\}\);/g)].map((match) => match[1]).join('\n');
for (const forbidden of ['prompt', 'modelId', 'projectId', 'userId', 'email', 'settings', 'providerResponse', 'signature', 'secret']) {
  assert.ok(!emittedContexts.includes(`${forbidden}:`), `video observability must not log ${forbidden}`);
}
assert.ok(!route.includes("emitServerError('Video generation start failed', error, {\n      correlationId,\n      requestId,\n      prompt"));

console.log('Video generation observability guard passed.');
