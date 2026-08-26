import { NextRequest, NextResponse } from 'next/server';
import { PricingEngine } from '@/lib/billing/pricing-engine';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: {
    generationType?: string;
    modelId?: string;
    prompt?: string;
    settings?: { maxTokens?: number };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const prompt = String(body.prompt || '').trim();
  const modelId = String(body.modelId || '').trim();
  if (body.generationType !== 'chat' || !modelId || !prompt || prompt.length > 4000) {
    return NextResponse.json({ error: 'INVALID_QUOTE_REQUEST' }, { status: 400 });
  }

  const { data: model, error: modelError } = await createPrivilegedSupabaseClient()
    .from('ai_model_catalog')
    .select('model_id,display_name_ar,display_name_en,minimum_plan_id,is_free,daily_free_user_limit,supports_vision,free_tier_note')
    .eq('model_id', modelId)
    .eq('generation_type', 'chat')
    .eq('is_enabled', true)
    .eq('is_visible_to_users', true)
    .maybeSingle();

  if (modelError || !model) {
    return NextResponse.json({ error: 'CHAT_MODEL_NOT_AVAILABLE' }, { status: 400 });
  }

  try {
    const quote = await PricingEngine.quoteChat({
      modelId,
      prompt,
      maxTokens: body.settings?.maxTokens,
    });

    return NextResponse.json({
      quote: {
        modelId: quote.modelId,
        displayName: model.display_name_ar || model.display_name_en || model.model_id,
        requiredPlan: model.minimum_plan_id || 'free',
        credits: quote.credits,
        free: quote.isFree,
        dailyFreeLimit: model.daily_free_user_limit == null ? null : Number(model.daily_free_user_limit),
        supportsVision: Boolean(model.supports_vision),
        freeTierNote: model.free_tier_note || null,
        estimatedInputTokens: quote.estimatedInputTokens,
        reservedOutputTokens: quote.reservedOutputTokens,
        kind: quote.isFree ? 'free' : 'estimated-max',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'QUOTE_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
