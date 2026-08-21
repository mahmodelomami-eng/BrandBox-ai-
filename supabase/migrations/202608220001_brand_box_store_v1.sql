-- Brand Box Store v1 foundation
-- Server-authoritative pricing + fulfillment-safe data model.

create extension if not exists pgcrypto;

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  provider_type text not null check (provider_type in ('DIRECT_API','RESELLER_API','VOUCHER_API','BRAND_BOX_CREDITS','PARTNER_REQUIRED','CATALOG_ONLY')),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','PAUSED','DISABLED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.store_categories(id) on delete restrict,
  provider_id uuid references public.store_providers(id) on delete set null,
  slug text not null unique,
  name text not null,
  brand text,
  short_description text,
  description text,
  image_url text,
  fulfillment_mode text not null check (fulfillment_mode in ('DIRECT_API','RESELLER_API','VOUCHER_API','BRAND_BOX_CREDITS','PARTNER_REQUIRED','CATALOG_ONLY')),
  sale_status text not null default 'DRAFT' check (sale_status in ('DRAFT','CATALOG_ONLY','ACTIVE_FOR_SALE','PAUSED','ARCHIVED')),
  requires_customer_identifier boolean not null default false,
  customer_identifier_label text,
  terms_url text,
  refund_policy text,
  supplier_authorization_verified boolean not null default false,
  regional_validity_verified boolean not null default false,
  automated_fulfillment_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_product_sale_gate check (
    sale_status <> 'ACTIVE_FOR_SALE' or (
      supplier_authorization_verified = true and
      regional_validity_verified = true and
      automated_fulfillment_verified = true and
      fulfillment_mode not in ('PARTNER_REQUIRED','CATALOG_ONLY')
    )
  )
);

create table if not exists public.store_skus (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  sku_code text not null unique,
  title text not null,
  duration_days integer,
  face_value numeric(14,3),
  face_value_currency text,
  sell_price_lyd numeric(14,3) not null check (sell_price_lyd >= 0),
  provider_cost numeric(14,3),
  provider_cost_currency text,
  region_code text not null default 'GLOBAL',
  is_active boolean not null default false,
  inventory_mode text not null default 'UNLIMITED' check (inventory_mode in ('UNLIMITED','CODE_STOCK','PROVIDER_STOCK')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_provider_products (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.store_providers(id) on delete cascade,
  sku_id uuid not null references public.store_skus(id) on delete cascade,
  external_product_id text,
  external_sku_id text,
  provider_region text,
  is_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, sku_id)
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  order_number text not null unique,
  status text not null default 'CREATED' check (status in ('CREATED','PAYMENT_PENDING','PAID','FULFILLMENT_PENDING','FULFILLED','FAILED','REVIEW_REQUIRED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')),
  currency text not null default 'LYD' check (currency = 'LYD'),
  subtotal_lyd numeric(14,3) not null check (subtotal_lyd >= 0),
  discount_lyd numeric(14,3) not null default 0 check (discount_lyd >= 0),
  total_lyd numeric(14,3) not null check (total_lyd >= 0),
  payment_provider text,
  payment_reference text,
  idempotency_key text not null unique,
  customer_data jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_order_totals check (total_lyd = greatest(subtotal_lyd - discount_lyd, 0))
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  sku_id uuid not null references public.store_skus(id) on delete restrict,
  product_name_snapshot text not null,
  sku_title_snapshot text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_lyd numeric(14,3) not null check (unit_price_lyd >= 0),
  line_total_lyd numeric(14,3) not null check (line_total_lyd >= 0),
  fulfillment_mode text not null,
  customer_identifier text,
  created_at timestamptz not null default now(),
  constraint store_order_item_total check (line_total_lyd = unit_price_lyd * quantity)
);

create table if not exists public.store_fulfillment_jobs (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.store_order_items(id) on delete cascade,
  provider_id uuid references public.store_providers(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SUCCEEDED','FAILED','REVIEW_REQUIRED','CANCELLED')),
  idempotency_key text not null unique,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  external_reference text,
  last_error_code text,
  last_error_message text,
  next_retry_at timestamptz,
  locked_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_digital_codes (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.store_skus(id) on delete restrict,
  code_ciphertext text not null,
  code_fingerprint text not null unique,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','RESERVED','DELIVERED','VOID')),
  reserved_for_order_item_id uuid references public.store_order_items(id) on delete set null,
  reserved_at timestamptz,
  delivered_at timestamptz,
  expires_at timestamptz,
  supplier_batch text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_item_id uuid not null unique references public.store_order_items(id) on delete restrict,
  entitlement_type text not null check (entitlement_type in ('SUBSCRIPTION','LICENSE','VOUCHER','CREDITS','ACCESS')),
  status text not null default 'ACTIVE' check (status in ('PENDING','ACTIVE','EXPIRED','REVOKED','REFUNDED')),
  external_reference text,
  delivery_payload jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_id text not null,
  event_type text,
  payload_hash text not null,
  status text not null default 'RECEIVED' check (status in ('RECEIVED','PROCESSED','IGNORED','FAILED')),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique(source, event_id)
);

create table if not exists public.store_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete restrict,
  amount_lyd numeric(14,3) not null check (amount_lyd > 0),
  status text not null default 'REQUESTED' check (status in ('REQUESTED','REVIEWING','APPROVED','REJECTED','PROCESSING','COMPLETED','FAILED')),
  reason text,
  provider_reference text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_products_category_sale on public.store_products(category_id, sale_status);
create index if not exists idx_store_skus_product_active on public.store_skus(product_id, is_active);
create index if not exists idx_store_orders_user_created on public.store_orders(user_id, created_at desc);
create index if not exists idx_store_order_items_order on public.store_order_items(order_id);
create index if not exists idx_store_jobs_status_retry on public.store_fulfillment_jobs(status, next_retry_at);
create index if not exists idx_store_codes_sku_status on public.store_digital_codes(sku_id, status);
create index if not exists idx_store_entitlements_user_status on public.store_entitlements(user_id, status);

alter table public.store_categories enable row level security;
alter table public.store_providers enable row level security;
alter table public.store_products enable row level security;
alter table public.store_skus enable row level security;
alter table public.store_provider_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_fulfillment_jobs enable row level security;
alter table public.store_digital_codes enable row level security;
alter table public.store_entitlements enable row level security;
alter table public.store_webhook_events enable row level security;
alter table public.store_refunds enable row level security;

create policy "store categories public read" on public.store_categories for select using (is_active = true);
create policy "store products public read" on public.store_products for select using (sale_status in ('CATALOG_ONLY','ACTIVE_FOR_SALE'));
create policy "store skus public read" on public.store_skus for select using (is_active = true);

create policy "users read own store orders" on public.store_orders for select to authenticated using (auth.uid() = user_id);
create policy "users read own store order items" on public.store_order_items for select to authenticated using (
  exists (select 1 from public.store_orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "users read own store entitlements" on public.store_entitlements for select to authenticated using (auth.uid() = user_id);
create policy "users read own store refunds" on public.store_refunds for select to authenticated using (
  exists (select 1 from public.store_orders o where o.id = order_id and o.user_id = auth.uid())
);

-- No client policies are intentionally granted for providers, provider mappings,
-- fulfillment jobs, webhook events or digital-code inventory. Service-role operations
-- bypass RLS and remain server-only.

revoke all on public.store_digital_codes from anon, authenticated;
revoke all on public.store_fulfillment_jobs from anon, authenticated;
revoke all on public.store_webhook_events from anon, authenticated;
revoke all on public.store_provider_products from anon, authenticated;
revoke all on public.store_providers from anon, authenticated;

grant select on public.store_categories, public.store_products, public.store_skus to anon, authenticated;
grant select on public.store_orders, public.store_order_items, public.store_entitlements, public.store_refunds to authenticated;
