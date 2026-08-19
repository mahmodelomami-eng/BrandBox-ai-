import { createHash } from 'crypto';

export interface OpenRouterChatRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterChatResponse {
  content: string;
  providerModel: string;
  requestId?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function isOpenRouterModelAllowed(model: string): boolean {
  const configured = (process.env.OPENROUTER_ALLOWED_MODELS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured.includes(model);

  return [
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'meta-llama/llama-3.3-70b-instruct',
    'google/gemini-2.5-flash',
  ].includes(model);
}

export async function generateOpenRouterChat(
  request: OpenRouterChatRequest,
  signal?: AbortSignal,
): Promise<OpenRouterChatResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('AI_PROVIDER_NOT_CONFIGURED: OpenRouter API key is missing.');
  if (!isOpenRouterModelAllowed(request.model)) {
    throw new Error(`MODEL_NOT_ALLOWED: ${request.model}`);
  }

  const baseUrl = (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const controller = new AbortController();
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || 60000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://brandbox-ai.com',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Brand Box AI',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2000,
      }),
    });

    const raw = await response.text();
    let payload: any;
    try { payload = JSON.parse(raw); } catch { payload = null; }

    if (!response.ok) {
      const providerMessage = payload?.error?.message || `HTTP_${response.status}`;
      throw new Error(`OPENROUTER_ERROR: ${providerMessage}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('OPENROUTER_ERROR: Provider returned an empty response.');
    }

    return {
      content,
      providerModel: payload?.model || request.model,
      requestId: payload?.id,
      usage: {
        promptTokens: payload?.usage?.prompt_tokens,
        completionTokens: payload?.usage?.completion_tokens,
        totalTokens: payload?.usage?.total_tokens,
      },
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('OPENROUTER_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function hashGenerationInput(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
