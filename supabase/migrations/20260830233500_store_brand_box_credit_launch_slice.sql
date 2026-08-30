-- Brand Box Store v1: first production-safe shippable SKU using Brand Box-owned credit fulfillment.
-- No third-party supplier dependency is required for these SKUs.

begin;

insert into public.store_providers (
  code,
  display_name,
  provider_type,
  status,
  metadata
)
values (
  'brand-box',
  'Brand Box',
  'BRAND_BOX_CREDITS',
  'ACTIVE',
  jsonb_build_object(
    'owned_fulfillment', true,
    'authorization_status', 'first_party',
    'launch_gate', 'approved'
  )
)
on conflict (code) do update set
  display_name = excluded.display_name,
  provider_type = excluded.provider_type,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = now();

with category_row as (
  select id from public.store_categories where slug = 'ai' limit 1
),
provider_row as (
  select id from public.store_providers where code = 'brand-box' limit 1
)
insert into public.store_products (
  category_id,
  provider_id,
  slug,
  name,
  brand,
  short_description,
  description,
  fulfillment_mode,
  sale_status,
  requires_customer_identifier,
  supplier_authorization_verified,
  regional_validity_verified,
  automated_fulfillment_verified,
  refund_policy,
  metadata
)
select
  category_row.id,
  provider_row.id,
  'brand-box-ai-credits',
  'Brand Box AI Credits',
  'Brand Box',
  'رصيد موحد لاستخدام أدوات الذكاء الاصطناعي داخل Brand Box.',
  'رصيد رقمي من Brand Box يضاف تلقائيًا إلى محفظة المستخدم بعد تأكيد الدفع من الخادم.',
  'BRAND_BOX_CREDITS',
  'ACTIVE_FOR_SALE',
  false,
  true,
  true,
  true,
  'تخضع عمليات الاسترداد للحالة الفعلية للرصيد وعدم استهلاكه.',
  jsonb_build_object(
    'first_party', true,
    'fulfillment_engine', 'grant_credits_idempotent',
    'launch_slice', 'store_v1_credits'
  )
from category_row, provider_row
on conflict (slug) do update set
  category_id = excluded.category_id,
  provider_id = excluded.provider_id,
  name = excluded.name,
  brand = excluded.brand,
  short_description = excluded.short_description,
  description = excluded.description,
  fulfillment_mode = excluded.fulfillment_mode,
  sale_status = excluded.sale_status,
  supplier_authorization_verified = excluded.supplier_authorization_verified,
  regional_validity_verified = excluded.regional_validity_verified,
  automated_fulfillment_verified = excluded.automated_fulfillment_verified,
  refund_policy = excluded.refund_policy,
  metadata = excluded.metadata,
  updated_at = now();

with product_row as (
  select id from public.store_products where slug = 'brand-box-ai-credits' limit 1
)
insert into public.store_skus (
  product_id,
  sku_code,
  title,
  sell_price_lyd,
  region_code,
  is_active,
  inventory_mode,
  metadata
)
select product_row.id, sku_code, title, sell_price_lyd, 'LY', true, 'UNLIMITED',
       jsonb_build_object('brand_box_credits', credits, 'first_party', true)
from product_row
cross join (
  values
    ('BB-CREDITS-100', '100 نقطة', 25.000::numeric, 100),
    ('BB-CREDITS-550', '550 نقطة', 100.000::numeric, 550),
    ('BB-CREDITS-1150', '1150 نقطة', 175.000::numeric, 1150)
) as sku_values(sku_code, title, sell_price_lyd, credits)
on conflict (sku_code) do update set
  title = excluded.title,
  sell_price_lyd = excluded.sell_price_lyd,
  region_code = excluded.region_code,
  is_active = excluded.is_active,
  inventory_mode = excluded.inventory_mode,
  metadata = excluded.metadata,
  updated_at = now();

commit;
