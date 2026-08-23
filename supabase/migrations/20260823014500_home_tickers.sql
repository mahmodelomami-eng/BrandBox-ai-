create table if not exists public.home_tickers (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(trim(text)) > 0),
  link_url text,
  duration_seconds integer not null default 8 check (duration_seconds between 3 and 120),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_tickers_date_window check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists home_tickers_active_sort_idx on public.home_tickers (is_active, sort_order, created_at);

alter table public.home_tickers enable row level security;

revoke all on public.home_tickers from anon, authenticated;
grant select on public.home_tickers to anon, authenticated;
grant insert, update, delete on public.home_tickers to authenticated;

drop policy if exists home_tickers_public_read on public.home_tickers;
create policy home_tickers_public_read on public.home_tickers
for select
to anon, authenticated
using (
  (is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now()))
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('ADMIN','SUPER_ADMIN')
  )
);

drop policy if exists home_tickers_admin_insert on public.home_tickers;
create policy home_tickers_admin_insert on public.home_tickers
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN','SUPER_ADMIN'))
);

drop policy if exists home_tickers_admin_update on public.home_tickers;
create policy home_tickers_admin_update on public.home_tickers
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN','SUPER_ADMIN'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN','SUPER_ADMIN'))
);

drop policy if exists home_tickers_admin_delete on public.home_tickers;
create policy home_tickers_admin_delete on public.home_tickers
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN','SUPER_ADMIN'))
);

insert into public.home_tickers (text, link_url, duration_seconds, sort_order, is_active)
select 'خصومات ومسابقات وجوائز Brand Box • تابع أحدث العروض الحصرية', '/pricing', 8, 0, true
where not exists (select 1 from public.home_tickers);
