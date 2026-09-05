const OPENROUTER_VIDEO_BASE = 'https://openrouter.ai/api/v1/videos';

// Verified launch fallback only. These constants are no longer the authority
// for all OpenRouter video models; per-model capability policy is resolved by
// openrouter-model-capabilities.ts before this client is called.
export const OPENROUTER_VIDEO_MODELS = ['bytedance/seedance-2.0-mini'] as const;
export const OPENROUTER_VIDEO_RATIOS = ['16:9', '9:16'] as const;
export const OPENROUTER_VIDEO_RESOLUTIONS = ['480p'] as const;
export const OPENROUTER_VIDEO_MIN_DURATION = 4;
export const OPENROUTER_VIDEO_MAX_DURATION = 15;

export type OpenRouterVideoTaskStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export interface OpenRouterVideoRequest {
  model: string;
  prompt: string;
  duration: number;
  resolution?: string;
  aspectRatio: string;
  generateAudio?: boolean;
  seed?: number;
}

export interface OpenRouterVideoCreatedTask {
  taskId: string;
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

function videoHttpErrorCode(status: number): string {
  if (status === 408) return 'OPENROUTER_VIDEO_TIMEOUT';
  if (status === 429) return 'OPENROUTER_VIDEO_RATE_LIMITED';
  if (status === 401 || status === 403) return 'OPENROUTER_VIDEO_AUTH_FAILED';
  if (status >= 500) return 'OPENROUTER_VIDEO_PROVIDER_UNAVAILABLE';
  return 'OPENROUTER_VIDEO_REQUEST_REJECTED';
}

function assertTaskId(raw: string): string {
  const value = String(raw || '').trim();
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(value)) throw new Error('OPENROUTER_VIDEO_INVALID_TASK_ID');
  return value;
}

function normalizeTaskStatus(raw: unknown): OpenRouterVideoTaskStatus {
  switch (String(raw || '').toLowerCase()) {
    case 'pending': return 'queued';
    case 'in_progress': return 'processing';
    case 'completed': return 'succeeded';
    case 'cancelled': return 'cancelled';
    case 'failed':
    case 'expired':
      return 'failed';
    default:
      throw new Error('OPENROUTER_VIDEO_INVALID_TASK_RESPONSE');
  }
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://brandbox-ai.com',
    'X-OpenRouter-Title': 'BrandBox AI',
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('OPENROUTER_VIDEO_INVALID_RESPONSE');
    }
    return payload as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === 'OPENROUTER_VIDEO_INVALID_RESPONSE') throw error;
    throw new Error('OPENROUTER_VIDEO_INVALID_RESPONSE');
  }
}

export function validateOpenRouterVideoRequest(request: OpenRouterVideoRequest): {
  model: string;
  prompt: string;
  duration: number;
  resolution?: string;
  aspectRatio: string;
  generateAudio?: boolean;
  seed?: number;
} {
  const model = String(request.model || '').trim();
  if (!/^[^/\s]+\/.{1,200}$/.test(model)) throw new Error('OPENROUTER_VIDEO_MODEL_NOT_ALLOWED');

  const prompt = request.prompt.trim();
  if (!prompt || prompt.length > 1000) throw new Error('OPENROUTER_VIDEO_INVALID_PROMPT');

  const duration = Number(request.duration);
  // Coarse protocol/safety bound only. Exact model durations are enforced by
  // the capability policy before this client runs.
  if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
    throw new Error('OPENROUTER_VIDEO_INVALID_DURATION');
  }

  const resolution = typeof request.resolution === 'string' ? request.resolution.trim() : '';
  if (resolution.length > 24) throw new Error('OPENROUTER_VIDEO_INVALID_RESOLUTION');

  const aspectRatio = String(request.aspectRatio || '').trim();
  if (!/^\d{1,4}:\d{1,4}$/.test(aspectRatio)) throw new Error('OPENROUTER_VIDEO_INVALID_RATIO');

  const seed = request.seed === undefined ? undefined : Number(request.seed);
  if (seed !== undefined && (!Number.isInteger(seed) || seed < 0)) throw new Error('OPENROUTER_VIDEO_INVALID_SEED');

  return {
    model,
    prompt,
    duration,
    ...(resolution ? { resolution } : {}),
    aspectRatio,
    ...(request.generateAudio !== undefined ? { generateAudio: request.generateAudio === true } : {}),
    ...(seed !== undefined ? { seed } : {}),
  };
}

export async function createOpenRouterVideoTask(
  request: OpenRouterVideoRequest,
  options: OpenRouterVideoOptions = {}
): Promise<OpenRouterVideoCreatedTask> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');
  const input = validateOpenRouterVideoRequest(request);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  try {
    const response = await (options.fetchImpl || fetch)(OPENROUTER_VIDEO_BASE, {
      method: 'POST',
      signal: controller.signal,
      headers: headers(apiKey),
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        duration: input.duration,
        ...(input.resolution ? { resolution: input.resolution } : {}),
        aspect_ratio: input.aspectRatio,
        ...(input.generateAudio !== undefined ? { generate_audio: input.generateAudio } : {}),
        ...(input.seed !== undefined ? { seed: input.seed } : {}),
      }),
    });
    if (!response.ok) throw new Error(videoHttpErrorCode(response.status));
    const payload = await readJson(response);
    if (typeof payload.id !== 'string') throw new Error('OPENROUTER_VIDEO_INVALID_RESPONSE');
    if (typeof payload.status !== 'string') throw new Error('OPENROUTER_VIDEO_INVALID_RESPONSE');
    normalizeTaskStatus(payload.status);
    return { taskId: assertTaskId(payload.id) };
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
  const id = assertTaskId(taskId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const response = await (options.fetchImpl || fetch)(`${OPENROUTER_VIDEO_BASE}/${encodeURIComponent(id)}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(videoHttpErrorCode(response.status));
    const payload = await readJson(response);
    return { taskId: id, status: normalizeTaskStatus(payload.status) };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('OPENROUTER_VIDEO_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadOpenRouterVideoContent(
  taskId: string,
  options: OpenRouterVideoOptions = {}
): Promise<Buffer> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');
  const id = assertTaskId(taskId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 90_000);
  try {
    const response = await (options.fetchImpl || fetch)(`${OPENROUTER_VIDEO_BASE}/${encodeURIComponent(id)}/content?index=0`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}` },
      redirect: 'error',
    });
    if (!response.ok) throw new Error(videoHttpErrorCode(response.status));
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('video/')) throw new Error('OPENROUTER_VIDEO_CONTENT_TYPE_INVALID');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error('OPENROUTER_VIDEO_EMPTY_CONTENT');
    return bytes;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('OPENROUTER_VIDEO_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
