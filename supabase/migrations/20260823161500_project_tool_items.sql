create table if not exists public.project_tool_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  tool_type text not null check (tool_type in ('video', 'audio')),
  item_type text not null default 'draft' check (item_type in ('draft', 'generation')),
  prompt text not null default '',
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'queued', 'processing', 'completed', 'failed')),
  result_url text,
  result_content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_tool_items_user_project_tool_idx
  on public.project_tool_items (user_id, project_id, tool_type, created_at desc);

alter table public.project_tool_items enable row level security;

revoke all on public.project_tool_items from anon;
grant select, insert, update, delete on public.project_tool_items to authenticated;

create policy "project_tool_items_select_own"
  on public.project_tool_items for select
  to authenticated
  using (auth.uid() = user_id);

create policy "project_tool_items_insert_own"
  on public.project_tool_items for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "project_tool_items_update_own"
  on public.project_tool_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "project_tool_items_delete_own"
  on public.project_tool_items for delete
  to authenticated
  using (auth.uid() = user_id);
