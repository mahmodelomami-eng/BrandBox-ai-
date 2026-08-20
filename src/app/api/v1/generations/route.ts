import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GenerationEngine, GenerationRequest } from '@/lib/generations/generation-engine';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: GenerationRequest;
  try {
    body = await request.json() as GenerationRequest;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (body.generationType !== 'chat' || !body.modelId || !body.prompt?.trim()) {
    return NextResponse.json({ error: 'INVALID_GENERATION_REQUEST' }, { status: 400 });
  }

  const result = await GenerationEngine.executeGeneration(
    { userId: data.user.id, email: data.user.email || '', role: 'USER' },
    body
  );
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
