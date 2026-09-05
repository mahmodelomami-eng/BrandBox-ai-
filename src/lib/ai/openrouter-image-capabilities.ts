export type OpenRouterImageResolution = '512' | '1K' | '2K' | '4K';

export type OpenRouterImageCapabilities = {
  supportedResolutions: readonly OpenRouterImageResolution[];
  defaultResolution?: OpenRouterImageResolution;
  maxCount: number;
};

const IMAGE_CAPABILITIES: Record<string, OpenRouterImageCapabilities> = {
  'openai/gpt-image-2': {
    supportedResolutions: [],
    maxCount: 10,
  },
  'bytedance-seed/seedream-4.5': {
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '2K',
    maxCount: 4,
  },
  'bytedance-seed/seedream-5-0-lite': {
    supportedResolutions: ['2K', '4K'],
    defaultResolution: '2K',
    maxCount: 4,
  },
  'google/gemini-3.1-flash-lite-image': {
    supportedResolutions: ['1K'],
    defaultResolution: '1K',
    maxCount: 1,
  },
};

export function getOpenRouterImageCapabilities(model: string): OpenRouterImageCapabilities | null {
  return IMAGE_CAPABILITIES[model] || null;
}

export function resolveOpenRouterImageResolution(
  model: string,
  requested?: string,
): OpenRouterImageResolution | undefined {
  const capabilities = getOpenRouterImageCapabilities(model);
  if (!capabilities) return undefined;

  if (capabilities.supportedResolutions.length === 0) {
    if (requested) throw new Error('OPENROUTER_INVALID_IMAGE_RESOLUTION');
    return undefined;
  }

  if (!requested) return capabilities.defaultResolution;
  if (!capabilities.supportedResolutions.includes(requested as OpenRouterImageResolution)) {
    throw new Error('OPENROUTER_INVALID_IMAGE_RESOLUTION');
  }
  return requested as OpenRouterImageResolution;
}

export function isOpenRouterImageCountSupported(model: string, count: number): boolean {
  const capabilities = getOpenRouterImageCapabilities(model);
  return Boolean(capabilities && Number.isInteger(count) && count >= 1 && count <= capabilities.maxCount);
}
