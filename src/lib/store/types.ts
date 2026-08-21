export type StoreFulfillmentMode =
  | 'DIRECT_API'
  | 'RESELLER_API'
  | 'VOUCHER_API'
  | 'BRAND_BOX_CREDITS'
  | 'PARTNER_REQUIRED'
  | 'CATALOG_ONLY';

export type StoreSaleStatus =
  | 'DRAFT'
  | 'CATALOG_ONLY'
  | 'ACTIVE_FOR_SALE'
  | 'PAUSED'
  | 'ARCHIVED';

export type StoreOrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FULFILLMENT_PENDING'
  | 'FULFILLED'
  | 'FAILED'
  | 'REVIEW_REQUIRED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface StoreSku {
  id: string;
  sku_code: string;
  title: string;
  duration_days: number | null;
  face_value: number | null;
  face_value_currency: string | null;
  sell_price_lyd: number;
  region_code: string;
  inventory_mode: 'UNLIMITED' | 'CODE_STOCK' | 'PROVIDER_STOCK';
  is_active: boolean;
}

export interface StoreCatalogProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  short_description: string | null;
  image_url: string | null;
  fulfillment_mode: StoreFulfillmentMode;
  sale_status: StoreSaleStatus;
  store_categories: { slug: string; name_ar: string; name_en: string | null } | null;
  store_skus: StoreSku[];
}

export interface CreateStoreOrderInput {
  userId: string;
  skuId: string;
  quantity?: number;
  customerIdentifier?: string;
  idempotencyKey: string;
}

export interface StoreFulfillmentResult {
  status: 'SUCCEEDED' | 'FAILED' | 'REVIEW_REQUIRED';
  externalReference?: string;
  entitlementType?: 'SUBSCRIPTION' | 'LICENSE' | 'VOUCHER' | 'CREDITS' | 'ACCESS';
  deliveryPayload?: Record<string, unknown>;
  startsAt?: string;
  expiresAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface StoreProviderAdapter {
  readonly mode: StoreFulfillmentMode;
  fulfill(input: {
    jobId: string;
    idempotencyKey: string;
    orderItemId: string;
    skuId: string;
    customerIdentifier?: string | null;
  }): Promise<StoreFulfillmentResult>;

  queryStatus?(externalReference: string): Promise<StoreFulfillmentResult>;
  cancel?(externalReference: string): Promise<{ success: boolean; reason?: string }>;
}
