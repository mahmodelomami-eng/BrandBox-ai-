import { randomUUID } from 'crypto';
import { CreditEngine } from '../credits/credit-engine';
import { createServerSupabaseClient } from '../supabase/server';
import { AuthContext } from '../auth/rbac-engine';
import { generateOpenRouterChat, isOpenRouterConfigured, isOpenRouterModelAllowed } from '../ai/openrouter';

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
  public static async executeGeneration(actor: AuthContext, request: GenerationRequest): Promise<GenerationResponse> {
    if (!actor?.userId) throw new Error('UNAUTHORIZED: Authentication required for AI generation.');
    if (!request.prompt?.trim()) throw new Error('INVALID_INPUT: Prompt is required.');

    const generationId = `gen_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const requiredCredits = CreditEngine.calculateRequiredCredits(request.modelId, request.generationType);
    const supabase = createServerSupabaseClient();

    const { error: generationInsertError } = await supabase.from('generations').insert({
      id: generationId,
      user_id: actor.userId,
      project_id: request.projectId || null,
      generation_type: request.generationType,
      provider: request.generationType === 'chat' ? 'OpenRouter' : 'unconfigured',
      model: request.modelId,
      prompt: request.prompt,
      settings: request.settings || {},
      status: 'queued',
      credits_consumed: 0,
      credits_reserved: requiredCredits,
    });

    if (generationInsertError) throw new Error(`GENERATION_RECORD_FAILED: ${generationInsertError.message}`);

    const currentBalance = await CreditEngine.getBalance(actor.userId);
    if (currentBalance < requiredCredits) {
      await supabase.from('generations').update({ status: 'failed', error_message: 'INSUFFICIENT_CREDITS', credits_reserved: 0 }).eq('id', generationId);
      return { success: false, generationId, creditsConsumed: 0, remainingBalance: currentBalance, errorMessage: `INSUFFICIENT_CREDITS: Required ${requiredCredits} credits, but current balance is ${currentBalance}.` };
    }

    const deductionRes = await CreditEngine.deductCredits(
      actor.userId, requiredCredits, `AI Generation (${request.modelId})`, 'generation', generationId,
      `gen_deduct_${generationId}`, actor.userId
    );

    if (!deductionRes.success) {
      await supabase.from('generations').update({ status: 'failed', error_message: deductionRes.message, credits_reserved: 0 }).eq('id', generationId);
      return { success: false, generationId, creditsConsumed: 0, remainingBalance: deductionRes.newBalance, errorMessage: deductionRes.message };
    }

    await supabase.from('generations').update({ status: 'processing' }).eq('id', generationId);

    try {
      if (request.simulateFailure) throw new Error('SIMULATED_AI_PROVIDER_TIMEOUT');
      if (request.generationType !== 'chat') throw new Error(`${request.generationType.toUpperCase()}_PROVIDER_NOT_CONFIGURED: This provider will be connected after the platform readiness phase.`);
      if (!isOpenRouterConfigured()) throw new Error('AI_PROVIDER_NOT_CONFIGURED: OpenRouter is not configured yet.');
      if (!isOpenRouterModelAllowed(request.modelId)) throw new Error(`MODEL_NOT_ALLOWED: ${request.modelId}`);

      const result = await generateOpenRouterChat({
        model: request.modelId,
        messages: [
          { role: 'system', content: 'You are Brand Box AI. Respond clearly and professionally. When the user writes Arabic, answer in Arabic unless asked otherwise.' },
          { role: 'user', content: request.prompt },
        ],
        temperature: Number(request.settings?.temperature ?? 0.7),
        maxTokens: Number(request.settings?.maxTokens ?? 2000),
      });

      await supabase.from('generations').update({ status: 'completed', credits_consumed: requiredCredits, credits_reserved: 0 }).eq('id', generationId);
      return { success: true, generationId, creditsConsumed: requiredCredits, remainingBalance: deductionRes.newBalance, content: result.content };
    } catch (err: any) {
      const message = err?.message || 'Generation failed';
      const refundRes = await CreditEngine.refundCredits(
        actor.userId, requiredCredits, `Automatic Refund: AI Provider Failure (${message})`, 'generation_failure_refund', generationId,
        `gen_refund_${generationId}`, actor.userId
      );

      await supabase.from('generations').update({ status: 'failed', credits_consumed: 0, credits_reserved: 0, error_message: message }).eq('id', generationId);
      return {
        success: false, generationId, creditsConsumed: 0, remainingBalance: refundRes.newBalance,
        errorMessage: `AI_PROVIDER_ERROR: ${message}. Credits refunded automatically.`, wasRefunded: refundRes.success,
      };
    }
  }
}
