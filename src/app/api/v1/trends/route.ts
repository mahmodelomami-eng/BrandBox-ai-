import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

const TREND_FIELDS = 'id,slug,title_ar,subtitle_ar,description_ar,category,tool,generation_mode,readiness,lifecycle,prompt_template,negative_prompt,required_inputs,tags,model_hint,aspect_ratio,preview_kind,preview_url,preview_gradient,trend_score,use_count,is_featured,published_at,expires_at';

export async function GET() {
  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await database
    .from('trend_templates')
    .select(TREND_FIELDS)
    .eq('is_published', true)
    .neq('lifecycle', 'archived')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('is_featured', { ascending: false })
    .order('trend_score', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'TREND_LIBRARY_UNAVAILABLE' }, { status: 503 });
  return NextResponse.json({ trends: data || [] }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { data: authData, error: authError } = await createServerSupabaseClient().auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { trendId?: string; projectId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const trendId = typeof body.trendId === 'string' ? body.trendId.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!trendId || !projectId) return NextResponse.json({ error: 'TREND_AND_PROJECT_REQUIRED' }, { status: 400 });

  const database = createPrivilegedSupabaseClient();
  const [{ data: profile }, { data: project }, { data: trend }] = await Promise.all([
    database.from('profiles').select('id,status').eq('id', authData.user.id).maybeSingle(),
    database.from('projects').select('id,user_id').eq('id', projectId).eq('user_id', authData.user.id).maybeSingle(),
    database.from('trend_templates').select('id,is_published,lifecycle').eq('id', trendId).eq('is_published', true).neq('lifecycle', 'archived').maybeSingle(),
  ]);

  if (!profile || profile.status === 'suspended') return NextResponse.json({ error: 'ACCOUNT_NOT_ACTIVE' }, { status: 403 });
  if (!project) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
  if (!trend) return NextResponse.json({ error: 'TREND_NOT_AVAILABLE' }, { status: 404 });

  const { error } = await database.from('trend_usage_events').insert({
    trend_id: trendId,
    user_id: authData.user.id,
    project_id: projectId,
    event_type: 'use',
    metadata: { source: 'trend-lab', route: '/templates/trends' },
  });
  if (error) return NextResponse.json({ error: 'TREND_USAGE_RECORD_FAILED' }, { status: 500 });
  return NextResponse.json({ success: true });
}
