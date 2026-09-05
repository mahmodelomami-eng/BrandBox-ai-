import assert from 'node:assert/strict';
import {
  createOpenRouterVideoTask,
  downloadOpenRouterVideoContent,
  getOpenRouterVideoTask,
  validateOpenRouterVideoRequest,
} from '../lib/ai/openrouter-video-client';

async function run() {
  const validated = validateOpenRouterVideoRequest({
    model: 'bytedance/seedance-2.0-mini',
    prompt: '  cinematic product shot  ',
    duration: 4,
    resolution: '480p',
    aspectRatio: '16:9',
    generateAudio: false,
  });
  assert.equal(validated.prompt, 'cinematic product shot');
  assert.equal(validated.duration, 4);
  assert.equal(validated.resolution, '480p');
  assert.equal(validated.aspectRatio, '16:9');
  assert.equal(validated.generateAudio, false);

  await assert.rejects(
    async () => validateOpenRouterVideoRequest({ model: 'unknown/video', prompt: 'x', duration: 4, aspectRatio: '16:9' }),
    (error: unknown) => error instanceof Error && error.message === 'OPENROUTER_VIDEO_MODEL_NOT_ALLOWED'
  );
  await assert.rejects(
    async () => validateOpenRouterVideoRequest({ model: 'bytedance/seedance-2.0-mini', prompt: 'x', duration: 3, aspectRatio: '16:9' }),
    (error: unknown) => error instanceof Error && error.message === 'OPENROUTER_VIDEO_INVALID_DURATION'
  );

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const created = await createOpenRouterVideoTask({
    model: 'bytedance/seedance-2.0-mini',
    prompt: 'product shot',
    duration: 4,
    resolution: '480p',
    aspectRatio: '16:9',
    generateAudio: false,
  }, {
    apiKey: 'test-key',
    fetchImpl: async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify({ id: 'video_job_1', status: 'pending', polling_url: '/api/v1/videos/video_job_1' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  assert.equal(created.taskId, 'video_job_1');
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/videos');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    model: 'bytedance/seedance-2.0-mini',
    prompt: 'product shot',
    duration: 4,
    resolution: '480p',
    aspect_ratio: '16:9',
    generate_audio: false,
  });

  const processing = await getOpenRouterVideoTask('video_job_1', {
    apiKey: 'test-key',
    fetchImpl: async (input) => {
      assert.equal(String(input), 'https://openrouter.ai/api/v1/videos/video_job_1');
      return new Response(JSON.stringify({ id: 'video_job_1', status: 'in_progress' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  assert.equal(processing.status, 'processing');

  const complete = await getOpenRouterVideoTask('video_job_1', {
    apiKey: 'test-key',
    fetchImpl: async () => new Response(JSON.stringify({ id: 'video_job_1', status: 'completed' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });
  assert.equal(complete.status, 'succeeded');

  const bytes = await downloadOpenRouterVideoContent('video_job_1', {
    apiKey: 'test-key',
    fetchImpl: async (input, init) => {
      assert.equal(String(input), 'https://openrouter.ai/api/v1/videos/video_job_1/content?index=0');
      assert.equal(init?.redirect, 'error');
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { 'content-type': 'video/mp4' },
      });
    },
  });
  assert.equal(bytes.length, 4);

  await assert.rejects(
    () => createOpenRouterVideoTask({ model: 'bytedance/seedance-2.0-mini', prompt: 'x', duration: 4, aspectRatio: '16:9' }, {
      apiKey: 'test-key',
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'private provider detail' } }), { status: 429 }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'OPENROUTER_VIDEO_RATE_LIMITED'
  );
  await assert.rejects(
    () => downloadOpenRouterVideoContent('video_job_1', {
      apiKey: 'test-key',
      fetchImpl: async () => new Response('not video', { status: 200, headers: { 'content-type': 'text/plain' } }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'OPENROUTER_VIDEO_CONTENT_TYPE_INVALID'
  );

  console.log('OpenRouter video client tests passed.');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
