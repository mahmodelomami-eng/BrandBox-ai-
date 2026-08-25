'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';
import {
  User,
  History,
  Save,
} from 'lucide-react';

export default function AccountSettingsPage() {
  const { user, profile, roleLabel, creditBalance, refreshProfile, loading } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);
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
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    let mounted = true;
    async function loadTransactions() {
      if (!user?.id) return;
      try {
        const supabase = createBrowserSupabaseClient();
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
    }

    loadTransactions();
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

  if (!user) {
    return null;
  }

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-gray-100 font-sans selection:bg-[#FF2E4C] selection:text-white">
      <div className="mx-auto max-w-[1720px] p-4 sm:p-6 lg:p-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          {toast && (
            <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
              <span>{toast.text}</span>
            </div>
          )}

          <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> الحساب <span className="px-2">/</span> إعدادات الحساب</div>

          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#FF2E4C]" /> إعدادات الملف الشخصي والحساب
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              إدارة معلوماتك الشخصية، ومتابعة رصيدك وسجل حركات النقاط.
            </p>
          </div>

          {/* Profile Card Form */}
          <form onSubmit={handleSaveProfile} className="p-6 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#1F2438] pb-4">
              <div>
                <h3 className="font-bold text-sm text-white">البيانات الشخصية</h3>
                <p className="text-[11px] text-gray-400">تُستخدم هذه المعلومات في فواتير ورسائل المنصة.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">نوع الحساب:</span>
                <span className="font-bold text-[#FF2E4C] bg-[#FF2E4C]/15 px-3 py-1 rounded-full border border-[#FF2E4C]/30 font-mono">
                  {roleLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 font-bold mb-1.5">الاسم الأول:</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-3 rounded-xl outline-none focus:border-[#FF2E4C]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">اسم العائلة:</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-3 rounded-xl outline-none focus:border-[#FF2E4C]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 font-bold mb-1.5">رقم الهاتف:</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2189XXXXXXXX"
                  className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-3 rounded-xl outline-none font-mono focus:border-[#FF2E4C]"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">البريد الإلكتروني:</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-[#0D0F17] border border-[#1F2438] text-gray-500 p-3 rounded-xl outline-none font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-[#FF2E4C]/20 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </form>

          {/* Credit Transactions History */}
          <div className="p-6 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2438] pb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#FF2E4C]" />
                <h3 className="font-bold text-sm text-white">سجل العمليات والنقاط الأخيرة</h3>
              </div>
              <span className="text-xs text-gray-400">
                الرصيد الحالي: <strong className="text-white">{creditBalance.toLocaleString('ar-LY')}</strong> نقطة
              </span>
            </div>

            {loadingTx ? (
              <div className="py-6 text-center text-xs text-gray-500">جاري تحميل السجل...</div>
            ) : transactions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">لا توجد عمليات مسجلة بعد.</div>
            ) : (
              <div className="divide-y divide-[#1F2438]">
                {transactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{tx.description}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                        {new Date(tx.created_at).toLocaleString('ar-LY')}
                      </div>
                    </div>
                    <span className={`font-bold font-mono ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} نقطة
                    </span>
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
