import { decryptSocialSecret, encryptSocialSecret } from './crypto';
import { isSocialProviderId, providerServerConfiguration, type SocialProviderId } from './providers';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

export type SocialConnectionHealth =
  | 'connected'
  | 'expiring'
  | 'refresh_due'
  | 'reauth_required'
  | 'revoked'
  | 'error';

type SocialConnectionRecord = {
  id?: string;
  provider: string;
  status: string;
  credential_ciphertext: string | null;
  credential_expires_at: string | null;
};

type SocialCredential = Record<string, unknown> & {
  accessToken?: string | null;
  refreshToken?: string | null;
  refreshExpiresAt?: string | null;
  tokenType?: string | null;
};

type RefreshPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string | null;
  refreshExpiresAt?: string | null;
  scopes?: string[];
  tokenType?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_DUE_WINDOW_MS = DAY_MS;
const EXPIRING_WINDOW_MS = 7 * DAY_MS;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function futureIso(seconds: unknown): string | null {
  const parsed = asNumber(seconds);
  if (!parsed || parsed <= 0) return null;
  return new Date(Date.now() + Math.trunc(parsed) * 1000).toISOString();
}

function splitScopes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .map((item) => item.trim());
  }
  if (typeof value !== 'string') return [];
  return value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
}

function decryptCredential(ciphertext: string | null): SocialCredential | null {
  if (!ciphertext) return null;
  try {
    const value = decryptSocialSecret<unknown>(ciphertext);
    const object = asObject(value);
    return Object.keys(object).length ? object as SocialCredential : null;
  } catch {
    return null;
  }
}

function providerCanRefresh(provider: SocialProviderId, credential: SocialCredential | null): boolean {
  if (provider === 'meta') return false;
  return Boolean(asString(credential?.refreshToken));
}

function statusHealth(status: string): SocialConnectionHealth | null {
  if (status === 'reauth_required') return 'reauth_required';
  if (status === 'revoked') return 'revoked';
  if (status === 'error') return 'error';
  return null;
}

export function inspectSocialConnectionLifecycle(
  connection: SocialConnectionRecord,
  nowMs = Date.now()
): { health: SocialConnectionHealth; refreshable: boolean } {
  const explicitHealth = statusHealth(connection.status);
  if (explicitHealth) return { health: explicitHealth, refreshable: false };
  if (connection.status !== 'connected' || !isSocialProviderId(connection.provider)) {
    return { health: 'error', refreshable: false };
  }

  const credential = decryptCredential(connection.credential_ciphertext);
  if (!credential || !asString(credential.accessToken)) {
    return { health: 'reauth_required', refreshable: false };
  }

  const refreshable = providerCanRefresh(connection.provider, credential);
  if (!connection.credential_expires_at) return { health: 'connected', refreshable };

  const expiryMs = Date.parse(connection.credential_expires_at);
  if (!Number.isFinite(expiryMs)) return { health: 'error', refreshable };
  const remainingMs = expiryMs - nowMs;

  if (remainingMs <= 0) {
    return { health: refreshable ? 'refresh_due' : 'reauth_required', refreshable };
  }
  if (refreshable && remainingMs <= REFRESH_DUE_WINDOW_MS) {
    return { health: 'refresh_due', refreshable };
  }
  if (remainingMs <= EXPIRING_WINDOW_MS) {
    return { health: 'expiring', refreshable };
  }
  return { health: 'connected', refreshable };
}

async function markReauthRequired(userId: string, connectionId: string) {
  const database = createPrivilegedSupabaseClient();
  await database.from('social_connections')
    .update({
      status: 'reauth_required',
      credential_ciphertext: null,
      credential_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('user_id', userId);
}

async function refreshFormRequest(
  url: string,
  body: URLSearchParams
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-store',
    },
    body: body.toString(),
    cache: 'no-store',
  });
  return {
    status: response.status,
    payload: asObject(await response.json().catch(() => ({}))),
  };
}

function providerRefreshFailureStatus(status: number): 'reauth' | 'transient' {
  if (status === 400 || status === 401 || status === 403) return 'reauth';
  return 'transient';
}

async function refreshTikTok(credential: SocialCredential): Promise<RefreshPayload> {
  const config = providerServerConfiguration('tiktok');
  const refreshToken = asString(credential.refreshToken);
  if (!config.clientId || !config.clientSecret || !refreshToken) {
    throw new Error('SOCIAL_REAUTH_REQUIRED');
  }
  const { status, payload } = await refreshFormRequest(
    'https://open.tiktokapis.com/v2/oauth/token/',
    new URLSearchParams({
      client_key: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  );
  if (status < 200 || status >= 300) {
    throw new Error(providerRefreshFailureStatus(status) === 'reauth'
      ? 'SOCIAL_REAUTH_REQUIRED'
      : 'SOCIAL_PROVIDER_REFRESH_UNAVAILABLE');
  }
  const accessToken = asString(payload.access_token);
  if (!accessToken) throw new Error('SOCIAL_REAUTH_REQUIRED');
  return {
    accessToken,
    refreshToken: asString(payload.refresh_token) || refreshToken,
    expiresAt: futureIso(payload.expires_in),
    refreshExpiresAt: futureIso(payload.refresh_expires_in) || asString(credential.refreshExpiresAt) || null,
    scopes: splitScopes(payload.scope),
    tokenType: asString(payload.token_type) || asString(credential.tokenType) || 'Bearer',
  };
}

async function refreshYouTube(credential: SocialCredential): Promise<RefreshPayload> {
  const config = providerServerConfiguration('youtube');
  const refreshToken = asString(credential.refreshToken);
  if (!config.clientId || !config.clientSecret || !refreshToken) {
    throw new Error('SOCIAL_REAUTH_REQUIRED');
  }
  const { status, payload } = await refreshFormRequest(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  );
  if (status < 200 || status >= 300) {
    throw new Error(providerRefreshFailureStatus(status) === 'reauth'
      ? 'SOCIAL_REAUTH_REQUIRED'
      : 'SOCIAL_PROVIDER_REFRESH_UNAVAILABLE');
  }
  const accessToken = asString(payload.access_token);
  if (!accessToken) throw new Error('SOCIAL_REAUTH_REQUIRED');
  return {
    accessToken,
    refreshToken,
    expiresAt: futureIso(payload.expires_in),
    scopes: splitScopes(payload.scope),
    tokenType: asString(payload.token_type) || asString(credential.tokenType) || 'Bearer',
  };
}

async function refreshLinkedIn(credential: SocialCredential): Promise<RefreshPayload> {
  const config = providerServerConfiguration('linkedin');
  const refreshToken = asString(credential.refreshToken);
  if (!config.clientId || !config.clientSecret || !refreshToken) {
    throw new Error('SOCIAL_REAUTH_REQUIRED');
  }
  const { status, payload } = await refreshFormRequest(
    'https://www.linkedin.com/oauth/v2/accessToken',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    })
  );
  if (status < 200 || status >= 300) {
    throw new Error(providerRefreshFailureStatus(status) === 'reauth'
      ? 'SOCIAL_REAUTH_REQUIRED'
      : 'SOCIAL_PROVIDER_REFRESH_UNAVAILABLE');
  }
  const accessToken = asString(payload.access_token);
  if (!accessToken) throw new Error('SOCIAL_REAUTH_REQUIRED');
  return {
    accessToken,
    refreshToken: asString(payload.refresh_token) || refreshToken,
    expiresAt: futureIso(payload.expires_in),
    refreshExpiresAt: futureIso(payload.refresh_token_expires_in) || asString(credential.refreshExpiresAt) || null,
    scopes: splitScopes(payload.scope),
    tokenType: asString(payload.token_type) || asString(credential.tokenType) || 'Bearer',
  };
}

async function refreshProviderCredential(
  provider: SocialProviderId,
  credential: SocialCredential
): Promise<RefreshPayload> {
  if (provider === 'tiktok') return refreshTikTok(credential);
  if (provider === 'youtube') return refreshYouTube(credential);
  if (provider === 'linkedin') return refreshLinkedIn(credential);
  throw new Error('SOCIAL_REAUTH_REQUIRED');
}

export async function refreshSocialConnection(userId: string, connectionId: string) {
  const database = createPrivilegedSupabaseClient();
  const { data: connection, error } = await database.from('social_connections')
    .select('id,provider,status,scopes,credential_ciphertext,credential_expires_at')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !connection) throw new Error('SOCIAL_CONNECTION_NOT_FOUND');
  if (!isSocialProviderId(connection.provider)) throw new Error('SOCIAL_PROVIDER_NOT_SUPPORTED');

  const credential = decryptCredential(connection.credential_ciphertext);
  if (connection.status !== 'connected' || !credential || !asString(credential.accessToken)) {
    await markReauthRequired(userId, connectionId);
    throw new Error('SOCIAL_REAUTH_REQUIRED');
  }
  if (!providerCanRefresh(connection.provider, credential)) {
    if (!connection.credential_expires_at || Date.parse(connection.credential_expires_at) <= Date.now()) {
      await markReauthRequired(userId, connectionId);
    }
    throw new Error('SOCIAL_REAUTH_REQUIRED');
  }

  let refreshed: RefreshPayload;
  try {
    refreshed = await refreshProviderCredential(connection.provider, credential);
  } catch (refreshError) {
    const code = refreshError instanceof Error ? refreshError.message : 'SOCIAL_PROVIDER_REFRESH_UNAVAILABLE';
    if (code === 'SOCIAL_REAUTH_REQUIRED') {
      await markReauthRequired(userId, connectionId);
    }
    throw refreshError;
  }

  const nextCredential: SocialCredential = {
    ...credential,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken || asString(credential.refreshToken) || null,
    refreshExpiresAt: refreshed.refreshExpiresAt ?? asString(credential.refreshExpiresAt) || null,
    tokenType: refreshed.tokenType || asString(credential.tokenType) || 'Bearer',
  };
  const nextScopes = refreshed.scopes?.length ? refreshed.scopes : (Array.isArray(connection.scopes) ? connection.scopes : []);
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await database.from('social_connections')
    .update({
      status: 'connected',
      scopes: nextScopes,
      credential_ciphertext: encryptSocialSecret(nextCredential),
      credential_expires_at: refreshed.expiresAt,
      last_sync_at: now,
      updated_at: now,
    })
    .eq('id', connectionId)
    .eq('user_id', userId)
    .select('id,provider,account_name,account_type,status,credential_expires_at,last_sync_at')
    .maybeSingle();
  if (updateError || !updated) throw new Error('SOCIAL_CONNECTION_REFRESH_SAVE_FAILED');

  return {
    id: updated.id,
    provider: updated.provider,
    name: updated.account_name,
    type: updated.account_type,
    status: updated.status,
    credentialExpiresAt: updated.credential_expires_at,
    lastSyncAt: updated.last_sync_at,
  };
}

async function revokeTikTokCredential(credential: SocialCredential): Promise<boolean> {
  const config = providerServerConfiguration('tiktok');
  const accessToken = asString(credential.accessToken);
  if (!config.clientId || !config.clientSecret || !accessToken) return false;
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-store' },
      body: new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        token: accessToken,
      }).toString(),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function revokeGoogleCredential(credential: SocialCredential): Promise<boolean> {
  const token = asString(credential.refreshToken) || asString(credential.accessToken);
  if (!token) return false;
  try {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-store' },
      body: new URLSearchParams({ token }).toString(),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function disconnectSocialConnection(userId: string, connectionId: string) {
  const database = createPrivilegedSupabaseClient();
  const { data: connection, error } = await database.from('social_connections')
    .select('id,provider,credential_ciphertext')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !connection) throw new Error('SOCIAL_CONNECTION_NOT_FOUND');
  if (!isSocialProviderId(connection.provider)) throw new Error('SOCIAL_PROVIDER_NOT_SUPPORTED');

  const credential = decryptCredential(connection.credential_ciphertext);
  let providerRevokeAttempted = false;
  let providerRevokeSucceeded = false;

  if (credential && connection.provider === 'tiktok') {
    providerRevokeAttempted = true;
    providerRevokeSucceeded = await revokeTikTokCredential(credential);
  }

  if (credential && connection.provider === 'youtube') {
    const { count } = await database.from('social_connections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('provider', 'youtube');
    if ((count || 0) <= 1) {
      providerRevokeAttempted = true;
      providerRevokeSucceeded = await revokeGoogleCredential(credential);
    }
  }

  const { error: deleteError } = await database.from('social_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userId);
  if (deleteError) throw new Error('SOCIAL_CONNECTION_DISCONNECT_FAILED');

  return {
    disconnected: true,
    provider: connection.provider,
    providerRevokeAttempted,
    providerRevokeSucceeded,
  };
}
