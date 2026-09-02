import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { inspectSocialConnectionLifecycle } from '@/lib/social/connection-lifecycle';
import { providerConnectionCapability } from '@/lib/social/oauth-service';
import {
  SOCIAL_PROVIDER_DEFINITIONS,
  providerServerConfiguration,
  type SocialProviderId,
} from '@/lib/social/providers';

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const { data: connections, error } = await database.from('social_connections')
    .select('id,provider,provider_account_id,account_name,account_type,avatar_url,status,scopes,credential_ciphertext,credential_expires_at,last_sync_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'SOCIAL_CONNECTIONS_UNAVAILABLE' }, { status: 503 });

  const providers = (Object.keys(SOCIAL_PROVIDER_DEFINITIONS) as SocialProviderId[]).map((providerId) => {
    const definition = SOCIAL_PROVIDER_DEFINITIONS[providerId];
    const config = providerServerConfiguration(providerId);
    const providerConnections = (connections || []).filter((item) => item.provider === providerId);
    const accounts = providerConnections.map((connection) => {
      const lifecycle = inspectSocialConnectionLifecycle({
        provider: connection.provider,
        status: connection.status,
        credential_ciphertext: connection.credential_ciphertext,
        credential_expires_at: connection.credential_expires_at,
      });
      return {
        id: connection.id,
        providerAccountId: connection.provider_account_id,
        name: connection.account_name,
        type: connection.account_type,
        avatarUrl: connection.avatar_url,
        status: connection.status,
        health: lifecycle.health,
        refreshable: lifecycle.refreshable,
        credentialExpiresAt: connection.credential_expires_at,
        lastSyncAt: connection.last_sync_at,
        scopes: Array.isArray(connection.scopes) ? connection.scopes : [],
      };
    });

    const publishingEnabled = accounts.some((account) => {
      const usable = account.health === 'connected' || account.health === 'expiring';
      return usable && providerConnectionCapability(providerId, account.scopes).publishingEnabled;
    });

    return {
      id: providerId,
      name: definition.name,
      oauthConfigured: config.oauthConfigured,
      publishingEnabled,
      connectionCount: accounts.length,
      usableConnectionCount: accounts.filter((account) => account.health === 'connected' || account.health === 'expiring').length,
      capabilities: definition.capabilities,
      accounts: accounts.map(({ scopes: _scopes, ...account }) => account),
    };
  });

  return NextResponse.json({ providers });
}
