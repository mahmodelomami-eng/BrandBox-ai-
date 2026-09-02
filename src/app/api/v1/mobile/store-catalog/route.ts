import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { listStoreCatalog } from '@/lib/store/store-service';

const DEFAULT_ALLOWED_CATEGORIES = new Set([
  'ai-tools',
  'software',
  'productivity',
  'game-cards',
  'gaming',
  'entertainment',
  'streaming',
]);

function allowedCategorySlugs() {
  const configured = (process.env.BRANDBOX_MOBILE_STORE_ALLOWED_CATEGORIES || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return configured.length ? new Set(configured) : DEFAULT_ALLOWED_CATEGORIES;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const allow = allowedCategorySlugs();
    const catalog = await listStoreCatalog();
    const products = catalog
      .filter((product) => product.store_categories?.slug && allow.has(product.store_categories.slug.toLowerCase()))
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        shortDescription: product.short_description,
        imageUrl: product.image_url,
        category: product.store_categories,
        availability: product.sale_status,
        nativePurchaseEnabled: false,
        skus: product.store_skus.map((sku) => ({
          id: sku.id,
          title: sku.title,
          durationDays: sku.duration_days,
          faceValue: sku.face_value,
          faceValueCurrency: sku.face_value_currency,
          priceLyd: Number(sku.sell_price_lyd),
          regionCode: sku.region_code,
        })),
      }));

    return NextResponse.json({
      products,
      nativeCheckout: {
        enabled: false,
        reason: 'PLATFORM_BILLING_REVIEW_REQUIRED',
      },
    });
  } catch {
    return NextResponse.json({ error: 'MOBILE_STORE_CATALOG_UNAVAILABLE' }, { status: 503 });
  }
}
