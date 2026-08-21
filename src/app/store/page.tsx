import Link from 'next/link';
import { listStoreCatalog } from '../../lib/store/store-service';

export const dynamic = 'force-dynamic';

const modeLabel: Record<string, string> = {
  DIRECT_API: 'تفعيل آلي',
  RESELLER_API: 'تفعيل عبر موزع معتمد',
  VOUCHER_API: 'تسليم رقمي',
  BRAND_BOX_CREDITS: 'رصيد Brand Box',
  PARTNER_REQUIRED: 'قريبًا',
  CATALOG_ONLY: 'عرض فقط',
};

export default async function StorePage() {
  const products = await listStoreCatalog();

  return (
    <main dir="rtl" className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-red-500">BRAND BOX STORE</p>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">كل خدماتك الرقمية في مكان واحد</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              أدوات ذكاء اصطناعي، برامج، اشتراكات، ألعاب وبطاقات رقمية مع تسعير واضح بالدينار الليبي.
            </p>
          </div>
          <Link href="/" className="text-sm text-zinc-400 transition hover:text-white">العودة للمنصة</Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <h2 className="text-xl font-bold">المتجر قيد التجهيز</h2>
            <p className="mt-2 text-zinc-400">ستظهر المنتجات هنا بعد اعتماد المورد والسعر وطريقة التفعيل.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const forSale = product.sale_status === 'ACTIVE_FOR_SALE';
              const prices = product.store_skus.map((sku) => Number(sku.sell_price_lyd)).filter(Number.isFinite);
              const fromPrice = prices.length ? Math.min(...prices) : null;

              return (
                <article key={product.id} className="group flex min-h-72 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-zinc-700">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-xl font-black">
                      {(product.brand || product.name).slice(0, 2).toUpperCase()}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${forSale ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      {modeLabel[product.fulfillment_mode] ?? product.fulfillment_mode}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500">{product.store_categories?.name_ar ?? 'خدمات رقمية'}</p>
                  <h2 className="mt-1 text-xl font-extrabold">{product.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{product.short_description || 'خدمة رقمية ضمن Brand Box Store.'}</p>

                  <div className="mt-auto pt-6">
                    <div className="mb-4 flex items-end justify-between">
                      <span className="text-xs text-zinc-500">{fromPrice === null ? 'السعر عند التوفر' : 'يبدأ من'}</span>
                      {fromPrice !== null && <strong className="text-xl">{fromPrice.toFixed(2)} د.ل</strong>}
                    </div>
                    <button
                      type="button"
                      disabled={!forSale || product.store_skus.length === 0}
                      className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                    >
                      {forSale ? 'عرض الخطط' : 'غير متاح للشراء حاليًا'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
