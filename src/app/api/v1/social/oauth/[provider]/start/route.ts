import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { isSocialProviderId } from '@/lib/social/providers';
import { startOAuthConnection } from '@/lib/social/oauth-service';

type RouteContext = { params: Promise<{ provider: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { provider } = await context.params;
  if (!isSocialProviderId(provider)) return NextResponse.json({ error: 'SOCIAL_PROVIDER_NOT_SUPPORTED' }, { status: 404 });

  try {
    const result = await startOAuthConnection(auth.user.id, provider);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SOCIAL_OAUTH_START_FAILED';
    const status = code === 'SOCIAL_PROVIDER_NOT_CONFIGURED' ? 409 : 503;
    return NextResponse.json({ error: code }, { status });
  }
}
