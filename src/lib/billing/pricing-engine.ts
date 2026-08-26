import { createPrivilegedSupabaseClient } from '../supabase/server';

export interface BillingSettingsSnapshot {
  marketUsdLyd: number;
  openRouterTopupFeePct: number;
  bankTransferFeePct: number;
  riskBufferPct: number;
  targetGrossMarginPct: number;
  referenceCreditValueLyd: number;
  minimumOperationCredits: number;
  maxBonusPct: number;
  emergencyFxThresholdLyd: number;
  hardStopFxThresholdLyd: number;
  freeGlobalDailyLimit: number;
  freeUserDailyLimit: number;
  freeModelsEnabled: boolean;
}

export interface ModelPricingSnapshot {
  modelId: string;
  provider: string;
  generationType: 'chat' | 'image' | 'video' | 'audio';
  pricingMode: 'token' | 'image' | 'second' | 'dynamic';
  inputCostPerMillionUsd?: number;
  outputCostPerMillionUsd?: number;
  fixedProviderCostUsd?: number;
  providerCostPerSecondUsd?: number;
  reservationMultiplier: number;
  minimumCredits: number;
  isFree: boolean;
  dailyFreeUserLimit?: number;
  supportsVision: boolean;
}

export interface CreditPricingBreakdown {
  providerCostUsd: number;
  acquisitionCostLyd: number;
  targetRetailValueLyd: number;
  credits: number;
}

export interface ChatCreditQuote extends CreditPricingBreakdown {
  modelId: string;
  estimatedInputTokens: number;
  reservedOutputTokens: number;
  reservationMultiplier: number;
  rawEstimatedProviderCostUsd: number;
  isFree: boolean;
  settings: BillingSettingsSnapshot;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value: number) {
  return value / 100;
}

export class PricingEngine {
  public static calculateUsdAcquisitionRateLyd(settings: BillingSettingsSnapshot): number {
    return settings.marketUsdLyd
      * (1 + pct(settings.bankTransferFeePct))
      * (1 + pct(settings.openRouterTopupFeePct))
      * (1 + pct(settings.riskBufferPct));
  }

  public static providerCostToCredits(
    providerCostUsd: number,
    settings: BillingSettingsSnapshot,
    modelMinimumCredits = 1,
  ): CreditPricingBreakdown {
    if (!Number.isFinite(providerCostUsd) || providerCostUsd < 0) {
      throw new Error('INVALID_PROVIDER_COST');
    }

    if (providerCostUsd === 0 && modelMinimumCredits === 0) {
      return {
        providerCostUsd: 0,
        acquisitionCostLyd: 0,
        targetRetailValueLyd: 0,
        credits: 0,
      };
    }

    const acquisitionRate = this.calculateUsdAcquisitionRateLyd(settings);
    const acquisitionCostLyd = providerCostUsd * acquisitionRate;
    const margin = Math.min(0.95, Math.max(0, pct(settings.targetGrossMarginPct)));
    const targetRetailValueLyd = margin >= 1
      ? acquisitionCostLyd
      : acquisitionCostLyd / Math.max(0.05, 1 - margin);
    const creditValue = Math.max(0.0001, settings.referenceCreditValueLyd);
    const minimumCredits = Math.max(settings.minimumOperationCredits, modelMinimumCredits, 1);
    const credits = Math.max(minimumCredits, Math.ceil(targetRetailValueLyd / creditValue));

    return {
      providerCostUsd,
      acquisitionCostLyd,
      targetRetailValueLyd,
      credits,
    };
  }

  public static async getBillingSettings(): Promise<BillingSettingsSnapshot> {
    const database = createPrivilegedSupabaseClient();
    const { data, error } = await database
      .from('billing_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) {
      throw new Error(`BILLING_SETTINGS_UNAVAILABLE: ${error?.message || 'No billing settings returned'}`);
    }

    return {
      marketUsdLyd: numberValue(data.market_usd_lyd),
      openRouterTopupFeePct: numberValue(data.openrouter_topup_fee_pct),
      bankTransferFeePct: numberValue(data.bank_transfer_fee_pct),
      riskBufferPct: numberValue(data.risk_buffer_pct),
      targetGrossMarginPct: numberValue(data.target_gross_margin_pct),
      referenceCreditValueLyd: numberValue(data.reference_credit_value_lyd, 0.1),
      minimumOperationCredits: Math.max(1, Math.trunc(numberValue(data.minimum_operation_credits, 1))),
      maxBonusPct: numberValue(data.max_bonus_pct, 20),
      emergencyFxThresholdLyd: numberValue(data.emergency_fx_threshold_lyd, 18),
      hardStopFxThresholdLyd: numberValue(data.hard_stop_fx_threshold_lyd, 22),
      freeGlobalDailyLimit: Math.max(1, Math.trunc(numberValue(data.openrouter_free_global_daily_limit, 40))),
      freeUserDailyLimit: Math.max(1, Math.trunc(numberValue(data.free_user_daily_limit, 5))),
      freeModelsEnabled: data.free_models_enabled !== false,
    };
  }

  public static async getModelPricing(modelId: string): Promise<ModelPricingSnapshot> {
    const database = createPrivilegedSupabaseClient();
    const { data, error } = await database
      .from('ai_model_catalog')
      .select('*')
      .eq('model_id', modelId)
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      throw new Error(`MODEL_PRICING_UNAVAILABLE: ${error?.message || modelId}`);
    }

    return {
      modelId: data.model_id,
      provider: data.provider,
      generationType: data.generation_type,
      pricingMode: data.pricing_mode,
      inputCostPerMillionUsd: data.input_cost_per_million_usd == null ? undefined : numberValue(data.input_cost_per_million_usd),
      outputCostPerMillionUsd: data.output_cost_per_million_usd == null ? undefined : numberValue(data.output_cost_per_million_usd),
      fixedProviderCostUsd: data.fixed_provider_cost_usd == null ? undefined : numberValue(data.fixed_provider_cost_usd),
      providerCostPerSecondUsd: data.provider_cost_per_second_usd == null ? undefined : numberValue(data.provider_cost_per_second_usd),
      reservationMultiplier: Math.max(1, numberValue(data.reservation_multiplier, 1.25)),
      minimumCredits: Math.max(0, Math.trunc(numberValue(data.minimum_credits, 1))),
      isFree: Boolean(data.is_free),
      dailyFreeUserLimit: data.daily_free_user_limit == null ? undefined : Math.max(1, Math.trunc(numberValue(data.daily_free_user_limit, 5))),
      supportsVision: Boolean(data.supports_vision),
    };
  }

  public static estimateTextTokens(text: string): number {
    // Conservative cross-language approximation for reservation only.
    // Actual provider usage is stored after the request and remains the accounting audit source.
    return Math.max(1, Math.ceil(Array.from(text || '').length / 2));
  }

  public static async quoteChat(input: {
    modelId: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<ChatCreditQuote> {
    const [settings, model] = await Promise.all([
      this.getBillingSettings(),
      this.getModelPricing(input.modelId),
    ]);

    if (model.generationType !== 'chat' || model.pricingMode !== 'token') {
      throw new Error('MODEL_NOT_CHAT_TOKEN_PRICED');
    }
    if (model.inputCostPerMillionUsd == null || model.outputCostPerMillionUsd == null) {
      throw new Error('MODEL_TOKEN_PRICING_INCOMPLETE');
    }
    if (model.isFree && !settings.freeModelsEnabled) {
      throw new Error('FREE_MODELS_DISABLED');
    }

    const estimatedInputTokens = this.estimateTextTokens(input.prompt);
    const reservedOutputTokens = Math.max(1, Math.min(65_536, Math.trunc(input.maxTokens || 1200)));
    const rawEstimatedProviderCostUsd =
      (estimatedInputTokens / 1_000_000) * model.inputCostPerMillionUsd
      + (reservedOutputTokens / 1_000_000) * model.outputCostPerMillionUsd;
    const reservedProviderCostUsd = rawEstimatedProviderCostUsd * model.reservationMultiplier;
    const priced = this.providerCostToCredits(reservedProviderCostUsd, settings, model.minimumCredits);

    return {
      modelId: model.modelId,
      estimatedInputTokens,
      reservedOutputTokens,
      reservationMultiplier: model.reservationMultiplier,
      rawEstimatedProviderCostUsd,
      isFree: model.isFree,
      ...priced,
      settings,
    };
  }

  public static settleActualProviderCost(
    actualProviderCostUsd: number,
    quote: Pick<ChatCreditQuote, 'settings' | 'isFree'>,
    modelMinimumCredits = 1,
  ) {
    return this.providerCostToCredits(
      actualProviderCostUsd,
      quote.settings,
      quote.isFree ? 0 : modelMinimumCredits,
    );
  }
}
