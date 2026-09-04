import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const settings = readFileSync(join(root, 'src/components/AdminSettingsHub.jsx'), 'utf8');
const ezone = readFileSync(join(root, 'src/components/AdminEzonePayPanel.jsx'), 'utf8');
const ai = readFileSync(join(root, 'src/components/AdminAIIntegrationsPanel.jsx'), 'utf8');

for (const [name, source] of [
  ['Admin Settings', settings],
  ['Admin Ezone Pay', ezone],
  ['Admin AI Integrations', ai],
] as const) {
  assert.ok(source.includes('bb-'), `${name} must use semantic Brand Box primitives`);
  assert.ok(!source.includes('bg-[#0d1016]'), `${name} must not retain the legacy admin panel background`);
  assert.ok(!source.includes('bg-[#10131a]'), `${name} must not retain the legacy admin card background`);
  assert.ok(!source.includes('text-gray-'), `${name} must not retain legacy gray-only typography`);
  assert.ok(!source.includes('border-white/10'), `${name} must not retain dark-only translucent borders`);
}

// Settings stays authenticated, fresh, diff-based and capability-gated.
assert.ok(settings.includes("fetch('/api/v1/admin/settings'"));
assert.ok(settings.match(/\/api\/v1\/admin\/settings[\s\S]*?cache: 'no-store'/));
assert.ok(settings.includes("method: 'PATCH'"));
assert.ok(settings.includes('body: JSON.stringify({ settings: dirtySettings })'));
assert.ok(settings.includes('capabilities.canManageSettings'));
assert.ok(settings.includes('capabilities.canManageSecurity'));
assert.ok(settings.includes("id === 'security' && !capabilities.canManageSecurity"));
assert.ok(settings.includes('JSON.stringify(value) !== JSON.stringify(original[key])'));
assert.ok(settings.includes('الأسرار ومفاتيح الخدمات لا يتم إرسالها إلى المتصفح'));

// Ezone Pay remains a read-only server-authoritative operational view.
assert.ok(ezone.includes("fetch('/api/v1/admin/ezonepay'"));
assert.ok(ezone.match(/\/api\/v1\/admin\/ezonepay[\s\S]*?cache: 'no-store'/));
assert.ok(ezone.includes("Authorization: 'Bearer ' + token"));
assert.ok(ezone.includes('Client fulfillment: disabled'));
assert.ok(!ezone.includes("method: 'PATCH'"));
assert.ok(!ezone.includes("method: 'POST'"));

// Admin payment diagnostics must never echo backend/provider errors into the browser.
assert.ok(ezone.includes('function safeAdminEzoneError(status)'));
assert.ok(ezone.includes('setError(safeAdminEzoneError(response.status))'));
assert.ok(!ezone.includes('result.error'));
assert.ok(!ezone.includes('err.message'));
assert.ok(ezone.includes("catch {\n      setError('تعذر تحميل حالة Ezone Pay.');"));

// AI integrations keep model/pricing authority behind authenticated PATCH + server capabilities.
assert.ok(ai.includes("fetch('/api/v1/admin/ai-integrations'"));
assert.ok(ai.match(/\/api\/v1\/admin\/ai-integrations[\s\S]*?cache: 'no-store'/));
assert.ok(ai.includes("method: 'PATCH'"));
assert.ok(ai.includes("action: 'update_billing'"));
assert.ok(ai.includes("action: 'update_pricing'"));
assert.ok(ai.includes("action: 'update_model'"));
assert.ok(ai.includes('capabilities.canManageModels'));
assert.ok(ai.includes('capabilities.canManagePricing'));
assert.ok(ai.includes('secretPolicy.exposedToBrowser'));
assert.ok(ai.includes('إدارة الأسرار محجوزة لصلاحية providers.secrets_manage'));

// AI admin diagnostics must not echo raw API/provider errors for reads or mutations.
assert.ok(ai.includes('function safeAdminAIError(status, fallback)'));
assert.ok(ai.includes("setError(safeAdminAIError(response.status, 'تعذر تحميل تكاملات الذكاء الاصطناعي.'))"));
assert.ok(ai.includes("setError(safeAdminAIError(response.status, 'تعذر حفظ التعديل.'))"));
assert.ok(!ai.includes('result.error'));
assert.ok(!ai.includes('err.message'));

console.log('Admin integrations semantic theme, authority, and safe error-surface guard passed.');
