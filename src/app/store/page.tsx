import Link from 'next/link';
import { Boxes, PackageCheck, ShieldCheck, ShoppingBag } from 'lucide-react';
import StoreCatalogClient from '../../components/StoreCatalogClient';
import { listStoreCatalog } from '../../lib/store/store-service';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
  const products = await listStoreCatalog();

  return (
    <main dir="rtl" className="bb-app-canvas min-h-screen">
      <section className="mx-auto max-w-7xl space-y-8 px-5 py-8 md:px-8 md:py-10">
        <div className="bb-dashboard-hero overflow-hidden rounded-[30px] border p-6 shadow-[var(--bb-shadow-md)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <div className="bb-accent-soft mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black">
                <ShoppingBag size={14} /> BRAND BOX STORE
              </div>
              <h1 className="bb-text-primary max-w-3xl text-3xl font-black tracking-tight md:text-5xl">كل خدماتك الرقمية في مكان واحد</h1>
              <p className="bb-text-secondary mt-4 max-w-2xl text-sm leading-7">
                أدوات ذكاء اصطناعي، برامج، اشتراكات، ألعاب وبطاقات رقمية مع تسعير واضح بالدينار الليبي وتفعيل مرتبط بالمصدر الفعلي.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/store/purchases" className="bb-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-black"><PackageCheck size={16} /> مشترياتي</Link>
                <Link href="/dashboard" className="bb-button-secondary inline-flex items-center rounded-xl border px-5 py-3 text-xs font-black">لوحة التحكم</Link>
              </div>
            </div>

            <div className="bb-panel grid gap-3 rounded-3xl border p-5">
              <StoreAssurance icon={<ShieldCheck className="text-[var(--bb-success)]" size={18} />} title="بيع معتمد فقط" text="لا يظهر زر شراء إلا للمنتج وSKU الجاهزين للبيع." />
              <StoreAssurance icon={<Boxes className="bb-text-accent" size={18} />} title="السعر من الخادم" text="السعر النهائي والمخزون يُعاد التحقق منهما عند إنشاء الطلب." />
              <StoreAssurance icon={<PackageCheck className="text-[var(--bb-info)]" size={18} />} title="التفعيل بعد الدفع" text="حالة الطلب والتسليم تظهر في صفحة مشترياتي بعد التأكيد." />
            </div>
          </div>
        </div>

        <div className="bb-warning-surface rounded-2xl border px-4 py-3 text-sm leading-6">
          لا يتم تفعيل أي خدمة مدفوعة إلا بعد اعتماد قناة توريد رسمية وSKU نشط. المنتجات غير المعتمدة تبقى للعرض فقط، ولا ينشأ أي طلب أو رابط دفع لها.
        </div>

        {products.length === 0 ? (
          <div className="bb-panel rounded-3xl border p-10 text-center">
            <span className="bb-accent-soft mx-auto grid h-14 w-14 place-items-center rounded-2xl border"><ShoppingBag size={24} /></span>
            <h2 className="bb-text-primary mt-4 text-xl font-bold">المتجر قيد التجهيز</h2>
            <p className="bb-text-secondary mt-2">ستظهر المنتجات هنا بعد اعتماد المورد والسعر وطريقة التفعيل.</p>
          </div>
        ) : (
          <StoreCatalogClient products={products} />
        )}
      </section>
    </main>
  );
}

function StoreAssurance({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bb-card flex items-start gap-3 rounded-2xl border p-4">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div><div className="bb-text-primary text-xs font-black">{title}</div><p className="bb-text-tertiary mt-1 text-[11px] leading-5">{text}</p></div>
    </div>
  );
}
