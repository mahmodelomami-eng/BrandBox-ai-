import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

const previewOpportunities = [
  { id: 'seasonal-moment', label: 'لحظة موسمية أو مناسبة قريبة', category: 'Seasonal', description: 'راقب المناسبات المحلية والعالمية ذات الصلة بالنشاط بدل النشر لمجرد المناسبة.', campaignAngle: 'اربط المناسبة بمشكلة حقيقية لدى الجمهور ثم حوّلها إلى سلسلة محتوى.' },
  { id: 'format-shift', label: 'صيغة محتوى صاعدة', category: 'Format', description: 'اختبر تغيرات الصيغة مثل الفيديو القصير، الشرح البصري، والمحتوى القابل للحفظ.', campaignAngle: 'أعد تدوير فكرة واحدة في ثلاث صيغ وقارن الحفظ والمشاركة.' },
  { id: 'conversation-window', label: 'نافذة نقاش مرتبطة بالقطاع', category: 'Conversation', description: 'التقط الأسئلة المتكررة والمواضيع التي تتقاطع مع تخصص المشروع.', campaignAngle: 'حوّل السؤال إلى رأي خبير + دليل سريع + دعوة واضحة للتفاعل.' },
  { id: 'launch-window', label: 'فرصة إطلاق أو عرض', category: 'Growth', description: 'استخدم تغيرًا في المنتج أو العرض كسبب حقيقي للحملة بدل الخصم العشوائي.', campaignAngle: 'ابنِ تشويقًا ثم كشفًا ثم إثباتًا اجتماعيًا ضمن مشروع واحد.' },
];

const TREND_FIELDS = 'id,slug,title_ar,subtitle_ar,description_ar,category,tool,generation_mode,readiness,lifecycle,prompt_template,negative_prompt,required_inputs,tags,model_hint,aspect_ratio,preview_kind,preview_url,preview_gradient,trend_score,use_count,is_featured,published_at,expires_at';

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (authorization) {
    const auth = await authenticateActiveUser(request);
    if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const region = (request.nextUrl.searchParams.get('region') || 'LY').slice(0, 8).toUpperCase();
  const language = (request.nextUrl.searchParams.get('language') || 'ar').slice(0, 8).toLowerCase();
  const now = new Date().toISOString();
  const database = createPrivilegedSupabaseClient();
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

  // This is a curated Brand Box library plus opportunity framework, not a live external social feed.
  // Keep isLive=false until a reviewed provider/source adapter is actually enabled.
  return NextResponse.json({
    mode: 'preview',
    isLive: false,
    region,
    language,
    generatedAt: now,
    source: 'brandbox-opportunity-framework+curated-trend-lab',
    opportunities: previewOpportunities,
    trends: data || [],
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { trendId?: string; projectId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const trendId = typeof body.trendId === 'string' ? body.trendId.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!trendId || !projectId) return NextResponse.json({ error: 'TREND_AND_PROJECT_REQUIRED' }, { status: 400 });

  const database = createPrivilegedSupabaseClient();
  const [{ data: project }, { data: trend }] = await Promise.all([
    database.from('projects').select('id,user_id').eq('id', projectId).eq('user_id', auth.profile.id).maybeSingle(),
    database.from('trend_templates').select('id,is_published,lifecycle,expires_at').eq('id', trendId).eq('is_published', true).neq('lifecycle', 'archived').maybeSingle(),
  ]);

  if (!project) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
  if (!trend || (trend.expires_at && new Date(trend.expires_at).getTime() <= Date.now())) {
    return NextResponse.json({ error: 'TREND_NOT_AVAILABLE' }, { status: 404 });
  }

  const { error } = await database.from('trend_usage_events').insert({
    trend_id: trendId,
    user_id: auth.profile.id,
    project_id: projectId,
    event_type: 'use',
    metadata: { source: 'trend-lab', route: '/templates/trends' },
  });
  if (error) return NextResponse.json({ error: 'TREND_USAGE_RECORD_FAILED' }, { status: 500 });
  return NextResponse.json({ success: true });
}
