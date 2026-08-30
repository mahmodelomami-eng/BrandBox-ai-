'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

const statusLabel = {
  CREATED: 'تم إنشاء الطلب',
  PAYMENT_PENDING: 'بانتظار الدفع',
  PAID: 'تم الدفع',
  FULFILLMENT_PENDING: 'جاري التفعيل',
  FULFILLED: 'مكتمل',
  FAILED: 'تعذر التنفيذ',
  REVIEW_REQUIRED: 'قيد المراجعة',
  CANCELLED: 'ملغي',
  REFUNDED: 'مسترد',
  PARTIALLY_REFUNDED: 'استرداد جزئي',
  ACTIVE: 'نشط',
  EXPIRED: 'منتهي',
};

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString('ar-LY'); } catch { return '—'; }
}

export default function StorePurchasesPage() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, error: '', orders: [], entitlements: [] });
  const [refundBusy, setRefundBusy] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          router.replace('/auth?next=%2Fstore%2Fpurchases');
          return;
        }

        const response = await fetch('/api/v1/store/purchases', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });

        if (response.status === 401) {
          router.replace('/auth?next=%2Fstore%2Fpurchases');
          return;
        }
        if (!response.ok) throw new Error('تعذر تحميل مشترياتك الآن.');

        const payload = await response.json();
        if (mounted) {
          setState({
            loading: false,
            error: '',
            orders: Array.isArray(payload.orders) ? payload.orders : [],
            entitlements: Array.isArray(payload.entitlements) ? payload.entitlements : [],
          });
        }
      } catch (error) {
        if (mounted) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.',
            orders: [],
            entitlements: [],
          });
        }
      }
    }

    void load();
    const orderId = new URLSearchParams(window.location.search).get('order');
    let paymentTimer;
    let attempts = 0;
    async function checkPayment() {
      if (!orderId || !mounted) return;
      attempts += 1;
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch(`/api/v1/store/payment-status?order=${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      if (!response.ok) return;
      const result = await response.json();
      if (result.state === 'completed') { setPaymentNotice('تم تأكيد الدفع وتنفيذ الطلب بنجاح.'); void load(); return; }
      if (result.state === 'failed') { setPaymentNotice('لم تكتمل عملية الدفع أو تنفيذ الطلب. راجع حالة الطلب.'); return; }
      setPaymentNotice(result.paymentConfirmed ? 'تم تأكيد الدفع، وجارٍ إكمال التفعيل.' : 'جارٍ التحقق من عملية الدفع...');
      if (attempts < 8) paymentTimer = window.setTimeout(checkPayment, 3000);
    }
    void checkPayment();
    return () => { mounted = false; if (paymentTimer) window.clearTimeout(paymentTimer); };
  }, [router]);

  async function requestRefund(orderId) {
    const reason = window.prompt('اكتب سبب طلب الاسترداد:');
    if (!reason) return;
    setRefundBusy(orderId);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return router.replace('/auth?next=%2Fstore%2Fpurchases');
      const response = await fetch('/api/v1/store/refunds', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر إرسال طلب الاسترداد.');
      window.alert('تم إرسال طلب الاسترداد للمراجعة.');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'تعذر إرسال طلب الاسترداد.');
    } finally {
      setRefundBusy('');
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-500">BRAND BOX STORE</p>
            <h1 className="mt-1 text-3xl font-black">مشترياتي</h1>
            <p className="mt-2 text-sm text-zinc-500">طلباتك وحالة الدفع والتفعيل من المصدر الفعلي.</p>
          </div>
          <Link href="/store" className="text-sm text-zinc-400 transition hover:text-white">العودة للمتجر</Link>
        </div>

        {paymentNotice && <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">{paymentNotice}</div>}
        {state.loading && <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-zinc-400">جاري تحميل المشتريات...</div>}
        {!state.loading && state.error && <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-8 text-red-300">{state.error}</div>}

        {!state.loading && !state.error && state.orders.length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
            <h2 className="text-xl font-bold">لا توجد مشتريات بعد</h2>
            <p className="mt-2 text-zinc-400">ستظهر طلباتك وعمليات التفعيل هنا بعد الشراء.</p>
            <Link href="/store" className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500">فتح المتجر</Link>
          </div>
        )}

        {!state.loading && !state.error && state.orders.length > 0 && (
          <div className="space-y-4">
            {state.orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500">{order.order_number}</p>
                    <h2 className="mt-1 font-bold">{statusLabel[order.status] || order.status}</h2>
                    <p className="mt-1 text-[11px] text-zinc-600">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-left">
                    <strong>{Number(order.total_lyd || 0).toFixed(2)} {order.currency || 'د.ل'}</strong>
                    <div className="mt-1 text-[11px] text-zinc-500">الدفع: {statusLabel[order.payment_status] || order.payment_status}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
                  {(order.store_order_items || []).map((item) => (
                    <div key={item.id} className="flex justify-between gap-4 text-sm">
                      <span className="text-zinc-300">{item.product_name_snapshot} — {item.sku_title_snapshot}</span>
                      <span className="text-zinc-500">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
                {order.payment_status === 'PAID' && ['FULFILLED', 'FULFILLMENT_PENDING', 'REVIEW_REQUIRED'].includes(order.status) && (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <button disabled={refundBusy === order.id} onClick={() => void requestRefund(order.id)} className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-red-700 hover:text-red-300 disabled:opacity-50">
                      {refundBusy === order.id ? 'جاري الإرسال...' : 'طلب استرداد'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {!state.loading && !state.error && state.entitlements.length > 0 && (
          <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-black">الخدمات والاستحقاقات المفعلة</h2>
              <p className="mt-1 text-xs text-zinc-500">نعرض الحالة والمواعيد فقط؛ بيانات التسليم الحساسة لا تُعرض هنا.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {state.entitlements.map((item) => (
                <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">{item.entitlement_type || 'خدمة رقمية'}</strong>
                    <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-300">{statusLabel[item.status] || item.status}</span>
                  </div>
                  <div className="mt-3 text-[11px] leading-6 text-zinc-500">
                    <div>البداية: {formatDate(item.starts_at)}</div>
                    <div>الانتهاء: {formatDate(item.expires_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
