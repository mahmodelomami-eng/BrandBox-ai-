import { CreditEngine } from '../credits/credit-engine';
import { AuthContext } from '../auth/rbac-engine';
import { createOpenRouterChatCompletion } from '../ai/openrouter-client';
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
    const requiredCredits = CreditEngine.calculateRequiredCredits(request.modelId, request.generationType);

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

      const providerResult = request.generationType === 'chat'
        ? await createOpenRouterChatCompletion({
            model: request.modelId,
            prompt: request.prompt,
            temperature: typeof request.settings?.temperature === 'number' ? request.settings.temperature : undefined,
            maxTokens: typeof request.settings?.maxTokens === 'number' ? request.settings.maxTokens : undefined,
          })
        : undefined;
      const responseContent = providerResult?.content;

      const responseUrl = request.generationType === 'image'
        ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80'
        : undefined;

      const { error: completeError } = await database.from('generations').update({
        status: 'completed',
        credits_consumed: requiredCredits,
        result_content: responseContent || null,
        result_url: responseUrl || null,
        provider_request_id: providerResult?.requestId || null,
        prompt_tokens: providerResult?.promptTokens ?? null,
        completion_tokens: providerResult?.completionTokens ?? null,
        total_tokens: providerResult?.totalTokens ?? null,
        provider_cost_usd: providerResult?.costUsd ?? null,
        duration_ms: Date.now() - startedAt,
      }).eq('id', generationId).eq('user_id', actor.userId);
      if (completeError) throw new Error(`GENERATION_LOG_COMPLETE_FAILED: ${completeError.message}`);

      return {
        success: true,
        generationId,
        creditsConsumed: requiredCredits,
        remainingBalance: deductionRes.newBalance,
        content: responseContent,
        resultUrl: responseUrl
      };
    } catch (err: any) {
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
