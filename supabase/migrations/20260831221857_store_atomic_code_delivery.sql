-- Atomic reservation and delivery for Store CODE_STOCK inventory.
create or replace function public.reserve_store_digital_codes(p_order_item_id uuid, p_sku_id uuid, p_quantity integer)
returns table(code_id uuid, code_ciphertext text)
language plpgsql security definer set search_path=public as $$
begin
  if p_quantity < 1 or p_quantity > 20 then raise exception 'STORE_INVALID_CODE_QUANTITY'; end if;
  return query
  with candidates as (
    select id from public.store_digital_codes
    where sku_id=p_sku_id and status='AVAILABLE' and (expires_at is null or expires_at>now())
    order by created_at for update skip locked limit p_quantity
  ), reserved as (
    update public.store_digital_codes c set status='RESERVED',reserved_for_order_item_id=p_order_item_id,reserved_at=now(),updated_at=now()
    from candidates x where c.id=x.id returning c.id,c.code_ciphertext
  )
  select r.id,r.code_ciphertext from reserved r;
  if (select count(*) from public.store_digital_codes where reserved_for_order_item_id=p_order_item_id and status in ('RESERVED','DELIVERED')) < p_quantity then
    raise exception 'STORE_OUT_OF_STOCK';
  end if;
end $$;
create or replace function public.deliver_store_digital_codes(p_order_item_id uuid)
returns table(code_id uuid, code_ciphertext text)
language plpgsql security definer set search_path=public as $$
begin
 return query update public.store_digital_codes set status='DELIVERED',delivered_at=coalesce(delivered_at,now()),updated_at=now()
 where reserved_for_order_item_id=p_order_item_id and status in ('RESERVED','DELIVERED') returning id,code_ciphertext;
end $$;
revoke all on function public.reserve_store_digital_codes(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.deliver_store_digital_codes(uuid) from public,anon,authenticated;
grant execute on function public.reserve_store_digital_codes(uuid,uuid,integer) to service_role;
grant execute on function public.deliver_store_digital_codes(uuid) to service_role;
