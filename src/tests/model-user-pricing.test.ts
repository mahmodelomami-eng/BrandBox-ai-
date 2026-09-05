import assert from 'node:assert/strict';
import { isModelUserPriced, providerCostIsFree } from '../lib/ai/model-user-pricing';

assert.equal(isModelUserPriced({ generation_type: 'chat', minimum_credits: 1 }), true);
assert.equal(isModelUserPriced({ generation_type: 'image', minimum_credits: 4 }), true);
assert.equal(isModelUserPriced({ generation_type: 'audio', minimum_credits: 2 }), true);
assert.equal(isModelUserPriced({ generation_type: 'chat', minimum_credits: 0 }), false);
assert.equal(isModelUserPriced({ generation_type: 'image', minimum_credits: null }), false);

// A provider-free model is still user-priced when Brand Box assigns credits.
assert.equal(providerCostIsFree({ fixed_provider_cost_usd: 0 }), true);
assert.equal(isModelUserPriced({ generation_type: 'image', minimum_credits: 4 }), true);

// Unknown provider cost is not the same thing as a verified free provider SKU.
assert.equal(providerCostIsFree({ fixed_provider_cost_usd: null }), false);
assert.equal(providerCostIsFree({}), false);
assert.equal(providerCostIsFree({ fixed_provider_cost_usd: 0.01 }), false);

const kling = {
  generation_type: 'video',
  minimum_credits: 45,
  metadata: {
    brandbox_video_pricing_matrix: {
      version: 1,
      variants: [
        { resolution: '*', audio_mode: 'off', credits_per_second: 28 },
        { resolution: '*', audio_mode: 'on', credits_per_second: 42 },
      ],
    },
  },
};
assert.equal(isModelUserPriced(kling), true);
assert.equal(isModelUserPriced({ generation_type: 'video', minimum_credits: 45, metadata: {} }), false);

console.log('Brand Box user pricing visibility policy tests passed.');
