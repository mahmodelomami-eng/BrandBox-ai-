import { minimumVideoCreditsPerSecond } from './video-pricing';

export interface UserPricedModelLike {
  generation_type?: unknown;
  minimum_credits?: unknown;
  metadata?: unknown;
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

/**
 * Brand Box user-facing pricing readiness.
 *
 * Provider cost is intentionally irrelevant here. A provider may expose a
 * model for $0 and Brand Box can still sell access for credits. The only thing
 * that decides whether a user can see/use a model is whether Brand Box has an
 * explicit positive user price for that model/settings contract.
 */
export function isModelUserPriced(model: UserPricedModelLike): boolean {
  const generationType = typeof model.generation_type === 'string' ? model.generation_type : '';
  if (generationType === 'video') {
    return minimumVideoCreditsPerSecond(model.metadata) !== null;
  }
  return positiveInteger(model.minimum_credits) !== null;
}

export function providerCostIsFree(model: Record<string, unknown>): boolean {
  const values = [
    model.input_cost_per_million_usd,
    model.output_cost_per_million_usd,
    model.fixed_provider_cost_usd,
    model.provider_cost_per_second_usd,
  ].map((value) => Number(value));
  const finite = values.filter(Number.isFinite);
  return finite.length > 0 && finite.every((value) => value === 0);
}
