const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
const CAPABILITY_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;

export type OpenRouterCapabilityTool = 'chat' | 'image' | 'video' | 'audio';

export type NumericRange = {
  min: number;
  max: number;
};

export type OpenRouterModelCapabilities = {
  modelId: string;
  tool: OpenRouterCapabilityTool;
  source: 'openrouter-live' | 'catalog-fallback';
  supportedParameters: string[];
  inputModalities: string[];
  outputModalities: string[];
  contextLength: number | null;
  maxCompletionTokens: number | null;
  image?: {
    resolutions: string[];
    aspectRatios: string[];
    countRange: NumericRange | null;
    inputReferenceRange: NumericRange | null;
    qualityValues: string[];
    outputFormats: string[];
    backgroundValues: string[];
    supportsStreaming: boolean;
  };
  video?: {
    durations: number[];
    resolutions: string[];
    aspectRatios: string[];
    frameImages: string[];
    supportsAudio: boolean;
    supportsSeed: boolean;
  };
  chat?: {
    supportsTemperature: boolean;
    supportsTopP: boolean;
    supportsMaxTokens: boolean;
    supportsMaxCompletionTokens: boolean;
    supportsReasoning: boolean;
    supportsTools: boolean;
    supportsToolChoice: boolean;
    supportsStructuredOutput: boolean;
    supportsResponseFormat: boolean;
    supportsSeed: boolean;
    supportsWebSearch: boolean;
  };
  audio?: {
    voices: string[];
    responseFormats: string[];
    supportsSpeed: boolean;
  };
};

type CacheEntry = { expiresAt: number; value: OpenRouterModelCapabilities };
const capabilityCache = new Map<string, CacheEntry>();

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))];
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((item) => Number.isFinite(item) && item > 0))].sort((a, b) => a - b);
}

function finitePositive(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function enumValues(descriptor: unknown): string[] {
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) return [];
  return stringArray((descriptor as Record<string, unknown>).values);
}

function rangeValue(descriptor: unknown): NumericRange | null {
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) return null;
  const row = descriptor as Record<string, unknown>;
  const min = Number(row.min);
  const max = Number(row.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
  return { min, max };
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function fallbackCapabilities(
  tool: OpenRouterCapabilityTool,
  modelId: string,
  metadata: Record<string, unknown>,
): OpenRouterModelCapabilities {
  const supportedParameters = stringArray(metadata.supported_parameters);
  const inputModalities = stringArray(metadata.input_modalities);
  const outputModalities = stringArray(metadata.output_modalities);
  const base: OpenRouterModelCapabilities = {
    modelId,
    tool,
    source: 'catalog-fallback',
    supportedParameters,
    inputModalities,
    outputModalities,
    contextLength: finitePositive(metadata.context_length),
    maxCompletionTokens: finitePositive(metadata.max_completion_tokens),
  };

  if (tool === 'image') {
    base.image = {
      resolutions: stringArray(metadata.supported_resolutions),
      aspectRatios: stringArray(metadata.supported_ratios),
      countRange: rangeValue(metadata.count_range),
      inputReferenceRange: rangeValue(metadata.input_reference_range),
      qualityValues: stringArray(metadata.supported_quality_values),
      outputFormats: stringArray(metadata.supported_output_formats),
      backgroundValues: stringArray(metadata.supported_background_values),
      supportsStreaming: metadata.supports_streaming === true,
    };
  }

  if (tool === 'video') {
    const explicitDurations = numberArray(metadata.supported_durations);
    const minimum = finitePositive(metadata.minimum_duration_seconds);
    const maximum = finitePositive(metadata.maximum_duration_seconds);
    const derivedDurations = explicitDurations.length > 0
      ? explicitDurations
      : minimum && maximum && maximum >= minimum && maximum - minimum <= 60
        ? Array.from({ length: Math.floor(maximum - minimum) + 1 }, (_, index) => minimum + index)
        : [];
    base.video = {
      durations: derivedDurations,
      resolutions: stringArray(metadata.supported_resolutions),
      aspectRatios: stringArray(metadata.supported_ratios),
      frameImages: stringArray(metadata.supported_frame_images),
      supportsAudio: metadata.supports_audio === true || metadata.generate_audio === true,
      supportsSeed: supportedParameters.includes('seed') || metadata.supports_seed === true,
    };
  }

  if (tool === 'chat') {
    const has = (name: string) => supportedParameters.includes(name);
    base.chat = {
      supportsTemperature: has('temperature'),
      supportsTopP: has('top_p'),
      supportsMaxTokens: has('max_tokens'),
      supportsMaxCompletionTokens: has('max_completion_tokens'),
      supportsReasoning: has('reasoning') || has('include_reasoning'),
      supportsTools: has('tools'),
      supportsToolChoice: has('tool_choice'),
      supportsStructuredOutput: has('structured_outputs'),
      supportsResponseFormat: has('response_format'),
      supportsSeed: has('seed'),
      supportsWebSearch: has('web_search_options'),
    };
  }

  if (tool === 'audio') {
    base.audio = {
      voices: stringArray(metadata.supported_voices),
      responseFormats: stringArray(metadata.supported_response_formats),
      supportsSpeed: metadata.supports_speed === true || supportedParameters.includes('speed'),
    };
  }

  return base;
}

async function fetchJson(url: string, apiKey: string, fetchImpl: typeof fetch): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://brandbox-ai.com',
        'X-OpenRouter-Title': 'BrandBox AI',
      },
    });
    if (!response.ok) throw new Error(`OPENROUTER_CAPABILITY_HTTP_${response.status}`);
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('OPENROUTER_CAPABILITY_INVALID_RESPONSE');
    }
    return payload as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function findModel(payload: Record<string, unknown>, modelId: string): Record<string, unknown> | null {
  const data = Array.isArray(payload.data) ? payload.data : [];
  const match = data.find((item) => {
    return item && typeof item === 'object' && !Array.isArray(item)
      && String((item as Record<string, unknown>).id || '') === modelId;
  });
  return match && typeof match === 'object' && !Array.isArray(match) ? match as Record<string, unknown> : null;
}

function normalizeGeneralModel(tool: 'chat' | 'audio', modelId: string, row: Record<string, unknown>): OpenRouterModelCapabilities {
  const supportedParameters = stringArray(row.supported_parameters);
  const architecture = metadataObject(row.architecture);
  const topProvider = metadataObject(row.top_provider);
  const base: OpenRouterModelCapabilities = {
    modelId,
    tool,
    source: 'openrouter-live',
    supportedParameters,
    inputModalities: stringArray(architecture.input_modalities),
    outputModalities: stringArray(architecture.output_modalities),
    contextLength: finitePositive(row.context_length),
    maxCompletionTokens: finitePositive(topProvider.max_completion_tokens),
  };

  if (tool === 'chat') {
    const has = (name: string) => supportedParameters.includes(name);
    base.chat = {
      supportsTemperature: has('temperature'),
      supportsTopP: has('top_p'),
      supportsMaxTokens: has('max_tokens'),
      supportsMaxCompletionTokens: has('max_completion_tokens'),
      supportsReasoning: has('reasoning') || has('include_reasoning'),
      supportsTools: has('tools'),
      supportsToolChoice: has('tool_choice'),
      supportsStructuredOutput: has('structured_outputs'),
      supportsResponseFormat: has('response_format'),
      supportsSeed: has('seed'),
      supportsWebSearch: has('web_search_options'),
    };
  } else {
    base.audio = {
      voices: stringArray(row.supported_voices),
      responseFormats: stringArray(row.supported_response_formats),
      supportsSpeed: supportedParameters.includes('speed'),
    };
  }
  return base;
}

function normalizeImageModel(modelId: string, row: Record<string, unknown>): OpenRouterModelCapabilities {
  const supported = metadataObject(row.supported_parameters);
  return {
    modelId,
    tool: 'image',
    source: 'openrouter-live',
    supportedParameters: Object.keys(supported),
    inputModalities: stringArray(metadataObject(row.architecture).input_modalities),
    outputModalities: stringArray(metadataObject(row.architecture).output_modalities),
    contextLength: null,
    maxCompletionTokens: null,
    image: {
      resolutions: enumValues(supported.resolution),
      aspectRatios: enumValues(supported.aspect_ratio),
      countRange: rangeValue(supported.n),
      inputReferenceRange: rangeValue(supported.input_references),
      qualityValues: enumValues(supported.quality),
      outputFormats: enumValues(supported.output_format),
      backgroundValues: enumValues(supported.background),
      supportsStreaming: row.supports_streaming === true,
    },
  };
}

function normalizeVideoModel(modelId: string, row: Record<string, unknown>): OpenRouterModelCapabilities {
  const supportedParameters = stringArray(row.supported_parameters);
  return {
    modelId,
    tool: 'video',
    source: 'openrouter-live',
    supportedParameters,
    inputModalities: stringArray(metadataObject(row.architecture).input_modalities),
    outputModalities: stringArray(metadataObject(row.architecture).output_modalities),
    contextLength: null,
    maxCompletionTokens: null,
    video: {
      durations: numberArray(row.supported_durations),
      resolutions: stringArray(row.supported_resolutions),
      aspectRatios: stringArray(row.supported_aspect_ratios),
      frameImages: stringArray(row.supported_frame_images),
      supportsAudio: row.supports_audio === true || row.supports_audio_generation === true || supportedParameters.includes('generate_audio'),
      supportsSeed: supportedParameters.includes('seed'),
    },
  };
}

async function fetchLiveCapabilities(
  tool: OpenRouterCapabilityTool,
  modelId: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<OpenRouterModelCapabilities> {
  if (tool === 'image') {
    const payload = await fetchJson(`${OPENROUTER_API_BASE}/images/models`, apiKey, fetchImpl);
    const row = findModel(payload, modelId);
    if (!row) throw new Error('OPENROUTER_CAPABILITY_MODEL_NOT_FOUND');
    return normalizeImageModel(modelId, row);
  }
  if (tool === 'video') {
    const payload = await fetchJson(`${OPENROUTER_API_BASE}/videos/models`, apiKey, fetchImpl);
    const row = findModel(payload, modelId);
    if (!row) throw new Error('OPENROUTER_CAPABILITY_MODEL_NOT_FOUND');
    return normalizeVideoModel(modelId, row);
  }

  const [author, ...slugParts] = modelId.split('/');
  const slug = slugParts.join('/');
  if (!author || !slug) throw new Error('OPENROUTER_CAPABILITY_INVALID_MODEL_ID');
  const payload = await fetchJson(`${OPENROUTER_API_BASE}/model/${encodeURIComponent(author)}/${slug.split('/').map(encodeURIComponent).join('/')}`, apiKey, fetchImpl);
  const row = metadataObject(payload.data);
  if (!Object.keys(row).length) throw new Error('OPENROUTER_CAPABILITY_MODEL_NOT_FOUND');
  return normalizeGeneralModel(tool, modelId, row);
}

export async function getOpenRouterModelCapabilities(
  tool: OpenRouterCapabilityTool,
  modelId: string,
  options: {
    apiKey?: string;
    fetchImpl?: typeof fetch;
    fallbackMetadata?: unknown;
    forceRefresh?: boolean;
  } = {},
): Promise<OpenRouterModelCapabilities> {
  const normalizedModelId = String(modelId || '').trim();
  if (!normalizedModelId || normalizedModelId.length > 220) throw new Error('OPENROUTER_CAPABILITY_INVALID_MODEL_ID');

  const key = `${tool}:${normalizedModelId}`;
  const cached = capabilityCache.get(key);
  if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value;

  const fallbackMetadata = metadataObject(options.fallbackMetadata);
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const fallback = fallbackCapabilities(tool, normalizedModelId, fallbackMetadata);
    capabilityCache.set(key, { value: fallback, expiresAt: Date.now() + CAPABILITY_TTL_MS });
    return fallback;
  }

  try {
    const value = await fetchLiveCapabilities(tool, normalizedModelId, apiKey, options.fetchImpl || fetch);
    capabilityCache.set(key, { value, expiresAt: Date.now() + CAPABILITY_TTL_MS });
    return value;
  } catch {
    const fallback = fallbackCapabilities(tool, normalizedModelId, fallbackMetadata);
    capabilityCache.set(key, { value: fallback, expiresAt: Date.now() + Math.min(CAPABILITY_TTL_MS, 60_000) });
    return fallback;
  }
}

export function normalizeSetting<T>(value: T, allowed: readonly T[], fallback?: T): T | undefined {
  if (allowed.includes(value)) return value;
  if (fallback !== undefined && allowed.includes(fallback)) return fallback;
  return allowed[0];
}

export function isCapabilityKnown(capabilities: OpenRouterModelCapabilities): boolean {
  if (capabilities.tool === 'image') {
    const image = capabilities.image;
    return Boolean(image && (image.resolutions.length || image.aspectRatios.length || image.countRange));
  }
  if (capabilities.tool === 'video') {
    const video = capabilities.video;
    return Boolean(video && video.durations.length && video.resolutions.length && video.aspectRatios.length);
  }
  if (capabilities.tool === 'chat') return Boolean(capabilities.chat && capabilities.supportedParameters.length);
  if (capabilities.tool === 'audio') return Boolean(capabilities.audio && (capabilities.audio.voices.length || capabilities.outputModalities.length));
  return false;
}
