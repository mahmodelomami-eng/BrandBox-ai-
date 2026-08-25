import Link from 'next/link';
import StoreCatalogClient from '../../components/StoreCatalogClient';
import { listStoreCatalog } from '../../lib/store/store-service';

export const dynamic = 'force-dynamic';

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
          <div className="flex items-center gap-4 text-sm">
            <Link href="/store/purchases" className="font-semibold text-white transition hover:text-red-400">مشترياتي</Link>
            <Link href="/dashboard" className="text-zinc-400 transition hover:text-white">لوحة التحكم</Link>
          </div>
        </div>

        <div className="mb-7 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm leading-6 text-zinc-400">
          لا يتم تفعيل أي خدمة مدفوعة إلا بعد اعتماد قناة توريد رسمية وSKU نشط. المنتجات غير المعتمدة تبقى للعرض فقط، ولا ينشأ أي طلب أو رابط دفع لها.
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <h2 className="text-xl font-bold">المتجر قيد التجهيز</h2>
            <p className="mt-2 text-zinc-400">ستظهر المنتجات هنا بعد اعتماد المورد والسعر وطريقة التفعيل.</p>
          </div>
        ) : (
          <StoreCatalogClient products={products} />
        )}
      </section>
    </main>
  );
}
