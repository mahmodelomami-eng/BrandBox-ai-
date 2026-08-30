import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const api = readFileSync(join(root, 'src/app/api/v1/admin/ai-integrations/route.ts'), 'utf8');
const ui = readFileSync(join(root, 'src/components/AdminAIIntegrationsPanel.jsx'), 'utf8');

assert.ok(api.includes("action === 'update_billing'"));
assert.ok(api.includes("models.pricing_manage"));
assert.ok(api.includes('openrouter_free_global_daily_limit'));
assert.ok(api.includes('free_user_daily_limit'));
assert.ok(api.includes('free_models_enabled'));
assert.ok(api.includes('ADMIN_UPDATED_AI_BILLING_SETTINGS'));
assert.ok(api.includes('providers.secrets_manage'));
assert.ok(!api.includes('exposedToBrowser: true'));

assert.ok(ui.includes('التكلفة وحدود Free AI'));
assert.ok(ui.includes("action: 'update_billing'"));
assert.ok(ui.includes("action: 'update_pricing'"));
assert.ok(ui.includes('Free Models مفعّلة'));

console.log('Admin AI integrations tests passed.');
