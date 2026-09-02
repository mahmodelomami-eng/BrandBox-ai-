import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generationIdForRequest, generationReplayDisposition } from '../lib/generations/generation-engine';

const root = process.cwd();
const route = readFileSync(join(root, 'src/app/api/v1/generations/route.ts'), 'utf8');
const engine = readFileSync(join(root, 'src/lib/generations/generation-engine.ts'), 'utf8');
const chatWorkspace = readFileSync(join(root, 'src/components/ChatProjectWorkspace.jsx'), 'utf8');
const imageWorkspace = readFileSync(join(root, 'src/components/ImageStudioWorkspace.jsx'), 'utf8');

const postRoute = route.slice(route.indexOf('export async function POST'));
const existingLookup = engine.indexOf('const existingGeneration = await resolveExistingGeneration');
const creditDeduction = engine.indexOf('CreditEngine.deductCredits');

const stableId = generationIdForRequest('user-a', 'request-1234');
assert.equal(stableId, generationIdForRequest('user-a', 'request-1234'), 'the same user request must keep one generation identity');
assert.notEqual(stableId, generationIdForRequest('user-a', 'request-5678'), 'different requests must not share a generation identity');
assert.notEqual(stableId, generationIdForRequest('user-b', 'request-1234'), 'request IDs must be tenant-scoped');
assert.deepEqual(generationReplayDisposition('completed'), { success: true, retryable: false });
assert.deepEqual(generationReplayDisposition('processing'), { success: false, retryable: true });
assert.deepEqual(generationReplayDisposition('queued'), { success: false, retryable: true });
assert.deepEqual(generationReplayDisposition('failed'), { success: false, retryable: false });

assert.ok(postRoute.includes("error: 'INVALID_GENERATION_REQUEST_ID'"), 'generation POST must reject missing or malformed request IDs');
assert.ok(postRoute.includes('requestId'), 'generation POST must pass the validated request ID to the engine');
assert.ok(engine.includes('generationIdForRequest(actor.userId, requestId)'), 'generation IDs must be stable for a user request');
assert.ok(existingLookup >= 0 && existingLookup < creditDeduction, 'a replay must be resolved before another credit deduction');
assert.ok(engine.includes('GENERATION_IDEMPOTENCY_LOOKUP_FAILED'), 'idempotency lookup failures must fail closed');
assert.match(engine, /if \(insertError\) \{[\s\S]*?resolveExistingGeneration\(database, actor\.userId, generationId\)/, 'concurrent insert conflicts must resolve the winning generation');
assert.ok(engine.includes('gen_deduct_${generationId}'), 'credit reservation must share the stable generation identity');
assert.ok(engine.includes("errorMessage: disposition.success"), 'an in-progress replay must not be represented as a completed success');
assert.ok(postRoute.includes('if (result.retryable)'));
assert.ok(postRoute.includes("status: 202, headers: { 'Retry-After': '2' }"), 'in-progress replays must receive an explicit retryable HTTP response');

for (const [name, source] of [
  ['chat workspace', chatWorkspace],
  ['image workspace', imageWorkspace],
] as const) {
  const calls = [...source.matchAll(/fetch\((["'])\/api\/v1\/generations\1,\s*\{([\s\S]*?)\n\s*\}\);/g)]
    .map((match) => match[2])
    .filter((call) => /method:\s*["']POST["']/.test(call));
  assert.ok(calls.length > 0, `${name} must expose its expected generation POST caller`);
  for (const call of calls) {
    assert.ok(call.includes('requestId: crypto.randomUUID()'), `${name} generation POST must include a per-attempt request ID`);
  }
}

console.log('Generation idempotency guard passed.');
