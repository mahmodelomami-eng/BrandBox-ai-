import assert from 'node:assert/strict';
import { createOpenRouterChatCompletion } from '../lib/ai/openrouter-client';

async function run() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({
      id: 'gen-test',
      choices: [{ message: { content: 'BrandBox response' } }],
      usage: { prompt_tokens: 4, completion_tokens: 3 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await createOpenRouterChatCompletion(
    { model: 'openai/gpt-4o-mini', prompt: '  hello  ' },
    { apiKey: 'test-key', fetchImpl }
  );
  assert.equal(result.content, 'BrandBox response');
  assert.equal(result.promptTokens, 4);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
  assert.equal(JSON.parse(String(calls[0].init?.body)).messages[0].content, 'hello');

  await assert.rejects(
    () => createOpenRouterChatCompletion({ model: 'x', prompt: 'hello' }, {
      apiKey: 'test-key',
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'denied' } }), { status: 401 }),
    }),
    /OPENROUTER_HTTP_401: denied/
  );
  console.log('OpenRouter client tests passed.');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
