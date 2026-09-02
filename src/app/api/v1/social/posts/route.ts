import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

const PROVIDERS = new Set(['meta', 'tiktok', 'youtube', 'linkedin']);
const PUBLISH_FLAG: Record<string, string> = {
  meta: 'BRANDBOX_META_PUBLISHING_ENABLED',
  tiktok: 'BRANDBOX_TIKTOK_PUBLISHING_ENABLED',
  youtube: 'BRANDBOX_YOUTUBE_PUBLISHING_ENABLED',
  linkedin: 'BRANDBOX_LINKEDIN_PUBLISHING_ENABLED',
};

function validTargets(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 4 && value.every((item) => typeof item === 'string' && PROVIDERS.has(item));
}

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database.from('social_posts')
    .select('id,project_id,content,media_asset_ids,target_providers,status,scheduled_at,published_at,error_summary,created_at,updated_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: 'SOCIAL_POSTS_UNAVAILABLE' }, { status: 503 });
  return NextResponse.json({ posts: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const targets = body.targetProviders ?? [];
  const scheduledAtRaw = typeof body.scheduledAt === 'string' ? body.scheduledAt.trim() : '';
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

  if (!content || content.length > 5000 || !validTargets(targets)) {
    return NextResponse.json({ error: 'INVALID_SOCIAL_POST' }, { status: 400 });
  }
  if (scheduledAt && !Number.isFinite(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'INVALID_SCHEDULE_TIME' }, { status: 400 });
  }
  if (scheduledAt && scheduledAt.getTime() <= Date.now() + 60_000) {
    return NextResponse.json({ error: 'SCHEDULE_TIME_TOO_SOON' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  if (projectId) {
    const { data: project, error } = await database.from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', auth.user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error || !project) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
  }

  if (scheduledAt) {
    if (!targets.length) return NextResponse.json({ error: 'SCHEDULE_TARGET_REQUIRED' }, { status: 400 });
    const publishingUnavailable = targets.some((provider) => process.env[PUBLISH_FLAG[provider]] !== 'true');
    if (publishingUnavailable) {
      return NextResponse.json({ error: 'SOCIAL_PUBLISHING_NOT_ENABLED' }, { status: 409 });
    }
    const { data: connections } = await database.from('social_connections')
      .select('provider,status')
      .eq('user_id', auth.user.id)
      .eq('status', 'connected')
      .in('provider', targets);
    const connected = new Set((connections || []).map((item) => item.provider));
    if (targets.some((provider) => !connected.has(provider))) {
      return NextResponse.json({ error: 'SOCIAL_CONNECTION_REQUIRED' }, { status: 409 });
    }
  }

  const { data: post, error: insertError } = await database.from('social_posts').insert({
    user_id: auth.user.id,
    project_id: projectId || null,
    content,
    media_asset_ids: [],
    target_providers: targets,
    status: scheduledAt ? 'scheduled' : 'draft',
    scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
  }).select('id,project_id,content,target_providers,status,scheduled_at,created_at').single();

  if (insertError || !post) return NextResponse.json({ error: 'SOCIAL_POST_CREATE_FAILED' }, { status: 503 });
  return NextResponse.json({ post }, { status: 201 });
}
