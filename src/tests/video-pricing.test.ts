import assert from 'node:assert/strict';
import {
  hasResolutionIndependentVideoPricing,
  hasVideoPricingMatrix,
  minimumVideoCreditsPerSecond,
  parseVideoPricingMatrix,
  pricedVideoAudioModes,
  pricedVideoResolutions,
  publicVideoPricingOptions,
  resolveVideoPricing,
} from '../lib/ai/video-pricing';

const matrixMetadata = {
  brandbox_credits_per_second: 5,
  brandbox_priced_resolutions: ['480p'],
  brandbox_priced_audio_modes: ['off'],
  brandbox_video_pricing_matrix: {
    version: 1,
    variants: [
      { resolution: '720p', audio_mode: 'off', credits_per_second: 10, provider_usd_per_second: 0.03 },
      { resolution: '720p', audio_mode: 'on', credits_per_second: 17, provider_usd_per_second: 0.05 },
      { resolution: '1080p', audio_mode: 'off', credits_per_second: 17, provider_usd_per_second: 0.05 },
      { resolution: '1080p', audio_mode: 'on', credits_per_second: 27, provider_usd_per_second: 0.08 },
    ],
  },
};

assert.equal(hasVideoPricingMatrix(matrixMetadata), true);
assert.equal(hasResolutionIndependentVideoPricing(matrixMetadata), false);
assert.deepEqual(pricedVideoResolutions(matrixMetadata), ['720p', '1080p']);
assert.deepEqual(pricedVideoAudioModes(matrixMetadata, '720p'), ['off', 'on']);
assert.equal(minimumVideoCreditsPerSecond(matrixMetadata), 10);

assert.deepEqual(resolveVideoPricing(matrixMetadata, { resolution: '720p', generateAudio: false }), {
  resolution: '720p',
  audioMode: 'off',
  creditsPerSecond: 10,
  providerUsdPerSecond: 0.03,
  source: 'matrix',
});
assert.equal(resolveVideoPricing(matrixMetadata, { resolution: '4K', generateAudio: false }), null);
assert.equal(resolveVideoPricing(matrixMetadata, { resolution: '1080p', generateAudio: true })?.creditsPerSecond, 27);

const publicOptions = publicVideoPricingOptions(matrixMetadata);
assert.equal(publicOptions.length, 4);
assert.ok(publicOptions.every((option) => !('providerUsdPerSecond' in option)), 'provider USD cost must stay server-only');

const klingStandardMetadata = {
  brandbox_video_pricing_matrix: {
    version: 1,
    pricing_dimension: 'audio_mode',
    resolution_independent: true,
    variants: [
      { resolution: '*', audio_mode: 'off', credits_per_second: 28, provider_usd_per_second: 0.084 },
      { resolution: '*', audio_mode: 'on', credits_per_second: 42, provider_usd_per_second: 0.126 },
    ],
  },
};
assert.equal(hasResolutionIndependentVideoPricing(klingStandardMetadata), true);
assert.deepEqual(pricedVideoResolutions(klingStandardMetadata), [], '`*` is pricing metadata, not a user resolution');
assert.deepEqual(pricedVideoAudioModes(klingStandardMetadata), ['off', 'on']);
assert.equal(resolveVideoPricing(klingStandardMetadata, { generateAudio: false })?.creditsPerSecond, 28);
assert.equal(resolveVideoPricing(klingStandardMetadata, { generateAudio: true })?.creditsPerSecond, 42);
assert.equal(resolveVideoPricing(klingStandardMetadata, { resolution: '1080p', generateAudio: true })?.creditsPerSecond, 42);
assert.equal(minimumVideoCreditsPerSecond(klingStandardMetadata), 28);

// Resolution-specific pricing wins when a catalog ever combines an exact SKU
// with a provider-wide fallback for the same audio mode.
const mixedMetadata = {
  brandbox_video_pricing_matrix: {
    version: 1,
    variants: [
      { resolution: '*', audio_mode: 'off', credits_per_second: 28 },
      { resolution: '4K', audio_mode: 'off', credits_per_second: 90 },
    ],
  },
};
assert.equal(resolveVideoPricing(mixedMetadata, { resolution: '4K', generateAudio: false })?.creditsPerSecond, 90);
assert.equal(resolveVideoPricing(mixedMetadata, { resolution: '720p', generateAudio: false })?.creditsPerSecond, 28);

// Once a matrix is declared, malformed or incomplete matrix data must fail
// closed instead of falling back to the old flat 5 credits/sec rate.
const malformedMatrix = {
  brandbox_credits_per_second: 5,
  brandbox_priced_resolutions: ['480p'],
  brandbox_priced_audio_modes: ['off'],
  brandbox_video_pricing_matrix: { version: 1, variants: [{ resolution: '480p', audio_mode: 'off' }] },
};
assert.equal(hasVideoPricingMatrix(malformedMatrix), true);
assert.deepEqual(parseVideoPricingMatrix(malformedMatrix), []);
assert.equal(resolveVideoPricing(malformedMatrix, { resolution: '480p', generateAudio: false }), null);

// Existing launch metadata remains valid until it is explicitly migrated.
const legacyMetadata = {
  brandbox_credits_per_second: 5,
  brandbox_priced_resolutions: ['480p'],
  brandbox_priced_audio_modes: ['off'],
};
assert.equal(hasVideoPricingMatrix(legacyMetadata), false);
assert.deepEqual(resolveVideoPricing(legacyMetadata, { resolution: '480p', generateAudio: false }), {
  resolution: '480p',
  audioMode: 'off',
  creditsPerSecond: 5,
  source: 'legacy',
});
assert.equal(resolveVideoPricing(legacyMetadata, { resolution: '480p', generateAudio: true }), null);
assert.equal(resolveVideoPricing(legacyMetadata, { resolution: '720p', generateAudio: false }), null);

console.log('Video settings-aware pricing resolver tests passed.');
