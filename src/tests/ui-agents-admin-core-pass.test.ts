import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const adminPage = readFileSync(join(root, 'src/app/admin/page.jsx'), 'utf8');
const center = readFileSync(join(root, 'src/components/AdminControlCenter.jsx'), 'utf8');

for (const [name, source] of [
  ['Admin page', adminPage],
  ['Admin Control Center', center],
] as const) {
  assert.ok(source.includes('bb-'), `${name} must use semantic Brand Box primitives`);
  assert.ok(!source.includes('bg-[#07090d]'), `${name} must not retain the legacy dark admin canvas`);
  assert.ok(!source.includes('bg-[#10131a]'), `${name} must not retain the legacy dark card background`);
  assert.ok(!source.includes('text-gray-'), `${name} must not retain legacy gray-only typography`);
  assert.ok(!source.includes('border-white/10'), `${name} must not retain dark-only translucent borders`);
}

assert.ok(adminPage.includes('<AdminControlCenter />'));
assert.ok(adminPage.includes('href="/admin/ai-team"'));
assert.ok(adminPage.includes('href="/admin/support"'));
assert.ok(adminPage.includes('bb-app-canvas'));

// Admin reads remain authenticated and explicitly fresh.
assert.ok(center.includes("fetch('/api/v1/admin/control-center'"));
assert.ok(center.includes("fetch('/api/v1/admin/users'"));
assert.ok(center.match(/\/api\/v1\/admin\/control-center[\s\S]*?cache: 'no-store'/));
assert.ok(center.match(/\/api\/v1\/admin\/users[\s\S]*?cache: 'no-store'/));
assert.ok(center.includes('Authorization: `Bearer ${token}`'));
assert.ok(center.includes("router.replace('/auth?next=%2Fadmin')"));
assert.ok(center.includes('if ([401, 403].includes(centerResponse.status)) router.replace(\'/dashboard\')'));

// Sensitive user mutations remain routed through protected admin APIs and capability gates.
assert.ok(center.includes("method: 'PATCH'"));
assert.ok(center.includes('body: JSON.stringify({ action, userId, ...extra })'));
assert.ok(center.includes("method: 'DELETE'"));
assert.ok(center.includes('permissions.manageUsers'));
assert.ok(center.includes('permissions.manageCredits'));
assert.ok(center.includes('permissions.changeRoles'));
assert.ok(center.includes('permissions.deleteUsers'));
assert.ok(center.includes("u.role !== 'SUPER_ADMIN'"));
assert.ok(center.includes('u.id !== actor.userId'));

// Section visibility remains capability-aware.
assert.ok(center.includes("requestedValid === 'commercial' && !permissions.viewCommercial"));
assert.ok(center.includes("requestedValid === 'audit' && !permissions.viewAudit"));
assert.ok(center.includes("requestedValid === 'settings' && !permissions.viewSettings"));
assert.ok(center.includes("requestedValid === 'ai' && !permissions.viewAI"));
assert.ok(center.includes("requestedValid === 'store' && !(permissions.viewPayments || permissions.viewAI)"));

// Specialized panels remain wired; they are migrated in the next Admin slice.
for (const panel of [
  'AdminSettingsHub',
  'AdminEzonePayPanel',
  'AdminAIIntegrationsPanel',
  'AdminStoreOperationsPanel',
  'AdminStoreFinancialPanel',
]) {
  assert.ok(center.includes(panel), `${panel} must remain wired into Admin Control Center`);
}

// React bootstrap remains lint-safe and refreshable.
assert.ok(center.includes('window.setTimeout(() => { void loadAll(); }, 0)'));
assert.ok(center.includes('onClick={() => void loadAll()}'));

// Core Admin chrome must follow semantic primitives.
for (const primitive of [
  'bb-app-canvas',
  'bb-surface-elevated',
  'bb-panel',
  'bb-card',
  'bb-input',
  'bb-button-primary',
  'bb-button-secondary',
  'bb-divider',
]) {
  assert.ok(center.includes(primitive), `Admin core must use ${primitive}`);
}

console.log('Admin core semantic theme and authority guard passed.');
