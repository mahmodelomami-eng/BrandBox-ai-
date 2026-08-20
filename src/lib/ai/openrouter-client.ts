const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterChatRequest {
  model: string;
  prompt: string;
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

export async function createOpenRouterChatCompletion(
  request: OpenRouterChatRequest,
  options: OpenRouterOptions = {}
): Promise<OpenRouterChatResult> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_MISSING');
  if (!request.model || !request.prompt.trim()) throw new Error('OPENROUTER_INVALID_REQUEST');

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
        messages: [{ role: 'user', content: request.prompt.trim() }],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1200,
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
