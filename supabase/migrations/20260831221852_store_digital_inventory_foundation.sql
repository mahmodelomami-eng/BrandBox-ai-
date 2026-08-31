-- Store digital inventory safety foundation
-- Prevent checkout from accepting CODE_STOCK SKUs without enough deliverable codes.

create or replace function public.store_available_code_count(p_sku_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)
  from public.store_digital_codes
  where sku_id = p_sku_id
    and status = 'AVAILABLE'
    and (expires_at is null or expires_at > now());
$$;

revoke all on function public.store_available_code_count(uuid) from public, anon, authenticated;
grant execute on function public.store_available_code_count(uuid) to service_role;

create index if not exists idx_store_codes_available_inventory
  on public.store_digital_codes (sku_id, status, expires_at)
  where status = 'AVAILABLE';
