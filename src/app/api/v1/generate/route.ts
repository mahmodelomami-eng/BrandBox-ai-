import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GenerationEngine, GenerationRequest } from '@/lib/generations/generation-engine';
import type { AuthContext, AdminRole } from '@/lib/auth/rbac-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBearerToken(req: NextRequest): string | null {
  const value = req.headers.get('authorization');
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
}

async function resolveAuth(req: NextRequest): Promise<AuthContext> {
  const supabase = createServerSupabaseClient();
  const token = getBearerToken(req);
  if (!token) throw new Error('UNAUTHORIZED: Missing Supabase access token.');

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) throw new Error('UNAUTHORIZED: Invalid Supabase access token.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email,role,status')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) throw new Error('PROFILE_NOT_FOUND: Application profile is missing.');
  if (profile.status !== 'active') throw new Error(`ACCOUNT_${String(profile.status).toUpperCase()}: Account is not active.`);

  return {
    userId: authData.user.id,
    email: profile.email || authData.user.email || '',
    role: (profile.role || 'USER') as AdminRole,
  };
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-correlation-id') || `genreq_${Date.now()}`;

  try {
    const actor = await resolveAuth(req);
    const body = await req.json();

    const request: GenerationRequest = {
      generationType: body?.generationType,
      modelId: String(body?.modelId || ''),
      prompt: String(body?.prompt || '').trim(),
      projectId: body?.projectId ? String(body.projectId) : undefined,
      settings: body?.settings && typeof body.settings === 'object' ? body.settings : {},
    };

    if (!['chat', 'image', 'video'].includes(request.generationType)) {
      return NextResponse.json({ success: false, error: 'INVALID_GENERATION_TYPE', requestId }, { status: 400 });
    }
    if (!request.modelId || !request.prompt) {
      return NextResponse.json({ success: false, error: 'MODEL_AND_PROMPT_REQUIRED', requestId }, { status: 400 });
    }
    if (request.prompt.length > 12000) {
      return NextResponse.json({ success: false, error: 'PROMPT_TOO_LONG', requestId }, { status: 400 });
    }

    const result = await GenerationEngine.executeGeneration(actor, request);
    const status = result.success ? 200 : result.errorMessage?.startsWith('INSUFFICIENT_CREDITS') ? 402 : 502;

    return NextResponse.json({ ...result, requestId }, { status });
  } catch (error: any) {
    const message = error?.message || 'GENERATION_REQUEST_FAILED';
    const status = message.startsWith('UNAUTHORIZED') ? 401 : message.startsWith('ACCOUNT_') ? 403 : 500;
    return NextResponse.json({ success: false, error: message, requestId }, { status });
  }
}
