import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { projectTypeMatchesTool } from '@/lib/projects/project-scope';
import { RUNWAY_VIDEO_MODELS, validateRunwayVideoRequest } from '@/lib/ai/runway-client';
import { VideoGenerationService } from '@/lib/generations/video-generation-service';
import { emitServerError, getRequestCorrelationId } from '@/lib/observability/telemetry';

const VIDEO_BUCKET = 'generation-video-assets';

function runwayConfigured(): boolean {
  return Boolean(process.env.RUNWAYML_API_SECRET);
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

function safeVideoModel(model: Record<string, unknown>) {
  const creditsPerSecond = modelCreditsPerSecond(model.metadata);
  const minimumCredits = safeMinimumCredits(model.minimum_credits) ?? 0;
  return {
    modelId: model.model_id,
    name: model.display_name_ar || model.display_name_en || model.model_id,
    vendor: model.vendor_name || 'Runway',
    minimumCredits,
    creditsPerSecond,
    sortOrder: Number(model.sort_order || 0),
    pricingReady: creditsPerSecond !== null,
  };
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
      .select('model_id,display_name_ar,display_name_en,vendor_name,minimum_credits,sort_order,metadata')
      .eq('provider', 'runway')
      .eq('generation_type', 'video')
      .eq('is_enabled', true)
      .eq('is_visible_to_users', true)
      .order('sort_order', { ascending: true }),
    database.from('generations')
      .select('id,project_id,model,prompt,settings,status,credits_reserved,credits_consumed,error_message,created_at')
      .eq('user_id', auth.user.id)
      .eq('project_id', projectId)
      .eq('generation_type', 'video')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (modelsError) return NextResponse.json({ error: 'VIDEO_MODEL_CATALOG_UNAVAILABLE' }, { status: 503 });
  if (generationsError) return NextResponse.json({ error: 'VIDEO_HISTORY_UNAVAILABLE' }, { status: 503 });

  const supportedModels = (models || [])
    .filter((model) => RUNWAY_VIDEO_MODELS.includes(model.model_id as typeof RUNWAY_VIDEO_MODELS[number]))
    .map((model) => safeVideoModel(model as unknown as Record<string, unknown>));

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
    providerConfigured: runwayConfigured(),
    models: supportedModels,
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
  const ratio = typeof settings.ratio === 'string' ? settings.ratio : '';
  const duration = Number(settings.duration);
  const quality = typeof settings.quality === 'string' ? settings.quality : 'standard';

  if (!projectId || !modelId || !prompt || prompt.length > 1000 || !requestId) {
    return NextResponse.json({ error: 'INVALID_VIDEO_REQUEST' }, { status: 400 });
  }
  if (quality !== 'standard') return NextResponse.json({ error: 'INVALID_VIDEO_SETTINGS' }, { status: 400 });
  try { validateRunwayVideoRequest({ model: modelId, promptText: prompt, ratio, duration }); }
  catch { return NextResponse.json({ error: 'INVALID_VIDEO_SETTINGS' }, { status: 400 }); }

  const database = createPrivilegedSupabaseClient();
  const ownership = await ownedVideoProject(database, auth.user.id, projectId);
  if (ownership.error === 'PROJECT_NOT_FOUND') return NextResponse.json({ error: ownership.error }, { status: 404 });
  if (ownership.error) return NextResponse.json({ error: ownership.error }, { status: 409 });

  const { data: model, error: modelError } = await database.from('ai_model_catalog')
    .select('model_id,minimum_credits,metadata')
    .eq('model_id', modelId)
    .eq('provider', 'runway')
    .eq('generation_type', 'video')
    .eq('is_enabled', true)
    .eq('is_visible_to_users', true)
    .maybeSingle();
  if (modelError) return NextResponse.json({ error: 'VIDEO_MODEL_CATALOG_UNAVAILABLE' }, { status: 503 });
  if (!model) return NextResponse.json({ error: 'VIDEO_MODEL_NOT_AVAILABLE' }, { status: 400 });

  const creditsPerSecond = modelCreditsPerSecond(model.metadata);
  const minimumCredits = safeMinimumCredits(model.minimum_credits);
  if (!creditsPerSecond || minimumCredits === null) {
    return NextResponse.json({ error: 'VIDEO_MODEL_PRICING_UNAVAILABLE' }, { status: 503 });
  }
  if (!runwayConfigured()) return NextResponse.json({ error: 'VIDEO_PROVIDER_NOT_CONFIGURED' }, { status: 503 });

  try {
    const result = await VideoGenerationService.start(
      { userId: auth.user.id, email: auth.user.email || '', role: auth.profile.role },
      {
        modelId,
        prompt,
        projectId,
        requestId,
        settings: { ratio, duration, quality },
      },
      { creditsPerSecond, minimumCredits }
    );
    const status = result.success ? 202 : result.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 502;
    if (!result.success && status >= 500) {
      emitServerError('Video generation start failed', new Error(result.errorCode || 'VIDEO_GENERATION_FAILED'), {
        correlationId,
        requestId,
        generationId: result.generationId,
        operation: 'video_start',
        errorCode: result.errorCode || 'VIDEO_GENERATION_FAILED',
        wasRefunded: result.wasRefunded === true,
      });
    }
    return NextResponse.json(result, { status });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'VIDEO_GENERATION_FAILED';
    if (code === 'INVALID_VIDEO_REQUEST_ID') return NextResponse.json({ error: code }, { status: 400 });
    emitServerError('Video generation start failed', error, {
      correlationId,
      requestId,
      operation: 'video_start',
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

  try {
    const result = await VideoGenerationService.refresh(
      { userId: auth.user.id, email: auth.user.email || '', role: auth.profile.role },
      generationId
    );
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'VIDEO_GENERATION_NOT_FOUND') return NextResponse.json({ error: code }, { status: 404 });
    if (code === 'RUNWAY_RATE_LIMITED' || code === 'RUNWAY_PROVIDER_UNAVAILABLE' || code === 'RUNWAY_TIMEOUT' || code === 'RUNWAY_AUTH_FAILED' || code === 'RUNWAY_API_SECRET_MISSING') {
      emitServerError('Video generation refresh failed', error, {
        correlationId,
        generationId,
        operation: 'video_refresh',
        errorCode: 'VIDEO_PROVIDER_TEMPORARILY_UNAVAILABLE',
      });
      return NextResponse.json({ error: 'VIDEO_PROVIDER_TEMPORARILY_UNAVAILABLE' }, { status: 503 });
    }
    emitServerError('Video generation refresh failed', error, {
      correlationId,
      generationId,
      operation: 'video_refresh',
      errorCode: 'VIDEO_REFRESH_FAILED',
    });
    return NextResponse.json({ error: 'VIDEO_REFRESH_FAILED' }, { status: 502 });
  }
}
