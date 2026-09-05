import assert from 'node:assert/strict';
import {
  getOpenRouterModelCapabilities,
  isCapabilityKnown,
  normalizeSetting,
} from '../lib/ai/openrouter-model-capabilities';

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

async function run() {
  const imageFetch: typeof fetch = async () => jsonResponse({
    data: [
      {
        id: 'vendor/image-a',
        supported_parameters: {
          resolution: { type: 'enum', values: ['1K', '2K'] },
          aspect_ratio: { type: 'enum', values: ['1:1', '16:9'] },
          n: { type: 'range', min: 1, max: 4 },
        },
      },
      {
        id: 'vendor/image-b',
        supported_parameters: {
          resolution: { type: 'enum', values: ['2K', '4K'] },
          aspect_ratio: { type: 'enum', values: ['1:1', '9:16'] },
          n: { type: 'range', min: 1, max: 1 },
        },
      },
    ],
  });

  const imageA = await getOpenRouterModelCapabilities('image', 'vendor/image-a', {
    apiKey: 'test-key', fetchImpl: imageFetch, forceRefresh: true,
  });
  const imageB = await getOpenRouterModelCapabilities('image', 'vendor/image-b', {
    apiKey: 'test-key', fetchImpl: imageFetch, forceRefresh: true,
  });
  assert.deepEqual(imageA.image?.resolutions, ['1K', '2K']);
  assert.deepEqual(imageB.image?.resolutions, ['2K', '4K']);
  assert.equal(imageB.image?.resolutions.includes('1K'), false);
  assert.equal(normalizeSetting('16:9', imageB.image?.aspectRatios || []), '1:1');
  assert.equal(imageA.image?.countRange?.max, 4);
  assert.equal(imageB.image?.countRange?.max, 1);

  const videoFetch: typeof fetch = async () => jsonResponse({
    data: [{
      id: 'vendor/video-a',
      supported_durations: [4, 6, 8],
      supported_resolutions: ['720p', '1080p'],
      supported_aspect_ratios: ['16:9', '9:16'],
      supported_frame_images: ['first_frame'],
      allowed_passthrough_parameters: ['seed'],
      generate_audio: true,
      seed: true,
    }],
  });
  const video = await getOpenRouterModelCapabilities('video', 'vendor/video-a', {
    apiKey: 'test-key', fetchImpl: videoFetch, forceRefresh: true,
  });
  assert.deepEqual(video.video?.durations, [4, 6, 8]);
  assert.deepEqual(video.video?.resolutions, ['720p', '1080p']);
  assert.equal(video.video?.supportsAudio, true);
  assert.equal(video.video?.supportsSeed, true);
  assert.deepEqual(video.video?.frameImages, ['first_frame']);
  assert.equal(video.supportedParameters.includes('seed'), true);
  assert.equal(normalizeSetting(5, video.video?.durations || []), 4);

  const chatFetch: typeof fetch = async () => jsonResponse({
    data: {
      id: 'vendor/chat-a',
      supported_parameters: ['max_tokens', 'reasoning', 'tools', 'tool_choice'],
      architecture: { input_modalities: ['text'], output_modalities: ['text'] },
      context_length: 128000,
      top_provider: { max_completion_tokens: 32000 },
    },
  });
  const chat = await getOpenRouterModelCapabilities('chat', 'vendor/chat-a', {
    apiKey: 'test-key', fetchImpl: chatFetch, forceRefresh: true,
  });
  assert.equal(chat.chat?.supportsTemperature, false);
  assert.equal(chat.chat?.supportsReasoning, true);
  assert.equal(chat.chat?.supportsTools, true);
  assert.equal(chat.chat?.supportsMaxTokens, true);
  assert.equal(chat.contextLength, 128000);
  assert.equal(chat.maxCompletionTokens, 32000);

  const audioFetch: typeof fetch = async () => jsonResponse({
    data: {
      id: 'vendor/tts-a',
      supported_parameters: ['speed'],
      supported_voices: ['voice-a', 'voice-b'],
      supported_response_formats: ['mp3', 'pcm'],
      architecture: { input_modalities: ['text'], output_modalities: ['speech'] },
    },
  });
  const audio = await getOpenRouterModelCapabilities('audio', 'vendor/tts-a', {
    apiKey: 'test-key', fetchImpl: audioFetch, forceRefresh: true,
  });
  assert.deepEqual(audio.audio?.voices, ['voice-a', 'voice-b']);
  assert.deepEqual(audio.audio?.responseFormats, ['mp3', 'pcm']);
  assert.equal(audio.audio?.supportsSpeed, true);

  const failingFetch: typeof fetch = async () => new Response('upstream down', { status: 503 });
  const closedFallback = await getOpenRouterModelCapabilities('image', 'vendor/unknown', {
    apiKey: 'test-key', fetchImpl: failingFetch, forceRefresh: true, fallbackMetadata: {},
  });
  assert.equal(closedFallback.source, 'catalog-fallback');
  assert.deepEqual(closedFallback.image?.resolutions, []);
  assert.deepEqual(closedFallback.image?.aspectRatios, []);
  assert.equal(isCapabilityKnown(closedFallback), false);

  const verifiedFallback = await getOpenRouterModelCapabilities('video', 'vendor/verified-video', {
    apiKey: 'test-key',
    fetchImpl: failingFetch,
    forceRefresh: true,
    fallbackMetadata: {
      supported_resolutions: ['480p'],
      supported_ratios: ['16:9'],
      supported_durations: [4],
    },
  });
  assert.equal(verifiedFallback.source, 'catalog-fallback');
  assert.equal(isCapabilityKnown(verifiedFallback), true);
  assert.deepEqual(verifiedFallback.video?.durations, [4]);

  console.log('OpenRouter adaptive model capability tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
