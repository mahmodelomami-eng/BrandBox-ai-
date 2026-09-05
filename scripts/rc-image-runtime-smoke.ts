const TARGET_BRANCH = 'launch/97-image-runtime-smoke';
const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key';

const isTargetPreview = process.env.VERCEL === '1'
  && process.env.VERCEL_ENV === 'preview'
  && process.env.VERCEL_GIT_COMMIT_REF === TARGET_BRANCH;

if (!isTargetPreview) {
  console.log('RC image smoke harness: skipped outside the dedicated Vercel Preview branch.');
  process.exit(0);
}

const apiKey = process.env.OPENROUTER_API_KEY?.trim() || '';
if (!apiKey) {
  console.error('RC image smoke harness: OpenRouter Preview key is unavailable.');
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
let response: Response;
try {
  response = await fetch(OPENROUTER_KEY_URL, {
    method: 'GET',
    signal: controller.signal,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
} catch {
  console.error('RC image smoke harness: OpenRouter authentication endpoint is unreachable.');
  process.exit(1);
} finally {
  clearTimeout(timeout);
}

if (!response.ok) {
  console.error(`RC image smoke harness: OpenRouter authentication returned HTTP ${response.status}.`);
  process.exit(1);
}

console.log('RC image smoke harness: authenticated and ready.');
