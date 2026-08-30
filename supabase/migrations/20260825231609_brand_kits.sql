create table if not exists public.brand_kits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  brand_name text not null default '',
  tagline text not null default '',
  description text not null default '',
  primary_color text not null default '#F31325' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#090A0F' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#FFFFFF' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_family text not null default 'Tajawal (أنيق وبسيط)',
  tone_of_voice text not null default 'احترافي وواضح',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brand_kits enable row level security;

drop policy if exists brand_kits_select_own on public.brand_kits;
create policy brand_kits_select_own on public.brand_kits
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists brand_kits_insert_own on public.brand_kits;
create policy brand_kits_insert_own on public.brand_kits
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists brand_kits_update_own on public.brand_kits;
create policy brand_kits_update_own on public.brand_kits
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.brand_kits to authenticated;
revoke all on public.brand_kits from anon;
