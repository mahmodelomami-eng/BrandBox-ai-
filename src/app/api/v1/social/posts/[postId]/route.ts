import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

const PROVIDERS = new Set(['meta', 'tiktok', 'youtube', 'linkedin']);
const EDITABLE_STATUSES = ['draft', 'cancelled', 'failed'] as const;
const ALLOWED_BODY_KEYS = new Set(['content', 'targetProviders']);

function validTargets(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length <= 4
    && new Set(value).size === value.length
    && value.every((item) => typeof item === 'string' && PROVIDERS.has(item));
}

function uuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (Object.keys(body).some((key) => !ALLOWED_BODY_KEYS.has(key))) {
    return NextResponse.json({ error: 'PROTECTED_SOCIAL_POST_FIELD' }, { status: 400 });
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const targets = body.targetProviders;
  if (!content || content.length > 5000 || !validTargets(targets)) {
    return NextResponse.json({ error: 'INVALID_SOCIAL_POST' }, { status: 400 });
  }

  const { postId } = await context.params;
  if (!uuidLike(postId)) return NextResponse.json({ error: 'INVALID_SOCIAL_POST_ID' }, { status: 400 });

  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await database.from('social_posts')
    .update({
      content,
      target_providers: targets,
      status: 'draft',
      scheduled_at: null,
      published_at: null,
      error_summary: null,
      updated_at: now,
    })
    .eq('id', postId)
    .eq('user_id', auth.user.id)
    .in('status', [...EDITABLE_STATUSES])
    .select('id,project_id,content,media_asset_ids,target_providers,status,scheduled_at,published_at,error_summary,created_at,updated_at')
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: 'SOCIAL_POST_UPDATE_FAILED' }, { status: 503 });
  if (updated) return NextResponse.json({ post: { ...updated, deliveries: [] } });

  // The conditional update above is the authority. This follow-up read only explains why
  // no row was changed and cannot turn a locked post into an editable one.
  const { data: existing, error: existingError } = await database.from('social_posts')
    .select('id,status')
    .eq('id', postId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: 'SOCIAL_POST_UPDATE_FAILED' }, { status: 503 });
  if (!existing) return NextResponse.json({ error: 'SOCIAL_POST_NOT_FOUND' }, { status: 404 });

  return NextResponse.json({
    error: existing.status === 'scheduled'
      ? 'CANCEL_SOCIAL_SCHEDULE_BEFORE_EDIT'
      : 'SOCIAL_POST_NOT_EDITABLE',
  }, { status: 409 });
}
