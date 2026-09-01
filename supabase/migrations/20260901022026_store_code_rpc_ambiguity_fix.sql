-- Fix PL/pgSQL output-column ambiguity in Store digital-code RPCs.

create or replace function public.reserve_store_digital_codes(
  p_order_item_id uuid,
  p_sku_id uuid,
  p_quantity integer
)
returns table(code_id uuid, code_ciphertext text)
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_quantity < 1 or p_quantity > 20 then
    raise exception 'STORE_INVALID_CODE_QUANTITY';
  end if;

  return query
  with candidates as (
    select d.id
    from public.store_digital_codes d
    where d.sku_id=p_sku_id
      and d.status='AVAILABLE'
      and (d.expires_at is null or d.expires_at>now())
    order by d.created_at
    for update skip locked
    limit p_quantity
  ), reserved as (
    update public.store_digital_codes c
    set status='RESERVED',
        reserved_for_order_item_id=p_order_item_id,
        reserved_at=now(),
        updated_at=now()
    from candidates x
    where c.id=x.id
    returning c.id, c.code_ciphertext as encrypted_code
  )
  select r.id, r.encrypted_code
  from reserved r;

  if (
    select count(*)
    from public.store_digital_codes d
    where d.reserved_for_order_item_id=p_order_item_id
      and d.status in ('RESERVED','DELIVERED')
  ) < p_quantity then
    raise exception 'STORE_OUT_OF_STOCK';
  end if;
end
$$;

create or replace function public.deliver_store_digital_codes(p_order_item_id uuid)
returns table(code_id uuid, code_ciphertext text)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  update public.store_digital_codes d
  set status='DELIVERED',
      delivered_at=coalesce(d.delivered_at,now()),
      updated_at=now()
  where d.reserved_for_order_item_id=p_order_item_id
    and d.status in ('RESERVED','DELIVERED')
  returning d.id, d.code_ciphertext;
end
$$;

revoke all on function public.reserve_store_digital_codes(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.deliver_store_digital_codes(uuid) from public,anon,authenticated;
grant execute on function public.reserve_store_digital_codes(uuid,uuid,integer) to service_role;
grant execute on function public.deliver_store_digital_codes(uuid) to service_role;
