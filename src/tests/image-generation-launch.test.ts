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
const launchMigration = readFileSync(join(root, 'supabase/migrations/20260902010000_image_model_catalog_launch_seed.sql'), 'utf8');
const verifiedMigration = readFileSync(join(root, 'supabase/migrations/20260905193000_add_verified_seedream_45_image_model.sql'), 'utf8');
const popularMigration = readFileSync(join(root, 'supabase/migrations/20260905194500_openrouter_popular_media_catalog.sql'), 'utf8');

const postRoute = route.slice(route.indexOf('export async function POST'));
const imageCatalogCheck = postRoute.indexOf(".from('ai_model_catalog')");
const generationExecution = postRoute.indexOf('GenerationEngine.executeGeneration');
assert.ok(imageCatalogCheck >= 0, 'image POST must consult the server model catalog');
assert.ok(generationExecution > imageCatalogCheck, 'image model authorization must happen before GenerationEngine/credit deduction');
assert.ok(postRoute.includes(".eq('provider', 'openrouter')"));
assert.ok(postRoute.includes(".eq('generation_type', generationType)"), 'shared chat/image lookup must remain scoped to the requested generation type');
assert.ok(postRoute.includes(".eq('is_enabled', true)"));
assert.ok(postRoute.includes(".eq('is_visible_to_users', true)"));
assert.ok(postRoute.includes("'IMAGE_MODEL_NOT_AVAILABLE'"));
assert.ok(postRoute.includes("'IMAGE_MODEL_CATALOG_UNAVAILABLE'"));
assert.ok(postRoute.includes("'IMAGE_MODEL_PRICING_UNAVAILABLE'"));
assert.ok(postRoute.includes("'IMAGE_MODEL_CAPABILITIES_UNAVAILABLE'"));
assert.ok(postRoute.includes('minimum_credits'));
assert.ok(postRoute.includes("getOpenRouterModelCapabilities(generationType, body.modelId"), 'image model capabilities must resolve before credit spending');
assert.ok(postRoute.includes('applyImageCapabilityPolicy(capabilities'), 'image settings must be normalized using selected-model capabilities');
assert.ok(postRoute.includes('{ unitCredits, chatSystemPrompt, imagePromptSuffix }'));
assert.ok(postRoute.includes("generationType === 'image' && body.settings?.useBrandKit === true"));
assert.ok(postRoute.includes(".from('brand_kits')"));
assert.ok(postRoute.includes(".eq('user_id', user.id)"), 'image Brand Kit must be resolved from the authenticated user on the server');

const getRoute = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'));
assert.ok(getRoute.includes("decorateModel('image'"), 'GET must decorate visible image models with live/fallback capability data');
assert.ok(getRoute.includes('supported_resolutions'));
assert.ok(getRoute.includes('supported_aspect_ratios'));
assert.ok(getRoute.includes('max_count'));
assert.ok(getRoute.includes('imageModelsAvailable'));
assert.ok(!getRoute.includes('OPENROUTER_IMAGE_MODELS.includes'), 'GET must not hide catalog models behind a static image allowlist');

assert.ok(engine.includes("const imageResolution = typeof request.settings?.resolution === 'string'"));
assert.ok(!engine.includes("['512', '1K', '2K', '4K'].includes"), 'engine must not enforce a universal image resolution list');
assert.ok(engine.includes("raw.startsWith('OPENROUTER_IMAGE_RATE_LIMITED')"));
assert.ok(engine.includes("raw.startsWith('OPENROUTER_IMAGE_PROVIDER_UNAVAILABLE')"));
assert.ok(engine.includes("raw.startsWith('OPENROUTER_IMAGE_TIMEOUT')"));
assert.ok(engine.includes('executionContext.imagePromptSuffix'));
assert.ok(engine.includes('prompt: providerImagePrompt'));
assert.ok(engine.includes('prompt: request.prompt,'), 'the durable generation record must keep the original user prompt');
assert.ok(engine.includes("'generation_failure_refund'"));
assert.ok(engine.includes('wasRefunded: refundRes.success'));

assert.ok(capabilityService.includes("`${OPENROUTER_API_BASE}/images/models`"), 'image capability discovery must use the dedicated OpenRouter image-model catalog');
assert.ok(capabilityService.includes('mediaCatalogCache'), 'image/video model-list responses must be shared rather than fetched once per model');
assert.ok(capabilityService.includes("tool === 'image'"));
assert.ok(capabilityService.includes('resolutions: enumValues(supported.resolution)'));
assert.ok(capabilityService.includes('aspectRatios: enumValues(supported.aspect_ratio)'));
assert.ok(capabilityService.includes('countRange: rangeValue(supported.n)'));
assert.ok(settingsPolicy.includes('applyImageCapabilityPolicy'));
assert.ok(settingsPolicy.includes('capabilities.image?.resolutions'));
assert.ok(settingsPolicy.includes('capabilities.image?.aspectRatios'));

const imageClient = client.slice(client.indexOf('export async function createOpenRouterImageGeneration'), client.indexOf('export async function createOpenRouterChatCompletion'));
assert.ok(imageClient.includes('...(resolution ? { resolution } : {})'), 'models without explicit resolution support must omit the provider parameter');
assert.ok(imageClient.includes('imageHttpErrorCode(response.status)'), 'image generation must route HTTP failures through the safe error mapper');
assert.ok(!imageClient.includes('OPENROUTER_IMAGE_MODELS.includes'), 'provider client must not duplicate the dynamic catalog as a hardcoded allowlist');
for (const code of [
  'OPENROUTER_IMAGE_RATE_LIMITED',
  'OPENROUTER_IMAGE_PROVIDER_UNAVAILABLE',
  'OPENROUTER_IMAGE_AUTH_FAILED',
  'OPENROUTER_IMAGE_REQUEST_REJECTED',
  'OPENROUTER_IMAGE_INVALID_RESPONSE',
  'OPENROUTER_IMAGE_TIMEOUT',
]) {
  assert.ok(client.includes(code), `missing safe image provider code ${code}`);
}
assert.ok(!imageClient.includes('OPENROUTER_IMAGE_HTTP_'), 'image provider errors must not embed raw HTTP/provider messages');
assert.ok(!imageClient.includes('error?.message'), 'image client must not surface raw provider error messages');

assert.ok(workspace.includes('payload.imageModels'));
assert.ok(workspace.includes('payload.imageModelsAvailable'));
assert.ok(workspace.includes("new URLSearchParams({ projectId, generationType: 'image' })"));
assert.ok(workspace.includes('supportedResolutions'));
assert.ok(workspace.includes('supportedAspectRatios'));
assert.ok(workspace.includes('capabilitiesAvailable'));
assert.ok(workspace.includes('availableResolutions'));
assert.ok(workspace.includes('availableAspects'));
assert.ok(workspace.includes('maxCount'));
assert.ok(workspace.includes('حسب كتالوج المنصة'));
assert.ok(!workspace.includes('const IMAGE_MODELS = ['), 'Image Studio must not hardcode model availability or pricing in the browser');
assert.ok(!workspace.includes('asset.project_id === projectId'), 'image history scoping must happen on the server');

// Historical launch/verified migrations remain idempotent and admin-safe.
for (const modelId of [
  'openai/gpt-image-2',
  'bytedance-seed/seedream-5-0-lite',
  'google/gemini-3.1-flash-lite-image',
]) {
  assert.ok(launchMigration.includes(`'${modelId}'`), `image launch catalog must seed ${modelId}`);
}
assert.ok(verifiedMigration.includes("'bytedance-seed/seedream-4.5'"));
assert.ok(verifiedMigration.includes("'runtime_verified', TRUE"));
assert.ok(!verifiedMigration.includes('minimum_credits = EXCLUDED.minimum_credits'), 'verified seed reruns must not overwrite administrator pricing decisions');
assert.ok(!verifiedMigration.includes('is_enabled = EXCLUDED.is_enabled'), 'verified seed reruns must not overwrite administrator enable/disable decisions');

// Current curated catalog: top stable OpenRouter image models plus popular
// Seedream/Grok alternatives. Production activation is deliberately false.
for (const modelId of [
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
]) {
  assert.ok(popularMigration.includes(`'${modelId}'`), `popular image catalog must include ${modelId}`);
}
const seedreamLiteStart = popularMigration.indexOf("'bytedance-seed/seedream-5-0-lite'");
const seedreamProStart = popularMigration.indexOf("'bytedance-seed/seedream-5-0-pro'", seedreamLiteStart + 1);
assert.ok(seedreamLiteStart >= 0 && seedreamProStart > seedreamLiteStart, 'Seedream Lite catalog row must be isolated for regression validation');
const seedreamLiteCatalogRow = popularMigration.slice(seedreamLiteStart, seedreamProStart);
assert.ok(seedreamLiteCatalogRow.includes('"supported_resolutions":["2K","4K"]'), 'Seedream 5 Lite fallback must advertise 2K/4K');
assert.ok(!seedreamLiteCatalogRow.includes('"1K"'), 'Seedream 5 Lite must never regress to unsupported 1K');
assert.ok(popularMigration.includes('FALSE, FALSE, sort_order'), 'new paid media models must be disabled/hidden by default in production');
assert.ok(popularMigration.includes('ON CONFLICT (model_id) DO UPDATE SET'));
assert.ok(!popularMigration.includes('is_enabled = EXCLUDED.is_enabled'), 'catalog reruns must preserve administrator activation decisions');

console.log('Image generation launch guard passed.');
