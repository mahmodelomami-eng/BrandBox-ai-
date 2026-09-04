import { createHash } from 'node:crypto';
import { CreditEngine } from '../credits/credit-engine';
import { AuthContext } from '../auth/rbac-engine';
import { createOpenRouterChatCompletion, createOpenRouterImageGeneration } from '../ai/openrouter-client';
import { emitServerError } from '../observability/telemetry';
import { createPrivilegedSupabaseClient } from '../supabase/server';

export interface GenerationRequest {
  generationType: 'chat' | 'image' | 'video';
  modelId: string;
  prompt: string;
  requestId: string;
  projectId?: string;
  settings?: Record<string, any>;
  simulateFailure?: boolean;
}

export interface GenerationExecutionContext {
  unitCredits?: number;
  chatSystemPrompt?: string;
  imagePromptSuffix?: string;
}

export interface GenerationResponse {
  success: boolean;
  generationId: string;
  creditsConsumed: number;
  remainingBalance: number;
  status?: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  retryable?: boolean;
  retryAfterMs?: number;
  resultUrl?: string;
  resultUrls?: string[];
  storagePaths?: string[];
  content?: string;
  errorMessage?: string;
  wasRefunded?: boolean;
}

type NormalizedFailure = { code: string; userMessage: string };

function safeGenerationRequestId(requestId: string): string {
  const value = String(requestId || '').trim();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(value)) throw new Error('INVALID_GENERATION_REQUEST_ID');
  return value;
}

export function generationIdForRequest(userId: string, requestId: string): string {
  const digest = createHash('sha256').update(`${userId}:${requestId}`).digest('hex');
  return `gen_${digest.slice(0, 40)}`;
}

export function generationReplayDisposition(status: string): { success: boolean; retryable: boolean } {
  if (status === 'completed') return { success: true, retryable: false };
  if (status === 'queued' || status === 'processing') return { success: false, retryable: true };
  return { success: false, retryable: false };
}

async function resolveExistingGeneration(
  database: ReturnType<typeof createPrivilegedSupabaseClient>,
  userId: string,
  generationId: string
): Promise<GenerationResponse | null> {
  const { data: existing, error } = await database.from('generations')
    .select('id,generation_type,status,credits_consumed,result_content,error_message')
    .eq('id', generationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`GENERATION_IDEMPOTENCY_LOOKUP_FAILED: ${error.message}`);
  if (!existing) return null;

  let remainingBalance = 0;
  try { remainingBalance = await CreditEngine.getBalance(userId); } catch { /* replay remains authoritative */ }
  const resultUrls: string[] = [];
  const storagePaths: string[] = [];
  if (existing.generation_type === 'image' && existing.status === 'completed') {
    const { data: assets, error: assetsError } = await database.from('assets')
      .select('file_path')
      .eq('generation_id', generationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (assetsError) throw new Error(`GENERATION_IDEMPOTENCY_LOOKUP_FAILED: ${assetsError.message}`);
    for (const asset of assets || []) {
      storagePaths.push(asset.file_path);
      const { data: signed, error: signedError } = await database.storage
        .from('generation-assets')
        .createSignedUrl(asset.file_path, 3600);
      if (signedError || !signed?.signedUrl) {
        throw new Error(`GENERATION_IDEMPOTENCY_LOOKUP_FAILED: ${signedError?.message || 'No signed URL returned'}`);
      }
      resultUrls.push(signed.signedUrl);
    }
  }

  const disposition = generationReplayDisposition(existing.status);
  const inProgressMessage = 'GENERATION_IN_PROGRESS: عملية التوليد قيد التنفيذ. أعد التحقق بعد قليل.';
  return {
    success: disposition.success,
    generationId: existing.id,
    creditsConsumed: Number(existing.credits_consumed || 0),
    remainingBalance,
    status: existing.status,
    retryable: disposition.retryable,
    retryAfterMs: disposition.retryable ? 2000 : undefined,
    content: typeof existing.result_content === 'string' ? existing.result_content : undefined,
    resultUrl: resultUrls[0],
    resultUrls,
    storagePaths,
    errorMessage: disposition.success
      ? undefined
      : disposition.retryable
        ? inProgressMessage
        : typeof existing.error_message === 'string' ? existing.error_message : 'GENERATION_FAILED',
  };
}

function normalizeGenerationFailure(error: unknown): NormalizedFailure {
  const raw = error instanceof Error ? error.message : '';
  if (
    raw.startsWith('OPENROUTER_TIMEOUT') ||
    raw.startsWith('OPENROUTER_IMAGE_TIMEOUT') ||
    raw.startsWith('SIMULATED_AI_PROVIDER_TIMEOUT')
  ) {
    return { code: 'AI_PROVIDER_TIMEOUT', userMessage: 'انتهت مهلة الاتصال بمزود الذكاء الاصطناعي.' };
  }
  if (raw.startsWith('OPENROUTER_RATE_LIMITED') || raw.startsWith('OPENROUTER_IMAGE_RATE_LIMITED')) {
    return { code: 'AI_PROVIDER_RATE_LIMITED', userMessage: 'المزود مشغول حاليًا. حاول مرة أخرى بعد قليل.' };
  }
  if (raw.startsWith('OPENROUTER_PROVIDER_UNAVAILABLE') || raw.startsWith('OPENROUTER_IMAGE_PROVIDER_UNAVAILABLE')) {
    return { code: 'AI_PROVIDER_UNAVAILABLE', userMessage: 'خدمة الذكاء الاصطناعي غير متاحة مؤقتًا.' };
  }
  if (
    raw.startsWith('OPENROUTER_AUTH_FAILED') ||
    raw.startsWith('OPENROUTER_IMAGE_AUTH_FAILED') ||
    raw.startsWith('OPENROUTER_API_KEY_MISSING')
  ) {
    return { code: 'AI_PROVIDER_CONFIGURATION', userMessage: 'تكامل مزود الذكاء الاصطناعي يحتاج مراجعة إدارية.' };
  }
  if (raw.startsWith('OPENROUTER_REQUEST_REJECTED') || raw.startsWith('OPENROUTER_IMAGE_REQUEST_REJECTED')) {
    return { code: 'AI_PROVIDER_REQUEST_REJECTED', userMessage: 'تعذر قبول الطلب من مزود الذكاء الاصطناعي.' };
  }
  if (
    raw.startsWith('OPENROUTER_EMPTY_RESPONSE') ||
    raw.startsWith('OPENROUTER_INVALID_RESPONSE') ||
    raw.startsWith('OPENROUTER_IMAGE_EMPTY_RESPONSE') ||
    raw.startsWith('OPENROUTER_IMAGE_INVALID_RESPONSE')
  ) {
    return { code: 'AI_PROVIDER_INVALID_RESPONSE', userMessage: 'وصل رد غير صالح من مزود الذكاء الاصطناعي.' };
  }
  if (
    raw.startsWith('OPENROUTER_IMAGE_MODEL_NOT_ALLOWED') ||
    raw.startsWith('OPENROUTER_INVALID_IMAGE_REQUEST') ||
    raw.startsWith('OPENROUTER_INVALID_ASPECT_RATIO') ||
    raw.startsWith('OPENROUTER_INVALID_IMAGE_RESOLUTION') ||
    raw.startsWith('OPENROUTER_INVALID_IMAGE_COUNT')
  ) {
    return { code: 'AI_IMAGE_REQUEST_INVALID', userMessage: 'إعدادات توليد الصورة غير مدعومة.' };
  }
  return { code: 'GENERATION_FAILED', userMessage: 'تعذر إكمال عملية التوليد.' };
}

export class GenerationEngine {
  public static async executeGeneration(
    actor: AuthContext,
    request: GenerationRequest,
    executionContext: GenerationExecutionContext = {}
  ): Promise<GenerationResponse> {
    if (!actor || !actor.userId) {
      throw new Error('UNAUTHORIZED: Authentication required for AI generation.');
    }

    const requestId = safeGenerationRequestId(request.requestId);
    const generationId = generationIdForRequest(actor.userId, requestId);
    const requestedCount = request.generationType === 'image'
      ? Math.max(1, Math.min(4, Math.trunc(Number(request.settings?.count) || 1)))
      : 1;
    const trustedUnitCredits = Number(executionContext.unitCredits);
    const unitCredits = Number.isFinite(trustedUnitCredits) && trustedUnitCredits >= 1
      ? Math.trunc(trustedUnitCredits)
      : CreditEngine.calculateRequiredCredits(request.modelId, request.generationType);
    const requiredCredits = unitCredits * requestedCount;
    const database = createPrivilegedSupabaseClient();
    const existingGeneration = await resolveExistingGeneration(database, actor.userId, generationId);
    if (existingGeneration) return existingGeneration;

    const currentBalance = await CreditEngine.getBalance(actor.userId);
    if (currentBalance < requiredCredits) {
      return {
        success: false,
        generationId,
        creditsConsumed: 0,
        remainingBalance: currentBalance,
        errorMessage: `INSUFFICIENT_CREDITS: Required ${requiredCredits} credits, but current balance is ${currentBalance}.`
      };
    }

    const deductDkey = `gen_deduct_${generationId}`;
    const deductionRes = await CreditEngine.deductCredits(
      actor.userId,
      requiredCredits,
      `AI Generation (${request.modelId})`,
      'generation',
      generationId,
      deductDkey,
      actor.userId
    );

    if (!deductionRes.success) {
      return {
        success: false,
        generationId,
        creditsConsumed: 0,
        remainingBalance: deductionRes.newBalance,
        errorMessage: deductionRes.message
      };
    }

    const uploadedPaths: string[] = [];
    try {
      const startedAt = Date.now();
      const { error: insertError } = await database.from('generations').insert({
        id: generationId,
        user_id: actor.userId,
        project_id: request.projectId || null,
        generation_type: request.generationType,
        provider: 'openrouter',
        model: request.modelId,
        prompt: request.prompt,
        settings: request.settings || {},
        status: 'processing',
        credits_reserved: requiredCredits,
        credits_consumed: 0,
        idempotency_key: deductDkey,
      });
      if (insertError) {
        const concurrentGeneration = await resolveExistingGeneration(database, actor.userId, generationId);
        if (concurrentGeneration) return concurrentGeneration;
        throw new Error(`GENERATION_LOG_CREATE_FAILED: ${insertError.message}`);
      }

      if (request.simulateFailure) {
        throw new Error('SIMULATED_AI_PROVIDER_TIMEOUT');
      }

      const chatResult = request.generationType === 'chat'
        ? await createOpenRouterChatCompletion({
            model: request.modelId,
            prompt: request.prompt,
            systemPrompt: executionContext.chatSystemPrompt,
            temperature: typeof request.settings?.temperature === 'number' ? request.settings.temperature : undefined,
            maxTokens: typeof request.settings?.maxTokens === 'number' ? request.settings.maxTokens : undefined,
          })
        : undefined;
      const imageResolution = ['512', '1K', '2K', '4K'].includes(String(request.settings?.resolution))
        ? request.settings?.resolution as '512' | '1K' | '2K' | '4K'
        : '1K';
      const imagePromptSuffix = executionContext.imagePromptSuffix?.trim();
      const providerImagePrompt = imagePromptSuffix
        ? `${request.prompt.trim()}\n${imagePromptSuffix}`
        : request.prompt;
      const imageResult = request.generationType === 'image'
        ? await createOpenRouterImageGeneration({
            model: request.modelId,
            prompt: providerImagePrompt,
            aspectRatio: typeof request.settings?.aspectRatio === 'string' ? request.settings.aspectRatio : '1:1',
            count: requestedCount,
            resolution: imageResolution,
          })
        : undefined;
      const responseContent = chatResult?.content;
      const responseUrls: string[] = [];

      if (imageResult) {
        const extensionByMime = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;
        for (const [index, image] of imageResult.images.entries()) {
          const extension = extensionByMime[image.mediaType];
          const storagePath = `${actor.userId}/${generationId}/${index + 1}.${extension}`;
          const imageBytes = Buffer.from(image.base64, 'base64');
          if (!imageBytes.length || imageBytes.length > 15 * 1024 * 1024) throw new Error('OPENROUTER_IMAGE_SIZE_INVALID');
          const { error: uploadError } = await database.storage.from('generation-assets').upload(storagePath, imageBytes, {
            contentType: image.mediaType,
            upsert: false,
          });
          if (uploadError) throw new Error(`GENERATION_ASSET_UPLOAD_FAILED: ${uploadError.message}`);
          uploadedPaths.push(storagePath);
          const { data: signed, error: signedError } = await database.storage.from('generation-assets').createSignedUrl(storagePath, 3600);
          if (signedError || !signed?.signedUrl) throw new Error(`GENERATION_ASSET_SIGN_FAILED: ${signedError?.message || 'No signed URL returned'}`);
          responseUrls.push(signed.signedUrl);
        }

        const assetRows = uploadedPaths.map((filePath, index) => ({
          id: `asset_${generationId}_${index + 1}`,
          user_id: actor.userId,
          project_id: request.projectId || null,
          generation_id: generationId,
          name: `brandbox-${generationId}-${index + 1}.${filePath.split('.').pop()}`,
          file_path: filePath,
          mime_type: imageResult.images[index].mediaType,
        }));
        const { error: assetsError } = await database.from('assets').insert(assetRows);
        if (assetsError) throw new Error(`GENERATION_ASSET_LOG_FAILED: ${assetsError.message}`);
      }

      const providerUsage = chatResult || imageResult;

      const { error: completeError } = await database.from('generations').update({
        status: 'completed',
        credits_consumed: requiredCredits,
        result_content: responseContent || null,
        result_url: uploadedPaths[0] || null,
        provider_request_id: chatResult?.requestId || null,
        prompt_tokens: providerUsage?.promptTokens ?? null,
        completion_tokens: providerUsage?.completionTokens ?? null,
        total_tokens: providerUsage?.totalTokens ?? null,
        provider_cost_usd: providerUsage?.costUsd ?? null,
        duration_ms: Date.now() - startedAt,
      }).eq('id', generationId).eq('user_id', actor.userId);
      if (completeError) throw new Error(`GENERATION_LOG_COMPLETE_FAILED: ${completeError.message}`);

      return {
        success: true,
        generationId,
        creditsConsumed: requiredCredits,
        remainingBalance: deductionRes.newBalance,
        status: 'completed',
        content: responseContent,
        resultUrl: responseUrls[0],
        resultUrls: responseUrls,
        storagePaths: uploadedPaths,
      };
    } catch (err: any) {
      if (uploadedPaths.length) {
        try {
          const cleanupDatabase = createPrivilegedSupabaseClient();
          await cleanupDatabase.from('assets').delete().eq('generation_id', generationId).eq('user_id', actor.userId);
          await cleanupDatabase.storage.from('generation-assets').remove(uploadedPaths);
        } catch { /* best-effort cleanup */ }
      }

      const failure = normalizeGenerationFailure(err);
      const refundDkey = `gen_refund_${generationId}`;
      let refundRes = await CreditEngine.refundCredits(
        actor.userId,
        requiredCredits,
        `Automatic Refund: ${failure.code}`,
        'generation_failure_refund',
        generationId,
        refundDkey,
        actor.userId
      );
      if (!refundRes.success) {
        refundRes = await CreditEngine.refundCredits(
          actor.userId,
          requiredCredits,
          `Automatic Refund Retry: ${failure.code}`,
          'generation_failure_refund',
          generationId,
          refundDkey,
          actor.userId
        );
      }

      try {
        await createPrivilegedSupabaseClient().from('generations').update({
          status: 'failed',
          credits_consumed: 0,
          error_message: failure.code,
        }).eq('id', generationId).eq('user_id', actor.userId);
      } catch {
        // The original provider/persistence error remains the authoritative failure.
      }

      let remainingBalance = refundRes.success ? refundRes.newBalance : deductionRes.newBalance;
      if (!refundRes.success) {
        try { remainingBalance = await CreditEngine.getBalance(actor.userId); } catch { /* retain last known balance */ }
      }

      emitServerError('generation execution failed', err, {
        requestId,
        generationId,
        generationType: request.generationType,
        failureCode: failure.code,
        refundConfirmed: refundRes.success,
      });

      return {
        success: false,
        generationId,
        creditsConsumed: 0,
        remainingBalance,
        status: 'failed',
        errorMessage: `${failure.code}: ${failure.userMessage}${refundRes.success ? ' تم إعادة النقاط تلقائيًا.' : ' تعذر تأكيد إعادة النقاط تلقائيًا وتم تسجيل العملية كفاشلة للمراجعة.'}`,
        wasRefunded: refundRes.success
      };
    }
  }
}
