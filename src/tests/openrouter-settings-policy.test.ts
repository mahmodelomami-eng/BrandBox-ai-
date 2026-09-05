import assert from 'node:assert/strict';
import {
  applyAudioCapabilityPolicy,
  applyChatCapabilityPolicy,
  applyImageCapabilityPolicy,
  applyVideoCapabilityPolicy,
} from '../lib/ai/openrouter-settings-policy';
import type { OpenRouterModelCapabilities } from '../lib/ai/openrouter-model-capabilities';

const imageCaps: OpenRouterModelCapabilities = {
  modelId: 'image-b', tool: 'image', source: 'openrouter-live', supportedParameters: [], inputModalities: [], outputModalities: [], contextLength: null, maxCompletionTokens: null,
  image: { resolutions: ['2K', '4K'], aspectRatios: ['1:1', '9:16'], countRange: { min: 1, max: 2 }, inputReferenceRange: null, qualityValues: [], outputFormats: [], backgroundValues: [], supportsStreaming: false },
};
const image = applyImageCapabilityPolicy(imageCaps, { resolution: '1K', aspectRatio: '16:9', count: 9 });
assert.deepEqual(image.settings, { aspectRatio: '1:1', resolution: '2K', count: 2 });
assert.deepEqual(image.normalizedFields.sort(), ['aspectRatio', 'count', 'resolution']);

const videoCaps: OpenRouterModelCapabilities = {
  modelId: 'video-a', tool: 'video', source: 'openrouter-live', supportedParameters: [], inputModalities: [], outputModalities: [], contextLength: null, maxCompletionTokens: null,
  video: { durations: [4, 6, 8], resolutions: ['720p', '1080p'], aspectRatios: ['16:9'], frameImages: [], supportsAudio: false, supportsSeed: false },
};
const video = applyVideoCapabilityPolicy(videoCaps, { duration: 5, resolution: '480p', ratio: '9:16', generateAudio: true, seed: 123 });
assert.deepEqual(video.settings, { duration: 4, resolution: '720p', aspectRatio: '16:9' });
assert.ok(video.normalizedFields.includes('generateAudio'));
assert.ok(video.normalizedFields.includes('seed'));

const chatCaps: OpenRouterModelCapabilities = {
  modelId: 'chat-a', tool: 'chat', source: 'openrouter-live', supportedParameters: ['max_tokens', 'reasoning'], inputModalities: ['text'], outputModalities: ['text'], contextLength: 32000, maxCompletionTokens: 2048,
  chat: { supportsTemperature: false, supportsTopP: false, supportsMaxTokens: true, supportsMaxCompletionTokens: false, supportsReasoning: true, supportsTools: false, supportsToolChoice: false, supportsStructuredOutput: false, supportsResponseFormat: false, supportsSeed: false, supportsWebSearch: false },
};
const chat = applyChatCapabilityPolicy(chatCaps, { temperature: 0.7, maxTokens: 5000, reasoning: { effort: 'low' }, seed: 7 });
assert.equal(chat.settings.temperature, undefined);
assert.equal(chat.settings.maxTokens, 2048);
assert.deepEqual(chat.settings.reasoning, { effort: 'low' });
assert.ok(chat.normalizedFields.includes('temperature'));
assert.ok(chat.normalizedFields.includes('seed'));

const audioCaps: OpenRouterModelCapabilities = {
  modelId: 'tts-a', tool: 'audio', source: 'openrouter-live', supportedParameters: ['speed'], inputModalities: ['text'], outputModalities: ['speech'], contextLength: null, maxCompletionTokens: null,
  audio: { voices: ['alloy', 'nova'], responseFormats: ['mp3'], supportsSpeed: true },
};
const audio = applyAudioCapabilityPolicy(audioCaps, { voice: 'unknown', responseFormat: 'wav', speed: 8 });
assert.deepEqual(audio.settings, { voice: 'alloy', responseFormat: 'mp3', speed: 4 });

console.log('OpenRouter capability settings policy tests passed.');
