import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

const ALLOWED_EVENT_TYPES = new Set(['open', 'use', 'share']);
const ALLOWED_TOOLS = new Set(['images', 'video']);
const ALLOWED_LIFECYCLES = new Set(['trending', 'evergreen']);

function publicTrend(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title_ar,
    subtitle: row.subtitle_ar,
    description: row.description_ar,
    category: row.category,
    tool: row.tool,
    generationMode: row.generation_mode,
    readiness: row.readiness,
    lifecycle: row.lifecycle,
    promptTemplate: row.prompt_template,
    negativePrompt: row.negative_prompt,
    requiredInputs: row.required_inputs,
    tags: row.tags,
    modelHint: row.model_hint,
    aspectRatio: row.aspect_ratio,
    previewKind: row.preview_kind,
    previewUrl: row.preview_url,
    previewGradient: row.preview_gradient,
    trendScore: Number(row.trend_score || 0),
    useCount: Number(row.use_count || 0),
    featured: Boolean(row.is_featured),
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
  };
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');
  const tool = request.nextUrl.searchParams.get('tool');
  const lifecycle = request.nextUrl.searchParams.get('lifecycle');
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 24);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 60) : 24;

  const database = createPrivilegedSupabaseClient();
  let query = database
    .from('trend_templates')
    .select('id,slug,title_ar,subtitle_ar,description_ar,category,tool,generation_mode,readiness,lifecycle,prompt_template,negative_prompt,required_inputs,tags,model_hint,aspect_ratio,preview_kind,preview_url,preview_gradient,trend_score,use_count,is_featured,published_at,expires_at')
    .eq('is_published', true)
    .in('lifecycle', ['trending', 'evergreen'])
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('is_featured', { ascending: false })
    .order('trend_score', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') query = query.eq('category', category);
  if (tool && ALLOWED_TOOLS.has(tool)) query = query.eq('tool', tool);
  if (lifecycle && ALLOWED_LIFECYCLES.has(lifecycle)) query = query.eq('lifecycle', lifecycle);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'TREND_CATALOG_UNAVAILABLE' }, { status: 503 });
  }

  return NextResponse.json({
    trends: (data || []).map((row) => publicTrend(row as Record<string, unknown>)),
    generatedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { trendId?: string; eventType?: string; projectId?: string | null; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.trendId || !/^[0-9a-f-]{36}$/i.test(body.trendId)) {
    return NextResponse.json({ error: 'INVALID_TREND_ID' }, { status: 400 });
  }
  const eventType = body.eventType || 'use';
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: 'INVALID_EVENT_TYPE' }, { status: 400 });
  }
  if (body.projectId && !/^[0-9a-f-]{36}$/i.test(body.projectId)) {
    return NextResponse.json({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data: trend, error: trendError } = await database
    .from('trend_templates')
    .select('id,is_published,lifecycle')
    .eq('id', body.trendId)
    .maybeSingle();

  if (trendError) return NextResponse.json({ error: 'TREND_LOOKUP_FAILED' }, { status: 503 });
  if (!trend || !trend.is_published || trend.lifecycle === 'archived') {
    return NextResponse.json({ error: 'TREND_NOT_AVAILABLE' }, { status: 404 });
  }

  if (body.projectId) {
    const { data: project } = await database
      .from('projects')
      .select('id,user_id')
      .eq('id', body.projectId)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (!project) return NextResponse.json({ error: 'PROJECT_NOT_OWNED' }, { status: 403 });
  }

  const safeMetadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? Object.fromEntries(Object.entries(body.metadata).slice(0, 12).map(([key, value]) => [String(key).slice(0, 60), typeof value === 'string' ? value.slice(0, 300) : value]))
    : {};

  const { error: usageError } = await database.from('trend_usage_events').insert({
    trend_id: body.trendId,
    user_id: auth.user.id,
    project_id: body.projectId || null,
    event_type: eventType,
    metadata: safeMetadata,
  });
  if (usageError) return NextResponse.json({ error: 'TREND_USAGE_NOT_RECORDED' }, { status: 503 });

  if (eventType === 'use') {
    const { data: current } = await database.from('trend_templates').select('use_count').eq('id', body.trendId).maybeSingle();
    if (current) {
      await database.from('trend_templates').update({ use_count: Number(current.use_count || 0) + 1 }).eq('id', body.trendId);
    }
  }

  return NextResponse.json({ success: true });
}
