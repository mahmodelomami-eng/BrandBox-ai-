'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

const statusLabel = {
  PAYMENT_PENDING: 'بانتظار الدفع',
  FULFILLMENT_PENDING: 'جاري التفعيل',
  FULFILLED: 'مكتمل',
  FAILED: 'تعذر التنفيذ',
  REVIEW_REQUIRED: 'قيد المراجعة',
  CANCELLED: 'ملغي',
  REFUNDED: 'مسترد',
  PARTIALLY_REFUNDED: 'استرداد جزئي',
};

export default function StorePurchasesPage() {
  const [state, setState] = useState({ loading: true, error: '', orders: [], entitlements: [] });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('يجب تسجيل الدخول لعرض مشترياتك.');
        const response = await fetch('/api/v1/store/purchases', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('تعذر تحميل مشترياتك الآن.');
        const payload = await response.json();
        if (mounted) setState({ loading: false, error: '', orders: payload.orders || [], entitlements: payload.entitlements || [] });
      } catch (error) {
        if (mounted) setState({ loading: false, error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.', orders: [], entitlements: [] });
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-500">BRAND BOX STORE</p>
            <h1 className="mt-1 text-3xl font-black">مشترياتي</h1>
          </div>
          <Link href="/store" className="text-sm text-zinc-400 hover:text-white">العودة للمتجر</Link>
        </div>

        {state.loading && <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-zinc-400">جاري تحميل المشتريات...</div>}
        {!state.loading && state.error && <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-8 text-red-300">{state.error}</div>}
        {!state.loading && !state.error && state.orders.length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
            <h2 className="text-xl font-bold">لا توجد مشتريات بعد</h2>
            <p className="mt-2 text-zinc-400">ستظهر طلباتك وعمليات التفعيل هنا بعد الشراء.</p>
          </div>
        )}

        <div className="space-y-4">
          {state.orders.map((order) => (
            <article key={order.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-zinc-500">{order.order_number}</p>
                  <h2 className="mt-1 font-bold">{statusLabel[order.status] || order.status}</h2>
                </div>
                <strong>{Number(order.total_lyd).toFixed(2)} د.ل</strong>
              </div>
              <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
                {(order.store_order_items || []).map((item) => (
                  <div key={item.id} className="flex justify-between gap-4 text-sm">
                    <span className="text-zinc-300">{item.product_name_snapshot} — {item.sku_title_snapshot}</span>
                    <span className="text-zinc-500">× {item.quantity}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
