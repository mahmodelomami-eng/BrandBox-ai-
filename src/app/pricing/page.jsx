'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { Wallet, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const { user, creditBalance } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingPackageId, setLoadingPackageId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    let mounted = true;
    async function loadPackages() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};

        const res = await fetch('/api/v1/credit-packages', { headers });
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data.packages)) {
            setPackages(data.packages.filter((p) => p.is_active));
          }
        }
      } catch (err) {
        console.error('[PricingPage] Error fetching packages:', err);
      } finally {
        if (mounted) setLoadingPackages(false);
      }
    }

    loadPackages();
    return () => { mounted = false; };
  }, []);

  const startCheckout = async (packageId) => {
    setLoadingPackageId(packageId);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        window.location.href = `/auth?next=${encodeURIComponent('/pricing')}`;
        return;
      }

      const response = await fetch('/api/v1/ezonepay/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ itemType: 'purchase', itemId: packageId }),
      });

      const result = await response.json();
      if (!response.ok || !result.paymentUrl) {
        throw new Error(result.error || 'تعذر إنشاء رابط الدفع');
      }

      window.location.assign(result.paymentUrl);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر بدء عملية الدفع', 'error');
      setLoadingPackageId(null);
    }
  };

  const monthlyLimit = 10000;
  const usedCredits = Math.max(0, monthlyLimit - creditBalance);
  const remainingPercent = Math.min(100, (creditBalance / monthlyLimit) * 100);

  return (
    <div className="space-y-7 pb-12 max-w-6xl mx-auto p-4 sm:p-8" dir="rtl">
      {toast && (
        <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
          <span>{toast.text}</span>
        </div>
      )}

      <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> الحساب والدفع <span className="px-2">/</span> شراء رصيد</div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">شراء رصيد ونقاط</h1>
          <p className="mt-2 text-xs text-gray-400">
            اشترِ نقاطًا لتشغيل أدوات الذكاء الاصطناعي وتوليد تصاميم لا محدودة عبر محرك Ezone Pay.
          </p>
        </div>
        {user && (
          <Link
            href="/dashboard/account"
            className="rounded-xl border border-[#343846] bg-[#15171c] px-5 py-2.5 text-xs font-bold text-gray-200 transition hover:border-[#f31325]/60 hover:text-white flex items-center gap-1.5"
          >
            <span>إعدادات الحساب</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Current Balance Summary Box for logged in users */}
      {user && (
        <section className="overflow-hidden rounded-[26px] border border-[#353946] bg-[#141619] shadow-[0_24px_70px_rgba(0,0,0,.28)]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_.85fr] lg:p-10">
            <div>
              <div className="text-xs font-bold text-gray-300">رصيدك الحالي المتاح</div>
              <div className="mt-3 flex items-end gap-3">
                <strong className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                  {creditBalance.toLocaleString('ar-LY')}
                </strong>
                <span className="pb-2 text-base font-bold text-gray-400">نقطة</span>
              </div>
              <div className="mt-7 h-3 overflow-hidden rounded-full bg-[#30333b]">
                <div className="h-full rounded-full bg-[#d41b2c] transition-all" style={{ width: `${remainingPercent}%` }} />
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                {remainingPercent.toFixed(1)}% من الحد الأقصى المرجعي ({monthlyLimit.toLocaleString('ar-LY')} نقطة)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 self-center">
              <div className="rounded-2xl border border-[#30343e] bg-[#101215] p-5">
                <div className="text-xs text-gray-500">الرصيد المستخدم</div>
                <div className="mt-2 text-2xl font-black text-[#f31325]">{usedCredits.toLocaleString('ar-LY')}</div>
              </div>
              <div className="rounded-2xl border border-[#30343e] bg-[#101215] p-5">
                <div className="text-xs text-gray-500">الرصيد المتاح</div>
                <div className="mt-2 text-2xl font-black text-white">{creditBalance.toLocaleString('ar-LY')}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div>
        <h2 className="text-lg font-black text-white">اختر باقة الرصيد المناسبة</h2>
        <p className="mt-1 text-xs text-gray-500">تُضاف النقاط إلى محفظتك فور تأكيد الدفع الإلكتروني عبر Ezone Pay.</p>
      </div>

      {/* Packages Grid */}
      {loadingPackages ? (
        <div className="p-12 text-center text-xs text-gray-400">جاري تحميل الباقات المتاحة...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isBest = Boolean(pkg.is_featured);
            const bonus = Number(pkg.bonus_credits || 0);
            const totalCredits = Number(pkg.credits || pkg.purchased_credits);
            return (
              <div
                key={pkg.id}
                className={`relative flex min-h-72 flex-col justify-between rounded-[24px] border bg-[#141619] p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(0,0,0,.35)] ${
                  isBest ? 'border-[#f31325] shadow-[0_0_35px_rgba(243,19,37,.12)]' : 'border-[#343846] hover:border-[#f31325]/65'
                }`}
              >
                {isBest && (
                  <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-[#d41b2c] px-4 py-1 text-[10px] font-black text-white shadow-lg">
                    الأكثر طلبًا
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-300">
                    <Wallet className="h-5 w-5 text-[#f31325]" /> {pkg.name}
                  </div>
                  <div className="mt-7 text-center">
                    <div className="text-4xl font-black text-white">{totalCredits.toLocaleString('ar-LY')}</div>
                    <div className="mt-1 text-xs font-bold text-gray-500">نقطة</div>
                    <div className="mt-4 text-2xl font-black text-white">{Number(pkg.price_lyd).toLocaleString('ar-LY')} د.ل</div>
                    {bonus > 0 && (
                      <div className="mt-2 text-xs font-bold text-emerald-400">
                        تشمل {bonus.toLocaleString('ar-LY')} نقطة هدية
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => startCheckout(pkg.id)}
                  disabled={loadingPackageId !== null}
                  className="mt-6 w-full rounded-xl bg-[#c91a2a] py-3.5 text-xs font-black text-white transition hover:bg-[#ef2638] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingPackageId === pkg.id ? 'جاري إنشاء رابط الدفع...' : 'شراء الآن'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-[#30343e] bg-[#121417] px-5 py-4 text-xs text-gray-500 gap-2">
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>دفع آمن وفوري عبر محرك Ezone Pay</span>
        </span>
        <span>النقاط المشتراة لا تنتهي الصلاحية</span>
      </div>
    </div>
  );
}
