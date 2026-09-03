import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { inspectSocialConnectionLifecycle } from './connection-lifecycle';
import { providerConnectionCapability } from './oauth-service';
import { isSocialProviderId, type SocialProviderId } from './providers';

export type SocialScheduleTarget = {
  provider: SocialProviderId;
  connectionId: string;
};

export type SocialPublishJob = {
  id: string;
  user_id: string;
  post_id: string;
  connection_id: string;
  provider: SocialProviderId;
  status: 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled';
  scheduled_at: string;
  next_attempt_at: string;
  attempt_count: number;
  max_attempts: number;
  idempotency_key: string;
};

export type SocialDelivery = {
  id: string;
  post_id: string;
  connection_id: string;
  provider: SocialProviderId;
  status: 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled';
  scheduled_at: string;
  next_attempt_at: string;
  attempt_count: number;
  max_attempts: number;
  provider_publication_id: string | null;
  provider_publication_url: string | null;
  error_code: string | null;
  error_summary: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const SAFE_JOB_COLUMNS = [
  'id',
  'post_id',
  'connection_id',
  'provider',
  'status',
  'scheduled_at',
  'next_attempt_at',
  'attempt_count',
  'max_attempts',
  'provider_publication_id',
  'provider_publication_url',
  'error_code',
  'error_summary',
  'published_at',
  'created_at',
  'updated_at',
].join(',');

export function socialSchedulerEnabled(): boolean {
  return process.env.BRANDBOX_SOCIAL_SCHEDULER_ENABLED === 'true';
}

export function socialLivePublishingEnabled(): boolean {
  return socialSchedulerEnabled() && process.env.BRANDBOX_SOCIAL_LIVE_PUBLISHING_ENABLED === 'true';
}

function assertUuidLike(value: string, errorCode: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(errorCode);
  }
}

function normalizeTargets(value: unknown): SocialScheduleTarget[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    throw new Error('INVALID_SOCIAL_TARGETS');
  }

  const targets: SocialScheduleTarget[] = value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('INVALID_SOCIAL_TARGETS');
    }
    const record = item as Record<string, unknown>;
    const provider = typeof record.provider === 'string' ? record.provider.trim() : '';
    const connectionId = typeof record.connectionId === 'string' ? record.connectionId.trim() : '';
    if (!isSocialProviderId(provider)) throw new Error('SOCIAL_PROVIDER_NOT_SUPPORTED');
    assertUuidLike(connectionId, 'INVALID_SOCIAL_CONNECTION_ID');
    return { provider, connectionId };
  });

  const unique = new Set(targets.map((item) => `${item.provider}:${item.connectionId}`));
  if (unique.size !== targets.length) throw new Error('DUPLICATE_SOCIAL_TARGET');
  return targets;
}

function normalizeScheduleTime(value: string): string {
  const parsed = new Date(value);
  if (!value || !Number.isFinite(parsed.getTime())) throw new Error('INVALID_SCHEDULE_TIME');
  const minimum = Date.now() + 60_000;
  const maximum = Date.now() + 180 * 24 * 60 * 60 * 1000;
  if (parsed.getTime() <= minimum) throw new Error('SCHEDULE_TIME_TOO_SOON');
  if (parsed.getTime() > maximum) throw new Error('SCHEDULE_TIME_TOO_FAR');
  return parsed.toISOString();
}

export async function scheduleSocialPostForUser(args: {
  userId: string;
  postId: string;
  scheduledAt: string;
  targets: unknown;
}) {
  if (!socialSchedulerEnabled()) throw new Error('SOCIAL_SCHEDULER_NOT_ENABLED');
  assertUuidLike(args.postId, 'INVALID_SOCIAL_POST_ID');
  const scheduledAt = normalizeScheduleTime(args.scheduledAt);
  const targets = normalizeTargets(args.targets);
  const database = createPrivilegedSupabaseClient();

  const { data: post, error: postError } = await database.from('social_posts')
    .select('id,status')
    .eq('id', args.postId)
    .eq('user_id', args.userId)
    .maybeSingle();
  if (postError || !post) throw new Error('SOCIAL_POST_NOT_FOUND');
  if (!['draft', 'cancelled', 'failed'].includes(post.status)) {
    throw new Error('SOCIAL_POST_NOT_SCHEDULABLE');
  }

  const connectionIds = targets.map((item) => item.connectionId);
  const { data: connections, error: connectionError } = await database.from('social_connections')
    .select('id,provider,status,scopes,credential_ciphertext,credential_expires_at')
    .eq('user_id', args.userId)
    .in('id', connectionIds);
  if (connectionError) throw new Error('SOCIAL_CONNECTIONS_UNAVAILABLE');

  const byId = new Map((connections || []).map((item) => [item.id, item]));
  for (const target of targets) {
    const connection = byId.get(target.connectionId);
    if (!connection || connection.provider !== target.provider || connection.status !== 'connected') {
      throw new Error('SOCIAL_CONNECTION_REQUIRED');
    }

    const lifecycle = inspectSocialConnectionLifecycle({
      provider: connection.provider,
      status: connection.status,
      credential_ciphertext: connection.credential_ciphertext,
      credential_expires_at: connection.credential_expires_at,
    });
    if (lifecycle.health !== 'connected' && lifecycle.health !== 'expiring') {
      throw new Error('SOCIAL_CONNECTION_REAUTH_REQUIRED');
    }

    const scopes = Array.isArray(connection.scopes) ? connection.scopes : [];
    if (!providerConnectionCapability(target.provider, scopes).publishingEnabled) {
      throw new Error('SOCIAL_PUBLISHING_NOT_ENABLED');
    }
  }

  const { error: scheduleError } = await database.rpc('schedule_social_post_jobs_atomic', {
    p_user_id: args.userId,
    p_post_id: args.postId,
    p_scheduled_at: scheduledAt,
    p_targets: targets,
  });
  if (scheduleError) {
    const message = scheduleError.message || '';
    if (message.includes('SOCIAL_POST_ALREADY_IN_FLIGHT')) throw new Error('SOCIAL_POST_ALREADY_IN_FLIGHT');
    if (message.includes('SOCIAL_CONNECTION_REQUIRED')) throw new Error('SOCIAL_CONNECTION_REQUIRED');
    throw new Error('SOCIAL_POST_SCHEDULE_FAILED');
  }

  return getSocialPostSchedule(args.userId, args.postId);
}

export async function cancelSocialPostSchedule(userId: string, postId: string) {
  assertUuidLike(postId, 'INVALID_SOCIAL_POST_ID');
  const database = createPrivilegedSupabaseClient();
  const { error } = await database.rpc('cancel_social_post_jobs_atomic', {
    p_user_id: userId,
    p_post_id: postId,
  });
  if (error) {
    const message = error.message || '';
    if (message.includes('SOCIAL_POST_ALREADY_IN_FLIGHT')) throw new Error('SOCIAL_POST_ALREADY_IN_FLIGHT');
    if (message.includes('SOCIAL_POST_NOT_FOUND')) throw new Error('SOCIAL_POST_NOT_FOUND');
    throw new Error('SOCIAL_POST_CANCEL_FAILED');
  }
  return getSocialPostSchedule(userId, postId);
}

export async function getSocialPostSchedule(userId: string, postId: string) {
  const database = createPrivilegedSupabaseClient();
  const [{ data: post, error: postError }, { data: jobs, error: jobsError }] = await Promise.all([
    database.from('social_posts')
      .select('id,content,target_providers,status,scheduled_at,published_at,error_summary,created_at,updated_at')
      .eq('id', postId)
      .eq('user_id', userId)
      .maybeSingle(),
    database.from('social_publish_jobs')
      .select(SAFE_JOB_COLUMNS)
      .eq('post_id', postId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);
  if (postError || !post) throw new Error('SOCIAL_POST_NOT_FOUND');
  if (jobsError) throw new Error('SOCIAL_PUBLISH_JOBS_UNAVAILABLE');
  return { post, deliveries: (jobs || []) as unknown as SocialDelivery[] };
}

export async function listSocialDeliveriesForUser(userId: string, postIds: string[]): Promise<SocialDelivery[]> {
  if (!postIds.length) return [];
  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database.from('social_publish_jobs')
    .select(SAFE_JOB_COLUMNS)
    .eq('user_id', userId)
    .in('post_id', postIds)
    .order('created_at', { ascending: true });
  if (error) throw new Error('SOCIAL_PUBLISH_JOBS_UNAVAILABLE');
  return (data || []) as unknown as SocialDelivery[];
}

export async function claimDueSocialPublishJobs(
  workerId: string,
  allowedProviders: SocialProviderId[],
  limit = 10
): Promise<SocialPublishJob[]> {
  if (!socialLivePublishingEnabled() || !allowedProviders.length) return [];
  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database.rpc('claim_due_social_publish_jobs_v2', {
    p_worker_id: workerId,
    p_allowed_providers: allowedProviders,
    p_limit: Math.max(1, Math.min(limit, 25)),
  });
  if (error) throw new Error('SOCIAL_PUBLISH_CLAIM_FAILED');
  return (data || []) as unknown as SocialPublishJob[];
}

export async function finalizeSocialPublishJob(args: {
  workerId: string;
  jobId: string;
  result: 'published' | 'retry' | 'failed' | 'reauth_required';
  providerPublicationId?: string | null;
  providerPublicationUrl?: string | null;
  errorCode?: string | null;
  errorSummary?: string | null;
  retryAt?: string | null;
}) {
  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database.rpc('finalize_social_publish_job_atomic', {
    p_worker_id: args.workerId,
    p_job_id: args.jobId,
    p_result: args.result,
    p_provider_publication_id: args.providerPublicationId || null,
    p_provider_publication_url: args.providerPublicationUrl || null,
    p_error_code: args.errorCode || null,
    p_error_summary: args.errorSummary || null,
    p_retry_at: args.retryAt || null,
  });
  if (error) {
    const message = error.message || '';
    if (message.includes('SOCIAL_PUBLISH_JOB_LEASE_MISMATCH')) throw new Error('SOCIAL_PUBLISH_JOB_LEASE_MISMATCH');
    throw new Error('SOCIAL_PUBLISH_FINALIZE_FAILED');
  }
  return data;
}

export function retryAtForAttempt(attemptCount: number): string {
  const minutes = [2, 5, 15, 30][Math.max(0, Math.min(attemptCount - 1, 3))] || 30;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
