import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

type SocialProvider = 'meta' | 'tiktok' | 'youtube' | 'linkedin';

const PROVIDERS = new Set<SocialProvider>(['meta', 'tiktok', 'youtube', 'linkedin']);

function isProvider(value: unknown): value is SocialProvider {
  return typeof value === 'string' && PROVIDERS.has(value as SocialProvider);
}

function requestKey(base: string, provider: SocialProvider) {
  return `${base}_${provider}`.slice(0, 120);
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

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  const rawDrafts = Array.isArray(body.drafts) ? body.drafts : [];

  if (!projectId || !/^[a-zA-Z0-9_-]{8,80}$/.test(requestId) || rawDrafts.length < 1 || rawDrafts.length > 4) {
    return NextResponse.json({ error: 'INVALID_DRAFT_BATCH' }, { status: 400 });
  }

  const drafts: Array<{ provider: SocialProvider; content: string; clientRequestId: string }> = [];
  const seen = new Set<SocialProvider>();
  for (const item of rawDrafts) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return NextResponse.json({ error: 'INVALID_DRAFT_BATCH' }, { status: 400 });
    }
    const record = item as Record<string, unknown>;
    if (!isProvider(record.provider) || seen.has(record.provider)) {
      return NextResponse.json({ error: 'INVALID_DRAFT_PROVIDER' }, { status: 400 });
    }
    const content = typeof record.content === 'string' ? record.content.trim() : '';
    if (!content || content.length > 5000) {
      return NextResponse.json({ error: 'INVALID_DRAFT_CONTENT' }, { status: 400 });
    }
    seen.add(record.provider);
    drafts.push({ provider: record.provider, content, clientRequestId: requestKey(requestId, record.provider) });
  }

  const database = createPrivilegedSupabaseClient();
  const { data: project, error: projectError } = await database.from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });

  const keys = drafts.map((draft) => draft.clientRequestId);
  const { data: existing, error: existingError } = await database.from('social_posts')
    .select('id,client_request_id,project_id,content,target_providers,status,created_at')
    .eq('user_id', auth.user.id)
    .in('client_request_id', keys);
  if (existingError) return NextResponse.json({ error: 'SOCIAL_DRAFT_LOOKUP_FAILED' }, { status: 503 });

  const existingKeys = new Set((existing || []).map((row) => row.client_request_id).filter(Boolean));
  const pending = drafts.filter((draft) => !existingKeys.has(draft.clientRequestId));

  let inserted: Array<Record<string, unknown>> = [];
  if (pending.length) {
    const { data, error } = await database.from('social_posts').insert(pending.map((draft) => ({
      user_id: auth.user.id,
      project_id: projectId,
      content: draft.content,
      media_asset_ids: [],
      target_providers: [draft.provider],
      status: 'draft',
      client_request_id: draft.clientRequestId,
    }))).select('id,client_request_id,project_id,content,target_providers,status,created_at');

    if (error) {
      const { data: replay } = await database.from('social_posts')
        .select('id,client_request_id,project_id,content,target_providers,status,created_at')
        .eq('user_id', auth.user.id)
        .in('client_request_id', keys);
      if ((replay || []).length !== drafts.length) {
        return NextResponse.json({ error: 'SOCIAL_DRAFT_BATCH_CREATE_FAILED' }, { status: 503 });
      }
      return NextResponse.json({ posts: replay || [], replayed: true });
    }
    inserted = (data || []) as Array<Record<string, unknown>>;
  }

  return NextResponse.json({
    posts: [...(existing || []), ...inserted],
    replayed: pending.length === 0,
  }, { status: pending.length ? 201 : 200 });
}
