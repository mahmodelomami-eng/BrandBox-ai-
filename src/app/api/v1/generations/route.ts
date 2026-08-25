import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { GenerationEngine, GenerationRequest } from '@/lib/generations/generation-engine';
import { OPENROUTER_IMAGE_MODELS } from '@/lib/ai/openrouter-client';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

function brandKitPrompt(kit: Record<string, string | null>) {
  const parts = [
    kit.brand_name ? `اسم العلامة: ${kit.brand_name}` : '',
    kit.tagline ? `الشعار اللفظي: ${kit.tagline}` : '',
    kit.description ? `وصف العلامة والنشاط: ${kit.description}` : '',
    kit.primary_color ? `اللون الرئيسي: ${kit.primary_color}` : '',
    kit.secondary_color ? `اللون الثانوي: ${kit.secondary_color}` : '',
    kit.accent_color ? `لون التمييز: ${kit.accent_color}` : '',
    kit.font_family ? `الطابع الطباعي المفضل: ${kit.font_family}` : '',
    kit.tone_of_voice ? `نبرة العلامة: ${kit.tone_of_voice}` : '',
  ].filter(Boolean);

  if (!parts.length) return '';
  return `\n\nتعليمات Brand Kit الخاصة بالمستخدم:\n${parts.join('\n')}\nحافظ على هوية العلامة ولوحة ألوانها ونبرتها في النتيجة البصرية قدر الإمكان، من دون إضافة نصوص أو شعارات غير مطلوبة صراحةً.`;
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
  if (body.generationType === 'image' && !OPENROUTER_IMAGE_MODELS.includes(body.modelId as typeof OPENROUTER_IMAGE_MODELS[number])) {
    return NextResponse.json({ error: 'IMAGE_MODEL_NOT_ALLOWED' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  if (body.projectId) {
    const { data: project, error: projectError } = await database.from('projects').select('id').eq('id', body.projectId).eq('owner_id', user.id).maybeSingle();
    if (projectError || !project) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
  }

  let effectiveBody = body;
  if (body.generationType === 'image' && body.settings?.useBrandKit === true) {
    const { data: kit, error: kitError } = await database
      .from('brand_kits')
      .select('brand_name,tagline,description,primary_color,secondary_color,accent_color,font_family,tone_of_voice')
      .eq('user_id', user.id)
      .maybeSingle();

    if (kitError) return NextResponse.json({ error: 'BRAND_KIT_UNAVAILABLE' }, { status: 503 });
    const instruction = kit ? brandKitPrompt(kit) : '';
    if (instruction) {
      effectiveBody = {
        ...body,
        prompt: `${body.prompt.trim()}${instruction}`,
        settings: { ...body.settings, brandKitApplied: true },
      };
    } else {
      effectiveBody = {
        ...body,
        settings: { ...body.settings, brandKitApplied: false },
      };
    }
  }

  const result = await GenerationEngine.executeGeneration(
    { userId: user.id, email: user.email || '', role: 'USER' },
    effectiveBody
  );
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
