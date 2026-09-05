const TARGET_BRANCH = 'launch/97-image-runtime-smoke';
const MODEL_ID = 'bytedance-seed/seedream-5-0-lite';
const OPENROUTER_IMAGES_URL = 'https://openrouter.ai/api/v1/images';

const isTargetPreview = process.env.VERCEL === '1'
  && process.env.VERCEL_ENV === 'preview'
  && process.env.VERCEL_GIT_COMMIT_REF === TARGET_BRANCH;

if (!isTargetPreview) {
  console.log('RC image runtime smoke: skipped outside the dedicated Vercel Preview branch.');
  process.exit(0);
}

const apiKey = process.env.OPENROUTER_API_KEY?.trim() || '';
if (!apiKey) {
  console.error('RC image runtime smoke: OpenRouter Preview key is unavailable.');
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 120_000);
let response: Response;
try {
  response = await fetch(OPENROUTER_IMAGES_URL, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.brandbox-ai.com',
      'X-OpenRouter-Title': 'BrandBox AI RC Image Smoke',
    },
    body: JSON.stringify({
      model: MODEL_ID,
      prompt: 'A clean studio product photograph of a matte black cube on a neutral light background, soft diffused lighting, no text, centered composition.',
    }),
  });
} catch (error) {
  console.error(`RC image runtime smoke: provider request failed before completion (${error instanceof Error ? error.name : 'NETWORK_ERROR'}).`);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}

if (!response.ok) {
  // Intentionally do not print provider response bodies: the HTTP status is enough for RC evidence.
  console.error(`RC image runtime smoke: OpenRouter returned HTTP ${response.status}.`);
  process.exit(1);
}

let payload: { data?: Array<{ b64_json?: unknown; media_type?: unknown }> };
try {
  payload = await response.json() as { data?: Array<{ b64_json?: unknown; media_type?: unknown }> };
} catch {
  console.error('RC image runtime smoke: provider returned an invalid JSON response.');
  process.exit(1);
}

const image = Array.isArray(payload.data) ? payload.data[0] : undefined;
const generated = typeof image?.b64_json === 'string' && image.b64_json.length > 100;
const mediaType = typeof image?.media_type === 'string' ? image.media_type : 'image/png';

console.log(`RC image runtime smoke: ${JSON.stringify({
  success: generated,
  model: MODEL_ID,
  imageCount: Array.isArray(payload.data) ? payload.data.length : 0,
  mediaType,
})}`);

if (!generated) process.exit(1);
