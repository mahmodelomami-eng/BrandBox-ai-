const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_IMAGES_URL = 'https://openrouter.ai/api/v1/images';

// Compatibility list for the current pilot. Runtime authorization is enforced
// against public.ai_model_catalog in the authenticated generation route.
export const OPENROUTER_CHAT_MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemini-3.7-flash',
] as const;

export const OPENROUTER_IMAGE_MODELS = [
  'openai/gpt-image-2',
  'bytedance-seed/seedream-5-0-lite',
  'google/gemini-3.1-flash-lite-image',
] as const;

const OPENROUTER_IMAGE_ASPECT_RATIOS = new Set([
  'auto', '4:1', '3:1', '21:9', '2:1', '17:9', '16:9', '3:2', '4:3',
  '5:4', '1:1', '4:5', '3:4', '2:3', '9:16',
]);

export interface OpenRouterChatRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  imageDataUrl?: string;
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
  resolution?: '512' | '1K' | '2K' | '4K';
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

function validateImageDataUrl(value?: string) {
  if (!value) return undefined;
  if (value.length > 6_000_000) throw new Error('OPENROUTER_INPUT_IMAGE_TOO_LARGE');
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) {
    throw new Error('OPENROUTER_INVALID_INPUT_IMAGE');
  }
  return value;
}

export async function createOpenRouterImageGeneration(
  request: OpenRouterImageRequest,
  options: OpenRouterOptions = {}
): Promise<OpenRouterImageResult> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');
  if (!OPENROUTER_IMAGE_MODELS.includes(request.model as typeof OPENROUTER_IMAGE_MODELS[number])) {
    throw new Error('OPENROUTER_IMAGE_MODEL_NOT_ALLOWED');
  }
  const prompt = request.prompt.trim();
  if (!prompt) throw new Error('OPENROUTER_INVALID_IMAGE_REQUEST');
  const aspectRatio = (request.aspectRatio || '1:1').toLowerCase();
  if (!OPENROUTER_IMAGE_ASPECT_RATIOS.has(aspectRatio)) throw new Error('OPENROUTER_INVALID_ASPECT_RATIO');
  const count = Math.max(1, Math.min(4, Math.trunc(request.count || 1)));
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
        resolution: request.resolution || '1K',
        n: count,
      }),
    });

    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      const error = payload.error as { message?: string } | undefined;
      throw new Error(`OPENROUTER_IMAGE_HTTP_${response.status}: ${error?.message || 'Request failed'}`);
    }
    const data = Array.isArray(payload.data) ? payload.data : [];
    const images = data.map((item) => {
      const row = item as { b64_json?: unknown; media_type?: unknown };
      const mediaType = row.media_type || 'image/png';
      if (typeof row.b64_json !== 'string' || !['image/png', 'image/jpeg', 'image/webp'].includes(String(mediaType))) {
        throw new Error('OPENROUTER_INVALID_IMAGE_RESPONSE');
      }
      return { base64: row.b64_json, mediaType: mediaType as OpenRouterGeneratedImage['mediaType'] };
    });
    if (!images.length) throw new Error('OPENROUTER_EMPTY_IMAGE_RESPONSE');
    const usage = payload.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number } | undefined;
    return { images, promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens, totalTokens: usage?.total_tokens, costUsd: usage?.cost };
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
  if (!request.model || !/^[A-Za-z0-9._:-]+\/[A-Za-z0-9._:-]+$/.test(request.model)) {
    throw new Error('OPENROUTER_INVALID_MODEL_ID');
  }
  const prompt = request.prompt.trim();
  if (!prompt) throw new Error('OPENROUTER_INVALID_REQUEST');
  const imageDataUrl = validateImageDataUrl(request.imageDataUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const userContent = imageDataUrl
      ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]
      : prompt;

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
        messages: [{ role: 'user', content: userContent }],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1200,
        usage: { include: true },
      }),
    });

    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      const error = payload.error as { message?: string } | undefined;
      throw new Error(`OPENROUTER_HTTP_${response.status}: ${error?.message || 'Request failed'}`);
    }

    const choices = payload.choices as Array<{ message?: { content?: string } }> | undefined;
    const content = choices?.[0]?.message?.content;
    if (!content) throw new Error('OPENROUTER_EMPTY_RESPONSE');
    const usage = payload.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number } | undefined;

    return {
      content,
      requestId: typeof payload.id === 'string' ? payload.id : undefined,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      costUsd: usage?.cost,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('OPENROUTER_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
