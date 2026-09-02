-- Private, server-mediated support request attachments.
-- Files are never public and browser clients receive no INSERT/UPDATE/DELETE privileges.

create table if not exists public.support_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 10 and 700),
  file_name text not null check (char_length(file_name) between 1 and 255),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  created_at timestamptz not null default now()
);

create index if not exists support_request_attachments_request_idx
  on public.support_request_attachments (request_id, created_at);

create index if not exists support_request_attachments_user_idx
  on public.support_request_attachments (user_id, created_at desc);

alter table public.support_request_attachments enable row level security;

drop policy if exists support_request_attachments_select_own on public.support_request_attachments;
create policy support_request_attachments_select_own
  on public.support_request_attachments
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Browser users can only read safe attachment metadata for their own requests.
-- All writes are performed through the authenticated server endpoint using the privileged client.
revoke all on public.support_request_attachments from authenticated;
grant select (
  id,
  request_id,
  user_id,
  file_name,
  content_type,
  byte_size,
  created_at
) on public.support_request_attachments to authenticated;
revoke all on public.support_request_attachments from anon;

create or replace function public.enforce_support_request_attachment_owner()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.support_requests request
    where request.id = new.request_id
      and request.user_id = new.user_id
  ) then
    raise exception 'SUPPORT_ATTACHMENT_OWNER_MISMATCH';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_support_request_attachment_owner() from public;
revoke all on function public.enforce_support_request_attachment_owner() from anon;
revoke all on function public.enforce_support_request_attachment_owner() from authenticated;

drop trigger if exists trg_support_request_attachment_owner on public.support_request_attachments;
create trigger trg_support_request_attachment_owner
before insert or update of request_id, user_id
on public.support_request_attachments
for each row execute function public.enforce_support_request_attachment_owner();

-- Private bucket: only server/service-role code uploads or signs files.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'support-attachments',
  'support-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
