import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { GenerationEngine, GenerationRequest } from '@/lib/generations/generation-engine';
import { OPENROUTER_IMAGE_MODELS } from '@/lib/ai/openrouter-client';

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3 };

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

async function currentPlanId(userId: string) {
  const database = createPrivilegedSupabaseClient();
  const { data } = await database
    .from('subscriptions')
    .select('plan_id,current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.plan_id || 'free';
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const database = createPrivilegedSupabaseClient();
  const [{ data: generations, error: generationsError }, { data: assets, error: assetsError }] = await Promise.all([
    database.from('generations').select('id,project_id,generation_type,provider,model,prompt,settings,status,credits_consumed,result_url,result_content,error_message,duration_ms,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    database.from('assets').select('id,project_id,generation_id,name,file_path,mime_type,width,height,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
  ]);
  if (generationsError || assetsError) return NextResponse.json({ error: 'GENERATION_HISTORY_UNAVAILABLE' }, { status: 503 });
  const signedAssets = await Promise.all((assets || []).map(async (asset) => {
    const { data, error } = await database.storage.from('generation-assets').createSignedUrl(asset.file_path, 3600);
    return { ...asset, signed_url: error ? null : data?.signedUrl || null };
  }));
  return NextResponse.json({ generations: generations || [], assets: signedAssets });
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: GenerationRequest;
  try {
    body = await request.json() as GenerationRequest;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!['chat', 'image'].includes(body.generationType) || !body.modelId || !body.prompt?.trim() || body.prompt.trim().length > 4000) {
    return NextResponse.json({ error: 'INVALID_GENERATION_REQUEST' }, { status: 400 });
  }

  if (body.generationType === 'chat') {
    const database = createPrivilegedSupabaseClient();
    const { data: model, error: modelError } = await database
      .from('ai_model_catalog')
      .select('model_id,minimum_plan_id')
      .eq('model_id', body.modelId)
      .eq('generation_type', 'chat')
      .eq('is_enabled', true)
      .eq('is_visible_to_users', true)
      .maybeSingle();

    if (modelError || !model) {
      return NextResponse.json({ error: 'CHAT_MODEL_NOT_AVAILABLE' }, { status: 400 });
    }

    const userPlan = await currentPlanId(user.id);
    const requiredPlan = model.minimum_plan_id || 'free';
    if ((PLAN_RANK[userPlan] ?? 0) < (PLAN_RANK[requiredPlan] ?? 0)) {
      return NextResponse.json({ error: 'MODEL_PLAN_REQUIRED', requiredPlan, currentPlan: userPlan }, { status: 403 });
    }
  }

  if (body.generationType === 'image' && !OPENROUTER_IMAGE_MODELS.includes(body.modelId as typeof OPENROUTER_IMAGE_MODELS[number])) {
    return NextResponse.json({ error: 'IMAGE_MODEL_NOT_ALLOWED' }, { status: 400 });
  }

  if (body.projectId) {
    const { data: project, error: projectError } = await createPrivilegedSupabaseClient().from('projects').select('id').eq('id', body.projectId).eq('owner_id', user.id).maybeSingle();
    if (projectError || !project) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
  }

  const result = await GenerationEngine.executeGeneration(
    { userId: user.id, email: user.email || '', role: 'USER' },
    body
  );
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
