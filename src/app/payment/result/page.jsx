'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

export default function PaymentResultPage() {
  const params = useSearchParams();
  const order = params.get('order') || '';
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
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

        if (result.state === 'pending') {
          timer = window.setTimeout(check, 2500);
        }
      } catch (error) {
        if (active) setState({ loading: false, data: null, error: error instanceof Error ? error.message : 'تعذر التحقق من الدفع.' });
      }
    }

    if (order) void check();
    else setState({ loading: false, data: null, error: 'مرجع عملية الدفع غير موجود.' });

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [order, supabase]);

  const result = state.data;

  return <main dir="rtl" className="min-h-screen bg-[#07090d] px-4 py-16 text-white">
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-6 text-amber-200">
        Ezone Pay يعمل حاليًا في الوضع التجريبي. لا يتم إضافة النقاط أو تفعيل الاشتراك إلا بعد تأكيد الدفع من الخادم.
      </div>

      <section className="rounded-[28px] border border-white/10 bg-[#10131a] p-7 shadow-2xl sm:p-10">
        {state.loading && <div className="py-10 text-center"><Loader2 className="mx-auto animate-spin text-[#f31325]" size={34}/><h1 className="mt-5 text-2xl font-black">جاري التحقق من عملية الدفع</h1><p className="mt-2 text-sm text-gray-500">ننتظر تأكيد Ezone Pay ثم ننفذ الإضافة تلقائيًا.</p></div>}

        {!state.loading && state.error && <div className="py-8 text-center"><XCircle className="mx-auto text-red-400" size={42}/><h1 className="mt-4 text-2xl font-black">تعذر التحقق</h1><p className="mt-3 text-sm text-red-200">{state.error}</p></div>}

        {!state.loading && result?.state === 'pending' && <div className="py-8 text-center"><Clock3 className="mx-auto text-amber-300" size={42}/><h1 className="mt-4 text-2xl font-black">الدفع قيد التأكيد</h1><p className="mt-3 text-sm leading-6 text-gray-400">إذا أكملت الدفع في Ezone Pay فسيتم تحديث هذه الصفحة تلقائيًا بعد وصول التأكيد.</p></div>}

        {!state.loading && result?.state === 'failed' && <div className="py-8 text-center"><XCircle className="mx-auto text-red-400" size={42}/><h1 className="mt-4 text-2xl font-black">لم تكتمل عملية الدفع</h1><p className="mt-3 text-sm text-gray-400">لم تتم إضافة أي نقاط ولم يتم تفعيل أي اشتراك.</p></div>}

        {!state.loading && result?.state === 'completed' && <div className="py-4">
          <CheckCircle2 className="mx-auto text-emerald-400" size={48}/>
          <h1 className="mt-4 text-center text-2xl font-black">تم الدفع والتفعيل بنجاح</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4"><div className="text-[10px] text-gray-500">المبلغ المؤكد</div><div className="mt-2 text-lg font-black">{Number(result.amountLYD || 0).toLocaleString('ar-LY')} د.ل</div></div>
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4"><div className="text-[10px] text-gray-500">الرصيد الحالي</div><div className="mt-2 text-lg font-black text-emerald-300">{Number(result.newBalance || 0).toLocaleString('ar-LY')} نقطة</div></div>
          </div>
          {result.itemType === 'subscription' && result.subscription && <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">تم تفعيل اشتراك {result.subscription.plan_id} حتى {new Date(result.subscription.current_period_end).toLocaleDateString('ar-LY')}.</div>}
        </div>}

        <div className="mt-6 flex flex-wrap justify-center gap-3 border-t border-white/10 pt-5">
          <Link href="/pricing" className="rounded-xl bg-[#f31325] px-5 py-3 text-xs font-black">العودة إلى الرصيد والباقات</Link>
          <Link href="/dashboard" className="rounded-xl border border-white/10 px-5 py-3 text-xs font-black text-gray-300">لوحة التحكم</Link>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-600"><ShieldCheck size={14}/> التحقق والتنفيذ يتمان Server-side فقط.</div>
    </div>
  </main>;
}
