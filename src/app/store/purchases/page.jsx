'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Clock3, KeyRound, PackageCheck, RefreshCw, RotateCcw, ShieldCheck, ShoppingBag } from 'lucide-react';
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

function statusSurface(status) {
  if (['FULFILLED', 'PAID', 'ACTIVE'].includes(status)) return 'border-[var(--bb-success)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]';
  if (['FAILED', 'CANCELLED'].includes(status)) return 'border-[var(--bb-danger)] bg-[var(--bb-danger-soft)] text-[var(--bb-danger)]';
  if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(status)) return 'border-[var(--bb-info)] bg-[var(--bb-info-soft)] text-[var(--bb-info)]';
  return 'border-[var(--bb-warning)] bg-[var(--bb-warning-soft)] text-[var(--bb-warning)]';
}

export default function StorePurchasesPage() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, error: '', orders: [], entitlements: [] });
  const [refundBusy, setRefundBusy] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [delivery, setDelivery] = useState({ busy: '', error: '', entitlementId: '', payload: null });

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

  async function revealDelivery(entitlementId) {
    setDelivery({ busy: entitlementId, error: '', entitlementId: '', payload: null });
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return router.replace('/auth?next=%2Fstore%2Fpurchases');
      const response = await fetch(`/api/v1/store/delivery?entitlement=${encodeURIComponent(entitlementId)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error('تعذر فتح بيانات التسليم.');
      setDelivery({ busy: '', error: '', entitlementId, payload: payload.entitlement?.delivery || {} });
    } catch (error) {
      setDelivery({ busy: '', error: error instanceof Error ? error.message : 'تعذر فتح بيانات التسليم.', entitlementId: '', payload: null });
    }
  }

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

  const paymentNoticeFailed = paymentNotice.startsWith('لم تكتمل');

  return (
    <main dir="rtl" className="bb-app-canvas min-h-screen">
      <section className="mx-auto max-w-5xl space-y-6 px-5 py-8 md:px-8 md:py-10">
        <header className="bb-dashboard-hero rounded-[28px] border p-6 shadow-[var(--bb-shadow-sm)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black"><ShoppingBag size={14} /> BRAND BOX STORE</div>
              <h1 className="bb-text-primary mt-4 text-3xl font-black">مشترياتي</h1>
              <p className="bb-text-secondary mt-2 text-sm leading-6">طلباتك وحالة الدفع والتفعيل والاستحقاقات من المصدر الفعلي.</p>
            </div>
            <Link href="/store" className="bb-button-secondary inline-flex items-center justify-center rounded-xl border px-5 py-3 text-xs font-black">العودة للمتجر</Link>
          </div>
        </header>

        {paymentNotice && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${paymentNoticeFailed ? 'bb-danger-surface' : 'border-[var(--bb-success)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]'}`}>{paymentNotice}</div>}
        {state.loading && <div className="bb-panel bb-text-secondary flex items-center gap-3 rounded-3xl border p-8"><RefreshCw className="bb-text-accent animate-spin" size={18} /> جاري تحميل المشتريات...</div>}
        {!state.loading && state.error && <div className="bb-danger-surface rounded-3xl border p-8" role="alert">{state.error}</div>}

        {!state.loading && !state.error && state.orders.length === 0 && (
          <div className="bb-panel rounded-3xl border p-8 text-center">
            <span className="bb-accent-soft mx-auto grid h-14 w-14 place-items-center rounded-2xl border"><PackageCheck size={24} /></span>
            <h2 className="bb-text-primary mt-4 text-xl font-bold">لا توجد مشتريات بعد</h2>
            <p className="bb-text-secondary mt-2">ستظهر طلباتك وعمليات التفعيل هنا بعد الشراء.</p>
            <Link href="/store" className="bb-button-primary mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-bold">فتح المتجر</Link>
          </div>
        )}

        {!state.loading && !state.error && state.orders.length > 0 && (
          <section className="space-y-4">
            <div><h2 className="bb-text-primary text-lg font-black">الطلبات</h2><p className="bb-text-tertiary mt-1 text-xs">السعر وحالة الدفع وحالة التنفيذ كما سجلها الخادم.</p></div>
            {state.orders.map((order) => (
              <article key={order.id} className="bb-card rounded-3xl border p-5 shadow-[var(--bb-shadow-sm)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="bb-text-tertiary font-mono text-xs">{order.order_number}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h3 className="bb-text-primary font-bold">{statusLabel[order.status] || order.status}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusSurface(order.status)}`}>{statusLabel[order.status] || order.status}</span>
                    </div>
                    <p className="bb-text-tertiary mt-1 flex items-center gap-1 text-[11px]"><Clock3 size={11} /> {formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-left">
                    <strong className="bb-text-primary">{Number(order.total_lyd || 0).toFixed(2)} {order.currency || 'د.ل'}</strong>
                    <div className="bb-text-tertiary mt-1 text-[11px]">الدفع: {statusLabel[order.payment_status] || order.payment_status}</div>
                  </div>
                </div>
                <div className="bb-divider mt-4 space-y-2 border-t pt-4">
                  {(order.store_order_items || []).map((item) => (
                    <div key={item.id} className="flex justify-between gap-4 text-sm">
                      <span className="bb-text-secondary">{item.product_name_snapshot} — {item.sku_title_snapshot}</span>
                      <span className="bb-text-tertiary">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
                {order.payment_status === 'PAID' && ['FULFILLED', 'FULFILLMENT_PENDING', 'REVIEW_REQUIRED'].includes(order.status) && (
                  <div className="bb-divider mt-4 border-t pt-4">
                    <button disabled={refundBusy === order.id} onClick={() => void requestRefund(order.id)} className="bb-button-secondary bb-text-secondary inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition hover:border-[var(--bb-danger)] hover:text-[var(--bb-danger)] disabled:opacity-50">
                      <RotateCcw size={14} /> {refundBusy === order.id ? 'جاري الإرسال...' : 'طلب استرداد'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {!state.loading && !state.error && state.entitlements.length > 0 && (
          <section className="bb-panel rounded-3xl border p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="bb-accent-soft grid h-10 w-10 shrink-0 place-items-center rounded-xl border"><KeyRound size={18} /></span>
              <div><h2 className="bb-text-primary text-lg font-black">الخدمات والاستحقاقات المفعلة</h2><p className="bb-text-secondary mt-1 text-xs leading-6">نعرض الحالة والمواعيد أولًا؛ بيانات التسليم الحساسة تُجلب فقط عند طلبك لها.</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {state.entitlements.map((item) => (
                <div key={item.id} className="bb-card rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="bb-text-primary text-sm">{item.entitlement_type || 'خدمة رقمية'}</strong>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusSurface(item.status)}`}>{statusLabel[item.status] || item.status}</span>
                  </div>
                  <div className="bb-text-tertiary mt-3 text-[11px] leading-6">
                    <div>البداية: {formatDate(item.starts_at)}</div>
                    <div>الانتهاء: {formatDate(item.expires_at)}</div>
                  </div>
                  {item.status === 'ACTIVE' && ['VOUCHER','CREDITS'].includes(item.entitlement_type) && <button onClick={() => void revealDelivery(item.id)} disabled={delivery.busy === item.id} className="bb-button-secondary bb-text-accent mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--bb-accent-border)] px-3 py-2 text-[11px] font-bold disabled:opacity-50"><ShieldCheck size={13} /> {delivery.busy === item.id ? 'جاري الفتح...' : item.entitlement_type === 'VOUCHER' ? 'عرض بيانات التسليم' : 'عرض تفاصيل الرصيد'}</button>}
                  {delivery.entitlementId === item.id && delivery.payload && <div className="bb-surface-2 bb-border bb-text-primary mt-3 rounded-xl border p-3 text-xs"><div className="bb-text-tertiary mb-2 flex items-center gap-1 text-[10px]"><ShieldCheck size={11} /> بيانات تسليم مطلوبة صراحة</div>{Array.isArray(delivery.payload.codes) && delivery.payload.codes.map((code, index) => <div key={index} dir="ltr" className="break-all font-mono">{String(code)}</div>)}{delivery.payload.credits_granted != null && <div>تمت إضافة {String(delivery.payload.credits_granted)} نقطة — الرصيد الجديد {String(delivery.payload.new_balance ?? '—')}</div>}</div>}
                </div>
              ))}
            </div>
            {delivery.error && <div className="bb-danger-surface mt-3 rounded-xl border px-3 py-2 text-xs" role="alert">{delivery.error}</div>}
          </section>
        )}
      </section>
    </main>
  );
}
