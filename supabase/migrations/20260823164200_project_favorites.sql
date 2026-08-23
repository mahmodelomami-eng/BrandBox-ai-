alter table public.projects
  add column if not exists is_favorite boolean not null default false;

create index if not exists projects_owner_favorite_updated_idx
  on public.projects (owner_id, is_favorite desc, updated_at desc);
