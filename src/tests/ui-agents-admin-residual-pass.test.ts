import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const support = readFileSync(join(root, 'src/components/AdminSupportRequests.jsx'), 'utf8');
const home = readFileSync(join(root, 'src/app/admin/home-content/page.jsx'), 'utf8');
const usersPage = readFileSync(join(root, 'src/app/admin/users/page.jsx'), 'utf8');
const users = readFileSync(join(root, 'src/components/AdminUsersRolesPanelV2.jsx'), 'utf8');

for (const [name, source] of [['Support', support], ['Home Content', home], ['Users route', usersPage], ['Users & Roles', users]] as const) {
  assert.ok(source.includes('bb-'), `${name} must use semantic Brand Box primitives`);
  assert.ok(!source.includes('bg-[#07090d]'), `${name} must not retain legacy admin canvas`);
  assert.ok(!source.includes('bg-[#0f1118]'), `${name} must not retain legacy users panel background`);
  assert.ok(!source.includes('bg-[#10131a]'), `${name} must not retain legacy card background`);
  assert.ok(!source.includes('text-gray-'), `${name} must not retain legacy gray-only typography`);
}

assert.ok(support.includes('/api/v1/admin/support-requests'));
assert.ok(support.includes("cache: 'no-store'"));
assert.ok(support.includes("method: 'PATCH'"));
assert.ok(support.includes('body: JSON.stringify({ requestId, ...patch })'));
assert.ok(support.includes('adminNote: notes[request.id]'));

assert.ok(home.includes("['ADMIN','SUPER_ADMIN'].includes(profile?.role)"));
assert.ok(home.includes("supabase.storage.from('home-banners').upload"));
assert.ok(home.includes("supabase.from('home_banners').insert(payload)"));
assert.ok(home.includes("supabase.from('home_tickers').insert(payload)"));
assert.ok(home.includes("supabase.from(table).update"));
assert.ok(home.includes("supabase.from(table).delete"));

assert.ok(usersPage.includes('AdminUsersRolesPanelV2'));
assert.ok(users.includes('const AUTO_REFRESH_MS = 30_000'));
assert.ok(users.includes("cache: 'no-store'"));
assert.ok(users.includes("api('/api/v1/admin/roles')"));
assert.ok(users.includes("api(`/api/v1/admin/users?${params.toString()}`)"));
assert.ok(users.includes("method: 'PATCH'"));
assert.ok(users.includes("action: 'change_role'"));
assert.ok(users.includes("action: 'grant_credits'"));
assert.ok(users.includes("action: 'suspend'"));
assert.ok(users.includes("action: 'reactivate'"));
assert.ok(users.includes('capabilities.canAssignRoles'));
assert.ok(users.includes("window.addEventListener('focus'"));
assert.ok(users.includes("document.addEventListener('visibilitychange'"));
assert.ok(users.includes('serverOffsetMs'));
assert.ok(users.includes('تأكيد تغيير الصلاحيات'));
assert.ok(users.includes('تأكيد الحفظ في قاعدة البيانات'));
assert.ok(users.includes('ROLE_UPDATE_VERIFICATION_FAILED'));

console.log('Residual Admin semantic theme and authority guard passed.');
