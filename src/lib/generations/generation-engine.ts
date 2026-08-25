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
}

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
      if (request.generationType === 'chat' && request.modelId === 'google/gemini-3.7-flash') {
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

    const currentBalance = await CreditEngine.getBalance(actor.userId);
    if (currentBalance < requiredCredits) {
      return {
        success: false,
        generationId,
        creditsConsumed: 0,
        remainingBalance: currentBalance,
        errorMessage: `INSUFFICIENT_CREDITS: Required ${requiredCredits} Credit, but current balance is ${currentBalance}.`
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
      const database = createPrivilegedSupabaseClient();
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
      if (insertError) throw new Error(`GENERATION_LOG_CREATE_FAILED: ${insertError.message}`);

      if (request.simulateFailure) {
        throw new Error('SIMULATED_AI_PROVIDER_TIMEOUT');
      }

      const chatResult = request.generationType === 'chat'
        ? await createOpenRouterChatCompletion({
            model: request.modelId,
            prompt: request.prompt,
            temperature: typeof request.settings?.temperature === 'number' ? request.settings.temperature : undefined,
            maxTokens: typeof request.settings?.maxTokens === 'number' ? request.settings.maxTokens : undefined,
          })
        : undefined;
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
        provider_cost_usd: providerUsage?.costUsd ?? null,
        duration_ms: Date.now() - startedAt,
      }).eq('id', generationId).eq('user_id', actor.userId);
      if (completeError) throw new Error(`GENERATION_LOG_COMPLETE_FAILED: ${completeError.message}`);

      if (chatQuote) {
        const providerCostUsd = typeof providerUsage?.costUsd === 'number' ? providerUsage.costUsd : null;
        const actualPricing = providerCostUsd == null
          ? null
          : PricingEngine.settleActualProviderCost(providerCostUsd, chatQuote, 1);
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
          pricing_version: 'credits-v1',
          updated_at: new Date().toISOString(),
        });
        if (financialError) throw new Error(`GENERATION_FINANCIAL_AUDIT_FAILED: ${financialError.message}`);
      }

      return {
        success: true,
        generationId,
        creditsConsumed: requiredCredits,
        remainingBalance: deductionRes.newBalance,
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

      try {
        await createPrivilegedSupabaseClient().from('generations').update({
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
        remainingBalance: refundRes.newBalance,
        errorMessage: `AI_PROVIDER_ERROR: ${err?.message || 'Generation failed'}. Credits refunded automatically.`,
        wasRefunded: true
      };
    }
  }
}
