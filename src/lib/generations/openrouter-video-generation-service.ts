import { CreditEngine } from '../credits/credit-engine';
import { AuthContext } from '../auth/rbac-engine';
import { createPrivilegedSupabaseClient } from '../supabase/server';
import {
  createOpenRouterVideoTask,
  downloadOpenRouterVideo,
  getOpenRouterVideoTask,
} from '../ai/openrouter-video-client';

const VIDEO_BUCKET = 'generation-video-assets';

export interface StartOpenRouterVideoGenerationRequest {
  modelId: string;
  prompt: string;
  projectId: string;
  requestId: string;
  settings: {
    ratio: string;
    duration: number;
    resolution: string;
    generateAudio?: boolean;
  };
}

export interface OpenRouterVideoGenerationResult {
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

interface StartContext {
  creditsPerSecond: number;
  minimumCredits: number;
}

function safeRequestId(requestId: string): string {
  const value = String(requestId || '').trim();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(value)) throw new Error('INVALID_VIDEO_REQUEST_ID');
  return value;
}

function generationId(): string {
  return `gen_video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFailure(error: unknown): { code: string; message: string; transient: boolean } {
  const raw = error instanceof Error ? error.message : '';
  if (raw === 'OPENROUTER_VIDEO_RATE_LIMITED') {
    return { code: 'VIDEO_PROVIDER_RATE_LIMITED', message: 'مزود الفيديو مشغول حاليًا. ستبقى المهمة محفوظة ويمكن تحديثها بعد قليل.', transient: true };
  }
  if (raw === 'OPENROUTER_VIDEO_PROVIDER_UNAVAILABLE' || raw === 'OPENROUTER_VIDEO_TIMEOUT') {
    return { code: 'VIDEO_PROVIDER_UNAVAILABLE', message: 'تعذر الوصول إلى مزود الفيديو مؤقتًا. ستبقى المهمة محفوظة ويمكن إعادة فحصها.', transient: true };
  }
  if (raw === 'OPENROUTER_VIDEO_AUTH_FAILED' || raw === 'OPENROUTER_API_KEY_MISSING') {
    return { code: 'VIDEO_PROVIDER_CONFIGURATION', message: 'تكامل مزود الفيديو يحتاج مراجعة إدارية.', transient: true };
  }
  if (raw === 'OPENROUTER_VIDEO_PAYMENT_REQUIRED') {
    return { code: 'VIDEO_PROVIDER_CREDIT_REQUIRED', message: 'تعذر تنفيذ الفيديو لأن رصيد المزود الخارجي غير كافٍ.', transient: false };
  }
  if (raw.startsWith('OPENROUTER_VIDEO_OUTPUT_') || raw.startsWith('VIDEO_ASSET_')) {
    return { code: 'VIDEO_OUTPUT_PERSISTENCE_FAILED', message: 'تم إنشاء الفيديو لكن تعذر حفظ النسخة الدائمة داخل Brand Box.', transient: false };
  }
  if (raw.startsWith('OPENROUTER_VIDEO_')) {
    return { code: 'VIDEO_PROVIDER_REQUEST_FAILED', message: 'تعذر تنفيذ طلب الفيديو لدى المزود.', transient: false };
  }
  return { code: 'VIDEO_GENERATION_FAILED', message: 'تعذر إكمال توليد الفيديو.', transient: false };
}

async function refundVideoCredits(userId: string, generationIdValue: string, amount: number, failureCode: string) {
  const refundKey = `video_refund_${generationIdValue}`;
  let result = await CreditEngine.refundCredits(
    userId,
    amount,
    `Automatic Video Refund: ${failureCode}`,
    'generation_failure_refund',
    generationIdValue,
    refundKey,
    userId
  );
  if (!result.success) {
    result = await CreditEngine.refundCredits(
      userId,
      amount,
      `Automatic Video Refund Retry: ${failureCode}`,
      'generation_failure_refund',
      generationIdValue,
      refundKey,
      userId
    );
  }
  return result;
}

export class OpenRouterVideoGenerationService {
  public static async start(
    actor: AuthContext,
    request: StartOpenRouterVideoGenerationRequest,
    context: StartContext
  ): Promise<OpenRouterVideoGenerationResult> {
    if (!actor?.userId) throw new Error('UNAUTHORIZED');
    const requestId = safeRequestId(request.requestId);
    const creditsPerSecond = Number(context.creditsPerSecond);
    const minimumCredits = Number(context.minimumCredits);
    const duration = Number(request.settings.duration);
    if (!Number.isInteger(creditsPerSecond) || creditsPerSecond < 1
      || !Number.isInteger(minimumCredits) || minimumCredits < 0
      || !Number.isInteger(duration) || duration < 1) {
      throw new Error('VIDEO_PRICING_UNAVAILABLE');
    }

    const requiredCredits = Math.max(minimumCredits, creditsPerSecond * duration);
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
      provider: 'openrouter',
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
      const task = await createOpenRouterVideoTask({
        model: request.modelId,
        prompt: request.prompt,
        duration,
        resolution: request.settings.resolution,
        aspectRatio: request.settings.ratio,
        generateAudio: request.settings.generateAudio === true,
      });
      const nextStatus = task.status === 'queued' ? 'queued' : 'processing';
      const { error: linkError } = await database.from('generations').update({
        status: nextStatus,
        provider_request_id: task.taskId,
      }).eq('id', id).eq('user_id', actor.userId);
      if (linkError) throw new Error('VIDEO_TASK_LINK_FAILED');
      return {
        success: true,
        generationId: id,
        status: nextStatus,
        creditsReserved: requiredCredits,
        creditsConsumed: 0,
        remainingBalance: deduction.newBalance,
      };
    } catch (error) {
      const failure = normalizeFailure(error);
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

  public static async refresh(actor: AuthContext, id: string): Promise<OpenRouterVideoGenerationResult> {
    if (!actor?.userId) throw new Error('UNAUTHORIZED');
    const database = createPrivilegedSupabaseClient();
    const { data: generation, error } = await database.from('generations')
      .select('id,user_id,project_id,status,provider,provider_request_id,credits_reserved,credits_consumed,created_at')
      .eq('id', id)
      .eq('user_id', actor.userId)
      .eq('generation_type', 'video')
      .eq('provider', 'openrouter')
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
      task = await getOpenRouterVideoTask(generation.provider_request_id);
    } catch (providerError) {
      const failure = normalizeFailure(providerError);
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
      const refund = await refundVideoCredits(actor.userId, id, reserved, failure.code);
      await database.from('generations').update({ status: 'failed', credits_consumed: 0, error_message: failure.code })
        .eq('id', id).eq('user_id', actor.userId);
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
      const finalStatus: 'failed' | 'cancelled' = task.status === 'cancelled' ? 'cancelled' : 'failed';
      await database.from('generations').update({ status: finalStatus, credits_consumed: 0, error_message: failureCode })
        .eq('id', id).eq('user_id', actor.userId);
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
      const bytes = await downloadOpenRouterVideo(generation.provider_request_id);
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
      } catch { /* best effort cleanup */ }
      const failure = normalizeFailure(persistenceError);
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
