import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const route = readFileSync(join(root, 'src/app/api/v1/generations/route.ts'), 'utf8');
const engine = readFileSync(join(root, 'src/lib/generations/generation-engine.ts'), 'utf8');
const client = readFileSync(join(root, 'src/lib/ai/openrouter-client.ts'), 'utf8');
const workspace = readFileSync(join(root, 'src/components/ImageStudioWorkspace.jsx'), 'utf8');
const migration = readFileSync(join(root, 'supabase/migrations/20260902010000_image_model_catalog_launch_seed.sql'), 'utf8');

const postRoute = route.slice(route.indexOf('export async function POST'));
const imageCatalogCheck = postRoute.indexOf(".eq('generation_type', 'image')");
const generationExecution = postRoute.indexOf('GenerationEngine.executeGeneration');
assert.ok(imageCatalogCheck >= 0, 'image POST must consult the server model catalog');
assert.ok(generationExecution > imageCatalogCheck, 'image model authorization must happen before GenerationEngine/credit deduction');
assert.ok(postRoute.includes(".eq('provider', 'openrouter')"));
assert.ok(postRoute.includes(".eq('is_enabled', true)"));
assert.ok(postRoute.includes(".eq('is_visible_to_users', true)"));
assert.ok(postRoute.includes("error: 'IMAGE_MODEL_NOT_AVAILABLE'"));
assert.ok(postRoute.includes("error: 'IMAGE_MODEL_CATALOG_UNAVAILABLE'"));
assert.ok(postRoute.includes("error: 'IMAGE_MODEL_PRICING_UNAVAILABLE'"));
assert.ok(postRoute.includes("error: 'INVALID_IMAGE_SETTINGS'"));
assert.ok(postRoute.includes('minimum_credits'));
assert.ok(postRoute.includes('{ unitCredits, chatSystemPrompt, imagePromptSuffix }'));

assert.ok(route.includes('OPENROUTER_IMAGE_ASPECT_RATIOS'));
assert.ok(route.includes('OPENROUTER_IMAGE_RESOLUTIONS'));
assert.ok(route.includes('function validImageSettings'));
assert.ok(route.includes('imageModelsAvailable'));
assert.ok(route.includes('supportedImageModels'));
assert.ok(route.includes(".eq('generation_type', 'image')"));
assert.ok(route.includes('function projectImagePromptSuffix'));
assert.ok(postRoute.includes("generationType === 'image' && body.settings?.useBrandKit === true"));
assert.ok(postRoute.includes(".from('brand_kits')"));
assert.ok(postRoute.includes(".eq('user_id', user.id)"), 'image Brand Kit must be resolved from the authenticated user on the server');

assert.ok(engine.includes("['512', '1K', '2K', '4K'].includes"), 'engine must preserve all validated image resolution tiers');
assert.ok(engine.includes("raw.startsWith('OPENROUTER_IMAGE_RATE_LIMITED')"));
assert.ok(engine.includes("raw.startsWith('OPENROUTER_IMAGE_PROVIDER_UNAVAILABLE')"));
assert.ok(engine.includes("raw.startsWith('OPENROUTER_IMAGE_TIMEOUT')"));
assert.ok(engine.includes('executionContext.imagePromptSuffix'));
assert.ok(engine.includes('prompt: providerImagePrompt'));
assert.ok(engine.includes('prompt: request.prompt,'), 'the durable generation record must keep the original user prompt');
assert.ok(engine.includes("'generation_failure_refund'"));
assert.ok(engine.includes('wasRefunded: refundRes.success'));

const imageClient = client.slice(client.indexOf('export async function createOpenRouterImageGeneration'), client.indexOf('export async function createOpenRouterChatCompletion'));
for (const code of [
  'OPENROUTER_IMAGE_RATE_LIMITED',
  'OPENROUTER_IMAGE_PROVIDER_UNAVAILABLE',
  'OPENROUTER_IMAGE_AUTH_FAILED',
  'OPENROUTER_IMAGE_REQUEST_REJECTED',
  'OPENROUTER_IMAGE_INVALID_RESPONSE',
  'OPENROUTER_IMAGE_TIMEOUT',
]) {
  assert.ok(imageClient.includes(code), `missing safe image provider code ${code}`);
}
assert.ok(!imageClient.includes('OPENROUTER_IMAGE_HTTP_'), 'image provider errors must not embed raw HTTP/provider messages');
assert.ok(!imageClient.includes('error?.message'), 'image client must not surface raw provider error messages');

assert.ok(workspace.includes('payload.imageModels'));
assert.ok(workspace.includes('payload.imageModelsAvailable'));
assert.ok(workspace.includes("new URLSearchParams({ projectId, generationType: 'image' })"));
assert.ok(workspace.includes('حسب كتالوج المنصة'));
assert.ok(workspace.includes('!selectedModel || !imageModelsAvailable'));
assert.ok(!workspace.includes('const IMAGE_MODELS = ['), 'Image Studio must not hardcode model availability or pricing in the browser');
assert.ok(!workspace.includes('asset.project_id === projectId'), 'image history scoping must happen on the server');
assert.ok(workspace.includes("{ value: '512', label: '512px' }"));

for (const modelId of [
  'openai/gpt-image-2',
  'bytedance-seed/seedream-5-0-lite',
  'google/gemini-3.1-flash-lite-image',
]) {
  assert.ok(migration.includes(`'${modelId}'`), `image launch catalog must seed ${modelId}`);
}
assert.match(migration, /'openai\/gpt-image-2'[\s\S]*?\n\s*1,\n\s*6,/);
assert.match(migration, /'bytedance-seed\/seedream-5-0-lite'[\s\S]*?\n\s*1,\n\s*4,/);
assert.match(migration, /'google\/gemini-3\.1-flash-lite-image'[\s\S]*?\n\s*1,\n\s*4,/);
assert.ok(migration.includes('ON CONFLICT (model_id) DO UPDATE SET'));
assert.ok(!migration.includes('minimum_credits = EXCLUDED.minimum_credits'), 'seed reruns must not overwrite administrator pricing decisions');
assert.ok(!migration.includes('is_enabled = EXCLUDED.is_enabled'), 'seed reruns must not overwrite administrator enable/disable decisions');

console.log('Image generation launch guard passed.');
