const OPENROUTER_VIDEO_BASE = 'https://openrouter.ai/api/v1/videos';

export const OPENROUTER_VIDEO_MODELS = ['bytedance/seedance-2.0-mini'] as const;
export const OPENROUTER_VIDEO_RATIOS = ['16:9', '9:16'] as const;
export const OPENROUTER_VIDEO_RESOLUTIONS = ['480p', '720p'] as const;
export const OPENROUTER_VIDEO_MIN_DURATION = 4;
export const OPENROUTER_VIDEO_MAX_DURATION = 15;

const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

export type OpenRouterVideoModel = typeof OPENROUTER_VIDEO_MODELS[number];
export type OpenRouterVideoRatio = typeof OPENROUTER_VIDEO_RATIOS[number];
export type OpenRouterVideoResolution = typeof OPENROUTER_VIDEO_RESOLUTIONS[number];
export type OpenRouterVideoTaskStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export interface OpenRouterVideoRequest {
  model: string;
  prompt: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  generateAudio?: boolean;
}

export interface OpenRouterCreatedVideoTask {
  taskId: string;
  status: OpenRouterVideoTaskStatus;
}

export interface OpenRouterVideoTaskResult {
  taskId: string;
  status: OpenRouterVideoTaskStatus;
}

interface OpenRouterVideoOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function providerHeaders(apiKey: string, includeJson = false): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://brandbox-ai.com',
    'X-OpenRouter-Title': 'BrandBox AI',
  };
}

function httpErrorCode(status: number): string {
  if (status === 402) return 'OPENROUTER_VIDEO_PAYMENT_REQUIRED';
  if (status === 408) return 'OPENROUTER_VIDEO_TIMEOUT';
  if (status === 429) return 'OPENROUTER_VIDEO_RATE_LIMITED';
  if (status === 401 || status === 403) return 'OPENROUTER_VIDEO_AUTH_FAILED';
  if (status >= 500) return 'OPENROUTER_VIDEO_PROVIDER_UNAVAILABLE';
  return 'OPENROUTER_VIDEO_REQUEST_REJECTED';
}

function safeTaskId(value: unknown): string {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || id.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(id)) {
    throw new Error('OPENROUTER_VIDEO_INVALID_TASK_RESPONSE');
  }
  return id;
}

function normalizeStatus(value: unknown): OpenRouterVideoTaskStatus {
  switch (String(value || '').toLowerCase()) {
    case 'pending': return 'queued';
    case 'in_progress': return 'processing';
    case 'completed': return 'succeeded';
    case 'failed':
    case 'expired': return 'failed';
    case 'cancelled':
    case 'canceled': return 'cancelled';
    default: throw new Error('OPENROUTER_VIDEO_INVALID_TASK_RESPONSE');
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('OPENROUTER_VIDEO_INVALID_TASK_RESPONSE');
    }
    return payload as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === 'OPENROUTER_VIDEO_INVALID_TASK_RESPONSE') throw error;
    throw new Error('OPENROUTER_VIDEO_INVALID_TASK_RESPONSE');
  }
}

export function validateOpenRouterVideoRequest(request: OpenRouterVideoRequest): {
  model: OpenRouterVideoModel;
  prompt: string;
  duration: number;
  resolution: OpenRouterVideoResolution;
  aspectRatio: OpenRouterVideoRatio;
  generateAudio: boolean;
} {
  if (!OPENROUTER_VIDEO_MODELS.includes(request.model as OpenRouterVideoModel)) {
    throw new Error('OPENROUTER_VIDEO_MODEL_NOT_ALLOWED');
  }
  const prompt = String(request.prompt || '').trim();
  if (!prompt || prompt.length > 1000) throw new Error('OPENROUTER_VIDEO_INVALID_PROMPT');
  if (!Number.isInteger(request.duration)
    || request.duration < OPENROUTER_VIDEO_MIN_DURATION
    || request.duration > OPENROUTER_VIDEO_MAX_DURATION) {
    throw new Error('OPENROUTER_VIDEO_INVALID_DURATION');
  }
  if (!OPENROUTER_VIDEO_RESOLUTIONS.includes(request.resolution as OpenRouterVideoResolution)) {
    throw new Error('OPENROUTER_VIDEO_INVALID_RESOLUTION');
  }
  if (!OPENROUTER_VIDEO_RATIOS.includes(request.aspectRatio as OpenRouterVideoRatio)) {
    throw new Error('OPENROUTER_VIDEO_INVALID_ASPECT_RATIO');
  }
  return {
    model: request.model as OpenRouterVideoModel,
    prompt,
    duration: request.duration,
    resolution: request.resolution as OpenRouterVideoResolution,
    aspectRatio: request.aspectRatio as OpenRouterVideoRatio,
    generateAudio: request.generateAudio === true,
  };
}

export async function createOpenRouterVideoTask(
  request: OpenRouterVideoRequest,
  options: OpenRouterVideoOptions = {}
): Promise<OpenRouterCreatedVideoTask> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');
  const input = validateOpenRouterVideoRequest(request);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  try {
    const response = await (options.fetchImpl || fetch)(OPENROUTER_VIDEO_BASE, {
      method: 'POST',
      signal: controller.signal,
      headers: providerHeaders(apiKey, true),
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        duration: input.duration,
        resolution: input.resolution,
        aspect_ratio: input.aspectRatio,
        generate_audio: input.generateAudio,
      }),
    });
    if (!response.ok) throw new Error(httpErrorCode(response.status));
    const payload = await readJson(response);
    return { taskId: safeTaskId(payload.id), status: normalizeStatus(payload.status) };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('OPENROUTER_VIDEO_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOpenRouterVideoTask(
  taskId: string,
  options: OpenRouterVideoOptions = {}
): Promise<OpenRouterVideoTaskResult> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');
  const id = safeTaskId(taskId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const response = await (options.fetchImpl || fetch)(`${OPENROUTER_VIDEO_BASE}/${encodeURIComponent(id)}`, {
      method: 'GET',
      signal: controller.signal,
      headers: providerHeaders(apiKey),
    });
    if (!response.ok) throw new Error(httpErrorCode(response.status));
    const payload = await readJson(response);
    return { taskId: id, status: normalizeStatus(payload.status) };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('OPENROUTER_VIDEO_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadOpenRouterVideo(
  taskId: string,
  options: OpenRouterVideoOptions = {}
): Promise<Buffer> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');
  const id = safeTaskId(taskId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);
  try {
    const response = await (options.fetchImpl || fetch)(`${OPENROUTER_VIDEO_BASE}/${encodeURIComponent(id)}/content?index=0`, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'error',
      headers: providerHeaders(apiKey),
    });
    if (!response.ok) throw new Error(httpErrorCode(response.status));
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('video')) throw new Error('OPENROUTER_VIDEO_OUTPUT_MIME_INVALID');
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) {
      throw new Error('OPENROUTER_VIDEO_OUTPUT_TOO_LARGE');
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_VIDEO_BYTES) throw new Error('OPENROUTER_VIDEO_OUTPUT_SIZE_INVALID');
    return bytes;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('OPENROUTER_VIDEO_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
