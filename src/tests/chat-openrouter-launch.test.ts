import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const route = readFileSync(join(root, 'src/app/api/v1/generations/route.ts'), 'utf8');
const engine = readFileSync(join(root, 'src/lib/generations/generation-engine.ts'), 'utf8');
const client = readFileSync(join(root, 'src/lib/ai/openrouter-client.ts'), 'utf8');
const workspace = readFileSync(join(root, 'src/components/ChatProjectWorkspace.jsx'), 'utf8');

const postRoute = route.slice(route.indexOf('export async function POST'));
const postCatalogCheck = postRoute.indexOf(".from('ai_model_catalog')");
const generationExecution = postRoute.indexOf('GenerationEngine.executeGeneration');
assert.ok(postCatalogCheck >= 0, 'chat POST must consult ai_model_catalog');
assert.ok(generationExecution > postCatalogCheck, 'POST model catalog authorization must occur before GenerationEngine/credit deduction');
assert.ok(postRoute.includes(".eq('provider', 'openrouter')"));
assert.ok(postRoute.includes(".eq('generation_type', 'chat')"));
assert.ok(postRoute.includes(".eq('is_enabled', true)"));
assert.ok(postRoute.includes(".eq('is_visible_to_users', true)"));
assert.ok(postRoute.includes("error: 'CHAT_MODEL_NOT_AVAILABLE'"));
assert.ok(postRoute.includes("error: 'CHAT_MODEL_PRICING_UNAVAILABLE'"));
assert.ok(postRoute.includes('minimum_credits'));
assert.ok(postRoute.includes('projectChatSystemPrompt(project, brandKit || null)'));
assert.ok(postRoute.includes(".from('brand_kits')"), 'chat context must load Brand Kit server-side');
assert.ok(postRoute.includes(".eq('user_id', user.id)"), 'Brand Kit context must remain tenant-scoped');
assert.ok(postRoute.includes(".eq('owner_id', user.id)"));
assert.ok(postRoute.includes(".is('deleted_at', null)"));
const executionContext = postRoute.slice(postRoute.lastIndexOf('GenerationEngine.executeGeneration'));
assert.ok(executionContext.includes('unitCredits'), 'chat execution must keep server-authoritative unit credits');
assert.ok(executionContext.includes('chatSystemPrompt'), 'chat execution must keep the trusted server-built project context');

const getRoute = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'));
assert.ok(getRoute.includes("searchParams.get('projectId')"));
assert.ok(getRoute.includes("searchParams.get('generationType')"));
assert.ok(getRoute.includes("generationQuery.eq('project_id', projectId)"));
assert.ok(getRoute.includes("generationQuery.eq('generation_type', requestedGenerationType)"));
assert.ok(getRoute.includes(".eq('owner_id', user.id)"), 'scoped history must validate project ownership before returning rows');
assert.ok(getRoute.includes("error: 'INVALID_HISTORY_FILTER'"));

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
assert.ok(workspace.includes("new URLSearchParams({ projectId, generationType: 'chat' })"));
assert.ok(workspace.includes('النماذج المفعّلة من لوحة الإدارة'));
assert.ok(!workspace.includes('const MODELS = ['), 'chat model list must no longer be hardcoded in the browser');
assert.ok(!workspace.includes(".filter((item) => item.project_id === projectId"), 'chat history filtering must happen on the server');

// Theme & Design System Expert: app chrome is semantic; user bubbles keep Brand Box red intentionally.
assert.ok(workspace.includes('bb-app-canvas'));
assert.ok(workspace.includes('bb-panel'));
assert.ok(workspace.includes('bb-input'));
assert.ok(workspace.includes('bb-button-primary'));
assert.ok(workspace.includes('bb-button-secondary'));
assert.ok(workspace.includes('bb-warning-surface'));
assert.ok(workspace.includes('bb-card'));
assert.ok(workspace.includes('bg-[var(--bb-accent)]'));
assert.ok(!workspace.includes('bg-[#050506]'));
assert.ok(!workspace.includes('bg-[#0b0d12]'));
assert.ok(!workspace.includes('bg-[#0d1016]'));
assert.ok(!workspace.includes('bg-[#14171e]'));
assert.ok(!workspace.includes('bg-[#171a21]'));
assert.ok(!workspace.includes('text-gray-'));
assert.ok(!workspace.includes('border-white/10'));

// Monitoring/Product: load failure is distinct from an empty chat and minimum-credit preflight is visible.
assert.ok(workspace.includes('const [workspaceLoadFailed, setWorkspaceLoadFailed]'));
assert.ok(workspace.includes('تعذر تحميل مشروع الشات'));
assert.ok(workspace.includes('لم يتم اعتبار المحادثة فارغة'));
assert.ok(workspace.includes("!/محادثة|chat|نص/i.test(found.type || '')"));
assert.ok(workspace.includes('const insufficientCredits ='));
assert.ok(workspace.includes('selectedModel.cost > balance'));
assert.ok(workspace.includes('href="/pricing"'));
assert.ok(workspace.includes('رصيدك الحالي أقل من الحد الأدنى المتوقع'));
assert.ok(workspace.includes('disabled={sending || !prompt.trim() || !modelId || !modelCatalogAvailable || insufficientCredits}'));
assert.ok(workspace.includes('إعادة المحاولة'));

console.log('Chat/OpenRouter launch + semantic theme guard passed.');
