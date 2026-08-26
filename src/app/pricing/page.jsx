'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, CircleHelp, Gauge, Gift, RefreshCcw, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import CreditCoin from '../../components/CreditCoin';

function PlanFeature({ children }) {
  return <div className="flex items-start gap-2 text-xs leading-6 text-gray-300"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" /> <span>{children}</span></div>;
}

export default function PricingPage() {
  const router = useRouter();
  const { user, creditBalance } = useAuth();
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingItem, setLoadingItem] = useState('');
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadError('');
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const [plansResponse, packagesResponse] = await Promise.all([
          fetch('/api/v1/plans', { cache: 'no-store' }),
          fetch('/api/v1/credit-packages', { headers, cache: 'no-store' }),
        ]);
        if (!plansResponse.ok || !packagesResponse.ok) throw new Error('تعذر تحميل الباقات الآن.');
        const [plansPayload, packagesPayload] = await Promise.all([plansResponse.json(), packagesResponse.json()]);
        if (!mounted) return;
        setPlans(Array.isArray(plansPayload.plans) ? plansPayload.plans : []);
        setPackages(Array.isArray(packagesPayload.packages) ? packagesPayload.packages.filter((item) => item.is_active) : []);
      } catch (error) {
        if (mounted) setLoadError(error instanceof Error ? error.message : 'تعذر تحميل الباقات الآن.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function startCheckout(itemType, itemId) {
    if (itemType === 'subscription' && itemId === 'free') {
      router.push(user ? '/dashboard' : '/auth?next=%2Fdashboard');
      return;
    }

    const key = `${itemType}:${itemId}`;
    setLoadingItem(key);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        router.push('/auth?next=%2Fpricing');
        return;
      }

      const response = await fetch('/api/v1/ezonepay/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ itemType, itemId }),
      });

      const result = await response.json();
      if (!response.ok || !result.paymentUrl) throw new Error(result.error || 'تعذر إنشاء رابط الدفع');
      window.location.assign(result.paymentUrl);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر بدء عملية الدفع', 'error');
      setLoadingItem('');
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-4 pb-16 pt-7 sm:p-8" dir="rtl">
      {toast && (
        <div className={`fixed left-6 top-24 z-50 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${toast.type === 'error' ? 'border-red-500/50 bg-[#121520] text-red-200' : 'border-emerald-500/50 bg-[#121520] text-emerald-200'}`}>
          {toast.text}
        </div>
      )}

      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.13),transparent_35%),#0d1018] p-6 sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black tracking-widest text-amber-300">BRAND BOX CREDIT</div>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">اشتراكك ورصيدك بدون غموض</h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-gray-400">الاشتراك يحدد مزايا حسابك وكمية Credit الشهرية. أما Top-up فهو Credit إضافي مستقل يبقى في محفظتك حتى بعد انتهاء الاشتراك.</p>
          </div>
          <Link href="/help" className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/[.06] px-5 py-3 text-xs font-black text-amber-100 transition hover:bg-amber-400/10">
            <CircleHelp size={17} /> اقرأ دليل Credit والترحيل
          </Link>
        </div>
        <div className="mt-6 rounded-2xl border border-white/[.07] bg-black/20 px-4 py-3 text-xs leading-6 text-gray-500">
          تسعير Pilot v1 للاختبار والمعايرة قبل الإطلاق النهائي. تكلفة أدوات AI نفسها تُحسب ديناميكيًا بحسب النموذج والتكلفة الفعلية وسياسة الحماية المالية.
        </div>
      </section>

      {user && (
        <section className="grid gap-4 rounded-[26px] border border-white/10 bg-[#0d1018] p-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="text-xs font-bold text-gray-400">محفظتك الحالية</div>
            <div className="mt-4"><CreditCoin value={creditBalance || 0} className="px-4 py-2 text-base" /></div>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-gray-500">يُستهلك Credit الأقرب للانتهاء أولًا، ويُترك Credit المشتَرى غير المنتهي للنهاية لحماية رصيدك المدفوع.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[.08] bg-[#11141a] p-4"><Gauge className="h-5 w-5 text-amber-300" /><div className="mt-3 text-xs text-gray-500">أقل تكلفة عملية</div><div className="mt-1 text-sm font-black text-white">1 Credit</div></div>
            <div className="rounded-2xl border border-white/[.08] bg-[#11141a] p-4"><RefreshCcw className="h-5 w-5 text-amber-300" /><div className="mt-3 text-xs text-gray-500">ترحيل الاشتراك</div><div className="mt-1 text-sm font-black text-white">دورة واحدة</div></div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-xs font-black text-[#ff3344]">01 — MONTHLY PLANS</div><h2 className="mt-1 text-2xl font-black text-white">الباقات الشهرية</h2></div>
          <p className="text-xs text-gray-500">التجديد يضيف مخصص الشهر الجديد ويطبق قواعد الترحيل تلقائيًا.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d1018] p-10 text-center text-sm text-gray-500">جاري تحميل الباقات...</div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/[.06] p-6 text-center text-sm font-bold text-red-300">{loadError}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const paid = Number(plan.priceMonthlyLYD || 0) > 0;
              const featured = plan.id === 'pro';
              const checkoutKey = `subscription:${plan.id}`;
              return (
                <article key={plan.id} className={`relative flex min-h-[430px] flex-col rounded-[26px] border bg-[#0d1018] p-6 ${featured ? 'border-[#f31325]/70 shadow-[0_0_40px_rgba(243,19,37,.10)]' : 'border-white/10'}`}>
                  {featured && <span className="absolute -top-3 right-5 rounded-full bg-[#f31325] px-4 py-1 text-[10px] font-black">الأكثر توازنًا</span>}
                  <div className="text-sm font-black text-white">{plan.name}</div>
                  <p className="mt-2 min-h-12 text-xs leading-6 text-gray-500">{plan.description}</p>
                  <div className="mt-5"><span className="text-3xl font-black">{Number(plan.priceMonthlyLYD || 0).toLocaleString('ar-LY')}</span><span className="mr-1 text-xs font-bold text-gray-500">د.ل / شهر</span></div>
                  <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-400/[.04] p-4"><div className="text-[10px] text-gray-500">يشمل شهريًا</div><div className="mt-2"><CreditCoin value={plan.monthlyCredits || 0} /></div></div>
                  <div className="mt-5 space-y-2.5">
                    <PlanFeature>حتى {Number(plan.maxProjects || 0).toLocaleString('ar-LY')} مشروع</PlanFeature>
                    {plan.brandKitAccess && <PlanFeature>Brand Kit</PlanFeature>}
                    {plan.commercialUsage && <PlanFeature>استخدام تجاري للمخرجات وفق الشروط</PlanFeature>}
                    {plan.videoAccess && <PlanFeature>الوصول إلى أدوات الفيديو عند تفعيلها</PlanFeature>}
                    {plan.rolloverEnabled ? <PlanFeature>ترحيل حتى {plan.rolloverCapPct}% لدورة واحدة</PlanFeature> : <PlanFeature>لا يوجد ترحيل في الخطة المجانية</PlanFeature>}
                    {paid && <PlanFeature>مهلة تجديد {plan.renewalGraceDays || 7} أيام لحفظ حق الترحيل</PlanFeature>}
                  </div>
                  <button type="button" onClick={() => startCheckout('subscription', plan.id)} disabled={Boolean(loadingItem)} className={`mt-auto w-full rounded-xl py-3.5 text-xs font-black transition disabled:opacity-50 ${featured ? 'bg-[#f31325] text-white hover:bg-[#ff2637]' : 'border border-white/15 bg-white/[.03] text-white hover:border-[#f31325]/40'}`}>
                    {loadingItem === checkoutKey ? 'جاري إنشاء رابط الدفع...' : paid ? 'اشترك الآن' : 'ابدأ مجانًا'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="pt-3">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-xs font-black text-amber-300">02 — TOP-UP CREDIT</div><h2 className="mt-1 text-2xl font-black text-white">شراء Credit إضافي</h2></div>
          <p className="text-xs text-gray-500">Credit المدفوع لا ينتهي بانتهاء الاشتراك. الهدية فقط لها مدة صلاحية معلنة.</p>
        </div>

        {!loading && !loadError && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {packages.map((pkg) => {
              const bonus = Number(pkg.bonus_credits || 0);
              const purchased = Number(pkg.purchased_credits || (Number(pkg.credits || 0) - bonus));
              const total = Number(pkg.credits || purchased + bonus);
              const isBest = Boolean(pkg.is_featured);
              const checkoutKey = `purchase:${pkg.id}`;
              return (
                <article key={pkg.id} className={`relative flex min-h-[330px] flex-col rounded-[24px] border bg-[#0d1018] p-5 ${isBest ? 'border-amber-300/45 shadow-[0_0_35px_rgba(245,158,11,.08)]' : 'border-white/10'}`}>
                  {isBest && <span className="absolute -top-3 right-5 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-black">أفضل قيمة</span>}
                  <WalletCards className="h-5 w-5 text-amber-300" />
                  <div className="mt-4 text-xs font-black text-gray-400">{pkg.name}</div>
                  <div className="mt-5"><CreditCoin value={total} /></div>
                  <div className="mt-5 text-2xl font-black text-white">{Number(pkg.price_lyd || 0).toLocaleString('ar-LY')} د.ل</div>
                  <div className="mt-4 space-y-2 text-[11px] leading-5 text-gray-500">
                    <div>{purchased.toLocaleString('ar-LY')} Credit مدفوع — لا ينتهي بانتهاء الاشتراك</div>
                    {bonus > 0 ? <div className="flex items-start gap-1.5 text-emerald-400"><Gift size={13} className="mt-0.5 shrink-0" /> +{bonus.toLocaleString('ar-LY')} Credit هدية — صلاحية {Number(pkg.bonus_valid_days || 60)} يومًا</div> : <div>بدون هدية؛ كل الرصيد مدفوع</div>}
                  </div>
                  <button type="button" onClick={() => startCheckout('purchase', pkg.id)} disabled={Boolean(loadingItem)} className="mt-auto w-full rounded-xl bg-amber-400 py-3 text-xs font-black text-black transition hover:bg-amber-300 disabled:opacity-50">
                    {loadingItem === checkoutKey ? 'جاري إنشاء رابط الدفع...' : 'اشحن Credit'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0d1018] p-5"><RefreshCcw className="h-5 w-5 text-amber-300" /><div className="mt-3 text-sm font-black">قاعدة الترحيل</div><p className="mt-2 text-xs leading-6 text-gray-500">Credit الاشتراك غير المستخدم يترحل لدورة واحدة فقط عند التجديد، وبحد الخطة. الرصيد المرحل لا يترحل مرة ثانية.</p></div>
        <div className="rounded-2xl border border-white/10 bg-[#0d1018] p-5"><Gift className="h-5 w-5 text-amber-300" /><div className="mt-3 text-sm font-black">حد الهدايا</div><p className="mt-2 text-xs leading-6 text-gray-500">السقف النظامي لدينا 20% من Credit المدفوع. عروض Pilot الحالية لا تتجاوز 15%، وتظهر صلاحية الهدية قبل الدفع.</p></div>
        <div className="rounded-2xl border border-white/10 bg-[#0d1018] p-5"><ShieldCheck className="h-5 w-5 text-emerald-400" /><div className="mt-3 text-sm font-black">تأكيد الخادم</div><p className="mt-2 text-xs leading-6 text-gray-500">لا يضاف الاشتراك أو Credit إلا بعد تأكيد الدفع من الخادم. وفشل توليد AI المؤكد يعيد Credit المحجوز تلقائيًا.</p></div>
      </section>

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d1018] px-5 py-4 text-xs text-gray-500 sm:flex-row">
        <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300" /> تكلفة كل أداة تُعرض قبل التنفيذ قدر الإمكان.</span>
        <div className="flex gap-4"><Link href="/help" className="font-black text-gray-300 hover:text-white">دليل الاستخدام</Link><Link href="/terms" className="font-black text-gray-300 hover:text-white">الشروط</Link><Link href="/privacy" className="font-black text-gray-300 hover:text-white">الخصوصية</Link></div>
      </div>
    </main>
  );
}
