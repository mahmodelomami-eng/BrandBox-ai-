import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import {
  getOpenRouterModelCapabilities,
  isCapabilityKnown,
  OpenRouterCapabilityTool,
} from '@/lib/ai/openrouter-model-capabilities';

const SUPPORTED_TOOLS = new Set<OpenRouterCapabilityTool>(['chat', 'image', 'video', 'audio']);

function parseTool(value: string): OpenRouterCapabilityTool | null {
  return SUPPORTED_TOOLS.has(value as OpenRouterCapabilityTool) ? value as OpenRouterCapabilityTool : null;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const modelId = request.nextUrl.searchParams.get('modelId')?.trim() || '';
  const tool = parseTool(request.nextUrl.searchParams.get('tool')?.trim() || '');
  if (!modelId || modelId.length > 220 || !tool) {
    return NextResponse.json({ error: 'INVALID_MODEL_CAPABILITY_REQUEST' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data: model, error: modelError } = await database
    .from('ai_model_catalog')
    .select('model_id,provider,generation_type,metadata,is_enabled,is_visible_to_users')
    .eq('model_id', modelId)
    .eq('provider', 'openrouter')
    .eq('generation_type', tool)
    .eq('is_enabled', true)
    .eq('is_visible_to_users', true)
    .maybeSingle();

  if (modelError) return NextResponse.json({ error: 'MODEL_CAPABILITY_CATALOG_UNAVAILABLE' }, { status: 503 });
  if (!model) return NextResponse.json({ error: 'MODEL_NOT_AVAILABLE' }, { status: 404 });

  const capabilities = await getOpenRouterModelCapabilities(tool, modelId, {
    fallbackMetadata: model.metadata,
  });

  if (!isCapabilityKnown(capabilities)) {
    return NextResponse.json({
      error: 'MODEL_CAPABILITIES_UNAVAILABLE',
      modelId,
      tool,
      source: capabilities.source,
    }, { status: 503 });
  }

  return NextResponse.json({ capabilities });
}
