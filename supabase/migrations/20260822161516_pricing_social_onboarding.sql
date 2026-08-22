alter table public.profiles add column if not exists whatsapp_phone text;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.whatsapp_phone is 'Optional WhatsApp number used for account notifications.';
comment on column public.profiles.onboarding_completed_at is 'Timestamp when required post-social-login contact onboarding was completed.';
