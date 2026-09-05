import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const runwayClient = readFileSync(join(root, 'src/lib/ai/runway-client.ts'), 'utf8');
const openRouterClient = readFileSync(join(root, 'src/lib/ai/openrouter-video-client.ts'), 'utf8');
const capabilityService = readFileSync(join(root, 'src/lib/ai/openrouter-model-capabilities.ts'), 'utf8');
const settingsPolicy = readFileSync(join(root, 'src/lib/ai/openrouter-settings-policy.ts'), 'utf8');
const runwayService = readFileSync(join(root, 'src/lib/generations/video-generation-service.ts'), 'utf8');
const openRouterService = readFileSync(join(root, 'src/lib/generations/openrouter-video-generation-service.ts'), 'utf8');
const route = readFileSync(join(root, 'src/app/api/v1/video-generations/route.ts'), 'utf8');
const workspace = readFileSync(join(root, 'src/components/VideoProjectWorkspace.jsx'), 'utf8');
const page = readFileSync(join(root, 'src/app/projects/video/workspace/page.jsx'), 'utf8');
const adminRoute = readFileSync(join(root, 'src/app/api/v1/admin/ai-integrations/route.ts'), 'utf8');
const runwayMigration = readFileSync(join(root, 'supabase/migrations/20260902023000_runway_video_catalog_launch_seed.sql'), 'utf8');
const runwayPricingMigration = readFileSync(join(root, 'supabase/migrations/20260902135442_price_runway_gen45_video.sql'), 'utf8');
const seedanceMigration = readFileSync(join(root, 'supabase/migrations/20260905170000_openrouter_seedance_video_launch_seed.sql'), 'utf8');
const popularMigration = readFileSync(join(root, 'supabase/migrations/20260905194500_openrouter_popular_media_catalog.sql'), 'utf8');
const extendedMigration = readFileSync(join(root, 'supabase/migrations/20260905200500_openrouter_extended_video_catalog.sql'), 'utf8');
const pricingScopeMigration = readFileSync(join(root, 'supabase/migrations/20260905202500_seedance_video_pricing_scope.sql'), 'utf8');

assert.ok(runwayClient.includes("RUNWAY_VIDEO_MODELS = ['gen4.5']"));
assert.ok(runwayClient.includes('/v1/text_to_video'));
assert.ok(runwayClient.includes('/v1/tasks/'));
assert.ok(runwayClient.includes('process.env.RUNWAYML_API_SECRET'));
assert.ok(!runwayClient.includes('error?.message'));

assert.ok(openRouterClient.includes("const OPENROUTER_VIDEO_BASE = 'https://openrouter.ai/api/v1/videos'"));
assert.ok(openRouterClient.includes("if (!/^[^/\\s]+\\/.{1,200}$/.test(model))"));
assert.ok(openRouterClient.includes('duration < 1 || duration > 120'));
assert.ok(openRouterClient.includes('...(input.resolution ? { resolution: input.resolution } : {})'));
assert.ok(openRouterClient.includes('...(input.generateAudio !== undefined ? { generate_audio: input.generateAudio } : {})'));
assert.ok(openRouterClient.includes('...(input.seed !== undefined ? { seed: input.seed } : {})'));
assert.ok(openRouterClient.includes("case 'pending': return 'queued'"));
assert.ok(openRouterClient.includes("case 'in_progress': return 'processing'"));
assert.ok(openRouterClient.includes("case 'completed': return 'succeeded'"));
assert.ok(openRouterClient.includes('/content?index=0'));
assert.ok(openRouterClient.includes('process.env.OPENROUTER_API_KEY'));
assert.ok(!openRouterClient.includes('error?.message'));

for (const snippet of [
  'mediaCatalogCache',
  "const endpoint = tool === 'image' ? 'images/models' : 'videos/models'",
  '`${OPENROUTER_API_BASE}/${endpoint}`',
  'durations: numberArray(row.supported_durations)',
  'resolutions: stringArray(row.supported_resolutions)',
  'aspectRatios: stringArray(row.supported_aspect_ratios)',
  'frameImages: stringArray(row.supported_frame_images)',
  'row.generate_audio === true',
  "stringArray(row.allowed_passthrough_parameters)",
]) assert.ok(capabilityService.includes(snippet), `video capability service missing ${snippet}`);
assert.ok(settingsPolicy.includes('applyVideoCapabilityPolicy'));
assert.ok(settingsPolicy.includes('const video = capabilities.video'));
assert.ok(settingsPolicy.includes('video.durations'));
assert.ok(settingsPolicy.includes('video.resolutions'));
assert.ok(settingsPolicy.includes('video.aspectRatios'));

const post = route.slice(route.indexOf('export async function POST'), route.indexOf('export async function PATCH'));
const catalogIndex = post.indexOf(".from('ai_model_catalog')");
const capabilityIndex = post.indexOf("getOpenRouterModelCapabilities('video', modelId");
const pricingScopeIndex = post.indexOf('openRouterPricingScopeMatches(model.metadata, normalizedSettings)');
const providerStartIndex = post.indexOf('OpenRouterVideoGenerationService.start');
assert.ok(catalogIndex >= 0 && capabilityIndex > catalogIndex, 'catalog checks must precede capability resolution');
assert.ok(pricingScopeIndex > capabilityIndex && providerStartIndex > pricingScopeIndex, 'verified settings pricing scope must be checked before OpenRouter credit/provider execution');
for (const snippet of [
  ".in('provider', ['runway', 'openrouter'])",
  ".eq('generation_type', 'video')",
  ".eq('is_enabled', true)",
  ".eq('is_visible_to_users', true)",
  "projectTypeMatchesTool(project.type, 'video')",
  "return /^[^/]+\\/.+/.test(modelId)",
  "'VIDEO_MODEL_CAPABILITIES_UNAVAILABLE'",
  "'VIDEO_MODEL_PRICING_UNAVAILABLE'",
  'applyVideoCapabilityPolicy(capabilities',
  'modelCreditsPerSecond(model.metadata)',
  'modelPricedResolutions',
  'modelPricedAudioModes',
  'openRouterPricingScopeMatches',
  'safeMinimumCredits(model.minimum_credits)',
  'OpenRouterVideoGenerationService.start',
  'OpenRouterVideoGenerationService.refresh',
  'VideoGenerationService.start',
  'VideoGenerationService.refresh',
]) assert.ok(route.includes(snippet), `video route missing ${snippet}`);
assert.ok(!route.includes("OPENROUTER_VIDEO_MODELS.includes"));
assert.ok(!post.includes("resolution: '480p'"));
assert.ok(!post.includes('generateAudio: false'));
assert.ok(!route.includes('CreditEngine.calculateRequiredCredits'));

for (const snippet of [
  'async function safeOpenRouterModel',
  'capabilitiesAvailable: known',
  'supportedDurations: durations',
  'supportedRatios: ratios',
  'supportedResolutions: selectableResolutions',
  "pricedResolutions.includes(resolution)",
  "pricedAudioModes.includes('on')",
  'pricingReady',
]) assert.ok(route.includes(snippet), `video model decoration/pricing scope missing ${snippet}`);

for (const service of [runwayService, openRouterService]) {
  for (const snippet of [
    "status: 'queued'", "status: 'processing'", "status: 'completed'", "status: 'failed'",
    '`video_refund_${generationId}`', "'generation_failure_refund'",
    'Math.max(minimumCredits, creditsPerSecond * duration)',
    "const VIDEO_BUCKET = 'generation-video-assets'", "contentType: 'video/mp4'",
    'result_url: storagePath', ".eq('user_id', actor.userId)", ".eq('generation_type', 'video')",
  ]) assert.ok(service.includes(snippet), `video lifecycle service missing ${snippet}`);
}
assert.ok(openRouterService.includes('const resolution = typeof providerSettings.resolution'));
assert.ok(openRouterService.includes('const generateAudio = providerSettings.generateAudio === true'));
assert.ok(openRouterService.includes('const seed = providerSettings.seed'));
assert.ok(openRouterService.includes('downloadOpenRouterVideoContent(task.taskId)'));
assert.ok(openRouterService.includes('MAX_VIDEO_BYTES'));

assert.ok(page.includes('VideoProjectWorkspace'));
assert.ok(!page.includes('MediaProjectWorkspace'));
for (const snippet of [
  'selectedModel?.supportedDurations',
  'selectedModel?.supportedRatios',
  'selectedModel?.supportedResolutions',
  'selectedModel?.capabilitiesAvailable',
  'const effectiveRatio = ratioAlias(ratio, availableRatios)',
  'const effectiveDuration = availableDurations.includes(duration)',
  'const effectiveResolution = availableResolutions.includes(resolution)',
  'const effectiveGenerateAudio = Boolean(selectedModel?.supportsAudio && generateAudio)',
  'function handleModelChange(event)',
  'ratio: effectiveRatio',
  'duration: effectiveDuration',
  'resolution: effectiveResolution',
  'generateAudio: effectiveGenerateAudio',
  'selectedModel?.creditsPerSecond',
  'priceEstimate > creditBalance',
  "fetch('/api/v1/video-generations'",
  "method: 'PATCH'",
  '<video controls',
]) assert.ok(workspace.includes(snippet), `Video Studio missing derived adaptive behavior ${snippet}`);
assert.ok(!workspace.includes('const DURATIONS ='));
assert.ok(!workspace.includes('const RATIOS ='));
assert.ok(!workspace.includes('useEffect(() => {\n    if (!selectedModel)'), 'selected-model normalization must not synchronously rewrite state in an effect');

for (const snippet of [
  'function hasRunwaySecret', 'function hasOpenRouterSecret',
  'runwayConfigured: hasRunwaySecret()',
  "existingModel.provider === 'openrouter' && !hasOpenRouterSecret()",
  "error: 'OPENROUTER_SECRET_REQUIRED'", "error: 'VIDEO_PRICING_REQUIRED'",
]) assert.ok(adminRoute.includes(snippet), `admin activation guard missing ${snippet}`);

assert.ok(runwayMigration.includes("'generation-video-assets'"));
assert.ok(runwayMigration.includes("ARRAY['video/mp4']"));
assert.ok(runwayPricingMigration.includes('minimum_credits = 50'));
assert.ok(runwayPricingMigration.includes("'brandbox_credits_per_second', 25"));
assert.ok(!runwayPricingMigration.includes('is_enabled = TRUE'));
assert.ok(seedanceMigration.includes("'bytedance/seedance-2.0-mini'"));
assert.ok(seedanceMigration.includes("'brandbox_credits_per_second', 5"));
assert.ok(seedanceMigration.includes("'runtime_verified_on', '2026-09-05'"));
assert.ok(!seedanceMigration.includes('is_enabled = EXCLUDED.is_enabled'));

assert.ok(pricingScopeMigration.includes("'brandbox_priced_resolutions', jsonb_build_array('480p')"));
assert.ok(pricingScopeMigration.includes("'brandbox_priced_audio_modes', jsonb_build_array('off')"));
assert.ok(pricingScopeMigration.includes("'bytedance/seedance-2.0-mini'"));
assert.ok(!pricingScopeMigration.includes('is_enabled ='));
assert.ok(!pricingScopeMigration.includes('is_visible_to_users ='));

const popularVideoModels = [
  'bytedance/seedance-2.0-mini', 'bytedance/seedance-2.5', 'google/veo-3.1-lite',
  'bytedance/seedance-2.0-fast', 'bytedance/seedance-2.0', 'x-ai/grok-imagine-video',
  'minimax/hailuo-3', 'google/veo-3.1-fast', 'alibaba/wan-3.0', 'x-ai/grok-imagine-video-1.5',
];
const extendedVideoModels = [
  'kwaivgi/kling-v3.0-pro', 'kwaivgi/kling-v3.0-std', 'kwaivgi/kling-video-o1',
  'google/veo-3.1', 'alibaba/wan-2.7', 'alibaba/wan-2.6',
  'bytedance/seedance-1-5-pro', 'minimax/hailuo-2.3', 'minimax/hailuo-3-max',
  'alibaba/happyhorse-1.1', 'alibaba/wan-3.0-prime',
];
for (const id of popularVideoModels) assert.ok(popularMigration.includes(`'${id}'`), `popular video catalog missing ${id}`);
for (const id of extendedVideoModels) assert.ok(extendedMigration.includes(`'${id}'`), `extended video catalog missing ${id}`);
assert.ok(!popularMigration.includes('openai/sora'));
assert.ok(!extendedMigration.includes("'openai/sora"));
assert.ok(popularMigration.includes('FALSE, FALSE, sort_order'));
assert.ok(extendedMigration.includes('FALSE, FALSE, sort_order'));
assert.ok(!popularMigration.includes('is_enabled = EXCLUDED.is_enabled'));
assert.ok(!extendedMigration.includes('is_enabled = EXCLUDED.is_enabled'));

console.log('Video generation adaptive multi-model + pricing-scope guard passed.');
