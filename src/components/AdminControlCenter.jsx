'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Boxes,
  Circle,
  Coins,
  CreditCard,
  Database,
  FileText,
  FolderOpen,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import AdminSettingsHub from './AdminSettingsHub';

const SECTION_IDS = new Set(['overview', 'users', 'projects', 'finance', 'commercial', 'ai', 'audit', 'settings']);
const ROLE_LABELS = { SUPER_ADMIN: 'المدير العام', PLATFORM_ADMIN: 'مدير المنصة', OPERATIONS_MANAGER: 'مدير العمليات', CONTENT_MANAGER: 'مدير المحتوى', USER_MANAGER: 'مدير المستخدمين', SUPPORT_AGENT: 'موظف الدعم', FINANCE_MANAGER: 'المدير المالي', MARKETING_MANAGER: 'مدير التسويق', SECURITY_AUDITOR: 'المدقق الأمني', ANALYST: 'المحلل', ADMIN: 'مدير قديم', SUPPORT: 'دعم قديم', USER: 'مستخدم' };

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString('ar-LY'); } catch { return '—'; }
}

function personName(person) {
  if (!person) return 'مستخدم غير معروف';
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email || 'بدون اسم';
}

function badgeClass(value) {
  const status = String(value || '').toLowerCase();
  if (['active', 'paid', 'completed', 'success', 'ok'].includes(status)) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (['failed', 'suspended', 'cancelled', 'error'].includes(status)) return 'border-red-500/20 bg-red-500/10 text-red-300';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
}

function Badge({ value }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${badgeClass(value)}`}>{value || '—'}</span>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-white/10 bg-[#10131a] p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold text-gray-500">{label}</div><div className="mt-2 text-2xl font-black">{value}</div><div className="mt-2 text-[10px] text-gray-600">{note}</div></div><span className="grid h-11 w-11 place-items-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344]"><Icon size={20}/></span></div></div>;
}

function Card({ title, subtitle, children }) {
  return <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1016]"><div className="border-b border-white/10 px-5 py-4"><h2 className="font-black">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-6 text-gray-500">{subtitle}</p>}</div><div className="p-4 sm:p-5">{children}</div></section>;
}

function Empty({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-[#10131a] px-5 py-12 text-center text-sm text-gray-500">{children}</div>;
}

function Table({ headers, rows }) {
  if (!rows.length) return <Empty>لا توجد بيانات مسجلة.</Empty>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-right text-xs"><thead className="text-gray-500"><tr className="border-b border-white/10">{headers.map((header) => <th key={header} className="p-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-white/[.06]">{rows}</tbody></table></div>;
}

export default function AdminControlCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [payload, setPayload] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState('100');
  const [creditReason, setCreditReason] = useState('إضافة رصيد بواسطة المدير العام');
  const [roleValue, setRoleValue] = useState('USER');

  const requestedSection = searchParams.get('section') || 'overview';
  const requestedValid = SECTION_IDS.has(requestedSection) ? requestedSection : 'overview';

  async function accessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const token = await accessToken();
      if (!token) { router.replace('/auth?next=%2Fadmin'); return; }
      const [centerResponse, usersResponse] = await Promise.all([
        fetch('/api/v1/admin/control-center', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch('/api/v1/admin/users', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
      ]);
      const center = await centerResponse.json();
      if (!centerResponse.ok) {
        if ([401, 403].includes(centerResponse.status)) router.replace('/dashboard');
        throw new Error(center.error || 'تعذر تحميل مركز الإدارة.');
      }
      const userData = usersResponse.ok ? await usersResponse.json() : { users: [] };
      setPayload(center);
      setUsers(Array.isArray(userData.users) ? userData.users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل مركز الإدارة.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAll(); }, 0);
    return () => window.clearTimeout(timer);
    // Initial authenticated bootstrap only; manual refresh handles subsequent reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissions = payload?.permissions || {};
  const actor = payload?.actor || {};
  const data = payload?.data || {};
  const metrics = payload?.metrics || {};
  const section = (requestedValid === 'commercial' && !permissions.viewCommercial) || (requestedValid === 'audit' && !permissions.viewAudit) || (requestedValid === 'settings' && !permissions.viewSettings) ? 'overview' : requestedValid;

  const peopleById = useMemo(() => {
    const map = new Map();
    for (const profile of data.profiles || []) map.set(profile.id, profile);
    return map;
  }, [data.profiles]);

  const nav = [
    ['overview', 'نظرة عامة', Gauge],
    ['users', 'المستخدمون والصلاحيات', Users],
    ['projects', 'المشاريع', FolderOpen],
    ['finance', 'المالية والاشتراكات', CreditCard],
    ...(permissions.viewCommercial ? [['commercial', 'الباقات والأسعار', WalletCards]] : []),
    ['ai', 'الذكاء الاصطناعي', Sparkles],
    ...(permissions.viewAudit ? [['audit', 'التدقيق والسجلات', FileText]] : []),
    ...(permissions.viewSettings ? [['settings', 'التشغيل والإعدادات', Settings]] : []),
  ];

  function go(next) { router.replace(`/admin?section=${encodeURIComponent(next)}`, { scroll: false }); }

  async function userAction(action, userId, extra = {}) {
    setBusyId(userId); setMessage('');
    try {
      const token = await accessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/users', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, userId, ...extra }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تنفيذ الإجراء.');
      setModal(null); setMessage('تم تنفيذ الإجراء بنجاح.'); await loadAll();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء.'); }
    finally { setBusyId(null); }
  }

  async function deleteUser(user) {
    if (!window.confirm(`هل تريد حذف حساب ${user.firstName || ''} ${user.lastName || ''} نهائيًا؟`)) return;
    setBusyId(user.id); setMessage('');
    try {
      const token = await accessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch(`/api/v1/admin/users?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر حذف المستخدم.');
      setMessage('تم حذف المستخدم.'); await loadAll();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'تعذر حذف المستخدم.'); }
    finally { setBusyId(null); }
  }

  if (loading && !payload) return <div className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] text-white"><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#10131a] px-5 py-4 text-sm text-gray-400"><Loader2 className="animate-spin text-[#ff3344]" size={19}/> جاري تحميل بيانات الإدارة الفعلية...</div></div>;
  if (error && !payload) return <div dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] px-5 text-white"><div className="max-w-lg rounded-3xl border border-red-500/25 bg-[#11131a] p-8 text-center"><ShieldCheck className="mx-auto text-[#ff3344]" size={38}/><h1 className="mt-4 text-2xl font-black">تعذر فتح مركز الإدارة</h1><p className="mt-3 text-sm text-gray-400">{error}</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-black">العودة إلى لوحة المستخدم</Link></div></div>;

  const filteredUsers = users.filter((user) => !search.trim() || `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#07090d] text-white"><div className="mx-auto flex max-w-[1800px]">
    <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-72 shrink-0 border-l border-white/[.07] bg-[#0b0d12] p-4 lg:flex lg:flex-col">
      <div className="rounded-2xl border border-[#f31325]/20 bg-[#f31325]/7 p-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f31325]"><ShieldCheck size={21}/></span><div><div className="font-black">مركز الإدارة</div><div className="mt-1 text-[10px] text-gray-500">{ROLE_LABELS[actor.role] || actor.role}</div></div></div><div className="mt-3 truncate text-[10px] text-gray-600">{actor.email}</div></div>
      <nav className="mt-5 space-y-1">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => go(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-bold ${section === id ? 'bg-[#f31325]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Icon size={18}/><span className="flex-1">{label}</span>{section === id && <ArrowLeft size={14}/>}</button>)}</nav>
      <div className="mt-auto space-y-2 border-t border-white/[.07] pt-4"><Link href="/admin/home-content" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-400 hover:bg-white/5"><Boxes size={18}/> محتوى الصفحة الرئيسية</Link><Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-400 hover:bg-white/5"><ArrowLeft size={18} className="rotate-180"/> لوحة المستخدم</Link></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-20 z-30 border-b border-white/[.07] bg-[#07090d]/95 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="text-[10px] font-black tracking-[.2em] text-[#ff6674]">ADMIN CONTROL CENTER</div><h1 className="mt-1 truncate text-xl font-black">{nav.find(([id]) => id === section)?.[1]}</h1></div><span className="hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[10px] font-black text-emerald-300 sm:flex"><Database size={14}/> Supabase Live</span><button onClick={() => void loadAll()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-3 py-2 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button></div><div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => go(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${section === id ? 'border-[#f31325] bg-[#f31325]' : 'border-white/10 bg-[#10131a] text-gray-400'}`}><Icon size={14}/>{label}</button>)}</div></header>
      <div className="space-y-5 p-4 sm:p-6 lg:p-8">{message && <div className="rounded-xl border border-[#f31325]/20 bg-[#f31325]/5 px-4 py-3 text-xs text-red-200">{message}</div>}{error && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">{error}</div>}

        {section === 'overview' && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="إجمالي المستخدمين" value={metrics.totalUsers || 0} note={`${metrics.activeUsers || 0} نشط · ${metrics.suspendedUsers || 0} موقوف`} icon={Users}/><Metric label="المشاريع" value={metrics.totalProjects || 0} note="من جدول projects" icon={FolderOpen}/><Metric label="الإيرادات المؤكدة" value={`${Number(metrics.paidRevenueLYD || 0).toLocaleString('ar-LY')} د.ل`} note={`${metrics.activeSubscriptions || 0} اشتراك نشط`} icon={CreditCard}/><Metric label="توليدات AI" value={metrics.totalGenerations || 0} note={`${metrics.completedGenerations || 0} مكتمل · ${metrics.failedGenerations || 0} فشل`} icon={Sparkles}/></div><div className="grid gap-5 xl:grid-cols-2"><Card title="أحدث المشاريع" subtitle="بيانات فعلية من Supabase"><div className="space-y-2">{(data.projects || []).slice(0, 5).map((p) => <div key={p.id} className="rounded-xl border border-white/[.07] bg-[#10131a] p-3"><div className="font-black">{p.name}</div><div className="mt-1 text-[10px] text-gray-500">{personName(peopleById.get(p.owner_id))} · {formatDate(p.updated_at)}</div></div>)}</div></Card><Card title="آخر التوليدات" subtitle="سجل generations الفعلي"><div className="space-y-2">{(data.generations || []).slice(0, 5).map((g) => <div key={g.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#10131a] p-3"><div className="min-w-0 flex-1"><div className="truncate font-black">{g.model || g.generation_type}</div><div className="mt-1 text-[10px] text-gray-500">{g.provider} · {personName(peopleById.get(g.user_id))}</div></div><Badge value={g.status}/></div>)}</div></Card></div></>}

        {section === 'users' && <Card title="إدارة المستخدمين والصلاحيات" subtitle="الحسابات والإجراءات الحساسة تمر عبر API محمي"><div className="mb-4 flex items-center justify-between gap-3"><label className="flex min-w-[280px] items-center gap-2 rounded-xl border border-white/10 bg-[#151922] px-4"><Search size={16} className="text-gray-500"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد..." className="w-full bg-transparent py-3 text-xs outline-none"/></label><span className="text-xs text-gray-500">{filteredUsers.length} حساب</span></div><Table headers={['المستخدم','الاتصال','الدور','الخطة','الرصيد','الحالة','آخر ظهور','الإجراءات']} rows={filteredUsers.map((u) => <tr key={u.id}><td className="p-3"><div className="font-black">{[u.firstName,u.lastName].filter(Boolean).join(' ') || 'بدون اسم'}</div><div className="mt-1 text-[10px] text-gray-500">{u.email}</div></td><td className="p-3"><span className={u.online ? 'text-emerald-300' : 'text-gray-600'}><Circle size={8} className="ml-2 inline" fill="currentColor"/>{u.online ? 'Online' : 'Offline'}</span></td><td className="p-3 text-cyan-300">{ROLE_LABELS[u.role] || u.role}</td><td className="p-3 text-amber-300">{String(u.planId || 'free').toUpperCase()}</td><td className="p-3 font-black">{Number(u.creditBalance || 0).toLocaleString('ar-LY')}</td><td className="p-3"><Badge value={u.status}/></td><td className="p-3 text-gray-500">{formatDate(u.lastSeenAt)}</td><td className="p-3"><div className="flex gap-2">{permissions.manageUsers && u.role !== 'SUPER_ADMIN' && <button disabled={busyId === u.id} onClick={() => void userAction(u.status === 'active' ? 'suspend' : 'reactivate', u.id)} className="rounded-lg border border-white/10 px-2.5 py-2">{u.status === 'active' ? 'إيقاف' : 'تفعيل'}</button>}{permissions.manageCredits && <button onClick={() => { setCreditAmount('100'); setModal({type:'credit',user:u}); }} className="rounded-lg border border-amber-500/25 px-2.5 py-2 text-amber-300"><Coins size={14}/></button>}{permissions.changeRoles && u.id !== actor.userId && <button onClick={() => { setRoleValue(u.role); setModal({type:'role',user:u}); }} className="rounded-lg border border-cyan-500/25 px-2.5 py-2 text-cyan-300"><UserCog size={14}/></button>}{permissions.deleteUsers && u.id !== actor.userId && u.role !== 'SUPER_ADMIN' && <button disabled={busyId === u.id} onClick={() => void deleteUser(u)} className="rounded-lg border border-red-500/25 px-2.5 py-2 text-red-300"><Trash2 size={14}/></button>}</div></td></tr>)}/></Card>}

        {section === 'projects' && <Card title="المشاريع" subtitle="المشاريع المسجلة فعليًا"><Table headers={['المشروع','المالك','النوع','المجال','آخر تحديث']} rows={(data.projects || []).map((p) => <tr key={p.id}><td className="p-3 font-black">{p.name}</td><td className="p-3">{personName(peopleById.get(p.owner_id))}</td><td className="p-3 text-amber-300">{p.type || '—'}</td><td className="p-3 text-gray-400">{p.industry || '—'}</td><td className="p-3 text-gray-500">{formatDate(p.updated_at)}</td></tr>)}/></Card>}

        {section === 'finance' && <><Card title="الاشتراكات" subtitle="من جدول subscriptions"><Table headers={['المستخدم','الخطة','الحالة','المزود','الانتهاء']} rows={(data.subscriptions || []).map((s) => <tr key={s.id}><td className="p-3 font-black">{personName(peopleById.get(s.user_id))}</td><td className="p-3 text-amber-300">{s.plan_id}</td><td className="p-3"><Badge value={s.status}/></td><td className="p-3">{s.provider}</td><td className="p-3 text-gray-500">{formatDate(s.current_period_end)}</td></tr>)}/></Card><Card title="المدفوعات" subtitle="من payment_transactions"><Table headers={['المرجع','المستخدم','المبلغ','النوع','الحالة','التاريخ']} rows={(data.payments || []).map((p) => <tr key={p.id}><td className="p-3 font-mono text-amber-300">{p.order_reference}</td><td className="p-3 font-black">{personName(peopleById.get(p.user_id))}</td><td className="p-3">{Number(p.amount_lyd || 0).toLocaleString('ar-LY')} {p.currency}</td><td className="p-3">{p.item_type}</td><td className="p-3"><Badge value={p.status}/></td><td className="p-3 text-gray-500">{formatDate(p.created_at)}</td></tr>)}/></Card>{permissions.viewCredits && <Card title="سجل النقاط" subtitle="من credit_transactions"><Table headers={['المستخدم','القيمة','النوع','الوصف','التاريخ']} rows={(data.credits || []).map((t) => <tr key={t.id}><td className="p-3">{personName(peopleById.get(t.user_id))}</td><td className={`p-3 font-black ${Number(t.amount)>=0?'text-emerald-300':'text-red-300'}`}>{t.amount}</td><td className="p-3 text-amber-300">{t.transaction_type}</td><td className="p-3">{t.description}</td><td className="p-3 text-gray-500">{formatDate(t.created_at)}</td></tr>)}/></Card>}</>}

        {section === 'commercial' && <div className="grid gap-5 xl:grid-cols-2"><Card title="خطط الاشتراك" subtitle="من plans"><div className="space-y-3">{(data.plans || []).map((p) => <div key={p.id} className="rounded-2xl border border-white/[.07] bg-[#10131a] p-4"><div className="flex justify-between"><b>{p.name}</b><Badge value={p.is_active?'active':'disabled'}/></div><div className="mt-3 text-xs text-gray-400">{p.price_monthly_lyd} د.ل · {p.monthly_credits} نقطة · {p.max_projects} مشروع</div></div>)}</div></Card><Card title="حزم النقاط" subtitle="من credit_packages"><div className="space-y-3">{(data.packages || []).map((p) => <div key={p.id} className="flex justify-between rounded-2xl border border-white/[.07] bg-[#10131a] p-4"><div><b>{p.name}</b><div className="mt-1 text-[10px] text-gray-500">{p.purchased_credits} + {p.bonus_credits} مكافأة</div></div><div className="text-left"><b>{p.price_lyd} د.ل</b><div className="text-[10px] text-amber-300">{p.credits} نقطة</div></div></div>)}</div></Card></div>}

        {section === 'ai' && <><Card title="توليدات الذكاء الاصطناعي" subtitle="بيانات فعلية من generations"><Table headers={['المستخدم','النوع','المزود','النموذج','الحالة','النقاط','تكلفة المزود','التاريخ']} rows={(data.generations || []).map((g) => <tr key={g.id}><td className="p-3">{personName(peopleById.get(g.user_id))}</td><td className="p-3 text-amber-300">{g.generation_type}</td><td className="p-3">{g.provider}</td><td className="p-3 font-mono text-[10px]">{g.model}</td><td className="p-3"><Badge value={g.status}/></td><td className="p-3">{g.credits_consumed}</td><td className="p-3">{g.provider_cost_usd ? `$${Number(g.provider_cost_usd).toFixed(4)}` : '—'}</td><td className="p-3 text-gray-500">{formatDate(g.created_at)}</td></tr>)}/></Card><Card title="الأصول" subtitle="من assets"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(data.assets || []).map((a) => <div key={a.id} className="rounded-2xl border border-white/[.07] bg-[#10131a] p-4"><FileText className="text-[#ff3344]" size={18}/><div className="mt-3 truncate font-black">{a.name}</div><div className="mt-1 text-[10px] text-gray-500">{a.mime_type} · {a.width || '—'}×{a.height || '—'}</div></div>)}</div></Card></>}

        {section === 'audit' && <Card title="سجل التدقيق" subtitle="الأحداث الفعلية من audit_logs"><div className="space-y-2">{(data.auditLogs || []).map((a) => <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#10131a] p-4"><Activity size={18} className="text-[#ff3344]"/><div className="min-w-0 flex-1"><div className="font-black">{a.action}</div><div className="mt-1 text-[10px] text-gray-500">{a.resource} · {a.resource_id || '—'} · {personName(peopleById.get(a.actor_id))}</div></div><div className="text-[10px] text-gray-600">{formatDate(a.created_at)}</div></div>)}{!(data.auditLogs || []).length && <Empty>لا توجد سجلات تدقيق مرئية.</Empty>}</div></Card>}

        {section === 'settings' && <AdminSettingsHub sources={payload?.sources || {}} />}
      </div>
    </div>
  </div>

  {modal && <div className="fixed inset-0 z-[220] grid place-items-center bg-black/75 p-4"><div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#10131a] p-6"><button onClick={() => setModal(null)} className="absolute left-5 top-5 text-gray-500"><X size={18}/></button>{modal.type === 'credit' ? <><h2 className="text-xl font-black">إضافة نقاط</h2><p className="mt-2 text-xs text-gray-500">{modal.user.email}</p><input type="number" min="1" max="1000000" value={creditAmount} onChange={(e)=>setCreditAmount(e.target.value)} className="mt-5 w-full rounded-xl border border-white/10 bg-[#181c25] p-4"/><input value={creditReason} onChange={(e)=>setCreditReason(e.target.value)} className="mt-3 w-full rounded-xl border border-white/10 bg-[#181c25] p-4"/><button onClick={() => void userAction('grant_credits', modal.user.id, { amount:Number(creditAmount), reason:creditReason })} className="mt-5 w-full rounded-xl bg-[#f31325] py-3 font-black">حفظ الإضافة</button></> : <><h2 className="text-xl font-black">تغيير الدور</h2><p className="mt-2 text-xs text-gray-500">{modal.user.email}</p><select value={roleValue} onChange={(e)=>setRoleValue(e.target.value)} className="mt-5 w-full rounded-xl border border-white/10 bg-[#181c25] p-4"><option value="USER">مستخدم</option><option value="SUPPORT">مشرف دعم</option><option value="ADMIN">مدير</option><option value="SUPER_ADMIN">مدير عام</option></select><button onClick={() => void userAction('change_role', modal.user.id, { role:roleValue })} className="mt-5 w-full rounded-xl bg-[#f31325] py-3 font-black">حفظ الدور</button></>}</div></div>}
  </main>;
}
