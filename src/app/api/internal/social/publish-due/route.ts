import { randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { certifiedPublishProviders, dispatchSocialPublishJob } from '@/lib/social/publishing-adapters';
import {
  claimDueSocialPublishJobs,
  finalizeSocialPublishJob,
  retryAtForAttempt,
  socialLivePublishingEnabled,
} from '@/lib/social/publishing-service';

export const runtime = 'nodejs';

function safeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function workerAuthorized(request: NextRequest): boolean {
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!supplied) return false;
  const secrets = [process.env.BRANDBOX_SOCIAL_WORKER_SECRET, process.env.CRON_SECRET]
    .map((value) => value?.trim() || '')
    .filter(Boolean);
  return secrets.some((secret) => safeEquals(supplied, secret));
}

function workerConfigured(): boolean {
  return Boolean(process.env.BRANDBOX_SOCIAL_WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim());
}

export async function POST(request: NextRequest) {
  if (!workerConfigured()) {
    return NextResponse.json({ error: 'SOCIAL_WORKER_SECRET_NOT_CONFIGURED' }, { status: 503 });
  }
  if (!workerAuthorized(request)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!socialLivePublishingEnabled()) {
    return NextResponse.json({ enabled: false, reason: 'SOCIAL_LIVE_PUBLISHING_DISABLED', claimed: 0 });
  }

  const allowedProviders = certifiedPublishProviders();
  if (!allowedProviders.length) {
    return NextResponse.json({ enabled: false, reason: 'NO_CERTIFIED_PROVIDER_ADAPTERS', claimed: 0 });
  }

  const workerId = `bbx-social-${randomUUID()}`;
  let jobs;
  try {
    jobs = await claimDueSocialPublishJobs(workerId, allowedProviders, 10);
  } catch {
    return NextResponse.json({ error: 'SOCIAL_PUBLISH_CLAIM_FAILED' }, { status: 503 });
  }

  const results: Array<{ jobId: string; provider: string; result: string }> = [];
  for (const job of jobs) {
    try {
      const dispatch = await dispatchSocialPublishJob(job);
      if (dispatch.kind === 'published') {
        await finalizeSocialPublishJob({
          workerId,
          jobId: job.id,
          result: 'published',
          providerPublicationId: dispatch.providerPublicationId,
          providerPublicationUrl: dispatch.providerPublicationUrl,
        });
      } else if (dispatch.kind === 'retry') {
        await finalizeSocialPublishJob({
          workerId,
          jobId: job.id,
          result: 'retry',
          errorCode: dispatch.code,
          errorSummary: dispatch.summary,
          retryAt: retryAtForAttempt(job.attempt_count),
        });
      } else if (dispatch.kind === 'reauth_required') {
        await finalizeSocialPublishJob({
          workerId,
          jobId: job.id,
          result: 'reauth_required',
          errorCode: dispatch.code,
          errorSummary: dispatch.summary,
        });
      } else {
        await finalizeSocialPublishJob({
          workerId,
          jobId: job.id,
          result: 'failed',
          errorCode: dispatch.code,
          errorSummary: dispatch.summary,
        });
      }
      results.push({ jobId: job.id, provider: job.provider, result: dispatch.kind });
    } catch (error) {
      const code = error instanceof Error ? error.message : 'SOCIAL_PROVIDER_TRANSIENT_FAILURE';
      const retryable = code === 'SOCIAL_PROVIDER_TRANSIENT_FAILURE' || code === 'SOCIAL_PROVIDER_RATE_LIMITED';
      try {
        await finalizeSocialPublishJob({
          workerId,
          jobId: job.id,
          result: code === 'SOCIAL_PROVIDER_REAUTH_REQUIRED' ? 'reauth_required' : retryable ? 'retry' : 'failed',
          errorCode: code,
          errorSummary: 'Provider dispatch did not complete successfully.',
          retryAt: retryable ? retryAtForAttempt(job.attempt_count) : null,
        });
      } catch {
        // Lease fencing intentionally prevents a stale worker from overwriting a re-claimed job.
      }
      results.push({ jobId: job.id, provider: job.provider, result: retryable ? 'retry' : 'failed' });
    }
  }

  return NextResponse.json({
    enabled: true,
    claimed: jobs.length,
    completed: results.length,
    results,
  });
}
