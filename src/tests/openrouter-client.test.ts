import assert from 'node:assert/strict';
import { createOpenRouterChatCompletion, createOpenRouterImageGeneration } from '../lib/ai/openrouter-client';

async function run() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({
      id: 'gen-test',
      choices: [{ message: { content: ' BrandBox response ' } }],
      usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7, cost: 0.00001 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await createOpenRouterChatCompletion(
    {
      model: 'openai/gpt-4o-mini',
      prompt: '  hello  ',
      systemPrompt: '  authenticated project context  ',
      temperature: 99,
      maxTokens: 99999,
    },
    { apiKey: 'test-key', fetchImpl }
  );
  assert.equal(result.content, 'BrandBox response');
  assert.equal(result.promptTokens, 4);
  assert.equal(result.totalTokens, 7);
  assert.equal(result.costUsd, 0.00001);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
  const chatBody = JSON.parse(String(calls[0].init?.body));
  assert.deepEqual(chatBody.messages, [
    { role: 'system', content: 'authenticated project context' },
    { role: 'user', content: 'hello' },
  ]);
  assert.equal(chatBody.temperature, 2);
  assert.equal(chatBody.max_tokens, 4000);

  await assert.rejects(
    () => createOpenRouterChatCompletion({ model: 'openai/gpt-4o-mini', prompt: 'hello' }, {
      apiKey: 'test-key',
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'internal quota detail' } }), { status: 429 }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'OPENROUTER_RATE_LIMITED'
  );

  await assert.rejects(
    () => createOpenRouterChatCompletion({ model: 'openai/gpt-4o-mini', prompt: 'hello' }, {
      apiKey: 'test-key',
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'provider stack detail' } }), { status: 503 }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'OPENROUTER_PROVIDER_UNAVAILABLE'
  );

  await assert.rejects(
    () => createOpenRouterChatCompletion({ model: 'openai/gpt-4o-mini', prompt: 'hello' }, {
      apiKey: 'test-key',
      fetchImpl: async () => new Response('not-json', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'OPENROUTER_INVALID_RESPONSE'
  );

  const timeoutFetch: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
    const abort = () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    };
    if (init?.signal?.aborted) abort();
    else init?.signal?.addEventListener('abort', abort, { once: true });
  });
  await assert.rejects(
    () => createOpenRouterChatCompletion(
      { model: 'openai/gpt-4o-mini', prompt: 'hello' },
      { apiKey: 'test-key', fetchImpl: timeoutFetch, timeoutMs: 1 }
    ),
    (error: unknown) => error instanceof Error && error.message === 'OPENROUTER_TIMEOUT'
  );

  const imageCalls: Array<{ url: string; init?: RequestInit }> = [];
  const imageResult = await createOpenRouterImageGeneration({
    model: 'openai/gpt-image-2',
    prompt: '  a red poster  ',
    aspectRatio: '4:5',
    count: 2,
    resolution: '1K',
  }, {
    apiKey: 'test-key',
    fetchImpl: async (input, init) => {
      imageCalls.push({ url: String(input), init });
      return new Response(JSON.stringify({
        data: [
          { b64_json: 'aW1hZ2Ux', media_type: 'image/png' },
          { b64_json: 'aW1hZ2Uy', media_type: 'image/webp' },
        ],
        usage: { total_tokens: 12, cost: 0.03 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  assert.equal(imageCalls[0].url, 'https://openrouter.ai/api/v1/images');
  assert.deepEqual(JSON.parse(String(imageCalls[0].init?.body)), {
    model: 'openai/gpt-image-2', prompt: 'a red poster', aspect_ratio: '4:5', resolution: '1K', n: 2,
  });
  assert.deepEqual(imageResult.images, [
    { base64: 'aW1hZ2Ux', mediaType: 'image/png' },
    { base64: 'aW1hZ2Uy', mediaType: 'image/webp' },
  ]);
  assert.equal(imageResult.costUsd, 0.03);

  await assert.rejects(
    () => createOpenRouterImageGeneration({ model: 'unknown/image-model', prompt: 'hello' }, { apiKey: 'test-key', fetchImpl }),
    /OPENROUTER_IMAGE_MODEL_NOT_ALLOWED/
  );
  await assert.rejects(
    () => createOpenRouterImageGeneration({ model: 'openai/gpt-image-2', prompt: 'hello' }, {
      apiKey: 'test-key',
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'provider down' } }), { status: 503 }),
    }),
    /OPENROUTER_IMAGE_HTTP_503: provider down/
  );
  console.log('OpenRouter client tests passed.');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
