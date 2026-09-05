import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { getOpenRouterModelCapabilities, isCapabilityKnown } from '@/lib/ai/openrouter-model-capabilities';
import { isModelUserPriced } from '@/lib/ai/model-user-pricing';

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const { data: models, error } = await database
    .from('ai_model_catalog')
    .select('model_id,display_name_ar,display_name_en,vendor_name,minimum_credits,sort_order,metadata')
    .eq('provider', 'openrouter')
    .eq('generation_type', 'audio')
    .eq('is_enabled', true)
    .eq('is_visible_to_users', true)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: 'AUDIO_MODEL_CATALOG_UNAVAILABLE' }, { status: 503 });

  const pricedModels = (models || []).filter((model) => isModelUserPriced({ ...model, generation_type: 'audio' }));
  const decorated = await Promise.all(pricedModels.map(async (model) => {
    const capabilities = await getOpenRouterModelCapabilities('audio', model.model_id, {
      fallbackMetadata: model.metadata,
    });
    const known = isCapabilityKnown(capabilities);
    return {
      modelId: model.model_id,
      name: model.display_name_ar || model.display_name_en || model.model_id,
      vendor: model.vendor_name || 'OpenRouter',
      minimumCredits: Number(model.minimum_credits || 0),
      capabilitiesAvailable: known,
      capabilitySource: capabilities.source,
      voices: known ? (capabilities.audio?.voices || []) : [],
      responseFormats: known ? (capabilities.audio?.responseFormats || []) : [],
      supportsSpeed: known && capabilities.audio?.supportsSpeed === true,
      outputModalities: capabilities.outputModalities,
    };
  }));

  return NextResponse.json({
    directGenerationEnabled: false,
    models: decorated,
  });
}
