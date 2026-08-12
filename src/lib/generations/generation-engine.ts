import { CreditEngine } from '../credits/credit-engine';
import { createServerSupabaseClient } from '../supabase/server';
import { AuthContext } from '../auth/rbac-engine';

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
      if (request.simulateFailure) {
        throw new Error('SIMULATED_AI_PROVIDER_TIMEOUT');
      }

      const responseContent = request.generationType === 'chat' 
        ? `[AI Generated Response using ${request.modelId}]`
        : undefined;

      const responseUrl = request.generationType === 'image'
        ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80'
        : undefined;

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