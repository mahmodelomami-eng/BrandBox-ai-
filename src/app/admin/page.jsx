'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import WorkspaceLayout from '../../components/navigation/WorkspaceLayout';
import { useAuth } from '../../context/AuthContext';
import { checkPermission } from '../../lib/auth/rbac-engine';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import {
  ShieldCheck,
  ShieldAlert,
  Tag,
  Server,
  Cpu,
  History,
  LayoutDashboard,
  CheckCircle2,
  X,
  Edit3,
} from 'lucide-react';

export default function AdminPage() {
  const { role, roleLabel, loading } = useAuth();
  const [activeAdminTab, setActiveAdminTab] = useState('overview');
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editBonus, setEditBonus] = useState(0);
  const [savingPackage, setSavingPackage] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isPrivileged = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'SUPPORT';

  useEffect(() => {
    let mounted = true;
    async function loadAdminPackages() {
      if (!isPrivileged) return;
      try {
        setLoadingPackages(true);
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch('/api/v1/credit-packages', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data.packages)) {
            setPackages(data.packages);
          }
        }
      } catch (err) {
        console.error('[AdminPage] Error loading packages:', err);
      } finally {
        if (mounted) setLoadingPackages(false);
      }
    }

    loadAdminPackages();
    return () => { mounted = false; };
  }, [isPrivileged]);

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!editingPackage) return;
    setSavingPackage(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('يرجى تسجيل الدخول مجدداً');

      const res = await fetch(`/api/v1/admin/credit-packages/${editingPackage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: editingPackage.name,
          priceLYD: editPrice,
          purchasedCredits: editingPackage.purchased_credits,
          bonusCredits: editBonus,
          bonusValidDays: editingPackage.bonus_valid_days || 90,
          isFeatured: editingPackage.is_featured,
          isActive: editingPackage.is_active,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'تعذر تحديث الباقة');

      setPackages((prev) => prev.map((p) => (p.id === editingPackage.id ? result.package : p)));
      setEditingPackage(null);
      showToast('تم تحديث الباقة بنجاح في قاعدة البيانات!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر تحديث الباقة', 'error');
    } finally {
      setSavingPackage(false);
    }
  };

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="py-20 text-center text-xs text-gray-400">جاري فحص الصلاحيات...</div>
      </WorkspaceLayout>
    );
  }

  // 403 Forbidden State for regular USER
  if (!isPrivileged) {
    return (
      <WorkspaceLayout>
        <div className="p-10 text-center bg-[#11131a] border border-red-500/30 rounded-3xl space-y-4 max-w-lg mx-auto my-12">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">وصول مرفوض (Forbidden 403)</h3>
          <p className="text-xs text-gray-400 leading-6">
            حسابك الحالي (<span className="font-bold text-white">{roleLabel}</span>) لا يمتلك الصلاحيات الإدارية المطلوبة للوصول إلى مركز تحكم النظام.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs px-6 py-2.5 rounded-xl inline-block transition"
            >
              العودة للوحة التحكم
            </Link>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  const adminNavItems = [
    { id: 'overview', label: 'المؤشرات العامة', icon: LayoutDashboard, perm: 'ANALYTICS_READ' },
    { id: 'packages', label: 'باقات النقاط (Live DB)', icon: Tag, perm: 'PACKAGES_READ' },
    { id: 'providers', label: 'حالة المزودين', icon: Server, perm: 'PROVIDERS_READ' },
    { id: 'models', label: 'النماذج والتسعير', icon: Cpu, perm: 'MODELS_READ' },
    { id: 'audit', label: 'سجل المراجعة والأمان', icon: History, perm: 'AUDIT_LOGS_READ' },
  ].filter((item) => checkPermission(role, item.perm));

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {toast && (
          <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
            <span>{toast.text}</span>
          </div>
        )}

        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> لوحة الإدارة</div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-400" /> مركز التحكم الإداري (Admin Control Center)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              إدارة المنصة، الباقات، النماذج، ومراقبة أداء العمليات وسجلات الأمان.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">الصلاحية:</span>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full font-mono">
              {role} ({roleLabel})
            </span>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#1F2438] pb-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveAdminTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeAdminTab === item.id
                    ? 'bg-[#FF2E4C] text-white shadow-lg shadow-[#FF2E4C]/20'
                    : 'bg-[#11131a] text-gray-400 hover:text-white border border-[#2a2e38]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeAdminTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-[#2a2e38] bg-[#11131a]">
                <div className="text-xs text-gray-400">حالة النظام</div>
                <div className="mt-2 text-xl font-extrabold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> جاهز (Healthy)
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Next.js 16 + Supabase</div>
              </div>
              <div className="p-5 rounded-2xl border border-[#2a2e38] bg-[#11131a]">
                <div className="text-xs text-gray-400">بوابة الدفع Ezone</div>
                <div className="mt-2 text-xl font-extrabold text-white">متصلة ونشطة</div>
                <div className="text-[10px] text-gray-500 mt-1">Webhook S2S Verification</div>
              </div>
              <div className="p-5 rounded-2xl border border-[#2a2e38] bg-[#11131a]">
                <div className="text-xs text-gray-400">مزود الذكاء OpenRouter</div>
                <div className="mt-2 text-xl font-extrabold text-white">جاهز (Direct)</div>
                <div className="text-[10px] text-gray-500 mt-1">Chat & Image Generation</div>
              </div>
              <div className="p-5 rounded-2xl border border-[#2a2e38] bg-[#11131a]">
                <div className="text-xs text-gray-400">قواعد البيانات Supabase</div>
                <div className="mt-2 text-xl font-extrabold text-white">مؤمنة بـ RLS</div>
                <div className="text-[10px] text-gray-500 mt-1">Idempotent RPC Handlers</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Credit Packages (Live DB) */}
        {activeAdminTab === 'packages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">باقات النقاط المسجلة في Supabase (Live Database)</h3>
            </div>
            {loadingPackages ? (
              <div className="p-8 text-center text-xs text-gray-400">جاري تحميل الباقات...</div>
            ) : (
              <div className="bg-[#11131a] border border-[#2a2e38] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs text-gray-300">
                  <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
                    <tr>
                      <th className="p-3.5">اسم الباقة</th>
                      <th className="p-3.5">النقاط الأساسية</th>
                      <th className="p-3.5">نقاط الهدية</th>
                      <th className="p-3.5">السعر (د.ل)</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2438]">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-[#0D0F17]/50">
                        <td className="p-3.5 font-bold text-white">{pkg.name}</td>
                        <td className="p-3.5">{pkg.purchased_credits}</td>
                        <td className="p-3.5 text-emerald-400 font-bold">+{pkg.bonus_credits}</td>
                        <td className="p-3.5 font-bold text-white">{pkg.price_lyd} د.ل</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pkg.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {pkg.is_active ? 'مفعلة' : 'معطلة'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {role === 'SUPER_ADMIN' && (
                            <button
                              onClick={() => {
                                setEditingPackage(pkg);
                                setEditPrice(Number(pkg.price_lyd));
                                setEditBonus(Number(pkg.bonus_credits));
                              }}
                              className="text-[#FF2E4C] hover:underline font-bold flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Providers */}
        {activeAdminTab === 'providers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">OpenRouter AI Gateway</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">جاهز</span>
              </div>
              <p className="text-xs text-gray-400">يوفر وصولاً لجميع نماذج GPT-4o, Claude 3.5, Imagen, Gemini و Seedream.</p>
            </div>
            <div className="p-5 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Ezone Pay Payment Gateway</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">جاهز</span>
              </div>
              <p className="text-xs text-gray-400">معالجة الدفع بالدينار الليبي والشحن التلقائي عبر Webhook مشفر بـ HMAC.</p>
            </div>
          </div>
        )}

        {/* Tab 4: Models */}
        {activeAdminTab === 'models' && (
          <div className="bg-[#11131a] border border-[#2a2e38] rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs text-gray-300">
              <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
                <tr>
                  <th className="p-3.5">اسم النموذج</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">المزود</th>
                  <th className="p-3.5">تكلفة النقاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2438]">
                <tr><td className="p-3.5 font-bold text-white">GPT-4o Mini</td><td className="p-3.5">نص ومحادثة</td><td className="p-3.5">OpenAI</td><td className="p-3.5 font-bold text-[#FF2E4C]">2 نقاط</td></tr>
                <tr><td className="p-3.5 font-bold text-white">Claude 3.5 Sonnet</td><td className="p-3.5">نص ومحادثة</td><td className="p-3.5">Anthropic</td><td className="p-3.5 font-bold text-[#FF2E4C]">4 نقاط</td></tr>
                <tr><td className="p-3.5 font-bold text-white">GPT Image 2</td><td className="p-3.5">توليد صور</td><td className="p-3.5">OpenAI</td><td className="p-3.5 font-bold text-[#FF2E4C]">6 نقاط</td></tr>
                <tr><td className="p-3.5 font-bold text-white">Seedream 5.0 Lite</td><td className="p-3.5">توليد صور</td><td className="p-3.5">ByteDance</td><td className="p-3.5 font-bold text-[#FF2E4C]">4 نقاط</td></tr>
                <tr><td className="p-3.5 font-bold text-white">Nano Banana 2 Lite</td><td className="p-3.5">توليد صور</td><td className="p-3.5">Google</td><td className="p-3.5 font-bold text-[#FF2E4C]">4 نقاط</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Audit & Security */}
        {activeAdminTab === 'audit' && (
          <div className="p-6 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-3">
            <h3 className="font-bold text-sm text-white">سجلات الأمان والعمليات الإدارية</h3>
            <p className="text-xs text-gray-400">
              جميع التعديلات على الباقات والشحنات والخصومات يتم تسجيلها ذرياً في جدول <code className="text-[#FF2E4C]">audit_logs</code> في Supabase.
            </p>
          </div>
        )}

        {/* Edit Package Modal */}
        {editingPackage && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-md space-y-4 relative text-xs">
              <button onClick={() => setEditingPackage(null)} className="absolute top-4 left-4 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-extrabold text-white">تعديل باقة النقاط ({editingPackage.name})</h3>
              <form onSubmit={handleSavePackage} className="space-y-3">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">السعر بالدينار الليبي (LYD):</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    min="1"
                    className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1">نقاط الهدية (Bonus):</label>
                  <input
                    type="number"
                    value={editBonus}
                    onChange={(e) => setEditBonus(Number(e.target.value))}
                    min="0"
                    className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPackage}
                  className="w-full bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs py-3 rounded-xl transition disabled:opacity-50 mt-2"
                >
                  {savingPackage ? 'جاري الحفظ في Supabase...' : 'حفظ التعديلات في قاعدة البيانات'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
