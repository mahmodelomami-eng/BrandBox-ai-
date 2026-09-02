import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'USER';
const MUTATING_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN'];
const BRIEF_STATUSES = ['discovered','shortlisted','designing','testing','approved','rejected','published'] as const;
const SOURCES = ['internal','tiktok','instagram','facebook','youtube','pinterest','reddit','x','web'] as const;
const CATEGORIES = ['now','personal','comedy','social','commercial','products','video','occasions','arabic','evergreen'] as const;
const TOOLS = ['images','video'] as const;
const MODES = ['text_to_image','reference_image','text_to_video','image_to_video'] as const;
const READINESS = ['live','requires_reference','draft'] as const;
const LIFECYCLES = ['trending','evergreen','archived'] as const;
const ASPECTS = ['1:1','4:3','3:4','16:9','9:16'] as const;

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;
  const database = createPrivilegedSupabaseClient();
  const { data: profile, error: profileError } = await database.from('profiles').select('id,role,status').eq('id', data.user.id).maybeSingle();
  if (profileError || !profile || profile.status === 'suspended') return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!['SUPER_ADMIN','ADMIN','SUPPORT'].includes(role)) return null;
  return { userId: data.user.id, role };
}

function text(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function score(value: unknown) { return Math.max(0, Math.min(100, Math.round(Number(value || 0)))); }
function weightedScore(body: Record<string, unknown>) {
  return Number((score(body.scoreViral) * .25 + score(body.scoreShareability) * .20 + score(body.scoreAiFit) * .20 + score(body.scoreArabicFit) * .15 + score(body.scoreBrandFit) * .10 + score(body.scoreCommercialFit) * .10).toFixed(2));
}

function briefPayload(body: Record<string, unknown>) {
  const source = SOURCES.includes(body.sourcePlatform as typeof SOURCES[number]) ? body.sourcePlatform : 'internal';
  return {
    title: text(body.title, 160), concept: text(body.concept, 2000), audience: text(body.audience, 800) || null, content_angle: text(body.contentAngle, 1000) || null,
    source_platform: source, source_url: text(body.sourceUrl, 1000) || null, source_note: text(body.sourceNote, 1600) || null,
    score_viral: score(body.scoreViral), score_shareability: score(body.scoreShareability), score_ai_fit: score(body.scoreAiFit), score_arabic_fit: score(body.scoreArabicFit), score_brand_fit: score(body.scoreBrandFit), score_commercial_fit: score(body.scoreCommercialFit), trend_score: weightedScore(body),
    workflow_status: BRIEF_STATUSES.includes(body.workflowStatus as typeof BRIEF_STATUSES[number]) ? body.workflowStatus : 'discovered',
  };
}

function templatePayload(body: Record<string, unknown>) {
  const requiredInputs = Array.isArray(body.requiredInputs) ? body.requiredInputs.slice(0, 12) : [];
  const tags = Array.isArray(body.tags) ? body.tags.map((item) => text(item, 60)).filter(Boolean).slice(0, 20) : [];
  return {
    brief_id: text(body.briefId, 80) || null,
    slug: text(body.slug, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    title_ar: text(body.titleAr, 120), subtitle_ar: text(body.subtitleAr, 220), description_ar: text(body.descriptionAr, 1200),
    category: CATEGORIES.includes(body.category as typeof CATEGORIES[number]) ? body.category : 'now',
    tool: TOOLS.includes(body.tool as typeof TOOLS[number]) ? body.tool : 'images',
    generation_mode: MODES.includes(body.generationMode as typeof MODES[number]) ? body.generationMode : 'text_to_image',
    readiness: READINESS.includes(body.readiness as typeof READINESS[number]) ? body.readiness : 'draft',
    lifecycle: LIFECYCLES.includes(body.lifecycle as typeof LIFECYCLES[number]) ? body.lifecycle : 'trending',
    prompt_template: text(body.promptTemplate, 8000), negative_prompt: text(body.negativePrompt, 2000) || null, required_inputs: requiredInputs, tags,
    model_hint: text(body.modelHint, 120) || null,
    aspect_ratio: ASPECTS.includes(body.aspectRatio as typeof ASPECTS[number]) ? body.aspectRatio : '9:16',
    preview_kind: body.previewKind === 'image' || body.previewKind === 'video' ? body.previewKind : 'gradient',
    preview_url: text(body.previewUrl, 1000) || null,
    preview_gradient: text(body.previewGradient, 1000) || 'linear-gradient(145deg,#1b1d24,#0b0c10)',
    trend_score: score(body.trendScore), is_featured: Boolean(body.isFeatured), is_published: Boolean(body.isPublished),
    expires_at: body.expiresAt ? text(body.expiresAt, 64) : null,
  };
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const database = createPrivilegedSupabaseClient();
  const [{ data: briefs, error: briefError }, { data: templates, error: templateError }] = await Promise.all([
    database.from('trend_briefs').select('*').order('trend_score', { ascending: false }).order('discovered_at', { ascending: false }).limit(500),
    database.from('trend_templates').select('*').order('is_featured', { ascending: false }).order('trend_score', { ascending: false }).limit(500),
  ]);
  if (briefError || templateError) return NextResponse.json({ error: 'TREND_ADMIN_UNAVAILABLE' }, { status: 503 });
  return NextResponse.json({ briefs: briefs || [], templates: templates || [], actorRole: actor.role, canManage: MUTATING_ROLES.includes(actor.role) });
}

export async function POST(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!MUTATING_ROLES.includes(actor.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();

  if (body.kind === 'brief') {
    const payload = briefPayload(body);
    if (payload.title.length < 3 || payload.concept.length < 10) return NextResponse.json({ error: 'INVALID_BRIEF_FIELDS' }, { status: 400 });
    const { data, error } = await database.from('trend_briefs').insert({ ...payload, discovered_by: 'trend-intelligence-agent', created_by: actor.userId, updated_by: actor.userId, reviewed_at: payload.workflow_status === 'discovered' ? null : now }).select('*').single();
    if (error) return NextResponse.json({ error: 'TREND_BRIEF_CREATE_FAILED' }, { status: 400 });
    await database.from('audit_logs').insert({ actor_id: actor.userId, actor_role: actor.role, action: 'ADMIN_CREATED_TREND_BRIEF', resource: 'trend_briefs', resource_id: data.id, metadata: { score: data.trend_score, status: data.workflow_status }, created_at: now });
    return NextResponse.json({ success: true, brief: data }, { status: 201 });
  }

  const payload = templatePayload(body);
  if (payload.slug.length < 3 || payload.title_ar.length < 3 || payload.subtitle_ar.length < 3 || payload.description_ar.length < 10 || payload.prompt_template.length < 20) return NextResponse.json({ error: 'INVALID_TEMPLATE_FIELDS' }, { status: 400 });
  const { data, error } = await database.from('trend_templates').insert({ ...payload, created_by: actor.userId, updated_by: actor.userId, published_at: payload.is_published ? now : null }).select('*').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'SLUG_EXISTS' : 'TREND_TEMPLATE_CREATE_FAILED' }, { status: 400 });
  await database.from('audit_logs').insert({ actor_id: actor.userId, actor_role: actor.role, action: 'ADMIN_CREATED_TREND_TEMPLATE', resource: 'trend_templates', resource_id: data.id, metadata: { slug: data.slug, readiness: data.readiness, published: data.is_published }, created_at: now });
  return NextResponse.json({ success: true, template: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!MUTATING_ROLES.includes(actor.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const id = text(body.id, 80);
  if (!id) return NextResponse.json({ error: 'TREND_ID_REQUIRED' }, { status: 400 });
  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();

  if (body.kind === 'brief') {
    const payload = briefPayload(body);
    if (payload.title.length < 3 || payload.concept.length < 10) return NextResponse.json({ error: 'INVALID_BRIEF_FIELDS' }, { status: 400 });
    const { data, error } = await database.from('trend_briefs').update({ ...payload, updated_by: actor.userId, reviewed_at: payload.workflow_status === 'discovered' ? null : now }).eq('id', id).select('*').maybeSingle();
    if (error) return NextResponse.json({ error: 'TREND_BRIEF_UPDATE_FAILED' }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'TREND_BRIEF_NOT_FOUND' }, { status: 404 });
    await database.from('audit_logs').insert({ actor_id: actor.userId, actor_role: actor.role, action: 'ADMIN_UPDATED_TREND_BRIEF', resource: 'trend_briefs', resource_id: id, metadata: { score: data.trend_score, status: data.workflow_status }, created_at: now });
    return NextResponse.json({ success: true, brief: data });
  }

  const payload = templatePayload(body);
  if (payload.slug.length < 3 || payload.title_ar.length < 3 || payload.subtitle_ar.length < 3 || payload.description_ar.length < 10 || payload.prompt_template.length < 20) return NextResponse.json({ error: 'INVALID_TEMPLATE_FIELDS' }, { status: 400 });
  const { data, error } = await database.from('trend_templates').update({ ...payload, updated_by: actor.userId, published_at: payload.is_published ? now : null }).eq('id', id).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'SLUG_EXISTS' : 'TREND_TEMPLATE_UPDATE_FAILED' }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'TREND_TEMPLATE_NOT_FOUND' }, { status: 404 });
  await database.from('audit_logs').insert({ actor_id: actor.userId, actor_role: actor.role, action: 'ADMIN_UPDATED_TREND_TEMPLATE', resource: 'trend_templates', resource_id: id, metadata: { slug: data.slug, readiness: data.readiness, published: data.is_published }, created_at: now });
  return NextResponse.json({ success: true, template: data });
}
