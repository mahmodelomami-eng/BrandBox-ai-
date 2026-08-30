revoke all on public.support_requests from authenticated;

grant select (
  id,
  user_id,
  category,
  subject,
  message,
  status,
  created_at,
  updated_at
) on public.support_requests to authenticated;

grant insert (
  user_id,
  category,
  subject,
  message
) on public.support_requests to authenticated;

revoke all on public.support_requests from anon;
