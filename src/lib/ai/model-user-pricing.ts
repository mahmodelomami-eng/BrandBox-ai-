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

/**
 * Returns true only when at least one provider-cost field is explicitly stored
 * and every explicitly stored provider-cost field is zero. Null/undefined are
 * unknown and must never be interpreted as a free provider price.
 */
export function providerCostIsFree(model: Record<string, unknown>): boolean {
  const rawValues = [
    model.input_cost_per_million_usd,
    model.output_cost_per_million_usd,
    model.fixed_provider_cost_usd,
    model.provider_cost_per_second_usd,
  ].filter((value) => value !== null && value !== undefined && value !== '');
  const values = rawValues.map((value) => Number(value)).filter(Number.isFinite);
  return values.length > 0 && values.length === rawValues.length && values.every((value) => value === 0);
}
