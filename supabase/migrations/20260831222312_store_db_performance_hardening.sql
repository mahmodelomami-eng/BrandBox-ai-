-- Store DB performance hardening: covering indexes and RLS initplan optimization.

create index if not exists idx_store_products_provider_id
  on public.store_products(provider_id);

create index if not exists idx_store_order_items_sku_id
  on public.store_order_items(sku_id);

create index if not exists idx_store_fulfillment_jobs_order_item_id
  on public.store_fulfillment_jobs(order_item_id);

create index if not exists idx_store_fulfillment_jobs_provider_id
  on public.store_fulfillment_jobs(provider_id);

create index if not exists idx_store_digital_codes_reserved_order_item_id
  on public.store_digital_codes(reserved_for_order_item_id);

create index if not exists idx_store_provider_products_sku_id
  on public.store_provider_products(sku_id);

create index if not exists idx_store_refunds_order_id
  on public.store_refunds(order_id);

create index if not exists idx_store_refunds_requested_by
  on public.store_refunds(requested_by);

drop policy if exists "users read own store orders" on public.store_orders;
create policy "users read own store orders"
  on public.store_orders
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users read own store order items" on public.store_order_items;
create policy "users read own store order items"
  on public.store_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_orders o
      where o.id = order_id
        and o.user_id = (select auth.uid())
    )
  );

drop policy if exists "users read own store entitlements" on public.store_entitlements;
create policy "users read own store entitlements"
  on public.store_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users read own store refunds" on public.store_refunds;
create policy "users read own store refunds"
  on public.store_refunds
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_orders o
      where o.id = order_id
        and o.user_id = (select auth.uid())
    )
  );