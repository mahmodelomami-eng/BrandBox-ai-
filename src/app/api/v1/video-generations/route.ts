import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { projectTypeMatchesTool } from '@/lib/projects/project-scope';
import { RUNWAY_VIDEO_MODELS, validateRunwayVideoRequest } from '@/lib/ai/runway-client';
import { getOpenRouterModelCapabilities, isCapabilityKnown } from '@/lib/ai/openrouter-model-capabilities';
import { applyVideoCapabilityPolicy } from '@/lib/ai/openrouter-settings-policy';
import {
  hasResolutionIndependentVideoPricing,
  minimumVideoCreditsPerSecond,
  pricedVideoAudioModes,
  pricedVideoResolutions,
  publicVideoPricingOptions,
  resolveVideoPricing,
} from '@/lib/ai/video-pricing';
import { VideoGenerationService } from '@/lib/generations/video-generation-service';
import { OpenRouterVideoGenerationService } from '@/lib/generations/openrouter-video-generation-service';
import { emitServerError, getRequestCorrelationId } from '@/lib/observability/telemetry';

const VIDEO_BUCKET = 'generation-video-assets';
type VideoProvider = 'runway' | 'openrouter';

function runwayConfigured(): boolean {
  return Boolean(process.env.RUNWAYML_API_SECRET);
}

function openRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function providerConfigured(provider: string): boolean {
  if (provider === 'runway') return runwayConfigured();
  if (provider === 'openrouter') return openRouterConfigured();
  return false;
}

function modelCreditsPerSecond(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = Number((metadata as Record<string, unknown>).brandbox_credits_per_second);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

function safeMinimumCredits(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function safeModelPresentation(metadata: unknown, pricingReady: boolean) {
  const record = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  const configuredBadge = typeof record.brandbox_badge === 'string' && record.brandbox_badge.trim()
    ? record.brandbox_badge.trim().slice(0, 30)
    : 'متاح';
  return {
    featured: record.brandbox_featured === true,
    badge: pricingReady ? configuredBadge : 'غير مسعّر',
  };
}

function safeRunwayModel(model: Record<string, unknown>) {
  const creditsPerSecond = modelCreditsPerSecond(model.metadata);
  const minimumCredits = safeMinimumCredits(model.minimum_credits) ?? 0;
  const pricingReady = creditsPerSecond !== null;
  const presentation = safeModelPresentation(model.metadata, pricingReady);
  return {
    modelId: model.model_id,
    provider: 'runway',
    name: model.display_name_ar || model.display_name_en || model.model_id,
    vendor: model.vendor_name || 'Runway',
    minimumCredits,
    creditsPerSecond,
    minimumCreditsPerSecond: creditsPerSecond,
    pricingOptions: creditsPerSecond ? [{ resolution: '720p', audioMode: 'off', creditsPerSecond }] : [],
    sortOrder: Number(model.sort_order || 0),
    pricingReady,
    featured: presentation.featured,
    badge: presentation.badge,
    configured: runwayConfigured(),
    capabilitiesAvailable: true,
    supportedDurations: Array.from({ length: 9 }, (_, index) => index + 2),
    minimumDuration: 2,
    maximumDuration: 10,
    supportedRatios: ['1280:720', '720:1280'],
    supportedResolutions: ['720p'],
    resolutionRequired: true,
    supportsAudio: false,
    quality: '720p',
  };
}

async function safeOpenRouterModel(model: Record<string, unknown>) {
  const modelId = String(model.model_id || '');
  const minimumCredits = safeMinimumCredits(model.minimum_credits) ?? 0;
  const capabilities = await getOpenRouterModelCapabilities('video', modelId, {
    fallbackMetadata: model.metadata,
  });
  const known = isCapabilityKnown(capabilities);
  const video = capabilities.video;
  const durations = known ? (video?.durations || []) : [];
  const resolutions = known ? (video?.resolutions || []) : [];
  const ratios = known ? (video?.aspectRatios || []) : [];
  const pricingOptions = publicVideoPricingOptions(model.metadata);
  const pricingConfigured = pricingOptions.length > 0;
  const resolutionIndependentPricing = pricingConfigured && hasResolutionIndependentVideoPricing(model.metadata);
  const pricedResolutions = pricingConfigured ? pricedVideoResolutions(model.metadata) : [];
  const pricedAudioModes = pricingConfigured ? pricedVideoAudioModes(model.metadata) : [];
  const selectableResolutions = pricingConfigured
    ? resolutionIndependentPricing
      ? resolutions
      : resolutions.filter((resolution) => pricedResolutions.includes(resolution))
    : resolutions;
  const minimumCreditsPerSecond = minimumVideoCreditsPerSecond(model.metadata);
  const flatRate = pricingOptions.length > 0
    && pricingOptions.every((option) => option.creditsPerSecond === pricingOptions[0].creditsPerSecond)
    ? pricingOptions[0].creditsPerSecond
    : null;
  const pricingReady = minimumCreditsPerSecond !== null
    && (resolutionIndependentPricing || selectableResolutions.length > 0);
  const presentation = safeModelPresentation(model.metadata, pricingReady);
  return {
    modelId,
    provider: 'openrouter',
    name: model.display_name_ar || model.display_name_en || model.model_id,
    vendor: model.vendor_name || 'OpenRouter',
    minimumCredits,
    creditsPerSecond: flatRate,
    minimumCreditsPerSecond,
    pricingOptions,
    sortOrder: Number(model.sort_order || 0),
    pricingReady,
    featured: presentation.featured,
    badge: presentation.badge,
    configured: openRouterConfigured(),
    capabilitiesAvailable: known,
    capabilitySource: capabilities.source,
    supportedDurations: durations,
    minimumDuration: durations.length ? Math.min(...durations) : null,
    maximumDuration: durations.length ? Math.max(...durations) : null,
    supportedRatios: ratios,
    supportedResolutions: selectableResolutions,
    resolutionRequired: selectableResolutions.length > 0,
    supportsAudio: video?.supportsAudio === true
      && (!pricingConfigured || pricedAudioModes.includes('on')),
    supportsSeed: video?.supportsSeed === true,
    frameImages: video?.frameImages || [],
    quality: selectableResolutions[0] || null,
  };
}

function openRouterRatio(value: string): string {
  if (value === '1280:720') return '16:9';
  if (value === '720:1280') return '9:16';
  return value;
}

function supportedVideoModel(provider: string, modelId: string): boolean {
  if (provider === 'runway') return RUNWAY_VIDEO_MODELS.includes(modelId as typeof RUNWAY_VIDEO_MODELS[number]);
  if (provider === 'openrouter') return /^[^/]+\/.+/.test(modelId);
  return false;
}

async function ownedVideoProject(database: ReturnType<typeof createPrivilegedSupabaseClient>, userId: string, projectId: string) {
  const { data: project, error } = await database.from('projects')
    .select('id,type,name')
    .eq('id', projectId)
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !project) return { project: null, error: 'PROJECT_NOT_FOUND' as const };
  if (!projectTypeMatchesTool(project.type, 'video')) return { project: null, error: 'PROJECT_TOOL_MISMATCH' as const };
  return { project, error: null };
}

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const projectId = request.nextUrl.searchParams.get('projectId')?.trim() || '';
  if (!projectId) return NextResponse.json({ error: 'PROJECT_ID_REQUIRED' }, { status: 400 });

  const database = createPrivilegedSupabaseClient();
  const ownership = await ownedVideoProject(database, auth.user.id, projectId);
  if (ownership.error === 'PROJECT_NOT_FOUND') return NextResponse.json({ error: ownership.error }, { status: 404 });
  if (ownership.error) return NextResponse.json({ error: ownership.error }, { status: 409 });

  const [{ data: models, error: modelsError }, { data: generations, error: generationsError }] = await Promise.all([
    database.from('ai_model_catalog')
      .select('model_id,provider,display_name_ar,display_name_en,vendor_name,minimum_credits,sort_order,metadata')
      .in('provider', ['runway', 'openrouter'])
      .eq('generation_type', 'video')
      .eq('is_enabled', true)
      .eq('is_visible_to_users', true)
      .order('sort_order', { ascending: true }),
    database.from('generations')
      .select('id,project_id,provider,model,prompt,settings,status,credits_reserved,credits_consumed,error_message,created_at')
      .eq('user_id', auth.user.id)
      .eq('project_id', projectId)
      .eq('generation_type', 'video')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (modelsError) return NextResponse.json({ error: 'VIDEO_MODEL_CATALOG_UNAVAILABLE' }, { status: 503 });
  if (generationsError) return NextResponse.json({ error: 'VIDEO_HISTORY_UNAVAILABLE' }, { status: 503 });

  const supportedModels = await Promise.all((models || [])
    .filter((model) => supportedVideoModel(String(model.provider || ''), String(model.model_id || '')))
    .map(async (model) => String(model.provider || '') === 'openrouter'
      ? safeOpenRouterModel(model as unknown as Record<string, unknown>)
      : safeRunwayModel(model as unknown as Record<string, unknown>)));
  const userVisibleModels = supportedModels.filter((model) => model.pricingReady === true);

  const rows = await Promise.all((generations || []).map(async (generation) => {
    let resultUrl: string | null = null;
    if (generation.status === 'completed') {
      const { data: asset } = await database.from('assets')
        .select('file_path')
        .eq('generation_id', generation.id)
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (asset?.file_path) {
        const { data: signed } = await database.storage.from(VIDEO_BUCKET).createSignedUrl(asset.file_path, 3600);
        resultUrl = signed?.signedUrl || null;
      }
    }
    return { ...generation, resultUrl };
  }));

  return NextResponse.json({
    project: ownership.project,
    providerConfigured: userVisibleModels.some((model) => model.configured && model.capabilitiesAvailable),
    models: userVisibleModels,
    generations: rows,
  });
}

export async function POST(request: NextRequest) {
  const correlationId = getRequestCorrelationId(request.headers);
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  const settings = body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)
    ? body.settings as Record<string, unknown>
    : {};
  const ratio = typeof settings.ratio === 'string'
    ? settings.ratio
    : typeof settings.aspectRatio === 'string' ? settings.aspectRatio : '';
  const duration = Number(settings.duration);
  const quality = typeof settings.quality === 'string' ? settings.quality : 'standard';

  if (!projectId || !modelId || !prompt || prompt.length > 1000 || !requestId) {
    return NextResponse.json({ error: 'INVALID_VIDEO_REQUEST' }, { status: 400 });
  }
  if (quality !== 'standard') return NextResponse.json({ error: 'INVALID_VIDEO_SETTINGS' }, { status: 400 });

  const database = createPrivilegedSupabaseClient();
  const ownership = await ownedVideoProject(database, auth.user.id, projectId);
  if (ownership.error === 'PROJECT_NOT_FOUND') return NextResponse.json({ error: ownership.error }, { status: 404 });
  if (ownership.error) return NextResponse.json({ error: ownership.error }, { status: 409 });

  const { data: model, error: modelError } = await database.from('ai_model_catalog')
    .select('model_id,provider,minimum_credits,metadata')
    .eq('model_id', modelId)
    .in('provider', ['runway', 'openrouter'])
    .eq('generation_type', 'video')
    .eq('is_enabled', true)
    .eq('is_visible_to_users', true)
    .maybeSingle();
  if (modelError) return NextResponse.json({ error: 'VIDEO_MODEL_CATALOG_UNAVAILABLE' }, { status: 503 });
  if (!model) return NextResponse.json({ error: 'VIDEO_MODEL_NOT_AVAILABLE' }, { status: 400 });

  const provider = String(model.provider || '') as VideoProvider;
  if (!supportedVideoModel(provider, modelId)) return NextResponse.json({ error: 'VIDEO_MODEL_NOT_AVAILABLE' }, { status: 400 });

  let normalizedSettings: Record<string, unknown> = { ratio, duration, quality };
  try {
    if (provider === 'runway') {
      validateRunwayVideoRequest({ model: modelId, promptText: prompt, ratio, duration });
    } else if (provider === 'openrouter') {
      const capabilities = await getOpenRouterModelCapabilities('video', modelId, {
        fallbackMetadata: model.metadata,
      });
      if (!isCapabilityKnown(capabilities)) {
        return NextResponse.json({ error: 'VIDEO_MODEL_CAPABILITIES_UNAVAILABLE' }, { status: 503 });
      }
      const policy = applyVideoCapabilityPolicy(capabilities, {
        duration,
        resolution: settings.resolution,
        aspectRatio: openRouterRatio(ratio),
        generateAudio: settings.generateAudio,
        seed: settings.seed,
      });
      const normalizedResolution = typeof policy.settings.resolution === 'string' && policy.settings.resolution.trim()
        ? policy.settings.resolution.trim()
        : undefined;
      normalizedSettings = {
        ratio: String(policy.settings.aspectRatio || ''),
        duration: Number(policy.settings.duration),
        quality,
        ...(normalizedResolution ? { resolution: normalizedResolution } : {}),
        generateAudio: policy.settings.generateAudio === true,
        ...(policy.settings.seed !== undefined ? { seed: policy.settings.seed } : {}),
      };
    } else {
      return NextResponse.json({ error: 'VIDEO_MODEL_NOT_AVAILABLE' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'INVALID_VIDEO_SETTINGS' }, { status: 400 });
  }

  const minimumCredits = safeMinimumCredits(model.minimum_credits);
  if (minimumCredits === null) {
    return NextResponse.json({ error: 'VIDEO_MODEL_PRICING_UNAVAILABLE' }, { status: 503 });
  }

  const openRouterPricing = provider === 'openrouter'
    ? resolveVideoPricing(model.metadata, normalizedSettings)
    : null;
  const creditsPerSecond = provider === 'openrouter'
    ? openRouterPricing?.creditsPerSecond || null
    : modelCreditsPerSecond(model.metadata);
  if (!creditsPerSecond) {
    return NextResponse.json({ error: 'VIDEO_MODEL_PRICING_UNAVAILABLE' }, { status: 503 });
  }
  if (!providerConfigured(provider)) return NextResponse.json({ error: 'VIDEO_PROVIDER_NOT_CONFIGURED' }, { status: 503 });

  try {
    const actor = { userId: auth.user.id, email: auth.user.email || '', role: auth.profile.role };
    const generationRequest = {
      modelId,
      prompt,
      projectId,
      requestId,
      settings: normalizedSettings as { ratio: string; duration: number; quality?: string },
    };
    const result = provider === 'openrouter'
      ? await OpenRouterVideoGenerationService.start(actor, generationRequest, { creditsPerSecond, minimumCredits })
      : await VideoGenerationService.start(actor, generationRequest, { creditsPerSecond, minimumCredits });
    const status = result.success ? 202 : result.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 502;
    if (!result.success && status >= 500) {
      emitServerError('Video generation start failed', new Error(result.errorCode || 'VIDEO_GENERATION_FAILED'), {
        correlationId,
        requestId,
        generationId: result.generationId,
        operation: 'video_start',
        provider,
        errorCode: result.errorCode || 'VIDEO_GENERATION_FAILED',
        wasRefunded: result.wasRefunded === true,
      });
    }
    return NextResponse.json({ ...result, normalizedSettings }, { status });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'VIDEO_GENERATION_FAILED';
    if (code === 'INVALID_VIDEO_REQUEST_ID') return NextResponse.json({ error: code }, { status: 400 });
    emitServerError('Video generation start failed', error, {
      correlationId,
      requestId,
      operation: 'video_start',
      provider,
      errorCode: 'VIDEO_GENERATION_FAILED',
    });
    return NextResponse.json({ error: 'VIDEO_GENERATION_FAILED' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  const correlationId = getRequestCorrelationId(request.headers);
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const generationId = typeof body.generationId === 'string' ? body.generationId.trim() : '';
  if (!generationId || body.action !== 'refresh') return NextResponse.json({ error: 'INVALID_VIDEO_REFRESH' }, { status: 400 });

  const database = createPrivilegedSupabaseClient();
  const { data: generation } = await database.from('generations')
    .select('provider')
    .eq('id', generationId)
    .eq('user_id', auth.user.id)
    .eq('generation_type', 'video')
    .maybeSingle();
  if (!generation) return NextResponse.json({ error: 'VIDEO_GENERATION_NOT_FOUND' }, { status: 404 });
  const provider = String(generation.provider || '') as VideoProvider;

  try {
    const actor = { userId: auth.user.id, email: auth.user.email || '', role: auth.profile.role };
    const result = provider === 'openrouter'
      ? await OpenRouterVideoGenerationService.refresh(actor, generationId)
      : provider === 'runway'
        ? await VideoGenerationService.refresh(actor, generationId)
        : null;
    if (!result) return NextResponse.json({ error: 'VIDEO_PROVIDER_NOT_SUPPORTED' }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'VIDEO_GENERATION_NOT_FOUND') return NextResponse.json({ error: code }, { status: 404 });
    const transientProviderError = [
      'RUNWAY_RATE_LIMITED', 'RUNWAY_PROVIDER_UNAVAILABLE', 'RUNWAY_TIMEOUT', 'RUNWAY_AUTH_FAILED', 'RUNWAY_API_SECRET_MISSING',
      'OPENROUTER_VIDEO_RATE_LIMITED', 'OPENROUTER_VIDEO_PROVIDER_UNAVAILABLE', 'OPENROUTER_VIDEO_TIMEOUT', 'OPENROUTER_VIDEO_AUTH_FAILED', 'OPENROUTER_API_KEY_MISSING',
    ].includes(code);
    if (transientProviderError) {
      emitServerError('Video generation refresh failed', error, {
        correlationId,
        generationId,
        operation: 'video_refresh',
        provider,
        errorCode: 'VIDEO_PROVIDER_TEMPORARILY_UNAVAILABLE',
      });
      return NextResponse.json({ error: 'VIDEO_PROVIDER_TEMPORARILY_UNAVAILABLE' }, { status: 503 });
    }
    emitServerError('Video generation refresh failed', error, {
      correlationId,
      generationId,
      operation: 'video_refresh',
      provider,
      errorCode: 'VIDEO_REFRESH_FAILED',
    });
    return NextResponse.json({ error: 'VIDEO_REFRESH_FAILED' }, { status: 502 });
  }
}
