create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general' check (category in ('general','technical','billing','store','print')),
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_user_created_idx
  on public.support_requests (user_id, created_at desc);
create index if not exists support_requests_status_created_idx
  on public.support_requests (status, created_at desc);

alter table public.support_requests enable row level security;

drop policy if exists support_requests_select_own on public.support_requests;
create policy support_requests_select_own
  on public.support_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists support_requests_insert_own on public.support_requests;
create policy support_requests_insert_own
  on public.support_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.support_requests to authenticated;
revoke update, delete on public.support_requests from authenticated;
revoke all on public.support_requests from anon;
