import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';

type Actor = { userId: string; email: string; role: AdminRole };

async function actorFromRequest(request: NextRequest): Promise<Actor | null> {
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
  if (!isKnownRole(role)) return null;
  if (!checkPermission(role, 'providers.read') && !checkPermission(role, 'models.read')) return null;

  return { userId: data.user.id, email: profile.email || data.user.email || '', role };
}

function hasOpenRouterSecret() {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY);
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const [modelsResult, billingResult] = await Promise.all([
    database.from('ai_model_catalog').select('*').order('sort_order', { ascending: true }),
    database.from('billing_settings').select('*').eq('id', 'default').maybeSingle(),
  ]);

  if (modelsResult.error) return NextResponse.json({ error: modelsResult.error.message }, { status: 500 });

  const models = modelsResult.data || [];
  const providers = Array.from(new Set(models.map((model) => model.provider || 'unknown'))).map((provider) => ({
    id: provider,
    modelCount: models.filter((model) => model.provider === provider).length,
    enabledModelCount: models.filter((model) => model.provider === provider && model.is_enabled).length,
    configured: provider === 'openrouter' ? hasOpenRouterSecret() : true,
  }));

  return NextResponse.json({
    providers,
    models,
    billing: billingResult.data || null,
    capabilities: {
      canManageProviders: checkPermission(actor.role, 'providers.manage'),
      canManageModels: checkPermission(actor.role, 'models.manage'),
      canManagePricing: checkPermission(actor.role, 'models.pricing_manage'),
      canManageSecrets: checkPermission(actor.role, 'providers.secrets_manage'),
    },
    secretPolicy: {
      openrouterConfigured: hasOpenRouterSecret(),
      exposedToBrowser: false,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== 'string') return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });

  const database = createPrivilegedSupabaseClient();
  const action = body.action;

  if (action === 'update_model') {
    if (!checkPermission(actor.role, 'models.manage')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    const modelId = String(body.modelId || '');
    if (!modelId) return NextResponse.json({ error: 'MODEL_ID_REQUIRED' }, { status: 400 });

    const allowed: Record<string, unknown> = {};
    if (typeof body.isEnabled === 'boolean') allowed.is_enabled = body.isEnabled;
    if (typeof body.isVisibleToUsers === 'boolean') allowed.is_visible_to_users = body.isVisibleToUsers;
    if (typeof body.isFeatured === 'boolean') allowed.is_featured = body.isFeatured;
    if (typeof body.fallbackModelId === 'string' || body.fallbackModelId === null) allowed.fallback_model_id = body.fallbackModelId || null;
    if (typeof body.minimumPlanId === 'string' || body.minimumPlanId === null) allowed.minimum_plan_id = body.minimumPlanId || null;
    if (typeof body.dailyFreeUserLimit === 'number') allowed.daily_free_user_limit = Math.max(1, Math.min(1000, Math.trunc(body.dailyFreeUserLimit)));
    allowed.updated_at = new Date().toISOString();

    const { error } = await database.from('ai_model_catalog').update(allowed).eq('model_id', modelId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await database.from('audit_logs').insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: 'ADMIN_UPDATED_AI_MODEL',
      resource: 'ai_model_catalog',
      resource_id: modelId,
      after_state: allowed,
      metadata: { source: 'admin-ai-integrations' },
    });

    return NextResponse.json({ success: true });
  }

  if (action === 'update_billing') {
    if (!checkPermission(actor.role, 'models.pricing_manage')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const current = await database.from('billing_settings').select('*').eq('id', 'default').maybeSingle();
    if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });

    const patch: Record<string, number | boolean | string> = { updated_at: new Date().toISOString() };
    const numericRules = [
      ['marketUsdLyd', 'market_usd_lyd', 0.01, 1000],
      ['openrouterTopupFeePct', 'openrouter_topup_fee_pct', 0, 99.9999],
      ['bankTransferFeePct', 'bank_transfer_fee_pct', 0, 99.9999],
      ['riskBufferPct', 'risk_buffer_pct', 0, 99.9999],
      ['targetGrossMarginPct', 'target_gross_margin_pct', 0, 99.9999],
      ['referenceCreditValueLyd', 'reference_credit_value_lyd', 0.0001, 1000000],
      ['minimumOperationCredits', 'minimum_operation_credits', 1, 1000000],
      ['maxBonusPct', 'max_bonus_pct', 0, 20],
      ['emergencyFxThresholdLyd', 'emergency_fx_threshold_lyd', 0.01, 1000],
      ['hardStopFxThresholdLyd', 'hard_stop_fx_threshold_lyd', 0.01, 1000],
      ['openrouterFreeGlobalDailyLimit', 'openrouter_free_global_daily_limit', 1, 1000],
      ['freeUserDailyLimit', 'free_user_daily_limit', 1, 100],
    ] as const;

    for (const [inputKey, databaseKey, min, max] of numericRules) {
      if (body[inputKey] === undefined) continue;
      const value = Number(body[inputKey]);
      if (!Number.isFinite(value) || value < min || value > max) {
        return NextResponse.json({ error: 'INVALID_BILLING_VALUE', field: inputKey }, { status: 400 });
      }
      patch[databaseKey] = databaseKey.includes('limit') || databaseKey === 'minimum_operation_credits'
        ? Math.trunc(value)
        : value;
    }

    if (typeof body.freeModelsEnabled === 'boolean') patch.free_models_enabled = body.freeModelsEnabled;
    if (Object.keys(patch).length === 1) return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });

    const { error } = await database.from('billing_settings').update(patch).eq('id', 'default');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await database.from('audit_logs').insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: 'ADMIN_UPDATED_AI_BILLING_SETTINGS',
      resource: 'billing_settings',
      resource_id: 'default',
      before_state: current.data || null,
      after_state: patch,
      metadata: { source: 'admin-ai-integrations' },
    });

    return NextResponse.json({ success: true });
  }

  if (action === 'update_pricing') {
    if (!checkPermission(actor.role, 'models.pricing_manage')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    const modelId = String(body.modelId || '');
    if (!modelId) return NextResponse.json({ error: 'MODEL_ID_REQUIRED' }, { status: 400 });

    const patch: Record<string, number | string> = { updated_at: new Date().toISOString() };
    const numericFields = [
      ['inputCostPerMillionUsd', 'input_cost_per_million_usd'],
      ['outputCostPerMillionUsd', 'output_cost_per_million_usd'],
      ['fixedProviderCostUsd', 'fixed_provider_cost_usd'],
      ['providerCostPerSecondUsd', 'provider_cost_per_second_usd'],
      ['reservationMultiplier', 'reservation_multiplier'],
      ['minimumCredits', 'minimum_credits'],
    ] as const;
    for (const [inputKey, databaseKey] of numericFields) {
      if (typeof body[inputKey] !== 'number' || !Number.isFinite(body[inputKey])) continue;
      const value = Number(body[inputKey]);
      if (databaseKey === 'reservation_multiplier') {
        if (value < 1 || value > 100) return NextResponse.json({ error: 'INVALID_RESERVATION_MULTIPLIER' }, { status: 400 });
        patch[databaseKey] = value;
      } else if (databaseKey === 'minimum_credits') {
        if (value < 0 || value > 1000000) return NextResponse.json({ error: 'INVALID_MINIMUM_CREDITS' }, { status: 400 });
        patch[databaseKey] = Math.trunc(value);
      } else {
        if (value < 0 || value > 1000000) return NextResponse.json({ error: 'INVALID_PRICING_VALUE', field: inputKey }, { status: 400 });
        patch[databaseKey] = value;
      }
    }

    const { error } = await database.from('ai_model_catalog').update(patch).eq('model_id', modelId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await database.from('audit_logs').insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: 'ADMIN_UPDATED_AI_MODEL_PRICING',
      resource: 'ai_model_catalog',
      resource_id: modelId,
      after_state: patch,
      metadata: { source: 'admin-ai-integrations' },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
}
