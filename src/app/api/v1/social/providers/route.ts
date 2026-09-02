import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { providerConnectionCapability } from '@/lib/social/oauth-service';
import {
  SOCIAL_PROVIDER_DEFINITIONS,
  providerServerConfiguration,
  SocialProviderId,
} from '@/lib/social/providers';

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const { data: connections, error } = await database.from('social_connections')
    .select('id,provider,provider_account_id,account_name,account_type,avatar_url,status,scopes,credential_expires_at,last_sync_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'SOCIAL_CONNECTIONS_UNAVAILABLE' }, { status: 503 });

  const providers = (Object.keys(SOCIAL_PROVIDER_DEFINITIONS) as SocialProviderId[]).map((providerId) => {
    const definition = SOCIAL_PROVIDER_DEFINITIONS[providerId];
    const config = providerServerConfiguration(providerId);
    const providerConnections = (connections || []).filter((item) => item.provider === providerId && item.status === 'connected');
    const publishingEnabled = providerConnections.some((connection) =>
      providerConnectionCapability(providerId, Array.isArray(connection.scopes) ? connection.scopes : []).publishingEnabled
    );

    return {
      id: providerId,
      name: definition.name,
      oauthConfigured: config.oauthConfigured,
      publishingEnabled,
      connectionCount: providerConnections.length,
      capabilities: definition.capabilities,
      accounts: providerConnections.map((connection) => ({
        id: connection.id,
        providerAccountId: connection.provider_account_id,
        name: connection.account_name,
        type: connection.account_type,
        avatarUrl: connection.avatar_url,
        credentialExpiresAt: connection.credential_expires_at,
        lastSyncAt: connection.last_sync_at,
      })),
    };
  });

  return NextResponse.json({ providers });
}
