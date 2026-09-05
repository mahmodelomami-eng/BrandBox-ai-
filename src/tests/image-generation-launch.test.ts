import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const route = readFileSync(join(root, 'src/app/api/v1/generations/route.ts'), 'utf8');
const engine = readFileSync(join(root, 'src/lib/generations/generation-engine.ts'), 'utf8');
const client = readFileSync(join(root, 'src/lib/ai/openrouter-client.ts'), 'utf8');
const capabilityService = readFileSync(join(root, 'src/lib/ai/openrouter-model-capabilities.ts'), 'utf8');
const settingsPolicy = readFileSync(join(root, 'src/lib/ai/openrouter-settings-policy.ts'), 'utf8');
const workspace = readFileSync(join(root, 'src/components/ImageStudioWorkspace.jsx'), 'utf8');
const verifiedMigration = readFileSync(join(root, 'supabase/migrations/20260905193000_add_verified_seedream_45_image_model.sql'), 'utf8');
const popularMigration = readFileSync(join(root, 'supabase/migrations/20260905194500_openrouter_popular_media_catalog.sql'), 'utf8');

const post = route.slice(route.indexOf('export async function POST'));
const catalogIndex = post.indexOf(".from('ai_model_catalog')");
const executionIndex = post.indexOf('GenerationEngine.executeGeneration');
assert.ok(catalogIndex >= 0 && executionIndex > catalogIndex, 'image catalog/capability validation must precede credit/provider execution');
for (const snippet of [
  ".eq('provider', 'openrouter')",
  ".eq('generation_type', generationType)",
  ".eq('is_enabled', true)",
  ".eq('is_visible_to_users', true)",
  "'IMAGE_MODEL_NOT_AVAILABLE'",
  "'IMAGE_MODEL_CATALOG_UNAVAILABLE'",
  "'IMAGE_MODEL_CAPABILITIES_UNAVAILABLE'",
  "'IMAGE_MODEL_PRICING_UNAVAILABLE'",
  'getOpenRouterModelCapabilities(generationType, body.modelId',
  'applyImageCapabilityPolicy(capabilities',
  "generationType === 'image' && normalizedSettings.useBrandKit === true",
  ".from('brand_kits')",
  ".eq('user_id', user.id)",
]) assert.ok(post.includes(snippet), `missing image server guard: ${snippet}`);

const get = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'));
assert.ok(get.includes("decorateModel('image'"), 'image GET must decorate catalog models with selected-model capabilities');
assert.ok(get.includes('imageModelsAvailable'), 'image GET must expose model catalog availability');
for (const snippet of ['supported_resolutions', 'supported_aspect_ratios', 'max_count']) {
  assert.ok(route.includes(snippet), `shared image decorator must expose selected-model capability data: ${snippet}`);
}
assert.ok(!get.includes('OPENROUTER_IMAGE_MODELS.includes'), 'visible catalog models must not be hidden by a static browser/server allowlist');

assert.ok(engine.includes("const imageResolution = typeof request.settings?.resolution === 'string'"));
assert.ok(!engine.includes("['512', '1K', '2K', '4K'].includes"), 'engine must not impose one global resolution list');
assert.ok(engine.includes('executionContext.imagePromptSuffix'));
assert.ok(engine.includes("'generation_failure_refund'"));
assert.ok(engine.includes('wasRefunded: refundRes.success'));

for (const snippet of [
  'mediaCatalogCache',
  "const endpoint = tool === 'image' ? 'images/models' : 'videos/models'",
  '`${OPENROUTER_API_BASE}/${endpoint}`',
  'resolutions: enumValues(supported.resolution)',
  'aspectRatios: enumValues(supported.aspect_ratio)',
  'countRange: rangeValue(supported.n)',
]) assert.ok(capabilityService.includes(snippet), `capability service missing ${snippet}`);
assert.ok(settingsPolicy.includes('applyImageCapabilityPolicy'));
assert.ok(settingsPolicy.includes('const image = capabilities.image'));
assert.ok(settingsPolicy.includes('image.resolutions'));
assert.ok(settingsPolicy.includes('image.aspectRatios'));

const imageClient = client.slice(client.indexOf('export async function createOpenRouterImageGeneration'), client.indexOf('export async function createOpenRouterChatCompletion'));
assert.ok(imageClient.includes('...(resolution ? { resolution } : {})'), 'resolution must be omitted when the selected model exposes none');
assert.ok(!imageClient.includes('OPENROUTER_IMAGE_MODELS.includes'), 'provider client must not duplicate the dynamic model catalog');
for (const code of [
  'OPENROUTER_IMAGE_RATE_LIMITED', 'OPENROUTER_IMAGE_PROVIDER_UNAVAILABLE',
  'OPENROUTER_IMAGE_AUTH_FAILED', 'OPENROUTER_IMAGE_REQUEST_REJECTED',
  'OPENROUTER_IMAGE_INVALID_RESPONSE', 'OPENROUTER_IMAGE_TIMEOUT',
]) assert.ok(client.includes(code), `missing safe image provider code ${code}`);
assert.ok(!imageClient.includes('error?.message'));

for (const snippet of [
  'payload.imageModels', 'payload.imageModelsAvailable',
  "new URLSearchParams({ projectId, generationType: 'image' })",
  'supportedResolutions', 'supportedAspectRatios', 'capabilitiesAvailable',
  'availableResolutions', 'availableAspects', 'maxCount',
]) assert.ok(workspace.includes(snippet), `Image Studio missing adaptive behavior ${snippet}`);
assert.ok(!workspace.includes('const IMAGE_MODELS = ['));
assert.ok(!workspace.includes('asset.project_id === projectId'));

assert.ok(verifiedMigration.includes("'bytedance-seed/seedream-4.5'"));
assert.ok(verifiedMigration.includes("'runtime_verified', TRUE"));
assert.ok(!verifiedMigration.includes('is_enabled = EXCLUDED.is_enabled'));

const popularModels = [
  'google/gemini-3.1-flash-image',
  'google/gemini-3.1-flash-lite-image',
  'google/gemini-2.5-flash-image',
  'openai/gpt-image-2',
  'google/gemini-3-pro-image',
  'openai/gpt-5.4-image-2',
  'black-forest-labs/flux.2-pro',
  'bytedance-seed/seedream-4.5',
  'bytedance-seed/seedream-5-0-lite',
  'bytedance-seed/seedream-5-0-pro',
  'x-ai/grok-imagine-image-quality',
];
for (const modelId of popularModels) assert.ok(popularMigration.includes(`'${modelId}'`), `curated image catalog missing ${modelId}`);

const liteStart = popularMigration.indexOf("'bytedance-seed/seedream-5-0-lite'");
const proStart = popularMigration.indexOf("'bytedance-seed/seedream-5-0-pro'", liteStart + 1);
assert.ok(liteStart >= 0 && proStart > liteStart);
const liteRow = popularMigration.slice(liteStart, proStart);
assert.ok(liteRow.includes('"supported_resolutions":["2K","4K"]'), 'Seedream 5 Lite fallback must be 2K/4K');
assert.ok(!liteRow.includes('"1K"'), 'Seedream 5 Lite must never advertise unsupported 1K');
assert.ok(popularMigration.includes('FALSE, FALSE, sort_order'), 'new paid media rows must be disabled/hidden by default in production');
assert.ok(!popularMigration.includes('is_enabled = EXCLUDED.is_enabled'), 'migration reruns must preserve administrator activation decisions');

console.log('Image generation adaptive capability + catalog guard passed.');
