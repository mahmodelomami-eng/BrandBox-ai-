import assert from 'node:assert/strict';
import {
  createRunwayVideoTask,
  getRunwayTask,
  RUNWAY_API_VERSION,
  validateRunwayVideoRequest,
} from '../lib/ai/runway-client';

async function run() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const created = await createRunwayVideoTask({
    model: 'gen4.5',
    promptText: '  cinematic product reveal  ',
    ratio: '1280:720',
    duration: 5,
  }, {
    apiSecret: 'runway-test-secret',
    fetchImpl: async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify({ id: 'task_123-test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  assert.equal(created.taskId, 'task_123-test');
  assert.equal(calls[0].url, 'https://api.dev.runwayml.com/v1/image_to_video');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer runway-test-secret');
  assert.equal((calls[0].init?.headers as Record<string, string>)['X-Runway-Version'], RUNWAY_API_VERSION);
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    model: 'gen4.5',
    promptText: 'cinematic product reveal',
    ratio: '1280:720',
    duration: 5,
  });

  assert.deepEqual(validateRunwayVideoRequest({
    model: 'gen4.5', promptText: 'hello', ratio: '720:1280', duration: 10,
  }), {
    model: 'gen4.5', promptText: 'hello', ratio: '720:1280', duration: 10,
  });
  assert.throws(() => validateRunwayVideoRequest({ model: 'gen3a_turbo', promptText: 'hello', ratio: '1280:720', duration: 5 }), /RUNWAY_VIDEO_MODEL_NOT_ALLOWED/);
  assert.throws(() => validateRunwayVideoRequest({ model: 'gen4.5', promptText: '', ratio: '1280:720', duration: 5 }), /RUNWAY_INVALID_VIDEO_PROMPT/);
  assert.throws(() => validateRunwayVideoRequest({ model: 'gen4.5', promptText: 'hello', ratio: '1:1', duration: 5 }), /RUNWAY_INVALID_VIDEO_RATIO/);
  assert.throws(() => validateRunwayVideoRequest({ model: 'gen4.5', promptText: 'hello', ratio: '1280:720', duration: 11 }), /RUNWAY_INVALID_VIDEO_DURATION/);

  const taskResponses: Array<[unknown, string]> = [
    ['PENDING', 'queued'],
    ['THROTTLED', 'queued'],
    ['RUNNING', 'processing'],
    ['SUCCEEDED', 'succeeded'],
    ['FAILED', 'failed'],
    ['CANCELED', 'cancelled'],
  ];
  for (const [providerStatus, expected] of taskResponses) {
    const task = await getRunwayTask('task_123-test', {
      apiSecret: 'runway-test-secret',
      fetchImpl: async () => new Response(JSON.stringify({
        id: 'task_123-test',
        status: providerStatus,
        output: providerStatus === 'SUCCEEDED' ? ['https://cdn.example.com/video.mp4?temporary=1'] : undefined,
        failure: 'provider internal detail that must never surface',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });
    assert.equal(task.status, expected);
    assert.deepEqual(task.outputUrls, providerStatus === 'SUCCEEDED' ? ['https://cdn.example.com/video.mp4?temporary=1'] : []);
    assert.equal(Object.prototype.hasOwnProperty.call(task, 'failure'), false);
  }

  await assert.rejects(
    () => createRunwayVideoTask({ model: 'gen4.5', promptText: 'hello', ratio: '1280:720', duration: 5 }, {
      apiSecret: 'runway-test-secret',
      fetchImpl: async () => new Response(JSON.stringify({ error: 'private quota detail' }), { status: 429 }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'RUNWAY_RATE_LIMITED'
  );
  await assert.rejects(
    () => createRunwayVideoTask({ model: 'gen4.5', promptText: 'hello', ratio: '1280:720', duration: 5 }, {
      apiSecret: 'runway-test-secret',
      fetchImpl: async () => new Response(JSON.stringify({ error: 'private auth detail' }), { status: 401 }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'RUNWAY_AUTH_FAILED'
  );
  await assert.rejects(
    () => getRunwayTask('task_123-test', {
      apiSecret: 'runway-test-secret',
      fetchImpl: async () => new Response(JSON.stringify({ error: 'provider stack detail' }), { status: 503 }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'RUNWAY_PROVIDER_UNAVAILABLE'
  );
  await assert.rejects(
    () => getRunwayTask('task_123-test', {
      apiSecret: 'runway-test-secret',
      fetchImpl: async () => new Response('not-json', { status: 200 }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'RUNWAY_INVALID_RESPONSE'
  );
  await assert.rejects(
    () => getRunwayTask('task_123-test', {
      apiSecret: 'runway-test-secret',
      fetchImpl: async () => new Response(JSON.stringify({ status: 'SUCCEEDED', output: [] }), { status: 200 }),
    }),
    (error: unknown) => error instanceof Error && error.message === 'RUNWAY_EMPTY_VIDEO_OUTPUT'
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
    () => createRunwayVideoTask({ model: 'gen4.5', promptText: 'hello', ratio: '1280:720', duration: 5 }, {
      apiSecret: 'runway-test-secret', fetchImpl: timeoutFetch, timeoutMs: 1,
    }),
    (error: unknown) => error instanceof Error && error.message === 'RUNWAY_TIMEOUT'
  );

  console.log('Runway client tests passed.');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
