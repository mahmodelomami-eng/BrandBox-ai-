const targetBranch = 'launch/97-openrouter-runtime-probe';
const isTargetPreview = process.env.VERCEL === '1'
  && process.env.VERCEL_ENV === 'preview'
  && process.env.VERCEL_GIT_COMMIT_REF === targetBranch;

if (!isTargetPreview) {
  console.log('OpenRouter RC build readiness: skipped outside target Vercel preview.');
  process.exit(0);
}

const apiKey = process.env.OPENROUTER_API_KEY?.trim() || '';
if (!apiKey) {
  console.error('OpenRouter RC build readiness: OPENROUTER_API_KEY is not configured for Preview.');
  process.exit(1);
}

const base = 'https://openrouter.ai/api/v1';
const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
  'HTTP-Referer': 'https://www.brandbox-ai.com',
  'X-OpenRouter-Title': 'BrandBox AI',
};

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: 'GET', headers, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timeout);
  }
}

async function catalogAvailable(path) {
  try {
    const response = await fetchWithTimeout(`${base}${path}`);
    if (!response.ok) return false;
    const payload = await response.json();
    return Array.isArray(payload?.data) && payload.data.length > 0;
  } catch {
    return false;
  }
}

let authenticated = false;
try {
  const response = await fetchWithTimeout(`${base}/key`);
  authenticated = response.ok;
} catch {
  authenticated = false;
}

const [imageCatalogAvailable, videoCatalogAvailable] = authenticated
  ? await Promise.all([
      catalogAvailable('/images/models'),
      catalogAvailable('/videos/models'),
    ])
  : [false, false];

const safe = { authenticated, imageCatalogAvailable, videoCatalogAvailable };
console.log(`OpenRouter RC build readiness: ${JSON.stringify(safe)}`);

if (!authenticated || !imageCatalogAvailable || !videoCatalogAvailable) {
  process.exit(1);
}
