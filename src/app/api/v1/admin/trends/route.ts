import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'USER';
const MUTATING_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN'];
const STATUSES = ['discovered','review','designing','approved','published','evergreen','archived'] as const;
const CATEGORIES = ['social','comedy','commercial','products','portraits','video','seasonal','libyan','arabic','evergreen'] as const;
const CONTENT_TYPES = ['image','video','mixed'] as const;

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;
  const database = createPrivilegedSupabaseClient();
  const { data: profile, error: profileError } = await database
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError || !profile || profile.status === 'suspended') return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!['SUPER_ADMIN','ADMIN','SUPPORT'].includes(role)) return null;
  return { userId: data.user.id, role };
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizePayload(body: Record<string, unknown>) {
  const variables = Array.isArray(body.variables) ? body.variables.slice(0, 12) : [];
  const aspectRatios = Array.isArray(body.aspectRatios)
    ? body.aspectRatios.map((item) => text(item, 12)).filter(Boolean).slice(0, 5)
    : ['4:5'];
  const sampleUrls = Array.isArray(body.sampleUrls)
    ? body.sampleUrls.map((item) => text(item, 1000)).filter(Boolean).slice(0, 8)
    : [];

  return {
    slug: text(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
    title_ar: text(body.titleAr, 120),
    subtitle_ar: text(body.subtitleAr, 220),
    description_ar: text(body.descriptionAr, 1200),
    category: CATEGORIES.includes(body.category as typeof CATEGORIES[number]) ? body.category : 'social',
    content_type: CONTENT_TYPES.includes(body.contentType as typeof CONTENT_TYPES[number]) ? body.contentType : 'image',
    status: STATUSES.includes(body.status as typeof STATUSES[number]) ? body.status : 'discovered',
    trend_score: Math.max(0, Math.min(100, Number(body.trendScore || 0))),
    source_platform: text(body.sourcePlatform, 120) || null,
    source_url: text(body.sourceUrl, 1000) || null,
    source_signal: text(body.sourceSignal, 1000) || null,
    prompt_template: text(body.promptTemplate, 6000),
    negative_prompt: text(body.negativePrompt, 2000) || null,
    variables,
    model_hint: text(body.modelHint, 120) || null,
    aspect_ratios: aspectRatios.length ? aspectRatios : ['4:5'],
    requires_reference: Boolean(body.requiresReference),
    preview_url: text(body.previewUrl, 1000) || null,
    sample_urls: sampleUrls,
    social_caption_ar: text(body.socialCaptionAr, 2000) || null,
    cta_ar: text(body.ctaAr, 120) || 'جرّب هذا الترند',
    expires_at: body.expiresAt ? text(body.expiresAt, 64) : null,
  };
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const database = createPrivilegedSupabaseClient();
  const requestedStatus = request.nextUrl.searchParams.get('status');
  let query = database.from('trend_templates').select('*').order('updated_at', { ascending: false }).limit(500);
  if (requestedStatus && STATUSES.includes(requestedStatus as typeof STATUSES[number])) query = query.eq('status', requestedStatus);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'TREND_LIBRARY_UNAVAILABLE' }, { status: 503 });
  return NextResponse.json({ trends: data || [], actorRole: actor.role, canManage: MUTATING_ROLES.includes(actor.role) });
}

export async function POST(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!MUTATING_ROLES.includes(actor.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const payload = normalizePayload(body);
  if (!payload.slug || payload.slug.length < 3) return NextResponse.json({ error: 'SLUG_REQUIRED' }, { status: 400 });
  if (payload.title_ar.length < 3) return NextResponse.json({ error: 'TITLE_REQUIRED' }, { status: 400 });
  if (payload.prompt_template.length < 20) return NextResponse.json({ error: 'PROMPT_REQUIRED' }, { status: 400 });
  const now = new Date().toISOString();
  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database.from('trend_templates').insert({
    ...payload,
    created_by: actor.userId,
    updated_by: actor.userId,
    discovered_at: now,
    published_at: ['published','evergreen'].includes(String(payload.status)) ? now : null,
    last_reviewed_at: ['review','designing','approved','published','evergreen'].includes(String(payload.status)) ? now : null,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'SLUG_EXISTS' : 'TREND_CREATE_FAILED' }, { status: 400 });
  await database.from('audit_logs').insert({ actor_id: actor.userId, actor_role: actor.role, action: 'ADMIN_CREATED_TREND_TEMPLATE', resource: 'trend_templates', resource_id: data.id, metadata: { slug: data.slug, status: data.status, trend_score: data.trend_score }, created_at: now });
  return NextResponse.json({ success: true, trend: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!MUTATING_ROLES.includes(actor.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const id = text(body.id, 80);
  if (!id) return NextResponse.json({ error: 'TREND_ID_REQUIRED' }, { status: 400 });
  const payload = normalizePayload(body);
  if (!payload.slug || payload.slug.length < 3 || payload.title_ar.length < 3 || payload.prompt_template.length < 20) return NextResponse.json({ error: 'INVALID_TREND_FIELDS' }, { status: 400 });
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { ...payload, updated_by: actor.userId, updated_at: now };
  if (['review','designing','approved','published','evergreen'].includes(String(payload.status))) update.last_reviewed_at = now;
  if (['published','evergreen'].includes(String(payload.status))) update.published_at = now;
  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database.from('trend_templates').update(update).eq('id', id).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'SLUG_EXISTS' : 'TREND_UPDATE_FAILED' }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'TREND_NOT_FOUND' }, { status: 404 });
  await database.from('audit_logs').insert({ actor_id: actor.userId, actor_role: actor.role, action: 'ADMIN_UPDATED_TREND_TEMPLATE', resource: 'trend_templates', resource_id: id, metadata: { slug: data.slug, status: data.status, trend_score: data.trend_score }, created_at: now });
  return NextResponse.json({ success: true, trend: data });
}
