'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  BarChart3,
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

const SECTION_IDS = new Set(['overview', 'users', 'projects', 'finance', 'commercial', 'ai', 'audit', 'settings']);

const ROLE_LABELS = {
  SUPER_ADMIN: 'المدير العام',
  ADMIN: 'مدير',
  SUPPORT: 'مشرف دعم',
  USER: 'مستخدم',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ar-LY');
  } catch {
    return '—';
  }
}

function personName(person) {
  if (!person) return 'مستخدم غير معروف';
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email || 'بدون اسم';
}

function statusClass(status) {
  if (['active', 'paid', 'completed', 'success'].includes(status)) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (['failed', 'suspended', 'cancelled', 'error'].includes(status)) return 'border-red-500/20 bg-red-500/10 text-red-300';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
}

function StatusBadge({ value }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(String(value || 'unknown'))}`}>{value || '—'}</span>;
}

function MetricCard({ label, value, note, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#10131a] p-5 shadow-[0_16px_45px_rgba(0,0,0,.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-gray-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-white">{value}</div>
          {note && <div className="mt-2 text-[10px] leading-5 text-gray-600">{note}</div>}
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344]"><Icon size={20} /></span>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-white/10 bg-[#0d1016] px-5 py-14 text-center text-sm text-gray-500">{text}</div>;
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1016]">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-black text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-6 text-gray-500">{subtitle}</p>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function AdminControlCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [payload, setPayload] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState('100');
  const [creditReason, setCreditReason] = useState('إضافة رصيد بواسطة المدير العام');
  const [roleValue, setRoleValue] = useState('USER');

  const requestedSection = searchParams.get('section') || 'overview';
  const section = SECTION_IDS.has(requestedSection) ? requestedSection : 'overview';

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadUsers(accessToken) {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const result = await response.json();
      setUsers(Array.isArray(result.users) ? result.users : []);
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setError('');
    const accessToken = await token();
    if (!accessToken) {
      router.replace('/auth?next=%2Fadmin');
      return;
    }

    try {
      const response = await fetch('/api/v1/admin/control-center', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) router.replace('/dashboard');
        throw new Error(result.error || 'تعذر تحميل مركز الإدارة.');
      }
      setPayload(result);
      await loadUsers(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل مركز الإدارة.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const peopleById = useMemo(() => {
    const map = new Map();
    for (const profile of payload?.data?.profiles || []) map.set(profile.id, profile);
    return map;
  }, [payload]);

  const permissions = payload?.permissions || {};
  const actor = payload?.actor || {};
  const metrics = payload?.metrics || {};
  const data = payload?.data || {};

  const navItems = useMemo(() => {
    const items = [
      ['overview', 'نظرة عامة', Gauge],
      ['users', 'المستخدمون والصلاحيات', Users],
      ['projects', 'المشاريع', FolderOpen],
      ['finance', 'المالية والاشتراكات', CreditCard],
    ];
    if (permissions.viewCommercial) items.push(['commercial', 'الباقات والأسعار', WalletCards]);
    items.push(['ai', 'الذكاء الاصطناعي', Sparkles]);
    if (permissions.viewAudit) items.push(['audit', 'التدقيق والسجلات', FileText]);
    items.push(['settings', 'التشغيل والإعدادات', Settings]);
    return items;
  }, [permissions.viewAudit, permissions.viewCommercial]);

  function goSection(nextSection) {
    router.replace(`/admin?section=${encodeURIComponent(nextSection)}`, { scroll: false });
  }

  async function performUserAction(action, userId, extra = {}) {
    const accessToken = await token();
    if (!accessToken) return;
    setBusyId(userId);
    setMessage('');
    try {
      const response = await fetch('/api/v1/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, userId, ...extra }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تنفيذ الإجراء.');
      await loadAll();
      setActionModal(null);
      setMessage('تم تنفيذ الإجراء بنجاح.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`هل تريد حذف حساب ${user.firstName || ''} ${user.lastName || ''} نهائيًا؟`)) return;
    const accessToken = await token();
    if (!accessToken) return;
    setBusyId(user.id);
    setMessage('');
    try {
      const response = await fetch(`/api/v1/admin/users?userId=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر حذف المستخدم.');
      await loadAll();
      setMessage('تم حذف المستخدم.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'تعذر حذف المستخدم.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !payload) {
    return <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] text-white"><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#10131a] px-5 py-4 text-sm font-bold text-gray-400"><Loader2 className="animate-spin text-[#ff3344]" size={19} /> جاري تحميل بيانات الإدارة الفعلية...</div></main>;
  }

  if (error && !payload) {
    return <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] px-5 text-white"><div className="max-w-lg rounded-3xl border border-red-500/25 bg-[#11131a] p-8 text-center"><ShieldCheck className="mx-auto text-[#ff3344]" size={38} /><h1 className="mt-4 text-2xl font-black">تعذر فتح مركز الإدارة</h1><p className="mt-3 text-sm leading-7 text-gray-400">{error}</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-black">العودة إلى لوحة المستخدم</Link></div></main>;
  }

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#07090d] text-white">
      <div className="mx-auto flex max-w-[1800px]">
        <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-72 shrink-0 border-l border-white/[.07] bg-[#0b0d12] p-4 lg:flex lg:flex-col">
          <div className="rounded-2xl border border-[#f31325]/20 bg-[#f31325]/7 p-4">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f31325] text-white"><ShieldCheck size={21} /></span><div><div className="text-sm font-black">مركز الإدارة</div><div className="mt-1 text-[10px] text-gray-500">{ROLE_LABELS[actor.role] || actor.role}</div></div></div>
            <div className="mt-3 truncate text-[10px] text-gray-600">{actor.email}</div>
          </div>

          <nav className="mt-5 space-y-1">
            {navItems.map(([id, label, Icon]) => (
              <button key={id} onClick={() => goSection(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-bold transition ${section === id ? 'bg-[#f31325] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Icon size={18} /><span className="flex-1">{label}</span>{section === id && <ArrowLeft size={14} />}</button>
            ))}
          </nav>

          <div className="mt-auto space-y-2 border-t border-white/[.07] pt-4">
            <Link href="/admin/home-content" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Boxes size={18} /> محتوى الصفحة الرئيسية</Link>
            <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><ArrowLeft size={18} className="rotate-180" /> لوحة المستخدم</Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-20 z-30 border-b border-white/[.07] bg-[#07090d]/95 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1"><div className="text-[10px] font-black tracking-[.2em] text-[#ff6674]">ADMIN CONTROL CENTER</div><h1 className="mt-1 truncate text-xl font-black sm:text-2xl">{navItems.find(([id]) => id === section)?.[1] || 'مركز الإدارة'}</h1></div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[10px] font-black text-emerald-300 sm:inline-flex"><Database size={14} className="ml-2" /> Supabase Live</span>
                <button onClick={() => void loadAll()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-3.5 py-2.5 text-xs font-black text-gray-300 hover:border-[#f31325]/35 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> تحديث</button>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
              {navItems.map(([id, label, Icon]) => <button key={id} onClick={() => goSection(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black ${section === id ? 'border-[#f31325] bg-[#f31325] text-white' : 'border-white/10 bg-[#10131a] text-gray-400'}`}><Icon size={15} />{label}</button>)}
            </div>
          </header>

          <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            {message && <div className="rounded-xl border border-[#f31325]/20 bg-[#f31325]/5 px-4 py-3 text-xs font-bold text-red-200">{message}</div>}
            {error && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs font-bold text-amber-200">{error}</div>}

            {section === 'overview' && <OverviewSection metrics={metrics} data={data} sources={payload?.sources || {}} peopleById={peopleById} />}
            {section === 'users' && <UsersSection users={users} loading={usersLoading} search={search} setSearch={setSearch} actor={actor} permissions={permissions} busyId={busyId} onSuspend={(user) => void performUserAction(user.status === 'active' ? 'suspend' : 'reactivate', user.id)} onCredit={(user) => { setCreditAmount('100'); setCreditReason('إضافة رصيد بواسطة المدير العام'); setActionModal({ type: 'credit', user }); }} onRole={(user) => { setRoleValue(user.role || 'USER'); setActionModal({ type: 'role', user }); }} onDelete={(user) => void deleteUser(user)} />}
            {section === 'projects' && <ProjectsSection projects={data.projects || []} peopleById={peopleById} />}
            {section === 'finance' && <FinanceSection subscriptions={data.subscriptions || []} payments={data.payments || []} credits={data.credits || []} peopleById={peopleById} canViewCredits={permissions.viewCredits} />}
            {section === 'commercial' && permissions.viewCommercial && <CommercialSection plans={data.plans || []} packages={data.packages || []} />}
            {section === 'ai' && <AiSection generations={data.generations || []} assets={data.assets || []} peopleById={peopleById} />}
            {section === 'audit' && permissions.viewAudit && <AuditSection logs={data.auditLogs || []} peopleById={peopleById} />}
            {section === 'settings' && <SettingsSection payload={payload} />}
          </div>
        </div>
      </div>

      {actionModal && (
        <div className="fixed inset-0 z-[220] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#10131a] p-6 shadow-2xl">
            <button onClick={() => setActionModal(null)} className="absolute left-5 top-5 rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="إغلاق"><X size={18} /></button>
            {actionModal.type === 'credit' ? (
              <>
                <h2 className="flex items-center gap-2 text-xl font-black"><Coins className="text-amber-300" /> إضافة نقاط</h2>
                <p className="mt-2 text-xs text-gray-500">{actionModal.user.email}</p>
                <label className="mt-5 block text-xs font-black text-gray-400">عدد النقاط</label>
                <input type="number" min="1" max="1000000" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#181c25] p-4 text-sm outline-none focus:border-amber-400" />
                <label className="mt-4 block text-xs font-black text-gray-400">السبب</label>
                <input value={creditReason} onChange={(event) => setCreditReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#181c25] p-4 text-sm outline-none focus:border-amber-400" />
                <button disabled={busyId === actionModal.user.id} onClick={() => void performUserAction('grant_credits', actionModal.user.id, { amount: Number(creditAmount), reason: creditReason })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] py-3.5 text-sm font-black disabled:opacity-50">{busyId === actionModal.user.id && <Loader2 size={16} className="animate-spin" />} حفظ الإضافة</button>
              </>
            ) : (
              <>
                <h2 className="flex items-center gap-2 text-xl font-black"><UserCog className="text-cyan-300" /> تغيير الدور</h2>
                <p className="mt-2 text-xs text-gray-500">{actionModal.user.email}</p>
                <label className="mt-5 block text-xs font-black text-gray-400">الدور الجديد</label>
                <select value={roleValue} onChange={(event) => setRoleValue(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#181c25] p-4 text-sm outline-none focus:border-cyan-400">
                  <option value="USER">مستخدم</option><option value="SUPPORT">مشرف دعم</option><option value="ADMIN">مدير</option><option value="SUPER_ADMIN">مدير عام</option>
                </select>
                <button disabled={busyId === actionModal.user.id} onClick={() => void performUserAction('change_role', actionModal.user.id, { role: roleValue })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] py-3.5 text-sm font-black disabled:opacity-50">{busyId === actionModal.user.id && <Loader2 size={16} className="animate-spin" />} حفظ الدور</button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function OverviewSection({ metrics, data, sources, peopleById }) {
  const latestProjects = (data.projects || []).slice(0, 5);
  const latestGenerations = (data.generations || []).slice(0, 5);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="إجمالي المستخدمين" value={metrics.totalUsers ?? 0} note={`${metrics.activeUsers ?? 0} نشط · ${metrics.suspendedUsers ?? 0} موقوف`} icon={Users} />
        <MetricCard label="المشاريع" value={metrics.totalProjects ?? 0} note="مشاريع مسجلة في قاعدة البيانات" icon={FolderOpen} />
        <MetricCard label="الإيرادات المؤكدة" value={`${Number(metrics.paidRevenueLYD || 0).toLocaleString('ar-LY')} د.ل`} note={`${metrics.activeSubscriptions ?? 0} اشتراك نشط`} icon={CreditCard} />
        <MetricCard label="توليدات AI" value={metrics.totalGenerations ?? 0} note={`${metrics.completedGenerations ?? 0} مكتمل · ${metrics.failedGenerations ?? 0} فشل`} icon={Sparkles} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="أحدث المشاريع" subtitle="آخر المشاريع المحدثة فعليًا من Supabase">
          <div className="space-y-2">{latestProjects.map((project) => <div key={project.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#10131a] p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><FolderOpen size={18} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{project.name}</div><div className="mt-1 truncate text-[10px] text-gray-500">{personName(peopleById.get(project.owner_id))} · {project.type || '—'}</div></div><div className="text-[10px] text-gray-600">{formatDate(project.updated_at)}</div></div>)}{!latestProjects.length && <EmptyState text="لا توجد مشاريع حتى الآن." />}</div>
        </SectionCard>
        <SectionCard title="آخر توليدات الذكاء الاصطناعي" subtitle="الحالة والمزود والنموذج من سجل generations">
          <div className="space-y-2">{latestGenerations.map((generation) => <div key={generation.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#10131a] p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Sparkles size={18} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{generation.model || generation.generation_type}</div><div className="mt-1 truncate text-[10px] text-gray-500">{generation.provider} · {personName(peopleById.get(generation.user_id))}</div></div><StatusBadge value={generation.status} /></div>)}{!latestGenerations.length && <EmptyState text="لا توجد توليدات مسجلة." />}</div>
        </SectionCard>
      </div>
      <div className="flex flex-wrap gap-2 text-[10px]">{Object.entries(sources).map(([name, state]) => <span key={name} className={`rounded-full border px-2.5 py-1 ${state === 'ok' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' : 'border-red-500/20 bg-red-500/5 text-red-300'}`}>{name}: {state}</span>)}</div>
    </>
  );
}

function UsersSection({ users, loading, search, setSearch, actor, permissions, busyId, onSuspend, onCredit, onRole, onDelete }) {
  const normalized = search.trim().toLowerCase();
  const filtered = users.filter((user) => !normalized || `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''}`.toLowerCase().includes(normalized));
  return (
    <SectionCard title="إدارة مستخدمي المنصة" subtitle="الحسابات والأدوار والحالة والرصيد من Supabase؛ الإجراءات الحساسة تمر عبر API محمي.">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-[280px] items-center gap-2 rounded-xl border border-white/10 bg-[#151922] px-4"><Search size={16} className="text-gray-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد..." className="w-full bg-transparent py-3 text-xs outline-none placeholder:text-gray-600" /></label>
        <div className="text-xs text-gray-500">{loading ? 'جاري التحديث...' : `${filtered.length} حساب`}</div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-right text-xs"><thead className="text-gray-500"><tr className="border-b border-white/10"><th className="p-3">المستخدم</th><th className="p-3">الاتصال</th><th className="p-3">الدور</th><th className="p-3">الخطة</th><th className="p-3">الرصيد</th><th className="p-3">الحالة</th><th className="p-3">آخر ظهور</th><th className="p-3">الإجراءات</th></tr></thead><tbody className="divide-y divide-white/[.06]">{filtered.map((user) => <tr key={user.id} className="hover:bg-white/[.02]"><td className="p-3"><div className="font-black text-white">{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'بدون اسم'}</div><div className="mt-1 text-[10px] text-gray-500">{user.email}</div></td><td className="p-3"><span className={`inline-flex items-center gap-2 ${user.online ? 'text-emerald-300' : 'text-gray-600'}`}><Circle size={8} fill="currentColor" />{user.online ? 'Online' : 'Offline'}</span></td><td className="p-3 font-black text-cyan-300">{ROLE_LABELS[user.role] || user.role}</td><td className="p-3 font-black text-amber-300">{String(user.planId || 'free').toUpperCase()}</td><td className="p-3 font-black">{Number(user.creditBalance || 0).toLocaleString('ar-LY')}</td><td className="p-3"><StatusBadge value={user.status} /></td><td className="p-3 text-gray-500">{formatDate(user.lastSeenAt)}</td><td className="p-3"><div className="flex flex-wrap gap-2">{permissions.manageUsers && user.role !== 'SUPER_ADMIN' && <button disabled={busyId === user.id} onClick={() => onSuspend(user)} className="rounded-lg border border-white/10 px-3 py-2 font-black text-gray-300 hover:border-[#f31325]/40">{user.status === 'active' ? 'إيقاف' : 'تفعيل'}</button>}{permissions.manageCredits && <button onClick={() => onCredit(user)} className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 font-black text-amber-300">نقاط</button>}{permissions.changeRoles && user.id !== actor.userId && <button onClick={() => onRole(user)} className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 font-black text-cyan-300">الدور</button>}{permissions.deleteUsers && user.id !== actor.userId && user.role !== 'SUPER_ADMIN' && <button disabled={busyId === user.id} onClick={() => onDelete(user)} className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-red-300"><Trash2 size={14} /></button>}</div></td></tr>)}</tbody></table></div>
      {!filtered.length && <EmptyState text="لا توجد حسابات مطابقة." />}
    </SectionCard>
  );
}

function ProjectsSection({ projects, peopleById }) {
  return <SectionCard title="المشاريع" subtitle="قائمة فعلية بالمشاريع المسجلة، المالك والنوع وآخر تحديث.">{projects.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-xs"><thead className="text-gray-500"><tr className="border-b border-white/10"><th className="p-3">المشروع</th><th className="p-3">المالك</th><th className="p-3">النوع</th><th className="p-3">المجال</th><th className="p-3">المفضلة</th><th className="p-3">آخر تحديث</th></tr></thead><tbody className="divide-y divide-white/[.06]">{projects.map((project) => <tr key={project.id} className="hover:bg-white/[.02]"><td className="p-3 font-black text-white">{project.name}</td><td className="p-3 text-gray-300">{personName(peopleById.get(project.owner_id))}</td><td className="p-3 text-amber-300">{project.type || '—'}</td><td className="p-3 text-gray-400">{project.industry || '—'}</td><td className="p-3">{project.is_favorite ? '★' : '—'}</td><td className="p-3 text-gray-500">{formatDate(project.updated_at)}</td></tr>)}</tbody></table></div> : <EmptyState text="لا توجد مشاريع." />}</SectionCard>;
}

function FinanceSection({ subscriptions, payments, credits, peopleById, canViewCredits }) {
  return <div className="space-y-5"><SectionCard title="الاشتراكات" subtitle="الاشتراكات الفعلية وحالتها وفترتها الحالية.">{subscriptions.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-xs"><thead className="text-gray-500"><tr className="border-b border-white/10"><th className="p-3">المستخدم</th><th className="p-3">الخطة</th><th className="p-3">الحالة</th><th className="p-3">المزود</th><th className="p-3">ينتهي</th><th className="p-3">التجديد</th></tr></thead><tbody className="divide-y divide-white/[.06]">{subscriptions.map((item) => <tr key={item.id}><td className="p-3 font-black">{personName(peopleById.get(item.user_id))}</td><td className="p-3 text-amber-300">{item.plan_id}</td><td className="p-3"><StatusBadge value={item.status} /></td><td className="p-3 text-gray-400">{item.provider}</td><td className="p-3 text-gray-500">{formatDate(item.current_period_end)}</td><td className="p-3">{item.auto_renew ? 'تلقائي' : 'يدوي'}</td></tr>)}</tbody></table></div> : <EmptyState text="لا توجد اشتراكات مسجلة." />}</SectionCard><SectionCard title="المدفوعات" subtitle="المعاملات المؤكدة والمعلقة والفاشلة من payment_transactions.">{payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-right text-xs"><thead className="text-gray-500"><tr className="border-b border-white/10"><th className="p-3">المرجع</th><th className="p-3">المستخدم</th><th className="p-3">المبلغ</th><th className="p-3">النوع</th><th className="p-3">الحالة</th><th className="p-3">المزود</th><th className="p-3">التاريخ</th></tr></thead><tbody className="divide-y divide-white/[.06]">{payments.map((item) => <tr key={item.id}><td className="p-3 font-mono text-amber-300">{item.order_reference}</td><td className="p-3 font-black">{personName(peopleById.get(item.user_id))}</td><td className="p-3 font-black">{Number(item.amount_lyd || 0).toLocaleString('ar-LY')} {item.currency}</td><td className="p-3 text-gray-400">{item.item_type}</td><td className="p-3"><StatusBadge value={item.status} /></td><td className="p-3 text-gray-400">{item.provider}</td><td className="p-3 text-gray-500">{formatDate(item.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState text="لا توجد معاملات دفع." />}</SectionCard>{canViewCredits && <SectionCard title="سجل النقاط" subtitle="آخر حركات الرصيد من credit_transactions.">{credits.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead className="text-gray-500"><tr className="border-b border-white/10"><th className="p-3">المستخدم</th><th className="p-3">القيمة</th><th className="p-3">النوع</th><th className="p-3">الوصف</th><th className="p-3">التاريخ</th></tr></thead><tbody className="divide-y divide-white/[.06]">{credits.map((item) => <tr key={item.id}><td className="p-3 font-black">{personName(peopleById.get(item.user_id))}</td><td className={`p-3 font-black ${Number(item.amount) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{Number(item.amount) >= 0 ? '+' : ''}{item.amount}</td><td className="p-3 text-amber-300">{item.transaction_type}</td><td className="p-3 text-gray-400">{item.description}</td><td className="p-3 text-gray-500">{formatDate(item.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState text="لا توجد حركات نقاط." />}</SectionCard>}</div>;
}

function CommercialSection({ plans, packages }) {
  return <div className="grid gap-5 xl:grid-cols-2"><SectionCard title="خطط الاشتراك" subtitle="الأسعار والمزايا الفعلية من جدول plans."><div className="space-y-3">{plans.map((plan) => <div key={plan.id} className="rounded-2xl border border-white/[.07] bg-[#10131a] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{plan.name}</div><div className="mt-1 text-[10px] text-gray-500">{plan.id}</div></div><StatusBadge value={plan.is_active ? 'active' : 'disabled'} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-white/[.03] p-2"><b>{plan.price_monthly_lyd}</b><div className="text-[9px] text-gray-600">د.ل / شهر</div></div><div className="rounded-xl bg-white/[.03] p-2"><b>{plan.monthly_credits}</b><div className="text-[9px] text-gray-600">نقطة</div></div><div className="rounded-xl bg-white/[.03] p-2"><b>{plan.max_projects}</b><div className="text-[9px] text-gray-600">مشروع</div></div></div></div>)}{!plans.length && <EmptyState text="لا توجد خطط." />}</div></SectionCard><SectionCard title="حزم النقاط" subtitle="القيمة والسعر والمكافأة من credit_packages."><div className="space-y-3">{packages.map((pkg) => <div key={pkg.id} className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-[#10131a] p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/10 text-amber-300"><Coins size={20} /></span><div className="min-w-0 flex-1"><div className="font-black">{pkg.name}</div><div className="mt-1 text-[10px] text-gray-500">{pkg.purchased_credits} أساسي + {pkg.bonus_credits} مكافأة · صلاحية المكافأة {pkg.bonus_valid_days} يوم</div></div><div className="text-left"><div className="font-black">{pkg.price_lyd} د.ل</div><div className="text-[10px] text-amber-300">{pkg.credits} نقطة</div></div></div>)}{!packages.length && <EmptyState text="لا توجد حزم نقاط." />}</div></SectionCard></div>;
}

function AiSection({ generations, assets, peopleById }) {
  return <div className="space-y-5"><SectionCard title="توليدات الذكاء الاصطناعي" subtitle="المزود، النموذج، الحالة، التكلفة والنقاط من سجل generations.">{generations.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-right text-xs"><thead className="text-gray-500"><tr className="border-b border-white/10"><th className="p-3">المستخدم</th><th className="p-3">النوع</th><th className="p-3">المزود</th><th className="p-3">النموذج</th><th className="p-3">الحالة</th><th className="p-3">النقاط</th><th className="p-3">تكلفة المزود</th><th className="p-3">التاريخ</th></tr></thead><tbody className="divide-y divide-white/[.06]">{generations.map((item) => <tr key={item.id}><td className="p-3 font-black">{personName(peopleById.get(item.user_id))}</td><td className="p-3 text-amber-300">{item.generation_type}</td><td className="p-3 text-gray-300">{item.provider}</td><td className="p-3 font-mono text-[10px] text-gray-400">{item.model}</td><td className="p-3"><StatusBadge value={item.status} /></td><td className="p-3 font-black">{item.credits_consumed}</td><td className="p-3 text-gray-400">{item.provider_cost_usd ? `$${Number(item.provider_cost_usd).toFixed(4)}` : '—'}</td><td className="p-3 text-gray-500">{formatDate(item.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState text="لا توجد توليدات." />}</SectionCard><SectionCard title="الأصول" subtitle="الملفات المرتبطة بالمشاريع والتوليدات من assets.">{assets.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{assets.map((item) => <div key={item.id} className="rounded-2xl border border-white/[.07] bg-[#10131a] p-4"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><FileText size={18} /></span><div className="text-[10px] text-gray-600">{formatDate(item.created_at)}</div></div><div className="mt-3 truncate text-sm font-black">{item.name}</div><div className="mt-1 text-[10px] text-gray-500">{item.mime_type} · {item.width || '—'}×{item.height || '—'}</div><div className="mt-2 truncate text-[10px] text-gray-600">{personName(peopleById.get(item.user_id))}</div></div>)}</div> : <EmptyState text="لا توجد أصول محفوظة." />}</SectionCard></div>;
}

function AuditSection({ logs, peopleById }) {
  return <SectionCard title="سجل التدقيق" subtitle="الأحداث الإدارية والأمنية المسجلة في audit_logs.">{logs.length ? <div className="space-y-2">{logs.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/[.07] bg-[#10131a] p-4 sm:flex-row sm:items-center"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Activity size={18} /></span><div className="min-w-0 flex-1"><div className="text-sm font-black">{item.action}</div><div className="mt-1 truncate text-[10px] text-gray-500">{item.resource} · {item.resource_id || '—'} · {personName(peopleById.get(item.actor_id))}</div></div><div className="text-[10px] text-gray-600">{formatDate(item.created_at)}</div></div>)}</div> : <EmptyState text="لا توجد أحداث تدقيق مرئية لهذا الدور." />}</SectionCard>;
}

function SettingsSection({ payload }) {
  return <div className="grid gap-5 xl:grid-cols-2"><SectionCard title="التشغيل" subtitle="روابط تشغيلية حقيقية بدل الأزرار غير الفعالة."><div className="grid gap-3 sm:grid-cols-2"><Link href="/admin/home-content" className="rounded-2xl border border-white/10 bg-[#10131a] p-5 transition hover:border-[#f31325]/35"><Boxes className="text-[#ff3344]" /><div className="mt-4 font-black">محتوى الصفحة الرئيسية</div><div className="mt-2 text-xs leading-6 text-gray-500">إدارة البانرات والشريط الإخباري.</div></Link><a href="/api/health" target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-[#10131a] p-5 transition hover:border-[#f31325]/35"><Gauge className="text-emerald-300" /><div className="mt-4 font-black">حالة الخدمة</div><div className="mt-2 text-xs leading-6 text-gray-500">فتح Health API في تبويب جديد.</div></a></div></SectionCard><SectionCard title="حالة مصادر البيانات" subtitle="هذه الشاشة لا تعرض قيماً تجريبية؛ كل مجموعة بيانات موضحة بحالة مصدرها."><div className="space-y-2">{Object.entries(payload?.sources || {}).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl border border-white/[.07] bg-[#10131a] px-4 py-3 text-xs"><span className="font-mono text-gray-400">{key}</span><StatusBadge value={value === 'ok' ? 'success' : 'error'} /></div>)}</div><div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 text-xs leading-6 text-amber-100/80">إعدادات مزودي الذكاء والنماذج ما زالت معرفة في طبقة التطبيق وليست جدول إعدادات مستقلًا في قاعدة البيانات، لذلك لم أضع محررات وهمية لها هنا.</div></SectionCard></div>;
}
