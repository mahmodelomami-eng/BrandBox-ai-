'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

function PaymentResultContent() {
  const params = useSearchParams();
  const order = params.get('order') || '';
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [state, setState] = useState(() => order
    ? { loading: true, data: null, error: '' }
    : { loading: false, data: null, error: 'مرجع عملية الدفع غير موجود.' });

  useEffect(() => {
    if (!order) return undefined;

    let active = true;
    let timer;

    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (active) setState({ loading: false, data: null, error: 'يجب تسجيل الدخول لعرض نتيجة الدفع.' });
          return;
        }

        const response = await fetch('/api/v1/ezonepay/status?order=' + encodeURIComponent(order), {
          headers: { Authorization: 'Bearer ' + token },
          cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'تعذر التحقق من الدفع.');

        if (!active) return;
        setState({ loading: false, data: result, error: '' });

        if (result.state === 'pending') timer = window.setTimeout(check, 2500);
      } catch (error) {
        if (active) setState({ loading: false, data: null, error: error instanceof Error ? error.message : 'تعذر التحقق من الدفع.' });
      }
    }

    void check();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [order, supabase]);

  const result = state.data;

  return <main dir="rtl" className="bb-app-canvas min-h-screen px-4 py-16">
    <div className="mx-auto max-w-2xl">
      <div className="bb-warning-surface mb-5 rounded-2xl border px-4 py-3 text-xs leading-6">
        Ezone Pay يعمل حاليًا في الوضع التجريبي. لا يتم إضافة النقاط أو تفعيل الاشتراك إلا بعد تأكيد الدفع من الخادم.
      </div>
      <section className="bb-panel rounded-[28px] border p-7 shadow-[var(--bb-shadow-md)] sm:p-10">
        {state.loading && <div className="py-10 text-center"><Loader2 className="bb-text-accent mx-auto animate-spin" size={34}/><h1 className="bb-text-primary mt-5 text-2xl font-black">جاري التحقق من عملية الدفع</h1><p className="bb-text-tertiary mt-2 text-sm">ننتظر تأكيد Ezone Pay ثم ننفذ الإضافة تلقائيًا.</p></div>}
        {!state.loading && state.error && <div className="py-8 text-center"><XCircle className="mx-auto text-[var(--bb-danger)]" size={42}/><h1 className="bb-text-primary mt-4 text-2xl font-black">تعذر التحقق</h1><p className="mt-3 text-sm text-[var(--bb-danger)]">{state.error}</p></div>}
        {!state.loading && result?.state === 'pending' && <div className="py-8 text-center"><Clock3 className="mx-auto text-[var(--bb-warning)]" size={42}/><h1 className="bb-text-primary mt-4 text-2xl font-black">الدفع قيد التأكيد</h1><p className="bb-text-secondary mt-3 text-sm leading-6">إذا أكملت الدفع في Ezone Pay فسيتم تحديث هذه الصفحة تلقائيًا بعد وصول التأكيد.</p></div>}
        {!state.loading && result?.state === 'failed' && <div className="py-8 text-center"><XCircle className="mx-auto text-[var(--bb-danger)]" size={42}/><h1 className="bb-text-primary mt-4 text-2xl font-black">لم تكتمل عملية الدفع</h1><p className="bb-text-secondary mt-3 text-sm">لم تتم إضافة أي نقاط ولم يتم تفعيل أي اشتراك.</p></div>}
        {!state.loading && result?.state === 'completed' && <div className="py-4">
          <CheckCircle2 className="mx-auto text-[var(--bb-success)]" size={48}/>
          <h1 className="bb-text-primary mt-4 text-center text-2xl font-black">تم الدفع والتفعيل بنجاح</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ResultMetric label="المبلغ المؤكد" value={`${Number(result.amountLYD || 0).toLocaleString('ar-LY')} د.ل`} />
            <ResultMetric label="الرصيد الحالي" value={`${Number(result.newBalance || 0).toLocaleString('ar-LY')} نقطة`} success />
          </div>
          {result.itemType === 'subscription' && result.subscription && <div className="mt-4 rounded-2xl border border-[var(--bb-success)] bg-[var(--bb-success-soft)] p-4 text-sm text-[var(--bb-success)]">تم تفعيل اشتراك {result.subscription.plan_id} حتى {new Date(result.subscription.current_period_end).toLocaleDateString('ar-LY')}.</div>}
        </div>}
        <div className="bb-divider mt-6 flex flex-wrap justify-center gap-3 border-t pt-5">
          <Link href="/pricing" className="bb-button-primary rounded-xl px-5 py-3 text-xs font-black">العودة إلى الرصيد والباقات</Link>
          <Link href="/dashboard" className="bb-button-secondary rounded-xl border px-5 py-3 text-xs font-black">لوحة التحكم</Link>
        </div>
      </section>
      <div className="bb-text-tertiary mt-4 flex items-center justify-center gap-2 text-[11px]"><ShieldCheck size={14}/> التحقق والتنفيذ يتمان Server-side فقط.</div>
    </div>
  </main>;
}

function ResultMetric({ label, value, success = false }) {
  return <div className="bb-card rounded-2xl border p-4"><div className="bb-text-tertiary text-[10px]">{label}</div><div className={`mt-2 text-lg font-black ${success ? 'text-[var(--bb-success)]' : 'bb-text-primary'}`}>{value}</div></div>;
}

function PaymentResultFallback() {
  return <main dir="rtl" className="bb-app-canvas grid min-h-screen place-items-center">
    <div className="bb-text-secondary flex items-center gap-3 text-sm"><Loader2 className="bb-text-accent animate-spin" size={20}/> جاري تحميل نتيجة الدفع...</div>
  </main>;
}

export default function PaymentResultPage() {
  return <Suspense fallback={<PaymentResultFallback />}><PaymentResultContent /></Suspense>;
}
