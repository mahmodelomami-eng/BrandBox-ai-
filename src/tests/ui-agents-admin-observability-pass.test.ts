import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const finance = readFileSync(join(root, 'src/components/AdminStoreFinancialPanel.jsx'), 'utf8');
const aiTeam = readFileSync(join(root, 'src/components/AdminAITeamControlCenter.jsx'), 'utf8');

for (const [name, source] of [['Store Finance', finance], ['AI Team', aiTeam]] as const) {
  assert.ok(source.includes('bb-'), `${name} must use semantic Brand Box primitives`);
  assert.ok(!source.includes('bg-[#07090d]'), `${name} must not retain legacy admin canvas`);
  assert.ok(!source.includes('bg-[#0d1016]'), `${name} must not retain legacy panel background`);
  assert.ok(!source.includes('bg-[#10131a]'), `${name} must not retain legacy card background`);
  assert.ok(!source.includes('text-gray-'), `${name} must not retain legacy gray-only typography`);
  assert.ok(!source.includes('border-white/10'), `${name} must not retain dark-only borders`);
}

// Store Finance remains an authenticated, fresh, read-only projection.
assert.ok(finance.includes("fetch('/api/v1/admin/store/finance'"));
assert.ok(finance.match(/\/api\/v1\/admin\/store\/finance[\s\S]*?cache: 'no-store'/));
assert.ok(finance.includes('Authorization: `Bearer ${session.access_token}`'));
assert.ok(!finance.includes("method: 'PATCH'"));
assert.ok(!finance.includes("method: 'POST'"));
assert.ok(!finance.includes("method: 'DELETE'"));
assert.ok(finance.includes('skuProfitability'));
assert.ok(finance.includes('grossMarginPercent'));

// AI Team remains observability-only with authenticated fresh reads and 60s polling.
assert.ok(aiTeam.includes('/api/v1/admin/ai-team${fresh ? \'?fresh=1\' : \'\'}'));
assert.ok(aiTeam.includes("cache: 'no-store'"));
assert.ok(aiTeam.includes('Authorization: `Bearer ${token}`'));
assert.ok(aiTeam.includes('window.setInterval(() => { void load(false); }, 60_000)'));
assert.ok(aiTeam.includes('الحالة مستنتجة من GitHub Issues وPull Requests وActions وVercel'));
assert.ok(aiTeam.includes('ليست Presence مباشرًا لكل Agent'));
assert.ok(!aiTeam.includes("method: 'PATCH'"));
assert.ok(!aiTeam.includes("method: 'POST'"));
assert.ok(!aiTeam.includes("method: 'DELETE'"));

console.log('Admin observability semantic theme and read-only authority guard passed.');
