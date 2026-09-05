import type { OpenRouterModelCapabilities } from './openrouter-model-capabilities';

export type CapabilityPolicyResult = {
  settings: Record<string, unknown>;
  normalizedFields: string[];
};

function first<T>(values: readonly T[]): T | undefined {
  return values.length > 0 ? values[0] : undefined;
}

function normalizedEnum(
  field: string,
  requested: unknown,
  allowed: readonly string[],
  output: Record<string, unknown>,
  normalizedFields: string[],
) {
  if (!allowed.length) return;
  const value = typeof requested === 'string' ? requested : '';
  if (allowed.includes(value)) {
    output[field] = value;
    return;
  }
  output[field] = first(allowed);
  normalizedFields.push(field);
}

export function applyImageCapabilityPolicy(
  capabilities: OpenRouterModelCapabilities,
  requested: Record<string, unknown> = {},
): CapabilityPolicyResult {
  if (capabilities.tool !== 'image' || !capabilities.image) throw new Error('IMAGE_CAPABILITIES_REQUIRED');
  const image = capabilities.image;
  if (!image.aspectRatios.length) throw new Error('IMAGE_ASPECT_RATIO_CAPABILITY_UNKNOWN');

  const settings: Record<string, unknown> = {};
  const normalizedFields: string[] = [];
  normalizedEnum('aspectRatio', requested.aspectRatio, image.aspectRatios, settings, normalizedFields);
  if (image.resolutions.length) {
    normalizedEnum('resolution', requested.resolution, image.resolutions, settings, normalizedFields);
  }

  const range = image.countRange;
  if (range) {
    const raw = Number(requested.count ?? range.min);
    const count = Number.isInteger(raw) ? Math.max(range.min, Math.min(range.max, raw)) : range.min;
    settings.count = count;
    if (raw !== count) normalizedFields.push('count');
  } else {
    settings.count = 1;
    if (requested.count !== undefined && Number(requested.count) !== 1) normalizedFields.push('count');
  }

  return { settings, normalizedFields };
}

export function applyVideoCapabilityPolicy(
  capabilities: OpenRouterModelCapabilities,
  requested: Record<string, unknown> = {},
): CapabilityPolicyResult {
  if (capabilities.tool !== 'video' || !capabilities.video) throw new Error('VIDEO_CAPABILITIES_REQUIRED');
  const video = capabilities.video;
  if (!video.durations.length || !video.resolutions.length || !video.aspectRatios.length) {
    throw new Error('VIDEO_CAPABILITY_INCOMPLETE');
  }

  const settings: Record<string, unknown> = {};
  const normalizedFields: string[] = [];
  const requestedDuration = Number(requested.duration);
  if (video.durations.includes(requestedDuration)) settings.duration = requestedDuration;
  else {
    settings.duration = first(video.durations);
    normalizedFields.push('duration');
  }
  normalizedEnum('resolution', requested.resolution, video.resolutions, settings, normalizedFields);
  normalizedEnum('aspectRatio', requested.aspectRatio ?? requested.ratio, video.aspectRatios, settings, normalizedFields);

  if (video.supportsAudio) settings.generateAudio = requested.generateAudio === true;
  else if (requested.generateAudio === true) normalizedFields.push('generateAudio');

  if (video.supportsSeed && Number.isInteger(Number(requested.seed))) {
    settings.seed = Number(requested.seed);
  } else if (requested.seed !== undefined) {
    normalizedFields.push('seed');
  }

  return { settings, normalizedFields };
}

export function applyChatCapabilityPolicy(
  capabilities: OpenRouterModelCapabilities,
  requested: Record<string, unknown> = {},
): CapabilityPolicyResult {
  if (capabilities.tool !== 'chat' || !capabilities.chat) throw new Error('CHAT_CAPABILITIES_REQUIRED');
  const chat = capabilities.chat;
  const settings: Record<string, unknown> = {};
  const normalizedFields: string[] = [];

  if (chat.supportsTemperature && typeof requested.temperature === 'number' && Number.isFinite(requested.temperature)) {
    settings.temperature = Math.max(0, Math.min(2, requested.temperature));
  } else if (requested.temperature !== undefined) normalizedFields.push('temperature');

  if (chat.supportsTopP && typeof requested.topP === 'number' && Number.isFinite(requested.topP)) {
    settings.topP = Math.max(0, Math.min(1, requested.topP));
  } else if (requested.topP !== undefined) normalizedFields.push('topP');

  const requestedMax = Number(requested.maxTokens ?? requested.maxCompletionTokens);
  const supportsOutputLimit = chat.supportsMaxCompletionTokens || chat.supportsMaxTokens;
  if (supportsOutputLimit && Number.isFinite(requestedMax) && requestedMax > 0) {
    const upper = capabilities.maxCompletionTokens || requestedMax;
    settings.maxTokens = Math.max(1, Math.min(upper, Math.trunc(requestedMax)));
  } else if (requested.maxTokens !== undefined || requested.maxCompletionTokens !== undefined) {
    normalizedFields.push('maxTokens');
  }

  if (chat.supportsReasoning && requested.reasoning !== undefined) settings.reasoning = requested.reasoning;
  else if (requested.reasoning !== undefined) normalizedFields.push('reasoning');

  if (chat.supportsSeed && Number.isInteger(Number(requested.seed))) settings.seed = Number(requested.seed);
  else if (requested.seed !== undefined) normalizedFields.push('seed');

  return { settings, normalizedFields };
}

export function applyAudioCapabilityPolicy(
  capabilities: OpenRouterModelCapabilities,
  requested: Record<string, unknown> = {},
): CapabilityPolicyResult {
  if (capabilities.tool !== 'audio' || !capabilities.audio) throw new Error('AUDIO_CAPABILITIES_REQUIRED');
  const audio = capabilities.audio;
  const settings: Record<string, unknown> = {};
  const normalizedFields: string[] = [];

  if (audio.voices.length) normalizedEnum('voice', requested.voice, audio.voices, settings, normalizedFields);
  if (audio.responseFormats.length) normalizedEnum('responseFormat', requested.responseFormat, audio.responseFormats, settings, normalizedFields);

  if (audio.supportsSpeed && typeof requested.speed === 'number' && Number.isFinite(requested.speed)) {
    settings.speed = Math.max(0.25, Math.min(4, requested.speed));
  } else if (requested.speed !== undefined) normalizedFields.push('speed');

  return { settings, normalizedFields };
}
