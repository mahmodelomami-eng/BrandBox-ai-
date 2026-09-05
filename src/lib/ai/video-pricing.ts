export type VideoPricingAudioMode = 'off' | 'on';

/** `*` means the provider price is independent of resolution. */
export type VideoPricingResolution = string;

export interface VideoPricingVariant {
  resolution: VideoPricingResolution;
  audioMode: VideoPricingAudioMode;
  creditsPerSecond: number;
  providerUsdPerSecond?: number;
}

export interface PublicVideoPricingOption {
  resolution: VideoPricingResolution;
  audioMode: VideoPricingAudioMode;
  creditsPerSecond: number;
}

export interface ResolvedVideoPricing extends VideoPricingVariant {
  source: 'matrix' | 'legacy';
}

type MetadataRecord = Record<string, unknown>;

function metadataRecord(metadata: unknown): MetadataRecord | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  return metadata as MetadataRecord;
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function positiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function audioMode(value: unknown): VideoPricingAudioMode | null {
  return value === 'off' || value === 'on' ? value : null;
}

function stringArray(metadata: MetadataRecord, key: string): string[] {
  const raw = metadata[key];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw
    .map(cleanString)
    .filter(Boolean))];
}

function hasOwn(record: MetadataRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/**
 * Whether metadata declares the v1 settings-aware pricing contract.
 *
 * Important: once the matrix key exists, malformed/empty matrix data must fail
 * closed. We deliberately do not fall back to a legacy flat rate because that
 * could undercharge a higher-resolution or audio-enabled request.
 */
export function hasVideoPricingMatrix(metadata: unknown): boolean {
  const record = metadataRecord(metadata);
  return Boolean(record && hasOwn(record, 'brandbox_video_pricing_matrix'));
}

export function parseVideoPricingMatrix(metadata: unknown): VideoPricingVariant[] {
  const record = metadataRecord(metadata);
  if (!record) return [];
  const matrix = metadataRecord(record.brandbox_video_pricing_matrix);
  if (!matrix || Number(matrix.version) !== 1 || !Array.isArray(matrix.variants)) return [];

  const seen = new Set<string>();
  const variants: VideoPricingVariant[] = [];
  for (const rawVariant of matrix.variants) {
    const variant = metadataRecord(rawVariant);
    if (!variant) continue;
    const resolution = cleanString(variant.resolution);
    const mode = audioMode(variant.audio_mode);
    const creditsPerSecond = positiveInteger(variant.credits_per_second);
    if (!resolution || !mode || !creditsPerSecond) continue;
    const key = `${resolution}\u0000${mode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const providerUsdPerSecond = positiveNumber(variant.provider_usd_per_second);
    variants.push({
      resolution,
      audioMode: mode,
      creditsPerSecond,
      ...(providerUsdPerSecond ? { providerUsdPerSecond } : {}),
    });
  }

  return variants.sort((left, right) => {
    if (left.resolution === '*' && right.resolution !== '*') return -1;
    if (right.resolution === '*' && left.resolution !== '*') return 1;
    const resolutionOrder = left.resolution.localeCompare(right.resolution, 'en', { numeric: true });
    if (resolutionOrder !== 0) return resolutionOrder;
    return left.audioMode.localeCompare(right.audioMode);
  });
}

function legacyPricingOptions(metadata: unknown): VideoPricingVariant[] {
  const record = metadataRecord(metadata);
  if (!record) return [];
  const creditsPerSecond = positiveInteger(record.brandbox_credits_per_second);
  if (!creditsPerSecond) return [];
  const resolutions = stringArray(record, 'brandbox_priced_resolutions');
  const audioModes = stringArray(record, 'brandbox_priced_audio_modes')
    .map(audioMode)
    .filter((value): value is VideoPricingAudioMode => value !== null);
  if (resolutions.length === 0 || audioModes.length === 0) return [];

  return resolutions.flatMap((resolution) => audioModes.map((mode) => ({
    resolution,
    audioMode: mode,
    creditsPerSecond,
  })));
}

export function videoPricingVariants(metadata: unknown): VideoPricingVariant[] {
  if (hasVideoPricingMatrix(metadata)) return parseVideoPricingMatrix(metadata);
  return legacyPricingOptions(metadata);
}

export function publicVideoPricingOptions(metadata: unknown): PublicVideoPricingOption[] {
  return videoPricingVariants(metadata).map(({ resolution, audioMode: mode, creditsPerSecond }) => ({
    resolution,
    audioMode: mode,
    creditsPerSecond,
  }));
}

/**
 * Resolve the exact billable variant. Resolution-specific pricing wins over a
 * wildcard (`*`) variant. Wildcard pricing is only for providers whose public
 * price is independent of output resolution (for example Kling v3 on
 * OpenRouter as of 2026-09-05).
 */
export function resolveVideoPricing(
  metadata: unknown,
  settings: Record<string, unknown>,
): ResolvedVideoPricing | null {
  const resolution = cleanString(settings.resolution);
  const mode: VideoPricingAudioMode = settings.generateAudio === true ? 'on' : 'off';
  const variants = videoPricingVariants(metadata);

  const exact = resolution
    ? variants.find((candidate) => candidate.resolution === resolution && candidate.audioMode === mode)
    : null;
  const wildcard = variants.find((candidate) => candidate.resolution === '*' && candidate.audioMode === mode);
  const variant = exact || wildcard;
  if (!variant) return null;

  const matrixDeclared = hasVideoPricingMatrix(metadata);
  return { ...variant, source: matrixDeclared ? 'matrix' : 'legacy' };
}

/** User-selectable resolutions only; `*` is pricing metadata, not a UI option. */
export function pricedVideoResolutions(metadata: unknown): string[] {
  return [...new Set(videoPricingVariants(metadata)
    .map((variant) => variant.resolution)
    .filter((resolution) => resolution !== '*'))];
}

export function hasResolutionIndependentVideoPricing(metadata: unknown): boolean {
  return videoPricingVariants(metadata).some((variant) => variant.resolution === '*');
}

export function pricedVideoAudioModes(metadata: unknown, resolution?: string): VideoPricingAudioMode[] {
  const targetResolution = cleanString(resolution);
  return [...new Set(videoPricingVariants(metadata)
    .filter((variant) => variant.resolution === '*' || !targetResolution || variant.resolution === targetResolution)
    .map((variant) => variant.audioMode))];
}

export function minimumVideoCreditsPerSecond(metadata: unknown): number | null {
  const rates = videoPricingVariants(metadata).map((variant) => variant.creditsPerSecond);
  return rates.length ? Math.min(...rates) : null;
}
