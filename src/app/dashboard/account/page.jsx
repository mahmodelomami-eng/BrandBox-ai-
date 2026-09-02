'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';
import {
  CalendarDays,
  CreditCard,
  History,
  Save,
  User,
  Wallet,
} from 'lucide-react';

export default function AccountSettingsPage() {
  const { user, profile, roleLabel, creditBalance, refreshProfile, loading } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loadingTx, setLoadingTx] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth?next=%2Fdashboard%2Faccount');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!profile) return undefined;

    const timer = window.setTimeout(() => {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }, 0);

    return () => window.clearTimeout(timer);
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    async function loadAccountData() {
      if (!user?.id) return;
      const supabase = createBrowserSupabaseClient();

      try {
        const { data, error } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (mounted) setTransactions(data || []);
      } catch (err) {
        console.error('[AccountPage] Error loading transactions:', err);
      } finally {
        if (mounted) setLoadingTx(false);
      }

      try {
        const { data: activeSubscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('id,plan_id,status,current_period_start,current_period_end')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscriptionError) throw subscriptionError;

        const planId = activeSubscription?.plan_id || 'free';
        const { data: planRow, error: planError } = await supabase
          .from('plans')
          .select('id,name,price_monthly_lyd,monthly_credits,max_projects,video_access,commercial_usage')
          .eq('id', planId)
          .eq('is_active', true)
          .maybeSingle();

        if (planError) throw planError;
        if (mounted) {
          setSubscription(activeSubscription || null);
          setPlan(planRow || null);
        }
      } catch (err) {
        console.error('[AccountPage] Error loading subscription:', err);
      } finally {
        if (mounted) setLoadingPlan(false);
      }
    }

    void loadAccountData();
    return () => { mounted = false; };
  }, [user?.id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      return showToast('يرجى إدخال الاسم الأول واسم العائلة', 'error');
    }

    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.rpc('update_own_profile', {
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_phone: phone.trim() || null,
        p_avatar_url: profile?.avatar_url || '',
      });

      if (error) throw error;

      await refreshProfile();
      showToast('تم حفظ بيانات الحساب بنجاح!', 'success');
    } catch (err) {
      showToast(err?.message || 'تعذر حفظ البيانات', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
        <div className="flex min-h-[65vh] items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#FF2E4C] border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!user) return null;

  const planName = plan?.name ? String(plan.name).replace(/\s*\([^)]*\)\s*$/, '') : subscription ? subscription.plan_id : 'المجانية';
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-gray-100 font-sans selection:bg-[#FF2E4C] selection:text-white">
      <div className="mx-auto max-w-[1720px] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {toast && (
            <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
              <span>{toast.text}</span>
            </div>
          )}

          <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> الحساب <span className="px-2">/</span> إعدادات الحساب</div>

          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
              <User className="h-5 w-5 text-[#FF2E4C]" /> إعدادات الملف الشخصي والحساب
            </h2>
            <p className="mt-1 text-xs text-gray-400">إدارة معلوماتك الشخصية، ومعرفة خطتك الحالية، ومتابعة الرصيد وسجل حركات النقاط.</p>
          </div>

          <section className="overflow-hidden rounded-[24px] border border-[#2a2e38] bg-[radial-gradient(circle_at_10%_15%,rgba(255,46,76,.14),transparent_35%),#11131a] p-5 sm:p-6">
            {loadingPlan ? (
              <div className="py-8 text-center text-xs text-gray-500">جاري تحميل الخطة والرصيد...</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500"><CreditCard className="h-4 w-4 text-[#FF2E4C]" /> الخطة الحالية</div>
                  <div className="mt-3 text-xl font-black text-white">{planName}</div>
                  <div className="mt-1 text-[10px] text-gray-500">{subscription ? 'اشتراك نشط' : 'الحساب يعمل بالخطة المجانية'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500"><Wallet className="h-4 w-4 text-emerald-400" /> الرصيد المتاح</div>
                  <div className="mt-3 text-xl font-black text-white">{Number(creditBalance || 0).toLocaleString('ar-LY')} <span className="text-xs text-gray-500">نقطة</span></div>
                  <div className="mt-1 text-[10px] text-gray-500">رصيد موحد لجميع أدوات الذكاء الاصطناعي</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500"><CalendarDays className="h-4 w-4 text-sky-400" /> دورة الخطة</div>
                  <div className="mt-3 text-sm font-black text-white">{periodEnd || 'لا توجد دورة مدفوعة'}</div>
                  <div className="mt-1 text-[10px] text-gray-500">{plan ? `${Number(plan.monthly_credits || 0).toLocaleString('ar-LY')} نقطة شهرية · ${Number(plan.max_projects || 0).toLocaleString('ar-LY')} مشاريع` : 'اختر باقة عندما تحتاج موارد إضافية'}</div>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-5 text-gray-500">يمكنك تغيير الباقة أو شراء رصيد إضافي من صفحة الباقات، والتفعيل المالي لا يتم إلا بعد تأكيد الدفع من الخادم.</p>
              <Link href="/pricing" className="shrink-0 rounded-xl bg-[#c91a2a] px-5 py-2.5 text-center text-xs font-black text-white transition hover:bg-[#ef2638]">إدارة الباقات والرصيد</Link>
            </div>
          </section>

          <form onSubmit={handleSaveProfile} className="space-y-4 rounded-2xl border border-[#2a2e38] bg-[#11131a] p-6 text-xs">
            <div className="flex items-center justify-between border-b border-[#1F2438] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">البيانات الشخصية</h3>
                <p className="text-[11px] text-gray-400">تُستخدم هذه المعلومات في فواتير ورسائل المنصة.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">نوع الحساب:</span>
                <span className="rounded-full border border-[#FF2E4C]/30 bg-[#FF2E4C]/15 px-3 py-1 font-mono font-bold text-[#FF2E4C]">{roleLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-bold text-gray-400">الاسم الأول:</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-xl border border-[#1F2438] bg-[#0D0F17] p-3 text-white outline-none focus:border-[#FF2E4C]" required />
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-gray-400">اسم العائلة:</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-xl border border-[#1F2438] bg-[#0D0F17] p-3 text-white outline-none focus:border-[#FF2E4C]" required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-bold text-gray-400">رقم الهاتف:</label>
                <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2189XXXXXXXX" className="w-full rounded-xl border border-[#1F2438] bg-[#0D0F17] p-3 font-mono text-white outline-none focus:border-[#FF2E4C]" />
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-gray-400">البريد الإلكتروني:</label>
                <input type="email" disabled value={user?.email || ''} className="w-full cursor-not-allowed rounded-xl border border-[#1F2438] bg-[#0D0F17] p-3 font-mono text-gray-500 outline-none" />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#FF2E4C] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-[#FF2E4C]/20 transition hover:bg-[#E50914] disabled:opacity-50">
                <Save className="h-4 w-4" /><span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </form>

          <div className="space-y-4 rounded-2xl border border-[#2a2e38] bg-[#11131a] p-6">
            <div className="flex items-center justify-between border-b border-[#1F2438] pb-4">
              <div className="flex items-center gap-2"><History className="h-4 w-4 text-[#FF2E4C]" /><h3 className="text-sm font-bold text-white">سجل العمليات والنقاط الأخيرة</h3></div>
              <span className="text-xs text-gray-400">الرصيد الحالي: <strong className="text-white">{creditBalance.toLocaleString('ar-LY')}</strong> نقطة</span>
            </div>

            {loadingTx ? (
              <div className="py-6 text-center text-xs text-gray-500">جاري تحميل السجل...</div>
            ) : transactions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">لا توجد عمليات مسجلة بعد.</div>
            ) : (
              <div className="divide-y divide-[#1F2438]">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 text-xs">
                    <div>
                      <div className="font-bold text-white">{tx.description}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-gray-500">{new Date(tx.created_at).toLocaleString('ar-LY')}</div>
                    </div>
                    <span className={`font-mono font-bold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{tx.amount >= 0 ? `+${tx.amount}` : tx.amount} نقطة</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
