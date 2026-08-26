import { CreditEngine } from '../credits/credit-engine';
import { AuthContext } from '../auth/rbac-engine';
import { createOpenRouterChatCompletion, createOpenRouterImageGeneration } from '../ai/openrouter-client';
import { ChatCreditQuote, PricingEngine } from '../billing/pricing-engine';
import { createPrivilegedSupabaseClient } from '../supabase/server';

export interface GenerationRequest {
  generationType: 'chat' | 'image' | 'video';
  modelId: string;
  prompt: string;
  projectId?: string;
  settings?: Record<string, any>;
  simulateFailure?: boolean;
}

export interface GenerationResponse {
  success: boolean;
  generationId: string;
  creditsConsumed: number;
  remainingBalance: number;
  resultUrl?: string;
  resultUrls?: string[];
  storagePaths?: string[];
  content?: string;
  errorMessage?: string;
  wasRefunded?: boolean;
  freeUsage?: {
    userUsed: number;
    userLimit: number;
    globalUsed: number;
    globalLimit: number;
  };
}

type FreeClaim = {
  allowed: boolean;
  message: string;
  user_used: number;
  user_limit: number;
  global_used: number;
  global_limit: number;
};

export class GenerationEngine {
  public static async executeGeneration(
    actor: AuthContext,
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    if (!actor || !actor.userId) {
      throw new Error('UNAUTHORIZED: Authentication required for AI generation.');
    }

    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const requestedCount = request.generationType === 'image'
      ? Math.max(1, Math.min(4, Math.trunc(Number(request.settings?.count) || 1)))
      : 1;

    let chatQuote: ChatCreditQuote | null = null;
    let requiredCredits: number;
    try {
      if (request.generationType === 'chat') {
        chatQuote = await PricingEngine.quoteChat({
          modelId: request.modelId,
          prompt: request.prompt,
          maxTokens: typeof request.settings?.maxTokens === 'number' ? request.settings.maxTokens : 1200,
        });
        requiredCredits = chatQuote.credits;
      } else {
        requiredCredits = CreditEngine.calculateRequiredCredits(request.modelId, request.generationType) * requestedCount;
      }
    } catch (pricingError) {
      return {
        success: false,
        generationId,
        creditsConsumed: 0,
        remainingBalance: await CreditEngine.getBalance(actor.userId),
        errorMessage: `BILLING_PRICING_UNAVAILABLE: ${pricingError instanceof Error ? pricingError.message : 'Unable to calculate Credit price.'}`,
      };
    }

    const database = createPrivilegedSupabaseClient();
    const currentBalance = await CreditEngine.getBalance(actor.userId);
    const isFreeOperation = Boolean(chatQuote?.isFree && requiredCredits === 0);
    let freeClaim: FreeClaim | null = null;
    let balanceAfterReservation = currentBalance;
    const reservationKey = isFreeOperation ? `free_claim_${generationId}` : `gen_deduct_${generationId}`;

    if (isFreeOperation) {
      const { data: claimRows, error: claimError } = await database.rpc('claim_free_ai_request', {
        p_user_id: actor.userId,
        p_model_id: request.modelId,
        p_generation_id: generationId,
      });
      freeClaim = Array.isArray(claimRows) ? (claimRows[0] as FreeClaim | undefined) || null : null;
      if (claimError || !freeClaim?.allowed) {
        return {
          success: false,
          generationId,
          creditsConsumed: 0,
          remainingBalance: currentBalance,
          errorMessage: freeClaim?.message || `FREE_QUOTA_UNAVAILABLE: ${claimError?.message || 'Unable to reserve free request.'}`,
          freeUsage: freeClaim ? {
            userUsed: freeClaim.user_used,
            userLimit: freeClaim.user_limit,
            globalUsed: freeClaim.global_used,
            globalLimit: freeClaim.global_limit,
          } : undefined,
        };
      }
    } else {
      if (currentBalance < requiredCredits) {
        return {
          success: false,
          generationId,
          creditsConsumed: 0,
          remainingBalance: currentBalance,
          errorMessage: `INSUFFICIENT_CREDITS: Required ${requiredCredits} Credit, but current balance is ${currentBalance}.`
        };
      }

      const deductionRes = await CreditEngine.deductCredits(
        actor.userId,
        requiredCredits,
        `AI Generation (${request.modelId})`,
        'generation',
        generationId,
        reservationKey,
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
      balanceAfterReservation = deductionRes.newBalance;
    }

    const uploadedPaths: string[] = [];
    let providerAttempted = false;
    try {
      const startedAt = Date.now();
      const persistedSettings = { ...(request.settings || {}) };
      if ('imageDataUrl' in persistedSettings) {
        delete persistedSettings.imageDataUrl;
        persistedSettings.hasInputImage = true;
      }

      const { error: insertError } = await database.from('generations').insert({
        id: generationId,
        user_id: actor.userId,
        project_id: request.projectId || null,
        generation_type: request.generationType,
        provider: 'openrouter',
        model: request.modelId,
        prompt: request.prompt,
        settings: persistedSettings,
        status: 'processing',
        credits_reserved: requiredCredits,
        credits_consumed: 0,
        idempotency_key: reservationKey,
      });
      if (insertError) throw new Error(`GENERATION_LOG_CREATE_FAILED: ${insertError.message}`);

      if (request.simulateFailure) {
        providerAttempted = true;
        throw new Error('SIMULATED_AI_PROVIDER_TIMEOUT');
      }

      if (request.generationType === 'chat') providerAttempted = true;
      const chatResult = request.generationType === 'chat'
        ? await createOpenRouterChatCompletion({
            model: request.modelId,
            prompt: request.prompt,
            temperature: typeof request.settings?.temperature === 'number' ? request.settings.temperature : undefined,
            maxTokens: typeof request.settings?.maxTokens === 'number' ? request.settings.maxTokens : undefined,
            imageDataUrl: typeof request.settings?.imageDataUrl === 'string' ? request.settings.imageDataUrl : undefined,
          })
        : undefined;
      if (request.generationType === 'image') providerAttempted = true;
      const imageResult = request.generationType === 'image'
        ? await createOpenRouterImageGeneration({
            model: request.modelId,
            prompt: request.prompt,
            aspectRatio: typeof request.settings?.aspectRatio === 'string' ? request.settings.aspectRatio : '1:1',
            count: requestedCount,
            resolution: request.settings?.resolution === '2K' ? '2K' : '1K',
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
        provider_cost_usd: providerUsage?.costUsd ?? (isFreeOperation ? 0 : null),
        duration_ms: Date.now() - startedAt,
      }).eq('id', generationId).eq('user_id', actor.userId);
      if (completeError) throw new Error(`GENERATION_LOG_COMPLETE_FAILED: ${completeError.message}`);

      if (chatQuote) {
        try {
          const providerCostUsd = typeof providerUsage?.costUsd === 'number' ? providerUsage.costUsd : (chatQuote.isFree ? 0 : null);
          const actualPricing = providerCostUsd == null
            ? null
            : PricingEngine.settleActualProviderCost(providerCostUsd, chatQuote, chatQuote.isFree ? 0 : 1);
          const billedReferenceValueLyd = requiredCredits * chatQuote.settings.referenceCreditValueLyd;
          const realizedGrossMarginPct = actualPricing && billedReferenceValueLyd > 0
            ? ((billedReferenceValueLyd - actualPricing.acquisitionCostLyd) / billedReferenceValueLyd) * 100
            : null;

          const { error: financialError } = await database.from('generation_financials').upsert({
            generation_id: generationId,
            model_id: request.modelId,
            provider: 'openrouter',
            provider_cost_usd: providerCostUsd,
            quoted_credits: requiredCredits,
            charged_credits: requiredCredits,
            market_usd_lyd: chatQuote.settings.marketUsdLyd,
            openrouter_topup_fee_pct: chatQuote.settings.openRouterTopupFeePct,
            bank_transfer_fee_pct: chatQuote.settings.bankTransferFeePct,
            risk_buffer_pct: chatQuote.settings.riskBufferPct,
            target_gross_margin_pct: chatQuote.settings.targetGrossMarginPct,
            reference_credit_value_lyd: chatQuote.settings.referenceCreditValueLyd,
            acquisition_cost_lyd: actualPricing?.acquisitionCostLyd ?? null,
            billed_reference_value_lyd: billedReferenceValueLyd,
            realized_gross_margin_pct: realizedGrossMarginPct,
            pricing_version: chatQuote.isFree ? 'free-pilot-v1' : 'credits-v1',
            updated_at: new Date().toISOString(),
          });
          if (financialError) console.error('GENERATION_FINANCIAL_AUDIT_FAILED', financialError.message, generationId);
        } catch (financialAuditError) {
          console.error('GENERATION_FINANCIAL_AUDIT_FAILED', financialAuditError, generationId);
        }
      }

      return {
        success: true,
        generationId,
        creditsConsumed: requiredCredits,
        remainingBalance: balanceAfterReservation,
        content: responseContent,
        resultUrl: responseUrls[0],
        resultUrls: responseUrls,
        storagePaths: uploadedPaths,
        freeUsage: freeClaim ? {
          userUsed: freeClaim.user_used,
          userLimit: freeClaim.user_limit,
          globalUsed: freeClaim.global_used,
          globalLimit: freeClaim.global_limit,
        } : undefined,
      };
    } catch (err: any) {
      if (uploadedPaths.length) {
        try {
          await database.from('assets').delete().eq('generation_id', generationId).eq('user_id', actor.userId);
          await database.storage.from('generation-assets').remove(uploadedPaths);
        } catch { /* best-effort cleanup */ }
      }

      let remainingBalance = balanceAfterReservation;
      let wasRefunded = false;
      if (!isFreeOperation && requiredCredits > 0) {
        const refundDkey = `gen_refund_${generationId}`;
        const refundRes = await CreditEngine.refundCredits(
          actor.userId,
          requiredCredits,
          `Automatic Refund: AI Provider Failure (${err?.message || 'Unknown Error'})`,
          'generation_failure_refund',
          generationId,
          refundDkey,
          actor.userId
        );
        remainingBalance = refundRes.newBalance;
        wasRefunded = true;
      } else if (isFreeOperation && !providerAttempted) {
        // A local persistence failure before the provider request should not consume free quota.
        try { await database.from('free_ai_request_claims').delete().eq('generation_id', generationId); } catch { /* best effort */ }
      }

      try {
        await database.from('generations').update({
          status: 'failed',
          credits_consumed: 0,
          error_message: err?.message || 'Generation failed',
        }).eq('id', generationId).eq('user_id', actor.userId);
      } catch {
        // The original provider/persistence error remains the authoritative failure.
      }

      return {
        success: false,
        generationId,
        creditsConsumed: 0,
        remainingBalance,
        errorMessage: isFreeOperation
          ? `AI_PROVIDER_ERROR: ${err?.message || 'Generation failed'}. No Credit was charged.`
          : `AI_PROVIDER_ERROR: ${err?.message || 'Generation failed'}. Credits refunded automatically.`,
        wasRefunded,
        freeUsage: freeClaim ? {
          userUsed: freeClaim.user_used,
          userLimit: freeClaim.user_limit,
          globalUsed: freeClaim.global_used,
          globalLimit: freeClaim.global_limit,
        } : undefined,
      };
    }
  }
}
