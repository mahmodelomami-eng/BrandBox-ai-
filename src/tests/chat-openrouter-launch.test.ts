import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const route = readFileSync(join(root, 'src/app/api/v1/generations/route.ts'), 'utf8');
const engine = readFileSync(join(root, 'src/lib/generations/generation-engine.ts'), 'utf8');
const client = readFileSync(join(root, 'src/lib/ai/openrouter-client.ts'), 'utf8');
const workspace = readFileSync(join(root, 'src/components/ChatProjectWorkspace.jsx'), 'utf8');

const catalogCheck = route.indexOf(".from('ai_model_catalog')");
const generationExecution = route.indexOf('GenerationEngine.executeGeneration');
assert.ok(catalogCheck >= 0, 'chat generation must consult ai_model_catalog');
assert.ok(generationExecution > catalogCheck, 'model catalog authorization must occur before GenerationEngine/credit deduction');
assert.ok(route.includes(".eq('provider', 'openrouter')"));
assert.ok(route.includes(".eq('generation_type', 'chat')"));
assert.ok(route.includes(".eq('is_enabled', true)"));
assert.ok(route.includes(".eq('is_visible_to_users', true)"));
assert.ok(route.includes("error: 'CHAT_MODEL_NOT_AVAILABLE'"));
assert.ok(route.includes("error: 'CHAT_MODEL_PRICING_UNAVAILABLE'"));
assert.ok(route.includes('minimum_credits'));
assert.ok(route.includes('projectChatSystemPrompt(project)'));
assert.ok(route.includes(".eq('owner_id', user.id)"));
assert.ok(route.includes(".is('deleted_at', null)"));
assert.ok(route.includes('{ unitCredits, chatSystemPrompt }'));

assert.ok(engine.includes('executionContext.unitCredits'));
assert.ok(engine.includes('systemPrompt: executionContext.chatSystemPrompt'));
assert.ok(engine.includes("'generation_failure_refund'"));
assert.ok(engine.includes('Automatic Refund Retry'));
assert.ok(engine.includes('wasRefunded: refundRes.success'));
assert.ok(!engine.includes('wasRefunded: true'), 'refund state must reflect the actual refund RPC result');
assert.ok(engine.includes('error_message: failure.code'), 'provider internals must not be persisted as user-facing generation errors');

const chatClient = client.slice(client.indexOf('export async function createOpenRouterChatCompletion'));
assert.ok(client.includes("status === 429"));
assert.ok(client.includes("'OPENROUTER_RATE_LIMITED'"));
assert.ok(client.includes("'OPENROUTER_PROVIDER_UNAVAILABLE'"));
assert.ok(chatClient.includes("'OPENROUTER_INVALID_RESPONSE'"));
assert.ok(chatClient.includes("role: 'system'"));
assert.ok(!chatClient.includes('error?.message'), 'chat client must not expose raw provider error messages');

assert.ok(workspace.includes('payload.chatModels'));
assert.ok(workspace.includes('payload.chatModelsAvailable'));
assert.ok(workspace.includes('النماذج المفعّلة من لوحة الإدارة'));
assert.ok(!workspace.includes('const MODELS = ['), 'chat model list must no longer be hardcoded in the browser');

console.log('Chat/OpenRouter launch guard passed.');
