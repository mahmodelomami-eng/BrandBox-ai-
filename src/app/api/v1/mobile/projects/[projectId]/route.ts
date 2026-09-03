import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

function validProjectId(value: string) {
  return value.length >= 3 && value.length <= 160 && /^[A-Za-z0-9_-]+$/.test(value);
}

function bounded(value: unknown, max: number) {
  return typeof value === 'string' ? value.slice(0, max) : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { projectId: rawProjectId } = await context.params;
  const projectId = rawProjectId.trim();
  if (!validProjectId(projectId)) {
    return NextResponse.json({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data: project, error: projectError } = await database.from('projects')
    .select('id,name,type,description,industry,target_audience,language,tone,thumbnail_url,created_at,updated_at')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (projectError) return NextResponse.json({ error: 'PROJECT_WORKSPACE_UNAVAILABLE' }, { status: 503 });
  if (!project) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });

  const [brandKitResult, generationsResult, assetsResult, socialPostsResult] = await Promise.all([
    database.from('brand_kits')
      .select('brand_name,tagline,description,primary_color,secondary_color,accent_color,font_family,tone_of_voice,updated_at')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
    database.from('generations')
      .select('id,generation_type,model,prompt,status,result_url,result_content,credits_consumed,created_at', { count: 'exact' })
      .eq('user_id', auth.user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(8),
    database.from('assets')
      .select('id,name,mime_type,width,height,created_at', { count: 'exact' })
      .eq('user_id', auth.user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(8),
    database.from('social_posts')
      .select('id,content,target_providers,status,scheduled_at,published_at,created_at', { count: 'exact' })
      .eq('user_id', auth.user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  if (brandKitResult.error || generationsResult.error || assetsResult.error || socialPostsResult.error) {
    return NextResponse.json({ error: 'PROJECT_WORKSPACE_UNAVAILABLE' }, { status: 503 });
  }

  const brandKit = brandKitResult.data;

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      type: project.type,
      description: project.description || null,
      industry: project.industry || null,
      targetAudience: project.target_audience || null,
      language: project.language,
      tone: project.tone,
      thumbnailUrl: project.thumbnail_url || null,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    brandKit: brandKit ? {
      scope: 'account',
      brandName: brandKit.brand_name,
      tagline: brandKit.tagline,
      description: bounded(brandKit.description, 1200),
      primaryColor: brandKit.primary_color,
      secondaryColor: brandKit.secondary_color,
      accentColor: brandKit.accent_color,
      fontFamily: brandKit.font_family,
      toneOfVoice: brandKit.tone_of_voice,
      updatedAt: brandKit.updated_at,
    } : null,
    stats: {
      generations: generationsResult.count || 0,
      assets: assetsResult.count || 0,
      socialPosts: socialPostsResult.count || 0,
    },
    recentGenerations: (generationsResult.data || []).map((item) => ({
      id: item.id,
      type: item.generation_type,
      model: item.model,
      prompt: bounded(item.prompt, 500),
      status: item.status,
      resultUrl: item.result_url || null,
      resultContent: bounded(item.result_content, 800),
      creditsConsumed: Number(item.credits_consumed || 0),
      createdAt: item.created_at,
    })),
    recentAssets: (assetsResult.data || []).map((item) => ({
      id: item.id,
      name: item.name,
      mimeType: item.mime_type,
      width: item.width || null,
      height: item.height || null,
      createdAt: item.created_at,
    })),
    recentSocialPosts: (socialPostsResult.data || []).map((item) => ({
      id: item.id,
      content: bounded(item.content, 800),
      targetProviders: Array.isArray(item.target_providers) ? item.target_providers : [],
      status: item.status,
      scheduledAt: item.scheduled_at || null,
      publishedAt: item.published_at || null,
      createdAt: item.created_at,
    })),
  });
}
