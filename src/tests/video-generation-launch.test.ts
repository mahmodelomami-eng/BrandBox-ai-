import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const runwayClient = readFileSync(join(root, 'src/lib/ai/runway-client.ts'), 'utf8');
const openRouterClient = readFileSync(join(root, 'src/lib/ai/openrouter-video-client.ts'), 'utf8');
const runwayService = readFileSync(join(root, 'src/lib/generations/video-generation-service.ts'), 'utf8');
const openRouterService = readFileSync(join(root, 'src/lib/generations/openrouter-video-generation-service.ts'), 'utf8');
const route = readFileSync(join(root, 'src/app/api/v1/video-generations/route.ts'), 'utf8');
const workspace = readFileSync(join(root, 'src/components/VideoProjectWorkspace.jsx'), 'utf8');
const page = readFileSync(join(root, 'src/app/projects/video/workspace/page.jsx'), 'utf8');
const adminRoute = readFileSync(join(root, 'src/app/api/v1/admin/ai-integrations/route.ts'), 'utf8');
const adminWorkspace = readFileSync(join(root, 'src/components/AdminAIIntegrationsPanel.jsx'), 'utf8');
const runwayMigration = readFileSync(join(root, 'supabase/migrations/20260902023000_runway_video_catalog_launch_seed.sql'), 'utf8');
const runwayPricingMigration = readFileSync(join(root, 'supabase/migrations/20260902135442_price_runway_gen45_video.sql'), 'utf8');
const openRouterMigration = readFileSync(join(root, 'supabase/migrations/20260905170000_openrouter_seedance_video_launch_seed.sql'), 'utf8');

// Runway remains a supported provider and keeps its existing security contract.
assert.ok(runwayClient.includes("RUNWAY_VIDEO_MODELS = ['gen4.5']"));
assert.ok(runwayClient.includes('/v1/text_to_video'));
assert.ok(runwayClient.includes('/v1/tasks/'));
assert.ok(runwayClient.includes('process.env.RUNWAYML_API_SECRET'));
assert.ok(!runwayClient.includes('error?.message'));

// OpenRouter video uses the verified async /videos lifecycle and one launch model.
assert.ok(openRouterClient.includes("OPENROUTER_VIDEO_MODELS = ['bytedance/seedance-2.0-mini']"));
assert.ok(openRouterClient.includes("OPENROUTER_VIDEO_RESOLUTIONS = ['480p']"));
assert.ok(openRouterClient.includes('OPENROUTER_VIDEO_MIN_DURATION = 4'));
assert.ok(openRouterClient.includes("const OPENROUTER_VIDEO_BASE = 'https://openrouter.ai/api/v1/videos'"));
assert.ok(openRouterClient.includes("generate_audio: input.generateAudio"));
assert.ok(openRouterClient.includes("case 'pending': return 'queued'"));
assert.ok(openRouterClient.includes("case 'in_progress': return 'processing'"));
assert.ok(openRouterClient.includes("case 'completed': return 'succeeded'"));
assert.ok(openRouterClient.includes('/content?index=0'));
assert.ok(openRouterClient.includes('process.env.OPENROUTER_API_KEY'));
assert.ok(!openRouterClient.includes('error?.message'), 'OpenRouter video client must not expose provider internals');

// Route resolves server catalog + provider before any paid generation begins.
const post = route.slice(route.indexOf('export async function POST'), route.indexOf('export async function PATCH'));
const catalogIndex = post.indexOf(".from('ai_model_catalog')");
const providerStartIndex = Math.min(
  ...['OpenRouterVideoGenerationService.start', 'VideoGenerationService.start']
    .map((value) => post.indexOf(value))
    .filter((value) => value >= 0),
);
assert.ok(catalogIndex >= 0 && providerStartIndex > catalogIndex, 'catalog checks must precede provider/credit execution');
assert.ok(route.includes(".in('provider', ['runway', 'openrouter'])"));
assert.ok(route.includes("projectTypeMatchesTool(project.type, 'video')"));
assert.ok(route.includes('OPENROUTER_VIDEO_MODELS'));
assert.ok(route.includes('RUNWAY_VIDEO_MODELS'));
assert.ok(route.includes('validateOpenRouterVideoRequest'));
assert.ok(route.includes('validateRunwayVideoRequest'));
assert.ok(route.includes("provider === 'openrouter'"));
assert.ok(route.includes('OpenRouterVideoGenerationService.start'));
assert.ok(route.includes('OpenRouterVideoGenerationService.refresh'));
assert.ok(route.includes('VideoGenerationService.start'));
assert.ok(route.includes('VideoGenerationService.refresh'));
assert.ok(route.includes("Boolean(process.env.OPENROUTER_API_KEY)"));
assert.ok(route.includes("Boolean(process.env.RUNWAYML_API_SECRET)"));
assert.ok(post.includes('modelCreditsPerSecond(model.metadata)'));
assert.ok(post.includes('safeMinimumCredits(model.minimum_credits)'));
assert.ok(post.includes("resolution: '480p'"));
assert.ok(post.includes('generateAudio: false'));
assert.ok(route.includes('minimumDuration'));
assert.ok(route.includes('maximumDuration'));
assert.ok(route.includes('configured: providerConfigured(provider)'));
assert.ok(!route.includes('CreditEngine.calculateRequiredCredits'), 'video pricing must remain server catalog-authoritative');

// Both lifecycle services reserve/refund credits and persist only Brand Box storage paths.
for (const service of [runwayService, openRouterService]) {
  assert.ok(service.includes("status: 'queued'"));
  assert.ok(service.includes("status: 'processing'"));
  assert.ok(service.includes("status: 'completed'"));
  assert.ok(service.includes("status: 'failed'"));
  assert.ok(service.includes("`video_refund_${generationId}`"));
  assert.ok(service.includes("'generation_failure_refund'"));
  assert.ok(service.includes('Math.max(minimumCredits, creditsPerSecond * duration)'));
  assert.ok(service.includes("const VIDEO_BUCKET = 'generation-video-assets'"));
  assert.ok(service.includes("contentType: 'video/mp4'"));
  assert.ok(service.includes('result_url: storagePath'));
  assert.ok(service.includes(".eq('user_id', actor.userId)"));
  assert.ok(service.includes(".eq('generation_type', 'video')"));
}
assert.ok(runwayService.includes('downloadRunwayVideo(task.outputUrls[0])'));
assert.ok(runwayService.includes("redirect: 'error'"));
assert.ok(runwayService.includes('isIP(hostname) !== 0'));
assert.ok(openRouterService.includes('downloadOpenRouterVideoContent(task.taskId)'));
assert.ok(openRouterService.includes("provider: 'openrouter'"));
assert.ok(openRouterService.includes('MAX_VIDEO_BYTES'));

// Video UX is model-specific, project-scoped, asynchronous and semantic-theme safe.
assert.ok(page.includes('VideoProjectWorkspace'));
assert.ok(!page.includes('MediaProjectWorkspace'));
assert.ok(workspace.includes("fetch('/api/v1/video-generations'"));
assert.ok(workspace.includes("method: 'PATCH'"));
assert.ok(workspace.includes('6000 + Math.floor(Math.random() * 1200)'));
assert.ok(workspace.includes('<video controls'));
assert.ok(workspace.includes('إعادة المحاولة'));
assert.ok(workspace.includes('providerConfigured'));
assert.ok(workspace.includes('selectedProviderConfigured'));
assert.ok(workspace.includes('const availableDurations = useMemo'));
assert.ok(workspace.includes('selectedModel?.minimumDuration'));
assert.ok(workspace.includes('selectedModel?.maximumDuration'));
assert.ok(workspace.includes('availableDurations.map'));
assert.ok(workspace.includes("selectedModel?.quality || '—'"));
assert.ok(workspace.includes('Math.max(Number(selectedModel.minimumCredits || 0), selectedModel.creditsPerSecond * duration)'));
assert.ok(workspace.includes('creditsPerSecond'));
assert.ok(workspace.includes('bb-app-canvas'));
assert.ok(workspace.includes('bb-panel'));
assert.ok(workspace.includes('bb-input'));
assert.ok(workspace.includes('bb-button-primary'));
assert.ok(workspace.includes('bb-button-secondary'));
assert.ok(workspace.includes('bb-warning-surface'));
assert.ok(workspace.includes('bg-black object-contain'));
assert.ok(!workspace.includes('text-gray-'));
assert.ok(workspace.includes('const [workspaceLoadFailed, setWorkspaceLoadFailed]'));
assert.ok(workspace.includes('تعذر تحميل مساحة الفيديو'));
assert.ok(workspace.includes('const insufficientCredits ='));
assert.ok(workspace.includes('priceEstimate > creditBalance'));
assert.ok(workspace.includes('href="/pricing"'));

// Admin keeps explicit provider-secret visibility and cannot activate video without secret + pricing.
assert.ok(adminRoute.includes('function hasRunwaySecret'));
assert.ok(adminRoute.includes('function hasOpenRouterSecret'));
assert.ok(adminRoute.includes('runwayConfigured: hasRunwaySecret()'));
assert.ok(adminRoute.includes("existingModel.provider === 'runway' && !hasRunwaySecret()"));
assert.ok(adminRoute.includes("existingModel.provider === 'openrouter' && !hasOpenRouterSecret()"));
assert.ok(adminRoute.includes("error: 'OPENROUTER_SECRET_REQUIRED'"));
assert.ok(adminRoute.includes("error: 'VIDEO_PRICING_REQUIRED'"));
assert.ok(adminRoute.includes("['runway', 'openrouter'].includes(currentModel.data.provider)"));
assert.ok(adminWorkspace.includes('Runway: {secretPolicy.runwayConfigured'));

// Storage + existing Runway launch gates remain intact.
assert.ok(runwayMigration.includes("'generation-video-assets'"));
assert.match(runwayMigration, /'generation-video-assets',[\s\S]*?FALSE,[\s\S]*?157286400/);
assert.ok(runwayMigration.includes("ARRAY['video/mp4']"));
assert.ok(runwayMigration.includes("'gen4.5'"));
assert.ok(runwayMigration.includes("'runway'"));
assert.ok(runwayPricingMigration.includes('minimum_credits = 50'));
assert.ok(runwayPricingMigration.includes("'brandbox_credits_per_second', 25"));
assert.ok(!runwayPricingMigration.includes('is_enabled = TRUE'));
assert.ok(!runwayPricingMigration.includes('is_visible_to_users = TRUE'));

// OpenRouter video is catalogued with tested capabilities but does not auto-activate production.
assert.ok(openRouterMigration.includes("'bytedance/seedance-2.0-mini'"));
assert.ok(openRouterMigration.includes("'openrouter'"));
assert.ok(openRouterMigration.includes("'brandbox_credits_per_second', 5"));
assert.ok(openRouterMigration.includes("'supported_resolutions', jsonb_build_array('480p')"));
assert.ok(openRouterMigration.includes("'minimum_duration_seconds', 4"));
assert.ok(openRouterMigration.includes("'runtime_verified_on', '2026-09-05'"));
assert.match(openRouterMigration, /\n\s*20,\n\s*FALSE,\n\s*FALSE,/);
assert.ok(!openRouterMigration.includes('is_enabled = EXCLUDED.is_enabled'));
assert.ok(!openRouterMigration.includes('is_visible_to_users = EXCLUDED.is_visible_to_users'));
assert.ok(!openRouterMigration.includes('minimum_credits = EXCLUDED.minimum_credits'));

console.log('Video generation dual-provider launch + semantic theme guard passed.');
