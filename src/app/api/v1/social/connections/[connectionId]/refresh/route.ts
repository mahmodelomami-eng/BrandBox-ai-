import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { refreshSocialConnection } from '@/lib/social/connection-lifecycle';

type RouteContext = { params: Promise<{ connectionId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { connectionId } = await context.params;
  const id = connectionId?.trim() || '';
  if (!id || id.length > 120) {
    return NextResponse.json({ error: 'INVALID_SOCIAL_CONNECTION_ID' }, { status: 400 });
  }

  try {
    const connection = await refreshSocialConnection(auth.user.id, id);
    return NextResponse.json({ connection });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SOCIAL_CONNECTION_REFRESH_FAILED';
    if (code === 'SOCIAL_CONNECTION_NOT_FOUND') {
      return NextResponse.json({ error: code }, { status: 404 });
    }
    if (code === 'SOCIAL_REAUTH_REQUIRED') {
      return NextResponse.json({ error: code, reauthRequired: true }, { status: 409 });
    }
    if (code === 'SOCIAL_PROVIDER_NOT_SUPPORTED') {
      return NextResponse.json({ error: code }, { status: 400 });
    }
    return NextResponse.json({ error: code }, { status: 503 });
  }
}
