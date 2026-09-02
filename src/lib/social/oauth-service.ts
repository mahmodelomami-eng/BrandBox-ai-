import { encryptSocialSecret, hashOAuthState, newOAuthState } from './crypto';
import {
  isSocialProviderId,
  providerPublishingEnabled,
  providerServerConfiguration,
  requestedProviderScopes,
  socialProviderDefinition,
  SocialProviderId,
} from './providers';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

type TokenBundle = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
  scopes: string[];
  providerUserId?: string;
  tokenType?: string;
};

type DiscoveredAccount = {
  providerAccountId: string;
  accountName: string;
  accountType: string;
  avatarUrl?: string | null;
  credential: Record<string, unknown>;
  credentialExpiresAt?: string | null;
};

type OAuthStateRow = {
  user_id: string;
  return_uri: string | null;
  requested_scopes: string[] | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function expiresAt(seconds: unknown): string | undefined {
  const value = asNumber(seconds);
  if (!value || value <= 0) return undefined;
  return new Date(Date.now() + Math.trunc(value) * 1000).toISOString();
}

function splitScopes(value: unknown, separator: RegExp = /[\s,]+/): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim());
  if (typeof value !== 'string') return [];
  return value.split(separator).map((item) => item.trim()).filter(Boolean);
}

async function fetchJson(url: string, init: RequestInit, errorCode: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const payload = asObject(await response.json().catch(() => ({})));
  if (!response.ok) throw new Error(errorCode);
  return payload;
}

function mobileReturnUri(): string {
  const configured = process.env.BRANDBOX_SOCIAL_MOBILE_RETURN_URI?.trim();
  if (configured && configured.startsWith('brandbox://social')) return configured;
  return 'brandbox://social';
}

function appendReturnParams(base: string, params: Record<string, string>): string {
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${new URLSearchParams(params).toString()}`;
}

function buildAuthorizationUrl(provider: SocialProviderId, state: string, scopes: string[]): string {
  const config = providerServerConfiguration(provider);
  if (!config.oauthConfigured) throw new Error('SOCIAL_PROVIDER_NOT_CONFIGURED');

  if (provider === 'meta') {
    const version = process.env.META_GRAPH_API_VERSION?.trim() || 'v26.0';
    const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state,
      scope: scopes.join(','),
    }).toString();
    return url.toString();
  }

  if (provider === 'tiktok') {
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.search = new URLSearchParams({
      client_key: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state,
      scope: scopes.join(','),
    }).toString();
    return url.toString();
  }

  if (provider === 'youtube') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state,
      scope: scopes.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
    }).toString();
    return url.toString();
  }

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state,
    scope: scopes.join(' '),
  }).toString();
  return url.toString();
}

export async function startOAuthConnection(userId: string, provider: SocialProviderId) {
  const config = providerServerConfiguration(provider);
  if (!config.oauthConfigured) throw new Error('SOCIAL_PROVIDER_NOT_CONFIGURED');
  const database = createPrivilegedSupabaseClient();
  const state = newOAuthState();
  const stateHash = hashOAuthState(state);
  const scopes = requestedProviderScopes(provider);
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const returnUri = mobileReturnUri();

  await database.from('social_oauth_states')
    .delete()
    .eq('user_id', userId)
    .lt('expires_at', new Date().toISOString());

  const { error } = await database.from('social_oauth_states').insert({
    state_hash: stateHash,
    user_id: userId,
    provider,
    requested_scopes: scopes,
    return_uri: returnUri,
    expires_at: expiry,
  });
  if (error) throw new Error('SOCIAL_OAUTH_STATE_CREATE_FAILED');

  return {
    authorizationUrl: buildAuthorizationUrl(provider, state, scopes),
    expiresAt: expiry,
    requestedScopes: scopes,
  };
}

async function consumeState(provider: SocialProviderId, state: string): Promise<OAuthStateRow> {
  if (!state || state.length > 300) throw new Error('SOCIAL_OAUTH_STATE_INVALID');
  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await database.from('social_oauth_states')
    .update({ consumed_at: now })
    .eq('state_hash', hashOAuthState(state))
    .eq('provider', provider)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .select('user_id,return_uri,requested_scopes')
    .maybeSingle();
  if (error || !data) throw new Error('SOCIAL_OAUTH_STATE_INVALID');
  return data as OAuthStateRow;
}

async function exchangeMeta(code: string, requestedScopes: string[]): Promise<TokenBundle> {
  const config = providerServerConfiguration('meta');
  const version = process.env.META_GRAPH_API_VERSION?.trim() || 'v26.0';
  const tokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  tokenUrl.search = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  }).toString();
  const shortToken = await fetchJson(tokenUrl.toString(), { method: 'GET' }, 'META_TOKEN_EXCHANGE_FAILED');
  let accessToken = asString(shortToken.access_token);
  let tokenExpiry = expiresAt(shortToken.expires_in);
  if (!accessToken) throw new Error('META_TOKEN_EXCHANGE_FAILED');

  const longUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  longUrl.search = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    fb_exchange_token: accessToken,
  }).toString();
  try {
    const longToken = await fetchJson(longUrl.toString(), { method: 'GET' }, 'META_LONG_TOKEN_EXCHANGE_FAILED');
    const candidate = asString(longToken.access_token);
    if (candidate) {
      accessToken = candidate;
      tokenExpiry = expiresAt(longToken.expires_in) || tokenExpiry;
    }
  } catch {
    // A valid short-lived token is still a valid connection; it will surface as expiring soon.
  }

  let scopes = requestedScopes;
  try {
    const permissions = await fetchJson(
      `https://graph.facebook.com/${version}/me/permissions?access_token=${encodeURIComponent(accessToken)}`,
      { method: 'GET' },
      'META_PERMISSION_LOOKUP_FAILED'
    );
    const data = Array.isArray(permissions.data) ? permissions.data : [];
    scopes = data
      .map((item) => asObject(item))
      .filter((item) => item.status === 'granted')
      .map((item) => asString(item.permission))
      .filter(Boolean);
  } catch {
    // Requested scopes remain a conservative fallback until the next sync.
  }

  return { accessToken, expiresAt: tokenExpiry, scopes, tokenType: 'Bearer' };
}

async function discoverMetaAccounts(token: TokenBundle): Promise<DiscoveredAccount[]> {
  const version = process.env.META_GRAPH_API_VERSION?.trim() || 'v26.0';
  const fields = 'id,name,access_token,tasks,instagram_business_account{id,username,profile_picture_url}';
  const url = new URL(`https://graph.facebook.com/${version}/me/accounts`);
  url.search = new URLSearchParams({ fields, access_token: token.accessToken }).toString();
  const payload = await fetchJson(url.toString(), { method: 'GET' }, 'META_ACCOUNT_DISCOVERY_FAILED');
  const pages = Array.isArray(payload.data) ? payload.data : [];
  const accounts: DiscoveredAccount[] = [];

  for (const rawPage of pages) {
    const page = asObject(rawPage);
    const pageId = asString(page.id);
    const pageName = asString(page.name);
    const pageToken = asString(page.access_token);
    if (!pageId || !pageToken) continue;
    accounts.push({
      providerAccountId: pageId,
      accountName: pageName || `Facebook Page ${pageId.slice(-6)}`,
      accountType: 'facebook_page',
      credentialExpiresAt: token.expiresAt || null,
      credential: {
        accessToken: pageToken,
        userAccessToken: token.accessToken,
        tokenType: 'Bearer',
        pageId,
      },
    });

    const instagram = asObject(page.instagram_business_account);
    const instagramId = asString(instagram.id);
    if (instagramId) {
      accounts.push({
        providerAccountId: instagramId,
        accountName: asString(instagram.username) || `Instagram ${instagramId.slice(-6)}`,
        accountType: 'instagram_professional',
        avatarUrl: asString(instagram.profile_picture_url) || null,
        credentialExpiresAt: token.expiresAt || null,
        credential: {
          accessToken: pageToken,
          userAccessToken: token.accessToken,
          tokenType: 'Bearer',
          pageId,
          instagramUserId: instagramId,
        },
      });
    }
  }

  if (!accounts.length) throw new Error('META_NO_MANAGED_SOCIAL_ACCOUNTS');
  return accounts;
}

async function exchangeTikTok(code: string, requestedScopes: string[]): Promise<TokenBundle> {
  const config = providerServerConfiguration('tiktok');
  const body = new URLSearchParams({
    client_key: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  });
  const payload = await fetchJson('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: body.toString(),
  }, 'TIKTOK_TOKEN_EXCHANGE_FAILED');
  const accessToken = asString(payload.access_token);
  if (!accessToken) throw new Error('TIKTOK_TOKEN_EXCHANGE_FAILED');
  return {
    accessToken,
    refreshToken: asString(payload.refresh_token) || undefined,
    expiresAt: expiresAt(payload.expires_in),
    refreshExpiresAt: expiresAt(payload.refresh_expires_in),
    providerUserId: asString(payload.open_id) || undefined,
    scopes: splitScopes(payload.scope).length ? splitScopes(payload.scope) : requestedScopes,
    tokenType: asString(payload.token_type) || 'Bearer',
  };
}

async function discoverTikTokAccounts(token: TokenBundle): Promise<DiscoveredAccount[]> {
  const payload = await fetchJson(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name',
    { method: 'GET', headers: { Authorization: `Bearer ${token.accessToken}` } },
    'TIKTOK_ACCOUNT_DISCOVERY_FAILED'
  );
  const user = asObject(asObject(payload.data).user);
  const openId = asString(user.open_id) || token.providerUserId || '';
  if (!openId) throw new Error('TIKTOK_ACCOUNT_DISCOVERY_FAILED');
  return [{
    providerAccountId: openId,
    accountName: asString(user.display_name) || 'TikTok account',
    accountType: 'tiktok_creator',
    avatarUrl: asString(user.avatar_url) || null,
    credentialExpiresAt: token.expiresAt || null,
    credential: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken || null,
      tokenType: token.tokenType || 'Bearer',
      refreshExpiresAt: token.refreshExpiresAt || null,
      openId,
    },
  }];
}

async function exchangeYouTube(code: string, requestedScopes: string[]): Promise<TokenBundle> {
  const config = providerServerConfiguration('youtube');
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });
  const payload = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, 'YOUTUBE_TOKEN_EXCHANGE_FAILED');
  const accessToken = asString(payload.access_token);
  if (!accessToken) throw new Error('YOUTUBE_TOKEN_EXCHANGE_FAILED');
  const scopes = splitScopes(payload.scope);
  return {
    accessToken,
    refreshToken: asString(payload.refresh_token) || undefined,
    expiresAt: expiresAt(payload.expires_in),
    scopes: scopes.length ? scopes : requestedScopes,
    tokenType: asString(payload.token_type) || 'Bearer',
  };
}

async function discoverYouTubeAccounts(token: TokenBundle): Promise<DiscoveredAccount[]> {
  const payload = await fetchJson(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { method: 'GET', headers: { Authorization: `Bearer ${token.accessToken}` } },
    'YOUTUBE_CHANNEL_DISCOVERY_FAILED'
  );
  const items = Array.isArray(payload.items) ? payload.items : [];
  const accounts = items.map((raw) => {
    const item = asObject(raw);
    const snippet = asObject(item.snippet);
    const thumbnails = asObject(snippet.thumbnails);
    const defaultThumb = asObject(thumbnails.default);
    const id = asString(item.id);
    return id ? {
      providerAccountId: id,
      accountName: asString(snippet.title) || 'YouTube channel',
      accountType: 'youtube_channel',
      avatarUrl: asString(defaultThumb.url) || null,
      credentialExpiresAt: token.expiresAt || null,
      credential: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken || null,
        tokenType: token.tokenType || 'Bearer',
        channelId: id,
      },
    } satisfies DiscoveredAccount : null;
  }).filter((item): item is DiscoveredAccount => Boolean(item));
  if (!accounts.length) throw new Error('YOUTUBE_CHANNEL_DISCOVERY_FAILED');
  return accounts;
}

async function exchangeLinkedIn(code: string, requestedScopes: string[]): Promise<TokenBundle> {
  const config = providerServerConfiguration('linkedin');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });
  const payload = await fetchJson('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, 'LINKEDIN_TOKEN_EXCHANGE_FAILED');
  const accessToken = asString(payload.access_token);
  if (!accessToken) throw new Error('LINKEDIN_TOKEN_EXCHANGE_FAILED');
  return {
    accessToken,
    refreshToken: asString(payload.refresh_token) || undefined,
    expiresAt: expiresAt(payload.expires_in),
    refreshExpiresAt: expiresAt(payload.refresh_token_expires_in),
    scopes: requestedScopes,
    tokenType: 'Bearer',
  };
}

async function discoverLinkedInAccounts(token: TokenBundle): Promise<DiscoveredAccount[]> {
  const profile = await fetchJson('https://api.linkedin.com/v2/userinfo', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token.accessToken}` },
  }, 'LINKEDIN_PROFILE_DISCOVERY_FAILED');
  const sub = asString(profile.sub);
  if (!sub) throw new Error('LINKEDIN_PROFILE_DISCOVERY_FAILED');
  return [{
    providerAccountId: sub,
    accountName: asString(profile.name) || 'LinkedIn member',
    accountType: 'linkedin_member',
    avatarUrl: asString(profile.picture) || null,
    credentialExpiresAt: token.expiresAt || null,
    credential: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken || null,
      tokenType: 'Bearer',
      memberSub: sub,
      refreshExpiresAt: token.refreshExpiresAt || null,
    },
  }];
}

async function exchangeAndDiscover(provider: SocialProviderId, code: string, requestedScopes: string[]) {
  if (provider === 'meta') {
    const token = await exchangeMeta(code, requestedScopes);
    return { token, accounts: await discoverMetaAccounts(token) };
  }
  if (provider === 'tiktok') {
    const token = await exchangeTikTok(code, requestedScopes);
    return { token, accounts: await discoverTikTokAccounts(token) };
  }
  if (provider === 'youtube') {
    const token = await exchangeYouTube(code, requestedScopes);
    return { token, accounts: await discoverYouTubeAccounts(token) };
  }
  const token = await exchangeLinkedIn(code, requestedScopes);
  return { token, accounts: await discoverLinkedInAccounts(token) };
}

export async function completeOAuthConnection(provider: SocialProviderId, state: string, code: string) {
  if (!code || code.length > 3000) throw new Error('SOCIAL_OAUTH_CODE_INVALID');
  const oauthState = await consumeState(provider, state);
  const requestedScopes = oauthState.requested_scopes || requestedProviderScopes(provider);
  const { token, accounts } = await exchangeAndDiscover(provider, code, requestedScopes);
  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();
  const rows = accounts.map((account) => ({
    user_id: oauthState.user_id,
    provider,
    provider_account_id: account.providerAccountId,
    account_name: account.accountName.slice(0, 300),
    account_type: account.accountType,
    avatar_url: account.avatarUrl || null,
    status: 'connected',
    scopes: token.scopes,
    credential_ciphertext: encryptSocialSecret(account.credential),
    credential_expires_at: account.credentialExpiresAt || token.expiresAt || null,
    last_sync_at: now,
    updated_at: now,
  }));
  const { error } = await database.from('social_connections').upsert(rows, {
    onConflict: 'user_id,provider,provider_account_id',
  });
  if (error) throw new Error('SOCIAL_CONNECTION_SAVE_FAILED');

  return {
    returnUri: oauthState.return_uri || mobileReturnUri(),
    connectionCount: rows.length,
  };
}

export async function failOAuthConnection(provider: SocialProviderId, state: string, reason: string) {
  const oauthState = await consumeState(provider, state);
  return appendReturnParams(oauthState.return_uri || mobileReturnUri(), {
    provider,
    status: 'error',
    reason: reason.slice(0, 80),
  });
}

export function oauthSuccessRedirect(provider: SocialProviderId, returnUri: string, connectionCount: number) {
  return appendReturnParams(returnUri, {
    provider,
    status: 'connected',
    accounts: String(connectionCount),
  });
}

export function defaultOAuthFailureRedirect(providerValue: string) {
  const provider = isSocialProviderId(providerValue) ? providerValue : 'meta';
  return appendReturnParams(mobileReturnUri(), { provider, status: 'error', reason: 'oauth_failed' });
}

export function providerConnectionCapability(provider: SocialProviderId, grantedScopes: string[]) {
  const definition = socialProviderDefinition(provider);
  const scopeSet = new Set(grantedScopes);
  const publishingScopesGranted = definition.publishingScopes.every((scope) => scopeSet.has(scope));
  return {
    publishingEnabled: providerPublishingEnabled(provider) && publishingScopesGranted,
    publishingScopesGranted,
  };
}
