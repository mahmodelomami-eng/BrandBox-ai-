import { isSocialEncryptionConfigured } from './crypto';

export type SocialProviderId = 'meta' | 'tiktok' | 'youtube' | 'linkedin';

export type SocialProviderDefinition = {
  id: SocialProviderId;
  name: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  redirectUriEnv: string;
  publishingFlagEnv: string;
  baseScopes: string[];
  publishingScopes: string[];
  capabilities: string[];
};

export const SOCIAL_PROVIDER_DEFINITIONS: Record<SocialProviderId, SocialProviderDefinition> = {
  meta: {
    id: 'meta',
    name: 'Facebook & Instagram',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    redirectUriEnv: 'META_OAUTH_REDIRECT_URI',
    publishingFlagEnv: 'BRANDBOX_META_PUBLISHING_ENABLED',
    baseScopes: ['pages_show_list', 'pages_read_engagement', 'instagram_basic'],
    publishingScopes: ['pages_manage_posts', 'instagram_content_publish'],
    capabilities: ['connect', 'pages', 'instagram', 'publish', 'insights'],
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    redirectUriEnv: 'TIKTOK_OAUTH_REDIRECT_URI',
    publishingFlagEnv: 'BRANDBOX_TIKTOK_PUBLISHING_ENABLED',
    baseScopes: ['user.info.basic'],
    publishingScopes: ['video.upload', 'video.publish'],
    capabilities: ['connect', 'profile', 'upload', 'publish'],
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
    redirectUriEnv: 'GOOGLE_OAUTH_REDIRECT_URI',
    publishingFlagEnv: 'BRANDBOX_YOUTUBE_PUBLISHING_ENABLED',
    baseScopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    publishingScopes: ['https://www.googleapis.com/auth/youtube.upload'],
    capabilities: ['connect', 'channel', 'upload', 'publish', 'analytics'],
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    redirectUriEnv: 'LINKEDIN_OAUTH_REDIRECT_URI',
    publishingFlagEnv: 'BRANDBOX_LINKEDIN_PUBLISHING_ENABLED',
    baseScopes: ['openid', 'profile'],
    publishingScopes: ['w_member_social'],
    capabilities: ['connect', 'member', 'publish'],
  },
};

export function isSocialProviderId(value: string): value is SocialProviderId {
  return value === 'meta' || value === 'tiktok' || value === 'youtube' || value === 'linkedin';
}

export function socialProviderDefinition(provider: SocialProviderId): SocialProviderDefinition {
  return SOCIAL_PROVIDER_DEFINITIONS[provider];
}

export function providerPublishingEnabled(provider: SocialProviderId): boolean {
  const definition = socialProviderDefinition(provider);
  return process.env[definition.publishingFlagEnv] === 'true';
}

export function requestedProviderScopes(provider: SocialProviderId): string[] {
  const definition = socialProviderDefinition(provider);
  return providerPublishingEnabled(provider)
    ? [...definition.baseScopes, ...definition.publishingScopes]
    : [...definition.baseScopes];
}

export function providerServerConfiguration(provider: SocialProviderId) {
  const definition = socialProviderDefinition(provider);
  const clientId = process.env[definition.clientIdEnv]?.trim() || '';
  const clientSecret = process.env[definition.clientSecretEnv]?.trim() || '';
  const redirectUri = process.env[definition.redirectUriEnv]?.trim() || '';
  return {
    clientId,
    clientSecret,
    redirectUri,
    oauthConfigured: Boolean(clientId && clientSecret && redirectUri && isSocialEncryptionConfigured()),
  };
}
