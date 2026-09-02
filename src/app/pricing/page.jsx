'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Film,
  Gauge,
  Layers3,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';

function checkoutErrorMessage(code) {
  if (code === 'PAYMENT_PROFILE_INCOMPLETE') return 'أكمل الاسم ورقم الهاتف في إعدادات الحساب قبل بدء الدفع.';
  if (code === 'ITEM_NOT_FOUND') return 'هذه الباقة غير متاحة حاليًا.';
  if (code === 'ITEM_NOT_PAYABLE') return 'هذه الباقة لا تحتاج إلى دفع.';
  if (code === 'EZONEPAY_API_KEY_MISSING' || code === 'EZONEPAY_API_BASE_URL_MISSING') return 'بوابة الدفع غير مهيأة حاليًا.';
  if (code === 'EZONEPAY_UPSTREAM_UNAVAILABLE') return 'بوابة الدفع غير متاحة مؤقتًا. حاول لاحقًا.';
  return 'تعذر بدء عملية الدفع الآن.';
}

export default function PricingPage() {
  const router = useRouter();
  const { user, creditBalance } = useAuth();
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingKey, setLoadingKey] = useState(null);
  const [plansError, setPlansError] = useState('');
  const [packagesError, setPackagesError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};

        const [plansResult, packagesResult] = await Promise.allSettled([
          fetch('/api/v1/plans', { cache: 'no-store' }),
          fetch('/api/v1/credit-packages', { headers, cache: 'no-store' }),
        ]);

        if (plansResult.status === 'fulfilled' && plansResult.value.ok) {
          const data = await plansResult.value.json();
          if (mounted) setPlans(Array.isArray(data.plans) ? data.plans : []);
        } else if (mounted) {
          setPlansError('تعذر تحميل الباقات الشهرية من الخادم الآن.');
        }

        if (packagesResult.status === 'fulfilled' && packagesResult.value.ok) {
          const data = await packagesResult.value.json();
          if (mounted) setPackages(Array.isArray(data.packages) ? data.packages.filter((item) => item.is_active) : []);
        } else if (mounted) {
          setPackagesError('تعذر تحميل باقات الرصيد الإضافي الآن.');
        }
      } catch {
        if (mounted) {
          setPlansError('تعذر تحميل الباقات الشهرية من الخادم الآن.');
          setPackagesError('تعذر تحميل باقات الرصيد الإضافي الآن.');
        }
      } finally {
        if (mounted) setLoadingCatalog(false);
      }
    }

    void loadCatalog();
    return () => { mounted = false; };
  }, []);

  const startCheckout = async (itemType, itemId) => {
    const checkoutKey = `${itemType}:${itemId}`;
    setLoadingKey(checkoutKey);

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

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.paymentUrl) {
        if (result.error === 'PAYMENT_PROFILE_INCOMPLETE') {
          showToast(checkoutErrorMessage(result.error), 'error');
          window.setTimeout(() => router.push('/dashboard/account'), 900);
          return;
        }
        throw new Error(result.error || 'EZONEPAY_CHECKOUT_FAILED');
      }

      window.location.assign(result.paymentUrl);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'EZONEPAY_CHECKOUT_FAILED';
      showToast(checkoutErrorMessage(code), 'error');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-10 p-4 pb-16 sm:p-8">
        {toast && (
          <div className={`fixed left-6 top-20 z-50 max-w-sm rounded-xl border px-4 py-3 text-xs shadow-2xl backdrop-blur-md ${toast.type === 'error' ? 'border-red-500/50 bg-[#121520] text-red-200' : 'border-emerald-500/50 bg-[#121520] text-emerald-200'}`}>
            {toast.text}
          </div>
        )}

        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> الحساب والدفع <span className="px-2">/</span> الباقات والرصيد</div>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_15%_20%,rgba(243,19,37,.18),transparent_34%),linear-gradient(145deg,#17191e,#0b0c0f_62%)] shadow-[0_28px_90px_rgba(0,0,0,.38)]">
          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.15fr_.85fr] lg:p-12">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f31325]/30 bg-[#f31325]/10 px-3 py-1.5 text-[11px] font-black text-red-200">
                <Sparkles className="h-3.5 w-3.5" /> خطط مرنة لصناعة المحتوى بالذكاء الاصطناعي
              </div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
                اشتراك شهري للانطلاق، ورصيد إضافي عندما تحتاج أكثر.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                اختر الخطة المناسبة لعدد مشاريعك وأدواتك. نقاط الخطة تُضاف بعد تأكيد الدفع من الخادم، ويمكنك شحن رصيد إضافي بشكل مستقل في أي وقت.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-[11px] font-bold text-gray-300">
                <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">تسعير من الخادم</span>
                <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">رصيد موحد لكل أدوات AI</span>
                <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">تأكيد دفع ذري وآمن</span>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/25 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-gray-400">رصيد حسابك الآن</div>
                  <div className="mt-3 text-4xl font-black text-white">
                    {user ? Number(creditBalance || 0).toLocaleString('ar-LY') : '—'}
                    <span className="mr-2 text-sm text-gray-500">نقطة</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#f31325]/25 bg-[#f31325]/10 p-3">
                  <Wallet className="h-6 w-6 text-[#ff3345]" />
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
                  <Gauge className="h-4 w-4 text-[#f31325]" />
                  <div className="mt-3 text-[11px] text-gray-500">الاستهلاك</div>
                  <div className="mt-1 text-xs font-black text-white">حسب الأداة والنموذج</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <div className="mt-3 text-[11px] text-gray-500">التفعيل</div>
                  <div className="mt-1 text-xs font-black text-white">بعد تأكيد الدفع فقط</div>
                </div>
              </div>
              {user ? (
                <Link href="/dashboard/account" className="mt-5 inline-flex items-center gap-2 text-xs font-black text-gray-300 transition hover:text-white">
                  إدارة الحساب <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <Link href="/auth?next=%2Fpricing" className="mt-5 inline-flex items-center gap-2 text-xs font-black text-red-300 transition hover:text-white">
                  تسجيل الدخول للشراء <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">الباقات الشهرية</h2>
              <p className="mt-1 text-xs leading-6 text-gray-500">الأسعار والمزايا أدناه تأتي من كاتالوج المنصة الفعلي، وليست قيمًا ثابتة داخل الواجهة.</p>
            </div>
            <span className="text-[11px] font-bold text-gray-600">يمكن شراء رصيد إضافي أسفل الباقات</span>
          </div>

          {loadingCatalog ? (
            <div className="rounded-2xl border border-white/10 bg-[#111318] p-12 text-center text-xs text-gray-400">جاري تحميل الباقات الفعلية...</div>
          ) : plansError ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/[.06] p-6 text-center text-sm font-bold text-red-300">{plansError}</div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#111318] p-8 text-center text-sm text-gray-500">لا توجد باقات شهرية مفعّلة حاليًا.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => {
                const isFree = Number(plan.priceMonthlyLYD || 0) <= 0;
                const isFeatured = plan.id === 'pro';
                const checkoutKey = `subscription:${plan.id}`;
                const totalMonthlyCredits = Number(plan.monthlyCredits || 0) + Number(plan.monthlyBonusCredits || 0);
                return (
                  <article
                    key={plan.id}
                    className={`relative flex min-h-[470px] flex-col rounded-[26px] border p-6 transition hover:-translate-y-1 ${isFeatured ? 'border-[#f31325] bg-[linear-gradient(180deg,rgba(243,19,37,.10),#121419_28%)] shadow-[0_0_38px_rgba(243,19,37,.12)]' : 'border-[#30343e] bg-[#121419] hover:border-[#f31325]/45'}`}
                  >
                    {isFeatured && (
                      <span className="absolute -top-3 right-6 rounded-full bg-[#d41b2c] px-4 py-1 text-[10px] font-black text-white shadow-lg">الأكثر توازنًا</span>
                    )}
                    <div>
                      <div className="text-sm font-black text-white">{plan.name}</div>
                      <p className="mt-2 min-h-12 text-xs leading-6 text-gray-500">{plan.description}</p>
                      <div className="mt-6 flex items-end gap-2">
                        <strong className="text-4xl font-black text-white">{Number(plan.priceMonthlyLYD || 0).toLocaleString('ar-LY')}</strong>
                        <span className="pb-1.5 text-xs font-bold text-gray-500">د.ل / شهر</span>
                      </div>
                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-[11px] text-gray-500">رصيد الخطة الشهري</div>
                        <div className="mt-1 text-xl font-black text-white">{totalMonthlyCredits.toLocaleString('ar-LY')} نقطة</div>
                        {Number(plan.monthlyBonusCredits || 0) > 0 && (
                          <div className="mt-1 text-[10px] font-bold text-emerald-400">منها {Number(plan.monthlyBonusCredits).toLocaleString('ar-LY')} نقطة إضافية</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex-1 space-y-3 text-xs text-gray-300">
                      <div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> حتى {Number(plan.maxProjects || 0).toLocaleString('ar-LY')} مشاريع</div>
                      <div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-[#ff3345]" /> Brand Kit {plan.brandKitAccess ? 'متاح' : 'غير متاح'}</div>
                      <div className="flex items-center gap-2"><Film className="h-4 w-4 text-[#ff3345]" /> الفيديو {plan.videoAccess ? 'متاح' : 'غير متاح'}</div>
                      <div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-[#ff3345]" /> الاستخدام التجاري {plan.commercialUsage ? 'متاح' : 'غير متاح'}</div>
                      {plan.rolloverEnabled && (
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> ترحيل الرصيد المؤهل لدورة واحدة</div>
                      )}
                    </div>

                    {isFree ? (
                      user ? (
                        <button type="button" disabled className="mt-6 w-full rounded-xl border border-white/10 bg-white/[.04] py-3.5 text-xs font-black text-gray-500">الخطة المجانية</button>
                      ) : (
                        <Link href="/auth?next=%2Fpricing" className="mt-6 block w-full rounded-xl border border-white/15 bg-white/[.06] py-3.5 text-center text-xs font-black text-white transition hover:border-[#f31325]/50">ابدأ مجانًا</Link>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => startCheckout('subscription', plan.id)}
                        disabled={loadingKey !== null}
                        className="mt-6 w-full rounded-xl bg-[#c91a2a] py-3.5 text-xs font-black text-white transition hover:bg-[#ef2638] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loadingKey === checkoutKey ? 'جاري إنشاء رابط الدفع...' : `اشترك في ${plan.name}`}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-5 border-t border-white/10 pt-9">
          <div>
            <h2 className="text-2xl font-black text-white">تحتاج رصيدًا إضافيًا؟</h2>
            <p className="mt-1 text-xs leading-6 text-gray-500">اشحن نقاطًا إضافية إلى محفظتك بدون تغيير خطتك الشهرية.</p>
          </div>

          {loadingCatalog ? (
            <div className="p-10 text-center text-xs text-gray-400">جاري تحميل باقات الرصيد...</div>
          ) : packagesError ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/[.06] p-6 text-center text-sm font-bold text-red-300">{packagesError}</div>
          ) : packages.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#121417] p-8 text-center text-sm text-gray-500">لا توجد باقات رصيد إضافي مفعّلة حاليًا.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => {
                const isBest = Boolean(pkg.is_featured);
                const bonus = Number(pkg.bonus_credits || 0);
                const totalCredits = Number(pkg.credits || pkg.purchased_credits || 0);
                const checkoutKey = `purchase:${pkg.id}`;
                return (
                  <article key={pkg.id} className={`relative flex min-h-72 flex-col justify-between rounded-[24px] border bg-[#141619] p-6 transition hover:-translate-y-1 ${isBest ? 'border-[#f31325] shadow-[0_0_35px_rgba(243,19,37,.12)]' : 'border-[#343846] hover:border-[#f31325]/65'}`}>
                    {isBest && <span className="absolute -top-3 right-6 rounded-full bg-[#d41b2c] px-4 py-1 text-[10px] font-black text-white">الأكثر طلبًا</span>}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-300"><Wallet className="h-5 w-5 text-[#f31325]" /> {pkg.name}</div>
                      <div className="mt-7 text-center">
                        <div className="text-4xl font-black text-white">{totalCredits.toLocaleString('ar-LY')}</div>
                        <div className="mt-1 text-xs font-bold text-gray-500">نقطة</div>
                        <div className="mt-4 text-2xl font-black text-white">{Number(pkg.price_lyd || 0).toLocaleString('ar-LY')} د.ل</div>
                        {bonus > 0 && <div className="mt-2 text-xs font-bold text-emerald-400">تشمل {bonus.toLocaleString('ar-LY')} نقطة هدية</div>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startCheckout('purchase', pkg.id)}
                      disabled={loadingKey !== null}
                      className="mt-6 w-full rounded-xl border border-white/10 bg-white/[.06] py-3.5 text-xs font-black text-white transition hover:border-[#f31325]/55 hover:bg-[#f31325]/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingKey === checkoutKey ? 'جاري إنشاء رابط الدفع...' : 'إضافة رصيد'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#30343e] bg-[#121417] px-5 py-4 text-xs text-gray-500 sm:flex-row">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> إنشاء الطلب وتأكيد التفعيل يتمان من الخادم</span>
          <span>لن تُضاف نقاط أو اشتراكات قبل تأكيد الدفع</span>
        </div>
      </div>
    </main>
  );
}
