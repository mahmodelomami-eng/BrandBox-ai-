import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import {
  cancelSocialPostSchedule,
  getSocialPostSchedule,
  scheduleSocialPostForUser,
} from '@/lib/social/publishing-service';

function responseForError(error: unknown) {
  const code = error instanceof Error ? error.message : 'SOCIAL_SCHEDULE_UNKNOWN_ERROR';
  const status = code === 'SOCIAL_POST_NOT_FOUND' ? 404
    : code === 'SOCIAL_SCHEDULER_NOT_ENABLED' || code === 'SOCIAL_PUBLISHING_NOT_ENABLED' || code === 'SOCIAL_CONNECTION_REQUIRED' || code === 'SOCIAL_CONNECTION_REAUTH_REQUIRED' || code === 'SOCIAL_POST_ALREADY_IN_FLIGHT' ? 409
      : code.startsWith('INVALID_') || code.startsWith('SCHEDULE_') || code === 'DUPLICATE_SOCIAL_TARGET' || code === 'SOCIAL_POST_NOT_SCHEDULABLE' ? 400
        : 503;
  return NextResponse.json({ error: code }, { status });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { postId } = await context.params;
  try {
    return NextResponse.json(await getSocialPostSchedule(auth.user.id, postId));
  } catch (error) {
    return responseForError(error);
  }
}

export async function POST(
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

  const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt.trim() : '';
  const { postId } = await context.params;
  try {
    const result = await scheduleSocialPostForUser({
      userId: auth.user.id,
      postId,
      scheduledAt,
      targets: body.targets,
    });
    return NextResponse.json(result);
  } catch (error) {
    return responseForError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { postId } = await context.params;
  try {
    return NextResponse.json(await cancelSocialPostSchedule(auth.user.id, postId));
  } catch (error) {
    return responseForError(error);
  }
}
