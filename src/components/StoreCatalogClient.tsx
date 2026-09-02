'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Loader2, ShieldCheck, ShoppingCart } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import type { StoreCatalogProduct, StoreSku } from '../lib/store/types';

const modeLabel: Record<string, string> = {
  DIRECT_API: 'تفعيل آلي',
  RESELLER_API: 'تفعيل عبر موزع معتمد',
  VOUCHER_API: 'تسليم رقمي',
  BRAND_BOX_CREDITS: 'رصيد Brand Box',
  PARTNER_REQUIRED: 'قريبًا',
  CATALOG_ONLY: 'عرض فقط',
};

function skuMeta(sku: StoreSku) {
  const parts: string[] = [];
  if (sku.duration_days) parts.push(`${sku.duration_days} يوم`);
  if (sku.face_value !== null && sku.face_value_currency) parts.push(`${sku.face_value} ${sku.face_value_currency}`);
  if (sku.region_code && sku.region_code !== 'GLOBAL') parts.push(sku.region_code);
  return parts.join(' · ');
}

function checkoutErrorMessage(message: string) {
  if (message.includes('STORE_CUSTOMER_IDENTIFIER_REQUIRED')) return 'أدخل معرف الحساب المطلوب لتفعيل هذه الخدمة.';
  if (message.includes('STORE_PRODUCT_NOT_FOR_SALE')) return 'هذا المنتج غير متاح للبيع حاليًا.';
  if (message.includes('STORE_SKU_UNAVAILABLE')) return 'هذه الخطة غير متاحة حاليًا.';
  if (message.includes('STORE_OUT_OF_STOCK')) return 'نفد مخزون هذه الخطة حاليًا. ستعود للشراء بعد إضافة مخزون جديد.';
  if (message.includes('UNAUTHORIZED')) return 'يجب تسجيل الدخول قبل الشراء.';
  return 'تعذر بدء عملية الشراء. حاول مرة أخرى لاحقًا.';
}

export default function StoreCatalogClient({ products }: { products: StoreCatalogProduct[] }) {
  const router = useRouter();
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [busySkuId, setBusySkuId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [identifiers, setIdentifiers] = useState<Record<string, string>>({});

  async function startCheckout(product: StoreCatalogProduct, sku: StoreSku) {
    if (busySkuId) return;

    const customerIdentifier = (identifiers[product.id] || '').trim();
    if (product.requires_customer_identifier && !customerIdentifier) {
      setError('أدخل معرف الحساب أو البريد المطلوب لتفعيل هذه الخدمة.');
      return;
    }

    setBusySkuId(sku.id);
    setError('');

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) {
        setBusySkuId(null);
        router.push(`/auth?next=${encodeURIComponent('/store')}`);
        return;
      }

      const response = await fetch('/api/v1/store/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skuId: sku.id,
          quantity: 1,
          customerIdentifier: product.requires_customer_identifier ? customerIdentifier : undefined,
          idempotencyKey: `store-${sku.id}-${crypto.randomUUID()}`,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.paymentUrl) {
        throw new Error(payload.error || 'STORE_CHECKOUT_FAILED');
      }

      window.location.assign(payload.paymentUrl);
    } catch (checkoutError) {
      const message = checkoutError instanceof Error ? checkoutError.message : 'STORE_CHECKOUT_FAILED';
      setError(checkoutErrorMessage(message));
      setBusySkuId(null);
    }
  }

  return (
    <>
      {error && (
        <div className="bb-danger-surface mb-5 rounded-2xl border px-4 py-3 text-sm font-bold" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => {
          const forSale = product.sale_status === 'ACTIVE_FOR_SALE' && product.store_skus.length > 0;
          const expanded = expandedProductId === product.id;
          const prices = product.store_skus.map((sku) => Number(sku.sell_price_lyd)).filter(Number.isFinite);
          const fromPrice = prices.length ? Math.min(...prices) : null;

          return (
            <article key={product.id} className="bb-card group flex min-h-72 flex-col rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:border-[var(--bb-border-strong)] hover:shadow-[var(--bb-shadow-md)]">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="bb-surface-2 bb-border flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border text-xl font-black">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="bb-text-primary">{(product.brand || product.name).slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${forSale ? 'border-[var(--bb-success)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]' : 'bb-button-secondary bb-text-tertiary'}`}>
                  {modeLabel[product.fulfillment_mode] ?? product.fulfillment_mode}
                </span>
              </div>

              <p className="bb-text-tertiary text-xs">{product.store_categories?.name_ar ?? 'خدمات رقمية'}</p>
              <h2 className="bb-text-primary mt-1 text-xl font-extrabold">{product.name}</h2>
              <p className="bb-text-secondary mt-2 line-clamp-2 text-sm leading-6">{product.short_description || 'خدمة رقمية ضمن Brand Box Store.'}</p>

              <div className="mt-auto pt-6">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <span className="bb-text-tertiary text-xs">{fromPrice === null ? 'السعر عند التوفر' : 'يبدأ من'}</span>
                  {fromPrice !== null && <strong className="bb-text-primary text-xl">{fromPrice.toFixed(2)} د.ل</strong>}
                </div>

                <button
                  type="button"
                  disabled={!forSale}
                  onClick={() => {
                    setError('');
                    setExpandedProductId((current) => current === product.id ? null : product.id);
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed ${forSale ? 'bb-button-primary' : 'bb-button-secondary bb-text-disabled border'}`}
                  aria-expanded={expanded}
                >
                  {forSale ? <><span>عرض الخطط</span><ChevronDown size={17} className={`transition ${expanded ? 'rotate-180' : ''}`} /></> : 'غير متاح للشراء حاليًا'}
                </button>

                {expanded && forSale && (
                  <div className="bb-divider mt-4 space-y-3 border-t pt-4">
                    {product.requires_customer_identifier && (
                      <label className="block">
                        <span className="bb-text-secondary mb-2 block text-xs font-bold">معرف الحساب / البريد المطلوب للتفعيل</span>
                        <input
                          value={identifiers[product.id] || ''}
                          onChange={(event) => setIdentifiers((current) => ({ ...current, [product.id]: event.target.value }))}
                          className="bb-input w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                          placeholder="أدخل بيانات الحساب المطلوبة"
                        />
                      </label>
                    )}

                    {product.store_skus.map((sku) => {
                      const meta = skuMeta(sku);
                      return (
                        <div key={sku.id} className="bb-surface-1 bb-border rounded-2xl border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="bb-text-primary font-bold">{sku.title}</div>
                              {meta && <div className="bb-text-tertiary mt-1 text-[11px]">{meta}</div>}
                            </div>
                            <strong className="bb-text-primary shrink-0 text-sm">{Number(sku.sell_price_lyd).toFixed(2)} د.ل</strong>
                          </div>
                          <button
                            type="button"
                            disabled={busySkuId !== null}
                            onClick={() => void startCheckout(product, sku)}
                            className="bb-button-secondary bb-text-accent mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--bb-accent-border)] px-3 py-2.5 text-xs font-black transition hover:bg-[var(--bb-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busySkuId === sku.id ? <><Loader2 size={15} className="animate-spin" /> جاري إنشاء الطلب...</> : <><ShoppingCart size={15} /> شراء هذه الخطة</>}
                          </button>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-2 rounded-xl border border-[var(--bb-success)] bg-[var(--bb-success-soft)] px-3 py-2 text-[10px] leading-5 text-[var(--bb-success)]">
                      <ShieldCheck size={14} className="shrink-0" />
                      السعر النهائي يُحل من قاعدة البيانات على الخادم قبل إنشاء رابط الدفع.
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
