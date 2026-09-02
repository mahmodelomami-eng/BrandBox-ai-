import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};

const releaseGateScripts = ['test', 'test:store-readiness'];

for (const scriptName of releaseGateScripts) {
  const command = packageJson.scripts?.[scriptName] ?? '';
  assert.ok(command, `Missing release-gate script: ${scriptName}`);
  assert.ok(
    !/(^|&&\s*)tsx(?:\s|$)/.test(command),
    `${scriptName} must not use the tsx CLI because it requires a local IPC socket`,
  );
  assert.ok(
    command.includes('node --import tsx'),
    `${scriptName} must load TypeScript through Node without the tsx CLI IPC server`,
  );
}

console.log('Test runner portability guard passed.');
