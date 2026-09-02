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
      <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
        <div className="flex min-h-[65vh] items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--bb-accent)] border-t-transparent" />
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
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)] font-sans selection:bg-[var(--bb-accent)] selection:text-[var(--bb-text-inverse)]">
      <div className="mx-auto max-w-[1720px] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {toast && (
            <div
              role="status"
              className={`fixed left-6 top-20 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-[var(--bb-shadow-lg)] backdrop-blur-md ${toast.type === 'error' ? 'bb-danger-surface' : 'bg-[var(--bb-success-soft)] text-[var(--bb-success)] border-[var(--bb-success)]'}`}
            >
              <span>{toast.text}</span>
            </div>
          )}

          <div className="bb-text-tertiary text-xs">الرئيسية <span className="px-2">/</span> الحساب <span className="px-2">/</span> إعدادات الحساب</div>

          <div>
            <h2 className="bb-text-primary flex items-center gap-2 text-xl font-extrabold">
              <User className="bb-text-accent h-5 w-5" /> إعدادات الملف الشخصي والحساب
            </h2>
            <p className="bb-text-secondary mt-1 text-xs">إدارة معلوماتك الشخصية، ومعرفة خطتك الحالية، ومتابعة الرصيد وسجل حركات النقاط.</p>
          </div>

          <section className="bb-dashboard-hero overflow-hidden rounded-[24px] border p-5 sm:p-6">
            {loadingPlan ? (
              <div className="bb-text-tertiary py-8 text-center text-xs">جاري تحميل الخطة والرصيد...</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <AccountMetric icon={<CreditCard className="bb-text-accent h-4 w-4" />} label="الخطة الحالية" value={planName} note={subscription ? 'اشتراك نشط' : 'الحساب يعمل بالخطة المجانية'} />
                <AccountMetric icon={<Wallet className="h-4 w-4 text-[var(--bb-success)]" />} label="الرصيد المتاح" value={<>{Number(creditBalance || 0).toLocaleString('ar-LY')} <span className="bb-text-tertiary text-xs">نقطة</span></>} note="رصيد موحد لجميع أدوات الذكاء الاصطناعي" />
                <AccountMetric icon={<CalendarDays className="h-4 w-4 text-[var(--bb-info)]" />} label="دورة الخطة" value={periodEnd || 'لا توجد دورة مدفوعة'} compact note={plan ? `${Number(plan.monthly_credits || 0).toLocaleString('ar-LY')} نقطة شهرية · ${Number(plan.max_projects || 0).toLocaleString('ar-LY')} مشاريع` : 'اختر باقة عندما تحتاج موارد إضافية'} />
              </div>
            )}
            <div className="bb-divider mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="bb-text-tertiary text-[11px] leading-5">يمكنك تغيير الباقة أو شراء رصيد إضافي من صفحة الباقات، والتفعيل المالي لا يتم إلا بعد تأكيد الدفع من الخادم.</p>
              <Link href="/pricing" className="bb-button-primary shrink-0 rounded-xl px-5 py-2.5 text-center text-xs font-black">إدارة الباقات والرصيد</Link>
            </div>
          </section>

          <form onSubmit={handleSaveProfile} className="bb-panel space-y-4 rounded-2xl border p-6 text-xs">
            <div className="bb-divider flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="bb-text-primary text-sm font-bold">البيانات الشخصية</h3>
                <p className="bb-text-secondary text-[11px]">تُستخدم هذه المعلومات في فواتير ورسائل المنصة.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bb-text-secondary text-[10px]">نوع الحساب:</span>
                <span className="bb-accent-soft rounded-full border px-3 py-1 font-mono font-bold">{roleLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AccountField label="الاسم الأول:" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <AccountField label="اسم العائلة:" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AccountField label="رقم الهاتف:" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2189XXXXXXXX" mono />
              <AccountField label="البريد الإلكتروني:" type="email" value={user?.email || ''} disabled mono />
            </div>

            <div className="flex justify-end pt-3">
              <button type="submit" disabled={saving} className="bb-button-primary flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold shadow-[var(--bb-shadow-sm)] disabled:opacity-50">
                <Save className="h-4 w-4" /><span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </form>

          <section className="bb-panel space-y-4 rounded-2xl border p-6">
            <div className="bb-divider flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-2"><History className="bb-text-accent h-4 w-4" /><h3 className="bb-text-primary text-sm font-bold">سجل العمليات والنقاط الأخيرة</h3></div>
              <span className="bb-text-secondary text-xs">الرصيد الحالي: <strong className="bb-text-primary">{Number(creditBalance || 0).toLocaleString('ar-LY')}</strong> نقطة</span>
            </div>

            {loadingTx ? (
              <div className="bb-text-tertiary py-6 text-center text-xs">جاري تحميل السجل...</div>
            ) : transactions.length === 0 ? (
              <div className="bb-text-tertiary py-6 text-center text-xs">لا توجد عمليات مسجلة بعد.</div>
            ) : (
              <div className="divide-y divide-[var(--bb-border-subtle)]">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-4 py-3 text-xs">
                    <div>
                      <div className="bb-text-primary font-bold">{tx.description}</div>
                      <div className="bb-text-tertiary mt-0.5 font-mono text-[10px]">{new Date(tx.created_at).toLocaleString('ar-LY')}</div>
                    </div>
                    <span className={`font-mono font-bold ${tx.amount >= 0 ? 'text-[var(--bb-success)]' : 'text-[var(--bb-danger)]'}`}>{tx.amount >= 0 ? `+${tx.amount}` : tx.amount} نقطة</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function AccountMetric({ icon, label, value, note, compact = false }) {
  return (
    <div className="bb-card rounded-2xl border p-4">
      <div className="bb-text-tertiary flex items-center gap-2 text-[11px] font-bold">{icon}{label}</div>
      <div className={`bb-text-primary mt-3 font-black ${compact ? 'text-sm' : 'text-xl'}`}>{value}</div>
      <div className="bb-text-tertiary mt-1 text-[10px]">{note}</div>
    </div>
  );
}

function AccountField({ label, type = 'text', dir, value, onChange, placeholder, required = false, disabled = false, mono = false }) {
  return (
    <label className="block">
      <span className="bb-text-secondary mb-1.5 block font-bold">{label}</span>
      <input
        type={type}
        dir={dir}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`bb-input w-full rounded-xl border p-3 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${mono ? 'font-mono' : ''}`}
      />
    </label>
  );
}
