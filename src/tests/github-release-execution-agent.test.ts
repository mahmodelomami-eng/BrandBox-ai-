import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const agentPath = path.join(root, '.github/agents/brand-box-release-execution.agent.md');
const workflowPath = path.join(root, '.github/workflows/release-executor-coordinator.yml');

assert.ok(fs.existsSync(agentPath), 'release execution custom agent profile must exist');
assert.ok(fs.existsSync(workflowPath), 'release coordinator workflow must exist');

const agent = fs.readFileSync(agentPath, 'utf8');
const workflow = fs.readFileSync(workflowPath, 'utf8');

assert.match(agent, /name:\s*Brand Box Release Execution/);
assert.match(agent, /target:\s*github-copilot/);
assert.match(agent, /AGENTS\.md/);
assert.match(agent, /issue #98/i);
assert.match(agent, /issue #183/i);
assert.match(agent, /npm run verify:agent/);
assert.match(agent, /Do not autonomously:/);
assert.match(agent, /production secrets/i);
assert.match(agent, /destructive.*production SQL/i);
assert.match(agent, /server authority/i);
assert.match(agent, /tenant isolation/i);

assert.match(workflow, /name:\s*Brand Box Release Coordinator/);
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /cron:\s*'17 \* \* \* \*'/);
assert.match(workflow, /issues:\s*\n\s+types:\s*\[closed, reopened\]/);
assert.match(workflow, /contents:\s*read/);
assert.match(workflow, /issues:\s*write/);
assert.doesNotMatch(workflow, /contents:\s*write/);
assert.match(workflow, /release:active/);
assert.match(workflow, /Completed: \\*\\*\\d\+/);
assert.match(workflow, /ACTIVE NEXT SLICE/);
assert.match(workflow, /brand-box-release-coordinator/);
assert.doesNotMatch(workflow, /merge_pull_request|\/merges|method:\s*['"]PUT['"].*pull/i);
assert.doesNotMatch(workflow, /secrets\.(?!GITHUB_TOKEN)/i);

console.log('GitHub Release Execution Agent guard: PASS');
