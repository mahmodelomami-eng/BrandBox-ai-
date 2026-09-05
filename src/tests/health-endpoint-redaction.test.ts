import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const routePath = join(process.cwd(), 'src/app/api/health/route.ts');
const source = readFileSync(routePath, 'utf8');
const openRouterRoutePath = join(process.cwd(), 'src/app/api/health/openrouter/route.ts');
const openRouterRoute = readFileSync(openRouterRoutePath, 'utf8');
const openRouterProbePath = join(process.cwd(), 'src/lib/ai/openrouter-runtime-readiness.ts');
const openRouterProbe = readFileSync(openRouterProbePath, 'utf8');

const assertions: Array<[boolean, string]> = [
  [source.includes('catch {'), 'health route must not retain a caught exception value'],
  [!source.includes('error?.message'), 'health route must not reflect raw exception messages'],
  [source.includes("status: 'unhealthy'"), 'health route must return a stable unhealthy status'],
  [source.includes('liveness: true'), 'health route failure response must preserve liveness semantics'],
  [source.includes('readiness: false'), 'health route failure response must mark readiness false'],
  [source.includes('{ status: 503 }'), 'health route unexpected failures must return HTTP 503'],
  [openRouterRoute.includes("dynamic = 'force-dynamic'"), 'OpenRouter readiness must never be statically cached'],
  [openRouterRoute.includes('authenticated'), 'OpenRouter readiness must expose only authentication readiness'],
  [openRouterRoute.includes('imageCatalogAvailable'), 'OpenRouter readiness must report image catalog capability'],
  [openRouterRoute.includes('videoCatalogAvailable'), 'OpenRouter readiness must report video catalog capability'],
  [!/(usage|limit_remaining|key_hash|keyHash|credits)/.test(openRouterRoute), 'OpenRouter readiness route must not expose key usage, limits, hashes or credits'],
  [openRouterProbe.includes('`${OPENROUTER_BASE_URL}/key`'), 'OpenRouter readiness must validate the configured key'],
  [openRouterProbe.includes('`${OPENROUTER_BASE_URL}/images/models`'), 'OpenRouter readiness must validate the image catalog'],
  [openRouterProbe.includes('`${OPENROUTER_BASE_URL}/videos/models`'), 'OpenRouter readiness must validate the video catalog'],
  [!openRouterProbe.includes('keyResponse.json(') && !openRouterProbe.includes('keyResponse.text('), 'OpenRouter readiness must never read key metadata response bodies'],
];

for (const [passed, message] of assertions) {
  if (!passed) throw new Error(`Health endpoint redaction regression: ${message}`);
}

console.log('Health endpoint redaction regression guard passed.');
