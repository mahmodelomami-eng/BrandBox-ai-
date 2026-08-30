export type PlatformSettingKey =
  | 'general.platform_name'
  | 'general.support_email'
  | 'general.country'
  | 'general.currency'
  | 'general.timezone'
  | 'general.default_language'
  | 'users.registration_enabled'
  | 'users.email_verification_required'
  | 'users.session_duration_minutes'
  | 'users.maximum_sessions'
  | 'usage.daily_jobs'
  | 'usage.monthly_jobs'
  | 'usage.concurrent_jobs'
  | 'usage.max_file_size_mb'
  | 'usage.max_video_duration_seconds'
  | 'usage.max_image_megapixels'
  | 'usage.api_requests_per_minute'
  | 'security.admin_2fa_required'
  | 'security.sensitive_action_reauth'
  | 'security.admin_session_minutes'
  | 'maintenance.enabled'
  | 'maintenance.message'
  | 'maintenance.allow_admins'
  | 'notifications.in_app_enabled'
  | 'notifications.email_enabled'
  | 'notifications.push_enabled'
  | 'storage.default_retention_days'
  | 'storage.compression_enabled'
  | 'storage.cdn_enabled'
  | 'finance.usd_lyd_rate'
  | 'finance.bank_commission_percent'
  | 'finance.target_margin_percent'
  | 'features.beta_models_enabled'
  | 'features.new_dashboard_rollout_percent'
  | 'features.video_editor_enabled'
  | 'features.advanced_upscaler_enabled';

export type SettingValue = string | number | boolean;

export interface PlatformSettingDefinition {
  key: PlatformSettingKey;
  category: string;
  labelAr: string;
  valueType: 'string' | 'number' | 'boolean';
  defaultValue: SettingValue;
  min?: number;
  max?: number;
}

export const PLATFORM_SETTING_DEFINITIONS: readonly PlatformSettingDefinition[] = [
  { key: 'general.platform_name', category: 'general', labelAr: 'اسم المنصة', valueType: 'string', defaultValue: 'Brand Box AI' },
  { key: 'general.support_email', category: 'general', labelAr: 'بريد الدعم', valueType: 'string', defaultValue: '' },
  { key: 'general.country', category: 'general', labelAr: 'الدولة', valueType: 'string', defaultValue: 'LY' },
  { key: 'general.currency', category: 'general', labelAr: 'العملة', valueType: 'string', defaultValue: 'LYD' },
  { key: 'general.timezone', category: 'general', labelAr: 'المنطقة الزمنية', valueType: 'string', defaultValue: 'Africa/Tripoli' },
  { key: 'general.default_language', category: 'general', labelAr: 'اللغة الافتراضية', valueType: 'string', defaultValue: 'ar' },

  { key: 'users.registration_enabled', category: 'users', labelAr: 'السماح بالتسجيل', valueType: 'boolean', defaultValue: true },
  { key: 'users.email_verification_required', category: 'users', labelAr: 'التحقق من البريد', valueType: 'boolean', defaultValue: true },
  { key: 'users.session_duration_minutes', category: 'users', labelAr: 'مدة الجلسة بالدقائق', valueType: 'number', defaultValue: 1440, min: 15, max: 43200 },
  { key: 'users.maximum_sessions', category: 'users', labelAr: 'الحد الأقصى للجلسات', valueType: 'number', defaultValue: 5, min: 1, max: 50 },

  { key: 'usage.daily_jobs', category: 'usage', labelAr: 'الحد اليومي للمهام', valueType: 'number', defaultValue: 100, min: 1, max: 1000000 },
  { key: 'usage.monthly_jobs', category: 'usage', labelAr: 'الحد الشهري للمهام', valueType: 'number', defaultValue: 3000, min: 1, max: 10000000 },
  { key: 'usage.concurrent_jobs', category: 'usage', labelAr: 'المهام المتزامنة', valueType: 'number', defaultValue: 3, min: 1, max: 100 },
  { key: 'usage.max_file_size_mb', category: 'usage', labelAr: 'أقصى حجم ملف MB', valueType: 'number', defaultValue: 50, min: 1, max: 2048 },
  { key: 'usage.max_video_duration_seconds', category: 'usage', labelAr: 'أقصى مدة فيديو بالثواني', valueType: 'number', defaultValue: 60, min: 1, max: 7200 },
  { key: 'usage.max_image_megapixels', category: 'usage', labelAr: 'أقصى دقة صورة MP', valueType: 'number', defaultValue: 24, min: 1, max: 200 },
  { key: 'usage.api_requests_per_minute', category: 'usage', labelAr: 'طلبات API في الدقيقة', valueType: 'number', defaultValue: 60, min: 1, max: 10000 },

  { key: 'security.admin_2fa_required', category: 'security', labelAr: 'فرض 2FA للإدارة', valueType: 'boolean', defaultValue: false },
  { key: 'security.sensitive_action_reauth', category: 'security', labelAr: 'إعادة التحقق للعمليات الحساسة', valueType: 'boolean', defaultValue: true },
  { key: 'security.admin_session_minutes', category: 'security', labelAr: 'مدة جلسة الإدارة', valueType: 'number', defaultValue: 480, min: 15, max: 1440 },

  { key: 'maintenance.enabled', category: 'maintenance', labelAr: 'وضع الصيانة', valueType: 'boolean', defaultValue: false },
  { key: 'maintenance.message', category: 'maintenance', labelAr: 'رسالة الصيانة', valueType: 'string', defaultValue: 'نعمل حاليًا على ترقية المنصة. سنعود قريبًا.' },
  { key: 'maintenance.allow_admins', category: 'maintenance', labelAr: 'السماح للإدارة أثناء الصيانة', valueType: 'boolean', defaultValue: true },

  { key: 'notifications.in_app_enabled', category: 'notifications', labelAr: 'إشعارات داخل المنصة', valueType: 'boolean', defaultValue: true },
  { key: 'notifications.email_enabled', category: 'notifications', labelAr: 'إشعارات البريد', valueType: 'boolean', defaultValue: true },
  { key: 'notifications.push_enabled', category: 'notifications', labelAr: 'الإشعارات الفورية', valueType: 'boolean', defaultValue: false },

  { key: 'storage.default_retention_days', category: 'storage', labelAr: 'مدة الاحتفاظ الافتراضية', valueType: 'number', defaultValue: 30, min: 1, max: 3650 },
  { key: 'storage.compression_enabled', category: 'storage', labelAr: 'ضغط الملفات', valueType: 'boolean', defaultValue: true },
  { key: 'storage.cdn_enabled', category: 'storage', labelAr: 'استخدام CDN', valueType: 'boolean', defaultValue: true },

  { key: 'finance.usd_lyd_rate', category: 'finance', labelAr: 'سعر صرف الدولار مقابل الدينار', valueType: 'number', defaultValue: 11, min: 0.01, max: 1000 },
  { key: 'finance.bank_commission_percent', category: 'finance', labelAr: 'عمولة المصرف %', valueType: 'number', defaultValue: 0, min: 0, max: 100 },
  { key: 'finance.target_margin_percent', category: 'finance', labelAr: 'هامش الربح المستهدف %', valueType: 'number', defaultValue: 30, min: 0, max: 1000 },

  { key: 'features.beta_models_enabled', category: 'features', labelAr: 'إتاحة نماذج Beta', valueType: 'boolean', defaultValue: false },
  { key: 'features.new_dashboard_rollout_percent', category: 'features', labelAr: 'نسبة إطلاق لوحة التحكم الجديدة %', valueType: 'number', defaultValue: 0, min: 0, max: 100 },
  { key: 'features.video_editor_enabled', category: 'features', labelAr: 'محرر الفيديو الجديد', valueType: 'boolean', defaultValue: false },
  { key: 'features.advanced_upscaler_enabled', category: 'features', labelAr: 'المحسن المتقدم للصور', valueType: 'boolean', defaultValue: false },
] as const;

const definitionMap = new Map(PLATFORM_SETTING_DEFINITIONS.map((definition) => [definition.key, definition]));

export function isPlatformSettingKey(value: string): value is PlatformSettingKey {
  return definitionMap.has(value as PlatformSettingKey);
}

export function defaultPlatformSettings(): Record<PlatformSettingKey, SettingValue> {
  return Object.fromEntries(PLATFORM_SETTING_DEFINITIONS.map((definition) => [definition.key, definition.defaultValue])) as Record<PlatformSettingKey, SettingValue>;
}

export function validateSettingValue(key: PlatformSettingKey, value: unknown): SettingValue {
  const definition = definitionMap.get(key);
  if (!definition) throw new Error('INVALID_SETTING_KEY');

  if (definition.valueType === 'boolean') {
    if (typeof value !== 'boolean') throw new Error('INVALID_SETTING_VALUE');
    return value;
  }

  if (definition.valueType === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('INVALID_SETTING_VALUE');
    if (definition.min !== undefined && value < definition.min) throw new Error('SETTING_VALUE_TOO_LOW');
    if (definition.max !== undefined && value > definition.max) throw new Error('SETTING_VALUE_TOO_HIGH');
    return value;
  }

  if (typeof value !== 'string') throw new Error('INVALID_SETTING_VALUE');
  const trimmed = value.trim();
  if (trimmed.length > 1000) throw new Error('SETTING_VALUE_TOO_LONG');
  return trimmed;
}
