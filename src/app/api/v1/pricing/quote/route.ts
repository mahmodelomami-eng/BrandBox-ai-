import { NextRequest, NextResponse } from 'next/server';
import { OPENROUTER_CHAT_MODELS } from '@/lib/ai/openrouter-client';
import { PricingEngine } from '@/lib/billing/pricing-engine';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
  if (body.generationType !== 'chat' || !prompt || prompt.length > 4000) {
    return NextResponse.json({ error: 'INVALID_QUOTE_REQUEST' }, { status: 400 });
  }
  if (!body.modelId || !OPENROUTER_CHAT_MODELS.includes(body.modelId as typeof OPENROUTER_CHAT_MODELS[number])) {
    return NextResponse.json({ error: 'CHAT_MODEL_NOT_ALLOWED' }, { status: 400 });
  }

  try {
    const quote = await PricingEngine.quoteChat({
      modelId: body.modelId,
      prompt,
      maxTokens: body.settings?.maxTokens,
    });

    return NextResponse.json({
      quote: {
        modelId: quote.modelId,
        displayName: 'Brand Box Smart',
        credits: quote.credits,
        estimatedInputTokens: quote.estimatedInputTokens,
        reservedOutputTokens: quote.reservedOutputTokens,
        kind: 'estimated-max',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'QUOTE_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
