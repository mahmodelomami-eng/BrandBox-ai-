import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const wrapper = readFileSync(join(root, 'src/components/layout/AppNavigationWrapper.jsx'), 'utf8');
const enhancer = readFileSync(join(root, 'src/components/UserExperienceEnhancer.jsx'), 'utf8');
const route = readFileSync(join(root, 'src/app/api/v1/admin/users/route.ts'), 'utf8');
const panel = readFileSync(join(root, 'src/components/AdminUsersRolesPanelV2.jsx'), 'utf8');
const page = readFileSync(join(root, 'src/app/admin/users/page.jsx'), 'utf8');
const policy = readFileSync(join(root, 'src/lib/admin/admin-user-policy.ts'), 'utf8');
const roleMigration = readFileSync(join(root, 'supabase/migrations/20260902014000_admin_role_transition_atomic.sql'), 'utf8');

assert.ok(wrapper.includes("import UserExperienceEnhancer from '../UserExperienceEnhancer'"));
assert.ok(wrapper.includes('<UserExperienceEnhancer />'), 'presence heartbeat must be mounted globally');

assert.ok(enhancer.includes("fetch('/api/v1/presence'"));
assert.ok(enhancer.includes('60_000'), 'authenticated presence heartbeat must run at least every minute');
assert.ok(enhancer.includes("window.addEventListener('focus'"));
assert.ok(enhancer.includes("document.addEventListener('visibilitychange'"));
assert.ok(enhancer.includes("document.visibilityState === 'visible'"));

assert.ok(route.includes('const ONLINE_WINDOW_MS = 2 * 60 * 1000'));
assert.ok(route.includes('const IDLE_WINDOW_MS = 10 * 60 * 1000'));
assert.ok(route.includes("type PresenceState = 'online' | 'idle' | 'offline'"));
assert.ok(route.includes('presenceState: state'));
assert.ok(route.includes("online: state === 'online'"));
assert.ok(route.includes('serverNow: new Date(now).toISOString()'));

assert.ok(route.includes("database.rpc('admin_change_user_role_atomic'"));
assert.ok(route.includes('p_actor_id: actor.userId'));
assert.ok(route.includes('p_target_user_id: body.userId'));
assert.ok(route.includes('p_next_role: body.role'));
assert.ok(route.includes(".select('role,updated_at')"));
assert.ok(route.includes("error: 'ROLE_UPDATE_VERIFICATION_FAILED'"));
assert.ok(route.includes('verifiedRole.role !== body.role'));
assert.ok(!route.includes('AdminService.changeUserRole(actor, body.userId, body.role)'), 'role changes must use the atomic DB RPC');

assert.ok(roleMigration.includes('CREATE OR REPLACE FUNCTION public.admin_change_user_role_atomic'));
assert.ok(roleMigration.includes('SECURITY DEFINER'));
assert.ok(roleMigration.includes("v_actor_role <> 'SUPER_ADMIN'::public.app_role"));
assert.ok(roleMigration.includes("v_actor_status <> 'active'"));
assert.ok(roleMigration.includes('SELF_DEMOTION_FORBIDDEN'));
assert.ok(roleMigration.includes('LAST_SUPER_ADMIN_FORBIDDEN'));
assert.ok(roleMigration.includes("'ADMIN_CHANGED_ADMIN_ROLE'"));
assert.ok(roleMigration.includes('FOR UPDATE'));
assert.ok(roleMigration.includes('REVOKE ALL ON FUNCTION public.admin_change_user_role_atomic'));
assert.ok(roleMigration.includes('FROM PUBLIC, anon, authenticated'));
assert.ok(roleMigration.includes('TO service_role'));

assert.ok(policy.includes("return role === 'SUPER_ADMIN' && checkPermission(role, 'roles.assign')"));
assert.ok(policy.includes('activeSuperAdminCount <= 1'), 'last active SUPER_ADMIN protection must remain enforced for non-RPC callers');

assert.ok(page.includes('AdminUsersRolesPanelV2'));
assert.ok(panel.includes('const AUTO_REFRESH_MS = 30_000'));
assert.ok(panel.includes('loadUsers({ silent: true })'));
assert.ok(panel.includes("window.addEventListener('focus'"));
assert.ok(panel.includes("document.addEventListener('visibilitychange'"));
assert.ok(panel.includes('serverOffsetMs'));
assert.ok(panel.includes("label: 'متصل الآن'"));
assert.ok(panel.includes("label: 'خامل'"));
assert.ok(panel.includes("label: 'غير متصل'"));
assert.ok(panel.includes('آخر ظهور'));
assert.ok(panel.includes('تغيير صلاحيات المستخدم'));
assert.ok(panel.includes('تأكيد تغيير الصلاحيات'));
assert.ok(panel.includes('تأكيد الحفظ في قاعدة البيانات'));
assert.ok(panel.includes('ROLE_UPDATE_VERIFICATION_FAILED'));
assert.ok(panel.includes('capabilities.canAssignRoles'), 'role UI must remain governed by server capability');

console.log('Admin users live presence and atomic role-management guard passed.');
