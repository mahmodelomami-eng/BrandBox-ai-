const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_IMAGES_URL = 'https://openrouter.ai/api/v1/images';

// Verified launch models kept for legacy references only. The authenticated
// Brand Box catalog + capability service is the authority for enabled models.
export const OPENROUTER_IMAGE_MODELS = [
  'openai/gpt-image-2',
  'bytedance-seed/seedream-4.5',
  'bytedance-seed/seedream-5-0-lite',
  'google/gemini-3.1-flash-lite-image',
] as const;

// Coarse platform unions are kept only for legacy typing/compatibility.
// Per-model validation belongs to openrouter-model-capabilities.ts and the
// authenticated Brand Box API routes before credits are spent.
export const OPENROUTER_IMAGE_ASPECT_RATIOS = [
  'auto', '4:1', '3:1', '21:9', '2:1', '17:9', '16:9', '3:2', '4:3',
  '5:4', '1:1', '4:5', '3:4', '2:3', '9:16',
] as const;
export const OPENROUTER_IMAGE_RESOLUTIONS = ['512', '1K', '2K', '4K'] as const;

export interface OpenRouterChatRequest {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterChatResult {
  content: string;
  requestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
}

interface OpenRouterOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface OpenRouterImageRequest {
  model: string;
  prompt: string;
  aspectRatio?: string;
  count?: number;
  resolution?: string;
}

export interface OpenRouterGeneratedImage {
  base64: string;
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
}

export interface OpenRouterImageResult {
  images: OpenRouterGeneratedImage[];
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
}

function chatHttpErrorCode(status: number): string {
  if (status === 408) return 'OPENROUTER_TIMEOUT';
  if (status === 429) return 'OPENROUTER_RATE_LIMITED';
  if (status === 401 || status === 403) return 'OPENROUTER_AUTH_FAILED';
  if (status >= 500) return 'OPENROUTER_PROVIDER_UNAVAILABLE';
  return 'OPENROUTER_REQUEST_REJECTED';
}

function imageHttpErrorCode(status: number): string {
  if (status === 408) return 'OPENROUTER_IMAGE_TIMEOUT';
  if (status === 429) return 'OPENROUTER_IMAGE_RATE_LIMITED';
  if (status === 401 || status === 403) return 'OPENROUTER_IMAGE_AUTH_FAILED';
  if (status >= 500) return 'OPENROUTER_IMAGE_PROVIDER_UNAVAILABLE';
  return 'OPENROUTER_IMAGE_REQUEST_REJECTED';
}

function finiteUsageNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function validOpenRouterModelId(value: unknown): boolean {
  const model = typeof value === 'string' ? value.trim() : '';
  return /^[^/\s]+\/.{1,200}$/.test(model);
}

export async function createOpenRouterImageGeneration(
  request: OpenRouterImageRequest,
  options: OpenRouterOptions = {}
): Promise<OpenRouterImageResult> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');
  if (!validOpenRouterModelId(request.model)) throw new Error('OPENROUTER_IMAGE_MODEL_NOT_ALLOWED');

  const prompt = request.prompt.trim();
  if (!prompt) throw new Error('OPENROUTER_INVALID_IMAGE_REQUEST');

  const aspectRatio = String(request.aspectRatio || '').trim().toLowerCase();
  if (!aspectRatio || aspectRatio.length > 20) throw new Error('OPENROUTER_INVALID_ASPECT_RATIO');
  const resolution = typeof request.resolution === 'string' ? request.resolution.trim() : '';
  if (resolution.length > 24) throw new Error('OPENROUTER_INVALID_IMAGE_RESOLUTION');
  const count = Math.trunc(Number(request.count ?? 1));
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('OPENROUTER_INVALID_IMAGE_COUNT');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);

  try {
    const response = await (options.fetchImpl || fetch)(OPENROUTER_IMAGES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://brandbox-ai.com',
        'X-OpenRouter-Title': 'BrandBox AI',
      },
      body: JSON.stringify({
        model: request.model,
        prompt,
        aspect_ratio: aspectRatio,
        n: count,
        ...(resolution ? { resolution } : {}),
      }),
    });

    let payload: Record<string, unknown>;
    try {
      payload = await response.json() as Record<string, unknown>;
    } catch {
      if (!response.ok) throw new Error(imageHttpErrorCode(response.status));
      throw new Error('OPENROUTER_IMAGE_INVALID_RESPONSE');
    }

    if (!response.ok) throw new Error(imageHttpErrorCode(response.status));

    const data = Array.isArray(payload.data) ? payload.data : [];
    const images = data.map((item) => {
      const row = item as { b64_json?: unknown; media_type?: unknown };
      const mediaType = row.media_type || 'image/png';
      if (typeof row.b64_json !== 'string' || !['image/png', 'image/jpeg', 'image/webp'].includes(String(mediaType))) {
        throw new Error('OPENROUTER_IMAGE_INVALID_RESPONSE');
      }
      return { base64: row.b64_json, mediaType: mediaType as OpenRouterGeneratedImage['mediaType'] };
    });
    if (!images.length) throw new Error('OPENROUTER_IMAGE_EMPTY_RESPONSE');

    const usage = payload.usage as { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown; cost?: unknown } | undefined;
    return {
      images,
      promptTokens: finiteUsageNumber(usage?.prompt_tokens),
      completionTokens: finiteUsageNumber(usage?.completion_tokens),
      totalTokens: finiteUsageNumber(usage?.total_tokens),
      costUsd: finiteUsageNumber(usage?.cost),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('OPENROUTER_IMAGE_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createOpenRouterChatCompletion(
  request: OpenRouterChatRequest,
  options: OpenRouterOptions = {}
): Promise<OpenRouterChatResult> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');

  const prompt = request.prompt?.trim();
  if (!request.model || !prompt) throw new Error('OPENROUTER_INVALID_REQUEST');

  const systemPrompt = request.systemPrompt?.trim().slice(0, 6000);
  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt },
  ];
  const providerSettings: Record<string, number> = {};
  if (typeof request.temperature === 'number' && Number.isFinite(request.temperature)) {
    providerSettings.temperature = Math.max(0, Math.min(2, request.temperature));
  }
  if (typeof request.maxTokens === 'number' && Number.isFinite(request.maxTokens)) {
    providerSettings.max_tokens = Math.max(1, Math.min(1_000_000, Math.trunc(request.maxTokens)));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const response = await (options.fetchImpl || fetch)(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://brandbox-ai.com',
        'X-OpenRouter-Title': 'BrandBox AI',
      },
      body: JSON.stringify({
        model: request.model,
        messages,
        ...providerSettings,
      }),
    });

    let payload: Record<string, unknown>;
    try {
      payload = await response.json() as Record<string, unknown>;
    } catch {
      if (!response.ok) throw new Error(chatHttpErrorCode(response.status));
      throw new Error('OPENROUTER_INVALID_RESPONSE');
    }

    if (!response.ok) throw new Error(chatHttpErrorCode(response.status));

    const choices = payload.choices as Array<{ message?: { content?: unknown } }> | undefined;
    const content = choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('OPENROUTER_EMPTY_RESPONSE');
    const usage = payload.usage as { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown; cost?: unknown } | undefined;

    return {
      content: content.trim(),
      requestId: typeof payload.id === 'string' ? payload.id : undefined,
      promptTokens: finiteUsageNumber(usage?.prompt_tokens),
      completionTokens: finiteUsageNumber(usage?.completion_tokens),
      totalTokens: finiteUsageNumber(usage?.total_tokens),
      costUsd: finiteUsageNumber(usage?.cost),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('OPENROUTER_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
