const TARGET_BRANCH = 'launch/97-image-runtime-smoke';
const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key';

const isTargetPreview = process.env.VERCEL === '1'
  && process.env.VERCEL_ENV === 'preview'
  && process.env.VERCEL_GIT_COMMIT_REF === TARGET_BRANCH;

if (!isTargetPreview) {
  console.log('RC image runtime billing check: skipped outside the dedicated Vercel Preview branch.');
  process.exit(0);
}

const apiKey = process.env.OPENROUTER_API_KEY?.trim() || '';
if (!apiKey) {
  console.error('RC image runtime billing check: OpenRouter Preview key is unavailable.');
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
} catch {
  console.error('RC image runtime billing check: key usage endpoint is unreachable.');
  process.exit(1);
} finally {
  clearTimeout(timeout);
}

if (!response.ok) {
  console.error(`RC image runtime billing check: key usage endpoint returned HTTP ${response.status}.`);
  process.exit(1);
}

let payload: { data?: { usage?: unknown; usage_monthly?: unknown } };
try {
  payload = await response.json() as { data?: { usage?: unknown; usage_monthly?: unknown } };
} catch {
  console.error('RC image runtime billing check: invalid key usage response.');
  process.exit(1);
}

const usage = Number(payload.data?.usage ?? payload.data?.usage_monthly ?? 0);
const hasUsage = Number.isFinite(usage) && usage > 0;
console.log(`RC image runtime billing check: ${JSON.stringify({ authenticated: true, hasUsage })}`);

// Success means the new staging key has recorded billed usage after the one-shot image attempt.
// Failure means no billed usage was recorded; importantly, this check never submits another generation.
if (!hasUsage) process.exit(1);
