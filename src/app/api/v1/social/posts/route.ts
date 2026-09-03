import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { listSocialDeliveriesForUser } from '@/lib/social/publishing-service';

const PROVIDERS = new Set(['meta', 'tiktok', 'youtube', 'linkedin']);

function validTargets(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length <= 4
    && new Set(value).size === value.length
    && value.every((item) => typeof item === 'string' && PROVIDERS.has(item));
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

  const posts = data || [];
  let deliveries: Array<Record<string, unknown>> = [];
  try {
    deliveries = await listSocialDeliveriesForUser(auth.user.id, posts.map((post) => post.id));
  } catch {
    return NextResponse.json({ error: 'SOCIAL_PUBLISH_JOBS_UNAVAILABLE' }, { status: 503 });
  }

  const byPost = new Map<string, Array<Record<string, unknown>>>();
  for (const delivery of deliveries) {
    const postId = typeof delivery.post_id === 'string' ? delivery.post_id : '';
    if (!postId) continue;
    const current = byPost.get(postId) || [];
    current.push(delivery);
    byPost.set(postId, current);
  }

  return NextResponse.json({
    posts: posts.map((post) => ({ ...post, deliveries: byPost.get(post.id) || [] })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  // Scheduling must always go through /posts/:id/schedule so a post cannot enter
  // `scheduled` state without matching atomic publish jobs.
  if (body.scheduledAt !== undefined || body.status === 'scheduled') {
    return NextResponse.json({ error: 'USE_SOCIAL_SCHEDULE_ENDPOINT' }, { status: 400 });
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const targets = body.targetProviders ?? [];

  if (!content || content.length > 5000 || !validTargets(targets)) {
    return NextResponse.json({ error: 'INVALID_SOCIAL_POST' }, { status: 400 });
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

  const { data: post, error: insertError } = await database.from('social_posts').insert({
    user_id: auth.user.id,
    project_id: projectId || null,
    content,
    media_asset_ids: [],
    target_providers: targets,
    status: 'draft',
    scheduled_at: null,
    published_at: null,
    error_summary: null,
  }).select('id,project_id,content,target_providers,status,scheduled_at,created_at').single();

  if (insertError || !post) return NextResponse.json({ error: 'SOCIAL_POST_CREATE_FAILED' }, { status: 503 });
  return NextResponse.json({ post: { ...post, deliveries: [] } }, { status: 201 });
}
