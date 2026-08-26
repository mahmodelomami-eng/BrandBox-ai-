import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'USER';
const GENERATION_TYPES = new Set(['chat', 'image', 'video', 'audio']);
const TOOL_CATEGORIES = new Set(['chat', 'image', 'video', 'audio', 'vision', 'agent', 'general']);
const PRICING_MODES = new Set(['token', 'image', 'second', 'dynamic']);
const PLAN_IDS = new Set(['free', 'starter', 'pro', 'business']);

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const database = createPrivilegedSupabaseClient();
  const { data: profile, error: profileError } = await database
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status === 'suspended') return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(role)) return null;
  return { userId: data.user.id, email: profile.email || data.user.email || '', role };
}

function nullableNumber(value: unknown) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('INVALID_NUMERIC_VALUE');
  return parsed;
}

function bool(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function modelIdValid(value: string) {
  return /^[A-Za-z0-9._:-]+\/[A-Za-z0-9._:-]+$/.test(value);
}

async function writeAudit(actor: { userId: string; role: AdminRole }, action: string, modelId: string, afterState: unknown) {
  try {
    await createPrivilegedSupabaseClient().from('audit_logs').insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action,
      resource: 'ai_model_catalog',
      resource_id: modelId,
      after_state: afterState,
      metadata: { source: 'admin-ai-models' },
    });
  } catch {
    // Audit persistence is best-effort and must not make the admin action inconsistent.
  }
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data, error } = await createPrivilegedSupabaseClient()
    .from('ai_model_catalog')
    .select('model_id,provider,vendor_name,generation_type,tool_category,display_name_ar,display_name_en,public_description_ar,public_description_en,pricing_mode,input_cost_per_million_usd,output_cost_per_million_usd,fixed_provider_cost_usd,provider_cost_per_second_usd,reservation_multiplier,minimum_credits,minimum_plan_id,fallback_model_id,is_enabled,is_visible_to_users,is_featured,sort_order,metadata,pricing_checked_at,created_at,updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'AI_MODELS_UNAVAILABLE' }, { status: 503 });
  return NextResponse.json({ models: data || [], canManage: ['SUPER_ADMIN', 'ADMIN'].includes(actor.role) });
}

export async function POST(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN'].includes(actor.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  const modelId = String(body.modelId || '').trim();
  const generationType = String(body.generationType || '').trim();
  const toolCategory = String(body.toolCategory || generationType || 'general').trim();
  const pricingMode = String(body.pricingMode || 'dynamic').trim();
  const displayName = String(body.displayName || '').trim();
  const vendorName = String(body.vendorName || '').trim();
  const minimumPlanId = body.minimumPlanId ? String(body.minimumPlanId) : null;
  const fallbackModelId = body.fallbackModelId ? String(body.fallbackModelId).trim() : null;

  if (!modelIdValid(modelId) || !displayName || !GENERATION_TYPES.has(generationType) || !TOOL_CATEGORIES.has(toolCategory) || !PRICING_MODES.has(pricingMode)) {
    return NextResponse.json({ error: 'INVALID_AI_MODEL' }, { status: 400 });
  }
  if (minimumPlanId && !PLAN_IDS.has(minimumPlanId)) return NextResponse.json({ error: 'INVALID_MINIMUM_PLAN' }, { status: 400 });
  if (fallbackModelId && !modelIdValid(fallbackModelId)) return NextResponse.json({ error: 'INVALID_FALLBACK_MODEL' }, { status: 400 });

  try {
    const row = {
      model_id: modelId,
      provider: String(body.provider || 'openrouter').trim() || 'openrouter',
      vendor_name: vendorName || null,
      generation_type: generationType,
      tool_category: toolCategory,
      display_name_ar: displayName,
      display_name_en: String(body.displayNameEn || displayName).trim() || displayName,
      public_description_ar: String(body.descriptionAr || '').trim() || null,
      public_description_en: String(body.descriptionEn || '').trim() || null,
      pricing_mode: pricingMode,
      input_cost_per_million_usd: nullableNumber(body.inputCostPerMillionUsd),
      output_cost_per_million_usd: nullableNumber(body.outputCostPerMillionUsd),
      fixed_provider_cost_usd: nullableNumber(body.fixedProviderCostUsd),
      provider_cost_per_second_usd: nullableNumber(body.providerCostPerSecondUsd),
      reservation_multiplier: Math.max(1, Number(body.reservationMultiplier || 1.25)),
      minimum_credits: Math.max(1, Math.trunc(Number(body.minimumCredits || 1))),
      minimum_plan_id: minimumPlanId,
      fallback_model_id: fallbackModelId,
      is_enabled: bool(body.isEnabled, false),
      is_visible_to_users: bool(body.isVisibleToUsers, false),
      is_featured: bool(body.isFeatured, false),
      sort_order: Math.trunc(Number(body.sortOrder || 100)),
      metadata: { source: 'admin', show_real_model_name: true },
      pricing_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await createPrivilegedSupabaseClient().from('ai_model_catalog').insert(row).select('*').single();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'MODEL_ALREADY_EXISTS' : 'AI_MODEL_CREATE_FAILED' }, { status: error.code === '23505' ? 409 : 503 });
    await writeAudit(actor, 'ai_model.create', modelId, data);
    return NextResponse.json({ model: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI_MODEL_CREATE_FAILED' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN'].includes(actor.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const modelId = String(body.modelId || '').trim();
  if (!modelIdValid(modelId)) return NextResponse.json({ error: 'INVALID_MODEL_ID' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.isEnabled === 'boolean') patch.is_enabled = body.isEnabled;
  if (typeof body.isVisibleToUsers === 'boolean') patch.is_visible_to_users = body.isVisibleToUsers;
  if (typeof body.isFeatured === 'boolean') patch.is_featured = body.isFeatured;
  if (body.displayName != null) patch.display_name_ar = String(body.displayName).trim();
  if (body.displayNameEn != null) patch.display_name_en = String(body.displayNameEn).trim();
  if (body.vendorName != null) patch.vendor_name = String(body.vendorName).trim() || null;
  if (body.descriptionAr != null) patch.public_description_ar = String(body.descriptionAr).trim() || null;
  if (body.minimumPlanId !== undefined) {
    const plan = body.minimumPlanId ? String(body.minimumPlanId) : null;
    if (plan && !PLAN_IDS.has(plan)) return NextResponse.json({ error: 'INVALID_MINIMUM_PLAN' }, { status: 400 });
    patch.minimum_plan_id = plan;
  }
  if (body.fallbackModelId !== undefined) {
    const fallback = body.fallbackModelId ? String(body.fallbackModelId).trim() : null;
    if (fallback && !modelIdValid(fallback)) return NextResponse.json({ error: 'INVALID_FALLBACK_MODEL' }, { status: 400 });
    patch.fallback_model_id = fallback;
  }
  if (body.minimumCredits !== undefined) patch.minimum_credits = Math.max(1, Math.trunc(Number(body.minimumCredits || 1)));
  if (body.sortOrder !== undefined) patch.sort_order = Math.trunc(Number(body.sortOrder || 0));

  const { data, error } = await createPrivilegedSupabaseClient().from('ai_model_catalog').update(patch).eq('model_id', modelId).select('*').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'AI_MODEL_UPDATE_FAILED' }, { status: 503 });
  await writeAudit(actor, 'ai_model.update', modelId, data);
  return NextResponse.json({ model: data });
}
