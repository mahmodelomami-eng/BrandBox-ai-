import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

const GENERATION_TYPES = new Set(['chat', 'image', 'video', 'audio']);

export async function GET(request: NextRequest) {
  const generationType = request.nextUrl.searchParams.get('generationType');
  if (generationType && !GENERATION_TYPES.has(generationType)) {
    return NextResponse.json({ error: 'INVALID_GENERATION_TYPE' }, { status: 400 });
  }

  let query = createPrivilegedSupabaseClient()
    .from('ai_model_catalog')
    .select('model_id,vendor_name,generation_type,tool_category,display_name_ar,display_name_en,public_description_ar,minimum_plan_id,is_featured,sort_order,is_free,daily_free_user_limit,supports_vision,free_tier_note')
    .eq('is_enabled', true)
    .eq('is_visible_to_users', true)
    .order('sort_order', { ascending: true });

  if (generationType) query = query.eq('generation_type', generationType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'AI_MODELS_UNAVAILABLE' }, { status: 503 });

  return NextResponse.json({
    models: (data || []).map((model) => ({
      id: model.model_id,
      name: model.display_name_ar || model.display_name_en || model.model_id,
      vendor: model.vendor_name || null,
      type: model.generation_type,
      category: model.tool_category,
      description: model.public_description_ar || null,
      minimumPlan: model.minimum_plan_id || 'free',
      featured: Boolean(model.is_featured),
      free: Boolean(model.is_free),
      dailyFreeLimit: model.daily_free_user_limit == null ? null : Number(model.daily_free_user_limit),
      supportsVision: Boolean(model.supports_vision),
      freeTierNote: model.free_tier_note || null,
    })),
  });
}
