-- Private service-managed storage for generated images.
-- Browser clients receive short-lived signed URLs from the authenticated API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generation-assets',
  'generation-assets',
  false,
  15728640,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
