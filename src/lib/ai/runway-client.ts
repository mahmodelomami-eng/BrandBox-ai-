const RUNWAY_API_BASE = 'https://api.dev.runwayml.com';
export const RUNWAY_API_VERSION = '2024-11-06';
export const RUNWAY_VIDEO_MODELS = ['gen4.5'] as const;
export const RUNWAY_TEXT_TO_VIDEO_RATIOS = ['1280:720', '720:1280'] as const;
export const RUNWAY_TEXT_TO_VIDEO_MIN_DURATION = 2;
export const RUNWAY_TEXT_TO_VIDEO_MAX_DURATION = 10;

export type RunwayVideoModel = typeof RUNWAY_VIDEO_MODELS[number];
export type RunwayVideoRatio = typeof RUNWAY_TEXT_TO_VIDEO_RATIOS[number];
export type RunwayTaskStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export interface RunwayVideoRequest {
  model: string;
  promptText: string;
  ratio: string;
  duration: number;
}

export interface RunwayCreatedTask {
  taskId: string;
}

export interface RunwayTaskResult {
  taskId: string;
  status: RunwayTaskStatus;
  outputUrls: string[];
}

interface RunwayOptions {
  apiSecret?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function runwayHttpErrorCode(status: number): string {
  if (status === 408) return 'RUNWAY_TIMEOUT';
  if (status === 429) return 'RUNWAY_RATE_LIMITED';
  if (status === 401 || status === 403) return 'RUNWAY_AUTH_FAILED';
  if (status >= 500) return 'RUNWAY_PROVIDER_UNAVAILABLE';
  return 'RUNWAY_REQUEST_REJECTED';
}

function normalizeProviderStatus(status: unknown): RunwayTaskStatus {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
    case 'THROTTLED':
      return 'queued';
    case 'RUNNING':
    case 'PROCESSING':
      return 'processing';
    case 'SUCCEEDED':
      return 'succeeded';
    case 'FAILED':
      return 'failed';
    case 'CANCELED':
    case 'CANCELLED':
      return 'cancelled';
    default:
      throw new Error('RUNWAY_INVALID_TASK_RESPONSE');
  }
}

function assertTaskId(taskId: string): string {
  const value = taskId.trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new Error('RUNWAY_INVALID_TASK_ID');
  return value;
}

function runwayHeaders(apiSecret: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiSecret}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': RUNWAY_API_VERSION,
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('RUNWAY_INVALID_RESPONSE');
    }
    return payload as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === 'RUNWAY_INVALID_RESPONSE') throw error;
    throw new Error('RUNWAY_INVALID_RESPONSE');
  }
}

export function validateRunwayVideoRequest(request: RunwayVideoRequest): {
  model: RunwayVideoModel;
  promptText: string;
  ratio: RunwayVideoRatio;
  duration: number;
} {
  if (!RUNWAY_VIDEO_MODELS.includes(request.model as RunwayVideoModel)) {
    throw new Error('RUNWAY_VIDEO_MODEL_NOT_ALLOWED');
  }
  const promptText = request.promptText.trim();
  if (!promptText || promptText.length > 1000) throw new Error('RUNWAY_INVALID_VIDEO_PROMPT');
  if (!RUNWAY_TEXT_TO_VIDEO_RATIOS.includes(request.ratio as RunwayVideoRatio)) {
    throw new Error('RUNWAY_INVALID_VIDEO_RATIO');
  }
  if (!Number.isInteger(request.duration)
      || request.duration < RUNWAY_TEXT_TO_VIDEO_MIN_DURATION
      || request.duration > RUNWAY_TEXT_TO_VIDEO_MAX_DURATION) {
    throw new Error('RUNWAY_INVALID_VIDEO_DURATION');
  }
  return {
    model: request.model as RunwayVideoModel,
    promptText,
    ratio: request.ratio as RunwayVideoRatio,
    duration: request.duration,
  };
}

export async function createRunwayVideoTask(
  request: RunwayVideoRequest,
  options: RunwayOptions = {}
): Promise<RunwayCreatedTask> {
  const apiSecret = options.apiSecret || process.env.RUNWAYML_API_SECRET;
  if (!apiSecret) throw new Error('RUNWAY_API_SECRET_MISSING');
  const input = validateRunwayVideoRequest(request);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const response = await (options.fetchImpl || fetch)(`${RUNWAY_API_BASE}/v1/image_to_video`, {
      method: 'POST',
      signal: controller.signal,
      headers: runwayHeaders(apiSecret),
      body: JSON.stringify({
        model: input.model,
        promptText: input.promptText,
        ratio: input.ratio,
        duration: input.duration,
      }),
    });
    if (!response.ok) throw new Error(runwayHttpErrorCode(response.status));
    const payload = await readJson(response);
    if (typeof payload.id !== 'string') throw new Error('RUNWAY_INVALID_RESPONSE');
    return { taskId: assertTaskId(payload.id) };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('RUNWAY_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRunwayTask(
  taskId: string,
  options: RunwayOptions = {}
): Promise<RunwayTaskResult> {
  const apiSecret = options.apiSecret || process.env.RUNWAYML_API_SECRET;
  if (!apiSecret) throw new Error('RUNWAY_API_SECRET_MISSING');
  const id = assertTaskId(taskId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const response = await (options.fetchImpl || fetch)(`${RUNWAY_API_BASE}/v1/tasks/${encodeURIComponent(id)}`, {
      method: 'GET',
      signal: controller.signal,
      headers: runwayHeaders(apiSecret),
    });
    if (!response.ok) throw new Error(runwayHttpErrorCode(response.status));
    const payload = await readJson(response);
    const status = normalizeProviderStatus(payload.status);
    const outputUrls = status === 'succeeded' && Array.isArray(payload.output)
      ? payload.output.filter((value): value is string => typeof value === 'string' && value.startsWith('https://'))
      : [];
    if (status === 'succeeded' && outputUrls.length === 0) throw new Error('RUNWAY_EMPTY_VIDEO_OUTPUT');
    return { taskId: id, status, outputUrls };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('RUNWAY_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
