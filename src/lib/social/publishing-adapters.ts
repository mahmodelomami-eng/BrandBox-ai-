import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { decryptSocialSecret } from './crypto';
import { providerPublishingEnabled, type SocialProviderId } from './providers';
import type { SocialPublishJob } from './publishing-service';

type ProviderCredential = {
  accessToken?: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  [key: string]: unknown;
};

export type SocialPublishContext = {
  job: SocialPublishJob;
  content: string;
  mediaAssetIds: string[];
  providerAccountId: string;
  accountType: string | null;
  credential: ProviderCredential;
};

export type SocialDispatchResult =
  | { kind: 'published'; providerPublicationId?: string | null; providerPublicationUrl?: string | null }
  | { kind: 'retry'; code: string; summary: string }
  | { kind: 'reauth_required'; code: string; summary: string }
  | { kind: 'failed'; code: string; summary: string };

// Certification is intentionally a code-level gate in addition to environment flags.
// A provider is changed to true only in the PR that contains its reviewed, tested
// production adapter. This prevents a mistaken environment toggle from enabling an
// unimplemented or partially reviewed network integration.
const PROVIDER_ADAPTER_CERTIFIED: Record<SocialProviderId, boolean> = {
  meta: false,
  tiktok: false,
  youtube: false,
  linkedin: false,
};

export function providerAdapterCertified(provider: SocialProviderId): boolean {
  return PROVIDER_ADAPTER_CERTIFIED[provider] === true;
}

export function certifiedPublishProviders(): SocialProviderId[] {
  return (Object.keys(PROVIDER_ADAPTER_CERTIFIED) as SocialProviderId[])
    .filter((provider) => providerAdapterCertified(provider) && providerPublishingEnabled(provider));
}

async function loadPublishContext(job: SocialPublishJob): Promise<SocialPublishContext> {
  const database = createPrivilegedSupabaseClient();
  const [{ data: post, error: postError }, { data: connection, error: connectionError }] = await Promise.all([
    database.from('social_posts')
      .select('id,user_id,content,media_asset_ids,status')
      .eq('id', job.post_id)
      .eq('user_id', job.user_id)
      .maybeSingle(),
    database.from('social_connections')
      .select('id,user_id,provider,provider_account_id,account_type,status,credential_ciphertext')
      .eq('id', job.connection_id)
      .eq('user_id', job.user_id)
      .eq('provider', job.provider)
      .maybeSingle(),
  ]);

  if (postError || !post) throw new Error('SOCIAL_PUBLISH_POST_NOT_FOUND');
  if (connectionError || !connection) throw new Error('SOCIAL_PUBLISH_CONNECTION_NOT_FOUND');
  if (connection.status !== 'connected' || !connection.credential_ciphertext) {
    throw new Error('SOCIAL_PROVIDER_REAUTH_REQUIRED');
  }

  const credential = decryptSocialSecret<ProviderCredential>(connection.credential_ciphertext);
  if (!credential.accessToken) throw new Error('SOCIAL_PROVIDER_REAUTH_REQUIRED');

  const mediaAssetIds = Array.isArray(post.media_asset_ids)
    ? post.media_asset_ids.filter((item: unknown): item is string => typeof item === 'string')
    : [];

  return {
    job,
    content: post.content,
    mediaAssetIds,
    providerAccountId: connection.provider_account_id,
    accountType: connection.account_type,
    credential,
  };
}

export async function dispatchSocialPublishJob(job: SocialPublishJob): Promise<SocialDispatchResult> {
  if (!providerAdapterCertified(job.provider)) {
    return {
      kind: 'failed',
      code: 'SOCIAL_PROVIDER_ADAPTER_NOT_CERTIFIED',
      summary: 'Provider adapter is not certified for live dispatch.',
    };
  }

  // Loading/decryption remains server-only. Provider-specific network calls will be
  // added one platform at a time and flip the certification bit in the same reviewed PR.
  await loadPublishContext(job);
  return {
    kind: 'failed',
    code: 'SOCIAL_PROVIDER_ADAPTER_NOT_IMPLEMENTED',
    summary: 'Provider adapter has not been implemented in this release.',
  };
}
