import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const routePath = join(process.cwd(), 'src/app/api/health/route.ts');
const source = readFileSync(routePath, 'utf8');

const assertions: Array<[boolean, string]> = [
  [source.includes('catch {'), 'health route must not retain a caught exception value'],
  [!source.includes('error?.message'), 'health route must not reflect raw exception messages'],
  [source.includes("status: 'unhealthy'"), 'health route must return a stable unhealthy status'],
  [source.includes('liveness: true'), 'health route failure response must preserve liveness semantics'],
  [source.includes('readiness: false'), 'health route failure response must mark readiness false'],
  [source.includes('{ status: 503 }'), 'health route unexpected failures must return HTTP 503'],
];

for (const [passed, message] of assertions) {
  if (!passed) throw new Error(`Health endpoint redaction regression: ${message}`);
}

console.log('Health endpoint redaction regression guard passed.');
