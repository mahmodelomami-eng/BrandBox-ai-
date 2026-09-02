import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';

const BRIEF_STATUSES = new Set(['discovered', 'shortlisted', 'designing', 'testing', 'approved', 'rejected', 'published']);
const TEMPLATE_LIFECYCLES = new Set(['trending', 'evergreen', 'archived']);
const TEMPLATE_READINESS = new Set(['live', 'requires_reference', 'draft']);
const TEMPLATE_TOOLS = new Set(['images', 'video']);
const TEMPLATE_MODES = new Set(['text_to_image', 'reference_image', 'text_to_video', 'image_to_video']);
const TEMPLATE_CATEGORIES = new Set(['now', 'personal', 'comedy', 'social', 'commercial', 'products', 'video', 'occasions', 'arabic', 'evergreen']);
const SOURCE_PLATFORMS = new Set(['internal', 'tiktok', 'instagram', 'facebook', 'youtube', 'pinterest', 'reddit', 'x', 'web']);

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
  if (!isKnownRole(role)) return null;
  return { userId: data.user.id, email: profile.email || data.user.email || '', role };
}

function integerScore(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function weightedScore(scores: Record<string, unknown>) {
  const viral = integerScore(scores.viral);
  const shareability = integerScore(scores.shareability);
  const aiFit = integerScore(scores.aiFit);
  const arabicFit = integerScore(scores.arabicFit);
  const brandFit = integerScore(scores.brandFit);
  const commercialFit = integerScore(scores.commercialFit);
  const total = viral * 0.25 + shareability * 0.20 + aiFit * 0.20 + arabicFit * 0.15 + brandFit * 0.10 + commercialFit * 0.10;
  return { viral, shareability, aiFit, arabicFit, brandFit, commercialFit, total: Math.round(total * 100) / 100 };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cleanString(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function audit(database: ReturnType<typeof createPrivilegedSupabaseClient>, actor: { userId: string; role: AdminRole }, action: string, resource: string, resourceId: string | null, metadata: Record<string, unknown>) {
  await database.from('audit_logs').insert({
    actor_id: actor.userId,
    actor_role: actor.role,
    action,
    resource,
    resource_id: resourceId,
    metadata,
    created_at: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!checkPermission(actor.role, 'settings.read')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const database = createPrivilegedSupabaseClient();
  const [briefsResult, templatesResult, usageResult] = await Promise.all([
    database.from('trend_briefs').select('*').order('trend_score', { ascending: false }).order('discovered_at', { ascending: false }).limit(200),
    database.from('trend_templates').select('*').order('is_featured', { ascending: false }).order('trend_score', { ascending: false }).limit(200),
    database.from('trend_usage_events').select('id,event_type,created_at', { count: 'exact', head: false }).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).limit(1000),
  ]);

  if (briefsResult.error || templatesResult.error || usageResult.error) {
    return NextResponse.json({ error: 'TREND_ADMIN_UNAVAILABLE' }, { status: 503 });
  }

  const usageRows = usageResult.data || [];
  return NextResponse.json({
    briefs: briefsResult.data || [],
    templates: templatesResult.data || [],
    stats: {
      briefs: briefsResult.data?.length || 0,
      published: (templatesResult.data || []).filter((item) => item.is_published).length,
      trending: (templatesResult.data || []).filter((item) => item.is_published && item.lifecycle === 'trending').length,
      uses30d: usageRows.filter((item) => item.event_type === 'use').length,
    },
    capabilities: { canManage: checkPermission(actor.role, 'settings.manage') },
    actorRole: actor.role,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!checkPermission(actor.role, 'settings.manage')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const database = createPrivilegedSupabaseClient();

  if (body.action === 'createBrief') {
    const title = cleanString(body.title, 160);
    const concept = cleanString(body.concept, 2000);
    if (title.length < 3 || concept.length < 10) return NextResponse.json({ error: 'INVALID_BRIEF' }, { status: 400 });
    const sourcePlatform = SOURCE_PLATFORMS.has(String(body.sourcePlatform)) ? String(body.sourcePlatform) : 'internal';
    const scores = weightedScore((body.scores && typeof body.scores === 'object' ? body.scores : {}) as Record<string, unknown>);
    const row = {
      title,
      concept,
      audience: cleanString(body.audience, 500) || null,
      content_angle: cleanString(body.contentAngle, 500) || null,
      source_platform: sourcePlatform,
      source_url: cleanString(body.sourceUrl, 1000) || null,
      source_note: cleanString(body.sourceNote, 1000) || null,
      score_viral: scores.viral,
      score_shareability: scores.shareability,
      score_ai_fit: scores.aiFit,
      score_arabic_fit: scores.arabicFit,
      score_brand_fit: scores.brandFit,
      score_commercial_fit: scores.commercialFit,
      trend_score: scores.total,
      workflow_status: scores.total >= 75 ? 'shortlisted' : 'discovered',
      discovered_by: cleanString(body.discoveredBy, 100) || 'trend-intelligence-agent',
      created_by: actor.userId,
      updated_by: actor.userId,
    };
    const { data, error } = await database.from('trend_briefs').insert(row).select('*').single();
    if (error) return NextResponse.json({ error: 'BRIEF_CREATE_FAILED' }, { status: 503 });
    await audit(database, actor, 'ADMIN_CREATED_TREND_BRIEF', 'trend_briefs', data.id, { score: scores.total, sourcePlatform });
    return NextResponse.json({ success: true, brief: data });
  }

  if (body.action === 'createTemplate') {
    const title = cleanString(body.title, 120);
    const subtitle = cleanString(body.subtitle, 220);
    const description = cleanString(body.description, 1200);
    const promptTemplate = cleanString(body.promptTemplate, 8000);
    const requestedSlug = slugify(cleanString(body.slug, 100));
    const slug = requestedSlug || `trend-${Date.now()}`;
    const category = TEMPLATE_CATEGORIES.has(String(body.category)) ? String(body.category) : 'now';
    const tool = TEMPLATE_TOOLS.has(String(body.tool)) ? String(body.tool) : 'images';
    const generationMode = TEMPLATE_MODES.has(String(body.generationMode)) ? String(body.generationMode) : (tool === 'video' ? 'text_to_video' : 'text_to_image');
    const readiness = TEMPLATE_READINESS.has(String(body.readiness)) ? String(body.readiness) : 'draft';
    const lifecycle = TEMPLATE_LIFECYCLES.has(String(body.lifecycle)) ? String(body.lifecycle) : 'trending';
    if (title.length < 3 || subtitle.length < 3 || description.length < 10 || promptTemplate.length < 20) {
      return NextResponse.json({ error: 'INVALID_TEMPLATE' }, { status: 400 });
    }
    const inputs = Array.isArray(body.requiredInputs) ? body.requiredInputs.slice(0, 12) : [];
    const tags = Array.isArray(body.tags) ? body.tags.map((tag) => cleanString(tag, 40)).filter(Boolean).slice(0, 16) : [];
    const score = Math.min(100, Math.max(0, Number(body.trendScore || 0)));
    const publish = body.isPublished === true && readiness !== 'draft';
    const row = {
      brief_id: typeof body.briefId === 'string' && /^[0-9a-f-]{36}$/i.test(body.briefId) ? body.briefId : null,
      slug,
      title_ar: title,
      subtitle_ar: subtitle,
      description_ar: description,
      category,
      tool,
      generation_mode: generationMode,
      readiness,
      lifecycle,
      prompt_template: promptTemplate,
      negative_prompt: cleanString(body.negativePrompt, 2000) || null,
      required_inputs: inputs,
      tags,
      model_hint: cleanString(body.modelHint, 200) || null,
      aspect_ratio: ['1:1','4:3','3:4','16:9','9:16'].includes(String(body.aspectRatio)) ? String(body.aspectRatio) : '9:16',
      preview_kind: ['gradient','image','video'].includes(String(body.previewKind)) ? String(body.previewKind) : 'gradient',
      preview_url: cleanString(body.previewUrl, 1200) || null,
      preview_gradient: cleanString(body.previewGradient, 1000) || 'radial-gradient(circle at 70% 20%,rgba(243,19,37,.4),transparent 30%),linear-gradient(145deg,#191a20,#07080b 70%)',
      trend_score: Number.isFinite(score) ? score : 0,
      is_featured: body.isFeatured === true,
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      created_by: actor.userId,
      updated_by: actor.userId,
    };
    const { data, error } = await database.from('trend_templates').insert(row).select('*').single();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'TREND_SLUG_EXISTS' : 'TEMPLATE_CREATE_FAILED' }, { status: 503 });
    if (row.brief_id && publish) await database.from('trend_briefs').update({ workflow_status: 'published', reviewed_at: new Date().toISOString(), updated_by: actor.userId }).eq('id', row.brief_id);
    await audit(database, actor, 'ADMIN_CREATED_TREND_TEMPLATE', 'trend_templates', data.id, { lifecycle, readiness, publish });
    return NextResponse.json({ success: true, template: data });
  }

  return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!checkPermission(actor.role, 'settings.manage')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const database = createPrivilegedSupabaseClient();

  if (body.action === 'updateBriefStatus') {
    const id = String(body.id || '');
    const status = String(body.status || '');
    if (!/^[0-9a-f-]{36}$/i.test(id) || !BRIEF_STATUSES.has(status)) return NextResponse.json({ error: 'INVALID_BRIEF_STATUS' }, { status: 400 });
    const { data, error } = await database.from('trend_briefs').update({ workflow_status: status, reviewed_at: ['approved','rejected','published'].includes(status) ? new Date().toISOString() : null, updated_by: actor.userId }).eq('id', id).select('*').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'BRIEF_UPDATE_FAILED' }, { status: 503 });
    await audit(database, actor, 'ADMIN_UPDATED_TREND_BRIEF_STATUS', 'trend_briefs', id, { status });
    return NextResponse.json({ success: true, brief: data });
  }

  if (body.action === 'updateTemplate') {
    const id = String(body.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'INVALID_TEMPLATE_ID' }, { status: 400 });
    const patch: Record<string, unknown> = { updated_by: actor.userId };
    if (body.lifecycle !== undefined) {
      if (!TEMPLATE_LIFECYCLES.has(String(body.lifecycle))) return NextResponse.json({ error: 'INVALID_LIFECYCLE' }, { status: 400 });
      patch.lifecycle = String(body.lifecycle);
    }
    if (body.readiness !== undefined) {
      if (!TEMPLATE_READINESS.has(String(body.readiness))) return NextResponse.json({ error: 'INVALID_READINESS' }, { status: 400 });
      patch.readiness = String(body.readiness);
    }
    if (body.isFeatured !== undefined) patch.is_featured = body.isFeatured === true;
    if (body.isPublished !== undefined) {
      patch.is_published = body.isPublished === true;
      patch.published_at = body.isPublished === true ? new Date().toISOString() : null;
    }
    if (body.previewUrl !== undefined) patch.preview_url = cleanString(body.previewUrl, 1200) || null;
    const { data, error } = await database.from('trend_templates').update(patch).eq('id', id).select('*').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'TEMPLATE_UPDATE_FAILED' }, { status: 503 });
    await audit(database, actor, 'ADMIN_UPDATED_TREND_TEMPLATE', 'trend_templates', id, { fields: Object.keys(patch) });
    return NextResponse.json({ success: true, template: data });
  }

  return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
}
