import assert from 'node:assert/strict';
import {
  PLATFORM_SETTING_DEFINITIONS,
  defaultPlatformSettings,
  isPlatformSettingKey,
  validateSettingValue,
} from '../lib/admin/platform-settings';

const defaults = defaultPlatformSettings();

assert.ok(PLATFORM_SETTING_DEFINITIONS.length >= 20, 'Expected a substantial settings taxonomy.');
assert.equal(defaults['general.platform_name'], 'Brand Box AI');
assert.equal(defaults['general.currency'], 'LYD');
assert.equal(defaults['maintenance.enabled'], false);
assert.equal(defaults['security.sensitive_action_reauth'], true);
assert.equal(defaults['finance.usd_lyd_rate'], 11);
assert.equal(defaults['finance.bank_commission_percent'], 0);
assert.equal(defaults['finance.target_margin_percent'], 30);
assert.equal(defaults['features.beta_models_enabled'], false);
assert.equal(defaults['features.new_dashboard_rollout_percent'], 0);

assert.equal(isPlatformSettingKey('usage.concurrent_jobs'), true);
assert.equal(isPlatformSettingKey('providers.openrouter_api_key'), false, 'Secret-like unknown keys must never be accepted.');

assert.equal(validateSettingValue('users.registration_enabled', false), false);
assert.equal(validateSettingValue('usage.concurrent_jobs', 5), 5);
assert.equal(validateSettingValue('general.country', ' LY '), 'LY');
assert.equal(validateSettingValue('finance.usd_lyd_rate', 12.5), 12.5);
assert.equal(validateSettingValue('finance.bank_commission_percent', 4), 4);
assert.equal(validateSettingValue('features.new_dashboard_rollout_percent', 10), 10);

assert.throws(() => validateSettingValue('usage.concurrent_jobs', 0), /SETTING_VALUE_TOO_LOW/);
assert.throws(() => validateSettingValue('usage.concurrent_jobs', 101), /SETTING_VALUE_TOO_HIGH/);
assert.throws(() => validateSettingValue('users.registration_enabled', 'true'), /INVALID_SETTING_VALUE/);
assert.throws(() => validateSettingValue('general.country', 123), /INVALID_SETTING_VALUE/);
assert.throws(() => validateSettingValue('finance.usd_lyd_rate', 0), /SETTING_VALUE_TOO_LOW/);
assert.throws(() => validateSettingValue('finance.bank_commission_percent', 101), /SETTING_VALUE_TOO_HIGH/);
assert.throws(() => validateSettingValue('features.new_dashboard_rollout_percent', 101), /SETTING_VALUE_TOO_HIGH/);

console.log('Platform settings foundation tests passed.');
