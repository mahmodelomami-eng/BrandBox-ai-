-- Phase 2B: platform settings foundation
-- Non-secret settings only. Secrets remain in server environment variables.

create table if not exists public.platform_settings (
  key text primary key,
  category text not null,
  value jsonb not null,
  is_sensitive boolean not null default false,
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

revoke all on table public.platform_settings from anon;
revoke all on table public.platform_settings from authenticated;

create index if not exists idx_platform_settings_category
  on public.platform_settings(category);

insert into public.platform_settings (key, category, value, is_sensitive)
values
  ('general.platform_name', 'general', to_jsonb('Brand Box AI'::text), false),
  ('general.support_email', 'general', to_jsonb(''::text), false),
  ('general.country', 'general', to_jsonb('LY'::text), false),
  ('general.currency', 'general', to_jsonb('LYD'::text), false),
  ('general.timezone', 'general', to_jsonb('Africa/Tripoli'::text), false),
  ('general.default_language', 'general', to_jsonb('ar'::text), false),
  ('users.registration_enabled', 'users', 'true'::jsonb, false),
  ('users.email_verification_required', 'users', 'true'::jsonb, false),
  ('users.session_duration_minutes', 'users', '1440'::jsonb, false),
  ('users.maximum_sessions', 'users', '5'::jsonb, false),
  ('usage.daily_jobs', 'usage', '100'::jsonb, false),
  ('usage.monthly_jobs', 'usage', '3000'::jsonb, false),
  ('usage.concurrent_jobs', 'usage', '3'::jsonb, false),
  ('usage.max_file_size_mb', 'usage', '50'::jsonb, false),
  ('usage.max_video_duration_seconds', 'usage', '60'::jsonb, false),
  ('usage.max_image_megapixels', 'usage', '24'::jsonb, false),
  ('usage.api_requests_per_minute', 'usage', '60'::jsonb, false),
  ('security.admin_2fa_required', 'security', 'false'::jsonb, false),
  ('security.sensitive_action_reauth', 'security', 'true'::jsonb, false),
  ('security.admin_session_minutes', 'security', '480'::jsonb, false),
  ('maintenance.enabled', 'maintenance', 'false'::jsonb, false),
  ('maintenance.message', 'maintenance', to_jsonb('نعمل حاليًا على ترقية المنصة. سنعود قريبًا.'::text), false),
  ('maintenance.allow_admins', 'maintenance', 'true'::jsonb, false),
  ('notifications.in_app_enabled', 'notifications', 'true'::jsonb, false),
  ('notifications.email_enabled', 'notifications', 'true'::jsonb, false),
  ('notifications.push_enabled', 'notifications', 'false'::jsonb, false),
  ('storage.default_retention_days', 'storage', '30'::jsonb, false),
  ('storage.compression_enabled', 'storage', 'true'::jsonb, false),
  ('storage.cdn_enabled', 'storage', 'true'::jsonb, false)
on conflict (key) do nothing;
