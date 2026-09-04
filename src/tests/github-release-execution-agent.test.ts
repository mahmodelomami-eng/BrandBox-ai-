import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative: string) => fs.existsSync(path.join(root, relative));

const agentPath = '.github/agents/brand-box-release-execution.agent.md';
const workflowPath = '.github/workflows/release-executor-coordinator.yml';

assert.ok(exists(agentPath), 'release execution custom agent profile must exist');
assert.ok(exists(workflowPath), 'release coordinator workflow must exist');

const agent = read(agentPath);
const workflow = read(workflowPath);

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
assert.match(workflow, /const completed = issueStates\.filter/);
assert.match(workflow, /const progress = Math\.round/);
assert.match(workflow, /Completed:/);
assert.match(workflow, /ACTIVE NEXT SLICE/);
assert.match(workflow, /body = body\.replace/);
assert.match(workflow, /brand-box-release-coordinator/);
assert.doesNotMatch(workflow, /merge_pull_request|\/merges|method:\s*['"]PUT['"].*pull/i);
assert.doesNotMatch(workflow, /secrets\.(?!GITHUB_TOKEN)/i);

// Agent Engineering System v2 — specialist profiles, local contracts and durable learning.
const specialistAgents: Array<[string, RegExp]> = [
  ['.github/agents/brand-box-web-frontend.agent.md', /name:\s*Brand Box Web Frontend/],
  ['.github/agents/brand-box-backend-supabase.agent.md', /name:\s*Brand Box Backend & Supabase/],
  ['.github/agents/brand-box-mobile-expo.agent.md', /name:\s*Brand Box Mobile Expo/],
  ['.github/agents/brand-box-ai-integration.agent.md', /name:\s*Brand Box AI Integration/],
  ['.github/agents/brand-box-store-operations.agent.md', /name:\s*Brand Box Store Operations/],
  ['.github/agents/brand-box-qa-security.agent.md', /name:\s*Brand Box QA & Security/],
  ['.github/agents/brand-box-performance-accessibility.agent.md', /name:\s*Brand Box Performance & Accessibility/],
  ['.github/agents/brand-box-architecture-reviewer.agent.md', /name:\s*Brand Box Architecture Reviewer/],
];

for (const [file, namePattern] of specialistAgents) {
  assert.ok(exists(file), `${file} must exist`);
  const content = read(file);
  assert.match(content, namePattern);
  assert.match(content, /target:\s*github-copilot/);
  assert.match(content, /AGENTS\.md/);
}

const localContracts = [
  'src/components/AGENTS.md',
  'src/app/api/AGENTS.md',
  'src/lib/AGENTS.md',
  'supabase/AGENTS.md',
  'apps/mobile/AGENTS.md',
];
for (const file of localContracts) assert.ok(exists(file), `${file} must exist`);

const rootContract = read('AGENTS.md');
assert.match(rootContract, /Agent Engineering System v2/);
assert.match(rootContract, /Parallel execution and file ownership/);
assert.match(rootContract, /Self-review loop/);
assert.match(rootContract, /Benchmarks and learning/);

const mobileContract = read('apps/mobile/AGENTS.md');
assert.match(mobileContract, /Specialist Agent Contract v2/);
assert.match(mobileContract, /foreground\/background|background.*foreground/i);
assert.match(mobileContract, /SecureStore/);
assert.match(mobileContract, /mobile-ci/);
assert.match(mobileContract, /apps\/mobile\/docs\/mobile-qa-matrix\.md/);

const runbooks = [
  'docs/agent-engineering/README.md',
  'docs/agent-engineering/file-ownership.md',
  'docs/agent-engineering/benchmarks.md',
  'docs/agent-knowledge/web-ui-runbook.md',
  'docs/agent-knowledge/supabase-security-runbook.md',
  'docs/agent-knowledge/ci-incident-learning.md',
  'apps/mobile/docs/mobile-architecture.md',
  'apps/mobile/docs/eas-runbook.md',
  'apps/mobile/docs/auth-session-runbook.md',
  'apps/mobile/docs/mobile-qa-matrix.md',
];
for (const file of runbooks) assert.ok(exists(file), `${file} must exist`);

const routerPath = '.github/workflows/agent-specialist-router.yml';
assert.ok(exists(routerPath), 'specialist router workflow must exist');
const router = read(routerPath);
assert.match(router, /name:\s*Brand Box Agent Specialist Router/);
assert.match(router, /agent:mobile/);
assert.match(router, /agent:web-frontend/);
assert.match(router, /agent:backend/);
assert.match(router, /agent:qa-security/);
assert.match(router, /agent:performance-a11y/);
assert.match(router, /agent:architecture/);
assert.match(router, /contents:\s*read/);
assert.doesNotMatch(router, /contents:\s*write/);
assert.doesNotMatch(router, /\/merges|merge_pull_request|enable.*auto.?merge/i);
assert.doesNotMatch(router, /secrets\.(?!GITHUB_TOKEN)/i);
assert.match(router, /does not assign coding agents|does not assign/i);

const mobileCi = read('.github/workflows/mobile-ci.yml');
assert.match(mobileCi, /expo-doctor/);
assert.match(mobileCi, /npm run typecheck/);
assert.match(mobileCi, /mobile-product-qa\.guard\.cjs/);

console.log('GitHub Release Execution Agent + Agent Engineering System v2 guard: PASS');
