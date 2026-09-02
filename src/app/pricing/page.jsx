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
    <main className="bb-app-canvas min-h-[calc(100vh-5rem)]" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-10 p-4 pb-16 sm:p-8">
        {toast && (
          <div role="status" className={`fixed left-6 top-20 z-50 max-w-sm rounded-xl border px-4 py-3 text-xs shadow-[var(--bb-shadow-lg)] backdrop-blur-md ${toast.type === 'error' ? 'bb-danger-surface' : 'bg-[var(--bb-success-soft)] text-[var(--bb-success)] border-[var(--bb-success)]'}`}>
            {toast.text}
          </div>
        )}

        <div className="bb-text-tertiary text-xs">الرئيسية <span className="px-2">/</span> الحساب والدفع <span className="px-2">/</span> الباقات والرصيد</div>

        <section className="bb-dashboard-hero overflow-hidden rounded-[30px] border shadow-[var(--bb-shadow-md)]">
          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.15fr_.85fr] lg:p-12">
            <div>
              <div className="bb-accent-soft mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black">
                <Sparkles className="h-3.5 w-3.5" /> خطط مرنة لصناعة المحتوى بالذكاء الاصطناعي
              </div>
              <h1 className="bb-text-primary max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                اشتراك شهري للانطلاق، ورصيد إضافي عندما تحتاج أكثر.
              </h1>
              <p className="bb-text-secondary mt-4 max-w-2xl text-sm leading-7">
                اختر الخطة المناسبة لعدد مشاريعك وأدواتك. نقاط الخطة تُضاف بعد تأكيد الدفع من الخادم، ويمكنك شحن رصيد إضافي بشكل مستقل في أي وقت.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-[11px] font-bold">
                {['تسعير من الخادم', 'رصيد موحد لكل أدوات AI', 'تأكيد دفع ذري وآمن'].map((item) => <span key={item} className="bb-card bb-text-secondary rounded-full border px-3 py-2">{item}</span>)}
              </div>
            </div>

            <div className="bb-panel rounded-[24px] border p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="bb-text-secondary text-xs font-bold">رصيد حسابك الآن</div>
                  <div className="bb-text-primary mt-3 text-4xl font-black">
                    {user ? Number(creditBalance || 0).toLocaleString('ar-LY') : '—'}
                    <span className="bb-text-tertiary mr-2 text-sm">نقطة</span>
                  </div>
                </div>
                <div className="bb-accent-soft rounded-2xl border p-3">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <PricingMetric icon={<Gauge className="bb-text-accent h-4 w-4" />} label="الاستهلاك" value="حسب الأداة والنموذج" />
                <PricingMetric icon={<ShieldCheck className="h-4 w-4 text-[var(--bb-success)]" />} label="التفعيل" value="بعد تأكيد الدفع فقط" />
              </div>
              {user ? (
                <Link href="/dashboard/account" className="bb-text-secondary mt-5 inline-flex items-center gap-2 text-xs font-black transition hover:text-[var(--bb-text-primary)]">
                  إدارة الحساب <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <Link href="/auth?next=%2Fpricing" className="bb-text-accent mt-5 inline-flex items-center gap-2 text-xs font-black">
                  تسجيل الدخول للشراء <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="bb-text-primary text-2xl font-black">الباقات الشهرية</h2>
              <p className="bb-text-tertiary mt-1 text-xs leading-6">الأسعار والمزايا أدناه تأتي من كاتالوج المنصة الفعلي، وليست قيمًا ثابتة داخل الواجهة.</p>
            </div>
            <span className="bb-text-tertiary text-[11px] font-bold">يمكن شراء رصيد إضافي أسفل الباقات</span>
          </div>

          {loadingCatalog ? (
            <CatalogState>جاري تحميل الباقات الفعلية...</CatalogState>
          ) : plansError ? (
            <div className="bb-danger-surface rounded-2xl border p-6 text-center text-sm font-bold">{plansError}</div>
          ) : plans.length === 0 ? (
            <CatalogState>لا توجد باقات شهرية مفعّلة حاليًا.</CatalogState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => {
                const isFree = Number(plan.priceMonthlyLYD || 0) <= 0;
                const isFeatured = plan.id === 'pro';
                const checkoutKey = `subscription:${plan.id}`;
                const totalMonthlyCredits = Number(plan.monthlyCredits || 0) + Number(plan.monthlyBonusCredits || 0);
                return (
                  <article key={plan.id} className={`relative flex min-h-[470px] flex-col rounded-[26px] border p-6 transition hover:-translate-y-1 ${isFeatured ? 'bb-panel border-[var(--bb-accent)] shadow-[0_0_38px_var(--bb-accent-soft)]' : 'bb-card'}`}>
                    {isFeatured && <span className="bb-button-primary absolute -top-3 right-6 rounded-full px-4 py-1 text-[10px] font-black shadow-[var(--bb-shadow-sm)]">الأكثر توازنًا</span>}
                    <div>
                      <div className="bb-text-primary text-sm font-black">{plan.name}</div>
                      <p className="bb-text-tertiary mt-2 min-h-12 text-xs leading-6">{plan.description}</p>
                      <div className="mt-6 flex items-end gap-2">
                        <strong className="bb-text-primary text-4xl font-black">{Number(plan.priceMonthlyLYD || 0).toLocaleString('ar-LY')}</strong>
                        <span className="bb-text-tertiary pb-1.5 text-xs font-bold">د.ل / شهر</span>
                      </div>
                      <div className="bb-surface-1 bb-border mt-5 rounded-2xl border p-4">
                        <div className="bb-text-tertiary text-[11px]">رصيد الخطة الشهري</div>
                        <div className="bb-text-primary mt-1 text-xl font-black">{totalMonthlyCredits.toLocaleString('ar-LY')} نقطة</div>
                        {Number(plan.monthlyBonusCredits || 0) > 0 && <div className="mt-1 text-[10px] font-bold text-[var(--bb-success)]">منها {Number(plan.monthlyBonusCredits).toLocaleString('ar-LY')} نقطة إضافية</div>}
                      </div>
                    </div>

                    <div className="bb-text-secondary mt-6 flex-1 space-y-3 text-xs">
                      <Feature icon={<Check className="h-4 w-4 text-[var(--bb-success)]" />} text={`حتى ${Number(plan.maxProjects || 0).toLocaleString('ar-LY')} مشاريع`} />
                      <Feature icon={<Layers3 className="bb-text-accent h-4 w-4" />} text={`Brand Kit ${plan.brandKitAccess ? 'متاح' : 'غير متاح'}`} />
                      <Feature icon={<Film className="bb-text-accent h-4 w-4" />} text={`الفيديو ${plan.videoAccess ? 'متاح' : 'غير متاح'}`} />
                      <Feature icon={<BriefcaseBusiness className="bb-text-accent h-4 w-4" />} text={`الاستخدام التجاري ${plan.commercialUsage ? 'متاح' : 'غير متاح'}`} />
                      {plan.rolloverEnabled && <Feature icon={<Check className="h-4 w-4 text-[var(--bb-success)]" />} text="ترحيل الرصيد المؤهل لدورة واحدة" />}
                    </div>

                    {isFree ? (
                      user ? (
                        <button type="button" disabled className="bb-button-secondary bb-text-disabled mt-6 w-full rounded-xl border py-3.5 text-xs font-black opacity-70">الخطة المجانية</button>
                      ) : (
                        <Link href="/auth?next=%2Fpricing" className="bb-button-secondary mt-6 block w-full rounded-xl border py-3.5 text-center text-xs font-black">ابدأ مجانًا</Link>
                      )
                    ) : (
                      <button type="button" onClick={() => startCheckout('subscription', plan.id)} disabled={loadingKey !== null} className="bb-button-primary mt-6 w-full rounded-xl py-3.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">
                        {loadingKey === checkoutKey ? 'جاري إنشاء رابط الدفع...' : `اشترك في ${plan.name}`}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="bb-divider space-y-5 border-t pt-9">
          <div>
            <h2 className="bb-text-primary text-2xl font-black">تحتاج رصيدًا إضافيًا؟</h2>
            <p className="bb-text-tertiary mt-1 text-xs leading-6">اشحن نقاطًا إضافية إلى محفظتك بدون تغيير خطتك الشهرية.</p>
          </div>

          {loadingCatalog ? (
            <div className="bb-text-secondary p-10 text-center text-xs">جاري تحميل باقات الرصيد...</div>
          ) : packagesError ? (
            <div className="bb-danger-surface rounded-2xl border p-6 text-center text-sm font-bold">{packagesError}</div>
          ) : packages.length === 0 ? (
            <CatalogState>لا توجد باقات رصيد إضافي مفعّلة حاليًا.</CatalogState>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => {
                const isBest = Boolean(pkg.is_featured);
                const bonus = Number(pkg.bonus_credits || 0);
                const totalCredits = Number(pkg.credits || pkg.purchased_credits || 0);
                const checkoutKey = `purchase:${pkg.id}`;
                return (
                  <article key={pkg.id} className={`bb-card relative flex min-h-72 flex-col justify-between rounded-[24px] border p-6 transition hover:-translate-y-1 ${isBest ? 'border-[var(--bb-accent)] shadow-[0_0_35px_var(--bb-accent-soft)]' : ''}`}>
                    {isBest && <span className="bb-button-primary absolute -top-3 right-6 rounded-full px-4 py-1 text-[10px] font-black">الأكثر طلبًا</span>}
                    <div>
                      <div className="bb-text-secondary flex items-center gap-2 text-sm font-bold"><Wallet className="bb-text-accent h-5 w-5" /> {pkg.name}</div>
                      <div className="mt-7 text-center">
                        <div className="bb-text-primary text-4xl font-black">{totalCredits.toLocaleString('ar-LY')}</div>
                        <div className="bb-text-tertiary mt-1 text-xs font-bold">نقطة</div>
                        <div className="bb-text-primary mt-4 text-2xl font-black">{Number(pkg.price_lyd || 0).toLocaleString('ar-LY')} د.ل</div>
                        {bonus > 0 && <div className="mt-2 text-xs font-bold text-[var(--bb-success)]">تشمل {bonus.toLocaleString('ar-LY')} نقطة هدية</div>}
                      </div>
                    </div>
                    <button type="button" onClick={() => startCheckout('purchase', pkg.id)} disabled={loadingKey !== null} className="bb-button-secondary mt-6 w-full rounded-xl border py-3.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">
                      {loadingKey === checkoutKey ? 'جاري إنشاء رابط الدفع...' : 'إضافة رصيد'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="bb-panel bb-text-tertiary flex flex-col items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-xs sm:flex-row">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--bb-success)]" /> إنشاء الطلب وتأكيد التفعيل يتمان من الخادم</span>
          <span>لن تُضاف نقاط أو اشتراكات قبل تأكيد الدفع</span>
        </div>
      </div>
    </main>
  );
}

function PricingMetric({ icon, label, value }) {
  return <div className="bb-card rounded-2xl border p-4">{icon}<div className="bb-text-tertiary mt-3 text-[11px]">{label}</div><div className="bb-text-primary mt-1 text-xs font-black">{value}</div></div>;
}

function CatalogState({ children }) {
  return <div className="bb-panel bb-text-tertiary rounded-2xl border p-8 text-center text-sm">{children}</div>;
}

function Feature({ icon, text }) {
  return <div className="flex items-center gap-2">{icon}<span>{text}</span></div>;
}
