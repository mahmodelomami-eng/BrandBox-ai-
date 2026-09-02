import { isIP } from 'node:net';
import { CreditEngine } from '../credits/credit-engine';
import { AuthContext } from '../auth/rbac-engine';
import { createPrivilegedSupabaseClient } from '../supabase/server';
import { createRunwayVideoTask, getRunwayTask } from '../ai/runway-client';

const VIDEO_BUCKET = 'generation-video-assets';
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

export interface StartVideoGenerationRequest {
  modelId: string;
  prompt: string;
  projectId: string;
  requestId: string;
  settings: {
    ratio: string;
    duration: number;
    quality?: string;
  };
}

export interface VideoGenerationResult {
  success: boolean;
  generationId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  creditsReserved: number;
  creditsConsumed: number;
  remainingBalance?: number;
  resultUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  wasRefunded?: boolean;
}

interface StartVideoContext {
  creditsPerSecond: number;
}

function safeRequestId(requestId: string): string {
  const value = String(requestId || '').trim();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(value)) throw new Error('INVALID_VIDEO_REQUEST_ID');
  return value;
}

function normalizeVideoFailure(error: unknown): { code: string; message: string; transient: boolean } {
  const raw = error instanceof Error ? error.message : '';
  if (raw === 'RUNWAY_RATE_LIMITED') return { code: 'VIDEO_PROVIDER_RATE_LIMITED', message: 'مزود الفيديو مشغول حاليًا. ستبقى المهمة محفوظة ويمكن تحديثها بعد قليل.', transient: true };
  if (raw === 'RUNWAY_PROVIDER_UNAVAILABLE' || raw === 'RUNWAY_TIMEOUT') return { code: 'VIDEO_PROVIDER_UNAVAILABLE', message: 'تعذر الوصول إلى مزود الفيديو مؤقتًا. ستبقى المهمة محفوظة ويمكن إعادة فحصها.', transient: true };
  if (raw === 'RUNWAY_AUTH_FAILED' || raw === 'RUNWAY_API_SECRET_MISSING') return { code: 'VIDEO_PROVIDER_CONFIGURATION', message: 'تكامل مزود الفيديو يحتاج مراجعة إدارية.', transient: true };
  if (raw.startsWith('RUNWAY_')) return { code: 'VIDEO_PROVIDER_REQUEST_FAILED', message: 'تعذر تنفيذ طلب الفيديو لدى المزود.', transient: false };
  if (raw.startsWith('VIDEO_OUTPUT_') || raw.startsWith('VIDEO_ASSET_')) return { code: 'VIDEO_OUTPUT_PERSISTENCE_FAILED', message: 'تم إنشاء الفيديو لكن تعذر حفظ النسخة الدائمة داخل Brand Box.', transient: false };
  return { code: 'VIDEO_GENERATION_FAILED', message: 'تعذر إكمال توليد الفيديو.', transient: false };
}

function assertSafeOutputUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('VIDEO_OUTPUT_URL_INVALID'); }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (url.protocol !== 'https:' || !hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || isIP(hostname) !== 0) {
    throw new Error('VIDEO_OUTPUT_URL_INVALID');
  }
  return url;
}

async function downloadRunwayVideo(outputUrl: string, fetchImpl: typeof fetch = fetch): Promise<Buffer> {
  const url = assertSafeOutputUrl(outputUrl);
  const response = await fetchImpl(url, { method: 'GET', redirect: 'follow' });
  if (!response.ok) throw new Error('VIDEO_OUTPUT_DOWNLOAD_FAILED');
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('video/mp4')) throw new Error('VIDEO_OUTPUT_MIME_INVALID');
  const lengthHeader = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(lengthHeader) && lengthHeader > MAX_VIDEO_BYTES) throw new Error('VIDEO_OUTPUT_TOO_LARGE');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_VIDEO_BYTES) throw new Error('VIDEO_OUTPUT_SIZE_INVALID');
  return bytes;
}

async function refundVideoCredits(
  userId: string,
  generationId: string,
  amount: number,
  failureCode: string
) {
  const refundKey = `video_refund_${generationId}`;
  let result = await CreditEngine.refundCredits(
    userId,
    amount,
    `Automatic Video Refund: ${failureCode}`,
    'generation_failure_refund',
    generationId,
    refundKey,
    userId
  );
  if (!result.success) {
    result = await CreditEngine.refundCredits(
      userId,
      amount,
      `Automatic Video Refund Retry: ${failureCode}`,
      'generation_failure_refund',
      generationId,
      refundKey,
      userId
    );
  }
  return result;
}

function generationId(): string {
  return `gen_video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class VideoGenerationService {
  public static async start(
    actor: AuthContext,
    request: StartVideoGenerationRequest,
    context: StartVideoContext
  ): Promise<VideoGenerationResult> {
    if (!actor?.userId) throw new Error('UNAUTHORIZED');
    const requestId = safeRequestId(request.requestId);
    const creditsPerSecond = Number(context.creditsPerSecond);
    const duration = Number(request.settings?.duration);
    if (!Number.isInteger(creditsPerSecond) || creditsPerSecond < 1 || !Number.isInteger(duration) || duration < 1) {
      throw new Error('VIDEO_PRICING_UNAVAILABLE');
    }
    const requiredCredits = creditsPerSecond * duration;
    const database = createPrivilegedSupabaseClient();
    const startKey = `video_start_${actor.userId}_${requestId}`;

    const { data: existing } = await database
      .from('generations')
      .select('id,status,credits_reserved,credits_consumed')
      .eq('user_id', actor.userId)
      .eq('idempotency_key', startKey)
      .maybeSingle();
    if (existing) {
      return {
        success: !['failed', 'cancelled'].includes(existing.status),
        generationId: existing.id,
        status: existing.status,
        creditsReserved: Number(existing.credits_reserved || 0),
        creditsConsumed: Number(existing.credits_consumed || 0),
      };
    }

    const balance = await CreditEngine.getBalance(actor.userId);
    const id = generationId();
    if (balance < requiredCredits) {
      return {
        success: false,
        generationId: id,
        status: 'failed',
        creditsReserved: 0,
        creditsConsumed: 0,
        remainingBalance: balance,
        errorCode: 'INSUFFICIENT_CREDITS',
        errorMessage: 'رصيد النقاط غير كافٍ لتوليد هذا الفيديو.',
      };
    }

    const deduction = await CreditEngine.deductCredits(
      actor.userId,
      requiredCredits,
      `AI Video Generation (${request.modelId}, ${duration}s)`,
      'generation',
      id,
      `video_deduct_${id}`,
      actor.userId
    );
    if (!deduction.success) {
      return {
        success: false,
        generationId: id,
        status: 'failed',
        creditsReserved: 0,
        creditsConsumed: 0,
        remainingBalance: deduction.newBalance,
        errorCode: 'VIDEO_CREDIT_RESERVATION_FAILED',
        errorMessage: 'تعذر حجز نقاط توليد الفيديو.',
      };
    }

    const { error: insertError } = await database.from('generations').insert({
      id,
      user_id: actor.userId,
      project_id: request.projectId,
      generation_type: 'video',
      provider: 'runway',
      model: request.modelId,
      prompt: request.prompt,
      settings: request.settings,
      status: 'queued',
      credits_reserved: requiredCredits,
      credits_consumed: 0,
      idempotency_key: startKey,
    });
    if (insertError) {
      const refund = await refundVideoCredits(actor.userId, id, requiredCredits, 'VIDEO_RECORD_CREATE_FAILED');
      return {
        success: false,
        generationId: id,
        status: 'failed',
        creditsReserved: requiredCredits,
        creditsConsumed: 0,
        remainingBalance: refund.success ? refund.newBalance : deduction.newBalance,
        errorCode: 'VIDEO_RECORD_CREATE_FAILED',
        errorMessage: 'تعذر إنشاء سجل توليد الفيديو.',
        wasRefunded: refund.success,
      };
    }

    try {
      const task = await createRunwayVideoTask({
        model: request.modelId,
        promptText: request.prompt,
        ratio: request.settings.ratio,
        duration,
      });
      const { error: taskUpdateError } = await database.from('generations').update({
        status: 'processing',
        provider_request_id: task.taskId,
      }).eq('id', id).eq('user_id', actor.userId);
      if (taskUpdateError) throw new Error('VIDEO_TASK_LINK_FAILED');
      return {
        success: true,
        generationId: id,
        status: 'processing',
        creditsReserved: requiredCredits,
        creditsConsumed: 0,
        remainingBalance: deduction.newBalance,
      };
    } catch (error) {
      const failure = normalizeVideoFailure(error);
      const refund = await refundVideoCredits(actor.userId, id, requiredCredits, failure.code);
      await database.from('generations').update({
        status: 'failed',
        credits_consumed: 0,
        error_message: failure.code,
      }).eq('id', id).eq('user_id', actor.userId);
      return {
        success: false,
        generationId: id,
        status: 'failed',
        creditsReserved: requiredCredits,
        creditsConsumed: 0,
        remainingBalance: refund.success ? refund.newBalance : deduction.newBalance,
        errorCode: failure.code,
        errorMessage: `${failure.message}${refund.success ? ' تم إعادة النقاط تلقائيًا.' : ' تعذر تأكيد إعادة النقاط تلقائيًا.'}`,
        wasRefunded: refund.success,
      };
    }
  }

  public static async refresh(actor: AuthContext, id: string): Promise<VideoGenerationResult> {
    if (!actor?.userId) throw new Error('UNAUTHORIZED');
    const database = createPrivilegedSupabaseClient();
    const { data: generation, error } = await database.from('generations')
      .select('id,user_id,project_id,status,provider_request_id,credits_reserved,credits_consumed,created_at')
      .eq('id', id)
      .eq('user_id', actor.userId)
      .eq('generation_type', 'video')
      .maybeSingle();
    if (error || !generation) throw new Error('VIDEO_GENERATION_NOT_FOUND');

    const reserved = Number(generation.credits_reserved || 0);
    const consumed = Number(generation.credits_consumed || 0);
    if (generation.status === 'completed') {
      const { data: asset } = await database.from('assets')
        .select('file_path')
        .eq('generation_id', id)
        .eq('user_id', actor.userId)
        .maybeSingle();
      let resultUrl: string | undefined;
      if (asset?.file_path) {
        const { data: signed } = await database.storage.from(VIDEO_BUCKET).createSignedUrl(asset.file_path, 3600);
        resultUrl = signed?.signedUrl || undefined;
      }
      return { success: true, generationId: id, status: 'completed', creditsReserved: reserved, creditsConsumed: consumed, resultUrl };
    }
    if (generation.status === 'failed' || generation.status === 'cancelled') {
      return { success: false, generationId: id, status: generation.status, creditsReserved: reserved, creditsConsumed: 0 };
    }
    if (!generation.provider_request_id) {
      return { success: true, generationId: id, status: 'queued', creditsReserved: reserved, creditsConsumed: 0 };
    }

    let task;
    try {
      task = await getRunwayTask(generation.provider_request_id);
    } catch (providerError) {
      const failure = normalizeVideoFailure(providerError);
      if (failure.transient) {
        return {
          success: true,
          generationId: id,
          status: generation.status === 'queued' ? 'queued' : 'processing',
          creditsReserved: reserved,
          creditsConsumed: 0,
          errorCode: failure.code,
          errorMessage: failure.message,
        };
      }
      throw providerError;
    }

    if (task.status === 'queued' || task.status === 'processing') {
      const nextStatus = task.status === 'queued' ? 'queued' : 'processing';
      if (generation.status !== nextStatus) {
        await database.from('generations').update({ status: nextStatus }).eq('id', id).eq('user_id', actor.userId);
      }
      return { success: true, generationId: id, status: nextStatus, creditsReserved: reserved, creditsConsumed: 0 };
    }

    if (task.status === 'failed' || task.status === 'cancelled') {
      const failureCode = task.status === 'cancelled' ? 'VIDEO_PROVIDER_CANCELLED' : 'VIDEO_PROVIDER_FAILED';
      const refund = await refundVideoCredits(actor.userId, id, reserved, failureCode);
      const finalStatus = task.status === 'cancelled' ? 'cancelled' : 'failed';
      await database.from('generations').update({
        status: finalStatus,
        credits_consumed: 0,
        error_message: failureCode,
      }).eq('id', id).eq('user_id', actor.userId);
      return {
        success: false,
        generationId: id,
        status: finalStatus,
        creditsReserved: reserved,
        creditsConsumed: 0,
        remainingBalance: refund.success ? refund.newBalance : undefined,
        errorCode: failureCode,
        errorMessage: refund.success ? 'لم يكتمل الفيديو وتمت إعادة النقاط تلقائيًا.' : 'لم يكتمل الفيديو وتعذر تأكيد إعادة النقاط تلقائيًا.',
        wasRefunded: refund.success,
      };
    }

    const storagePath = `${actor.userId}/${id}/video.mp4`;
    try {
      const bytes = await downloadRunwayVideo(task.outputUrls[0]);
      const { error: uploadError } = await database.storage.from(VIDEO_BUCKET).upload(storagePath, bytes, {
        contentType: 'video/mp4',
        upsert: false,
      });
      if (uploadError && !String(uploadError.message || '').toLowerCase().includes('already exists')) {
        throw new Error('VIDEO_ASSET_UPLOAD_FAILED');
      }
      const assetId = `asset_${id}_video`;
      const { error: assetError } = await database.from('assets').upsert({
        id: assetId,
        user_id: actor.userId,
        project_id: generation.project_id,
        generation_id: id,
        name: `brandbox-${id}.mp4`,
        file_path: storagePath,
        mime_type: 'video/mp4',
      }, { onConflict: 'id' });
      if (assetError) throw new Error('VIDEO_ASSET_LOG_FAILED');

      const durationMs = generation.created_at
        ? Math.max(0, Date.now() - new Date(generation.created_at).getTime())
        : null;
      const { error: completeError } = await database.from('generations').update({
        status: 'completed',
        credits_consumed: reserved,
        result_url: storagePath,
        error_message: null,
        duration_ms: durationMs,
      }).eq('id', id).eq('user_id', actor.userId);
      if (completeError) throw new Error('VIDEO_ASSET_FINALIZE_FAILED');
      const { data: signed, error: signedError } = await database.storage.from(VIDEO_BUCKET).createSignedUrl(storagePath, 3600);
      if (signedError || !signed?.signedUrl) throw new Error('VIDEO_ASSET_SIGN_FAILED');
      return {
        success: true,
        generationId: id,
        status: 'completed',
        creditsReserved: reserved,
        creditsConsumed: reserved,
        resultUrl: signed.signedUrl,
      };
    } catch (persistenceError) {
      try {
        await database.from('assets').delete().eq('generation_id', id).eq('user_id', actor.userId);
        await database.storage.from(VIDEO_BUCKET).remove([storagePath]);
      } catch { /* best effort */ }
      const failure = normalizeVideoFailure(persistenceError);
      const refund = await refundVideoCredits(actor.userId, id, reserved, failure.code);
      await database.from('generations').update({
        status: 'failed',
        credits_consumed: 0,
        result_url: null,
        error_message: failure.code,
      }).eq('id', id).eq('user_id', actor.userId);
      return {
        success: false,
        generationId: id,
        status: 'failed',
        creditsReserved: reserved,
        creditsConsumed: 0,
        remainingBalance: refund.success ? refund.newBalance : undefined,
        errorCode: failure.code,
        errorMessage: `${failure.message}${refund.success ? ' تم إعادة النقاط تلقائيًا.' : ' تعذر تأكيد إعادة النقاط تلقائيًا.'}`,
        wasRefunded: refund.success,
      };
    }
  }
}
