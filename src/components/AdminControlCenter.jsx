'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
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
import AdminEzonePayPanel from './AdminEzonePayPanel';
import AdminAIIntegrationsPanel from './AdminAIIntegrationsPanel';
import AdminStoreOperationsPanel from './AdminStoreOperationsPanel';
import AdminStoreFinancialPanel from './AdminStoreFinancialPanel';

const SECTION_IDS = new Set(['overview', 'users', 'projects', 'finance', 'payments', 'store', 'commercial', 'ai', 'audit', 'settings']);
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
  if (['active', 'paid', 'completed', 'success', 'ok'].includes(status)) return 'border-[var(--bb-success)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]';
  if (['failed', 'suspended', 'cancelled', 'error'].includes(status)) return 'border-[var(--bb-danger)] bg-[var(--bb-danger-soft)] text-[var(--bb-danger)]';
  return 'border-[var(--bb-warning)] bg-[var(--bb-warning-soft)] text-[var(--bb-warning)]';
}

function Badge({ value }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${badgeClass(value)}`}>{value || '—'}</span>;
}

function Metric({ label, value, note, icon: Icon }) {
  return (
    <div className="bb-card rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="bb-text-secondary text-xs font-bold">{label}</div>
          <div className="bb-text-primary mt-2 text-2xl font-black">{value}</div>
          <div className="bb-text-tertiary mt-2 text-[10px]">{note}</div>
        </div>
        <span className="bb-accent-soft grid h-11 w-11 place-items-center rounded-xl border"><Icon size={20}/></span>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="bb-panel overflow-hidden rounded-3xl border">
      <div className="bb-divider border-b px-5 py-4">
        <h2 className="bb-text-primary font-black">{title}</h2>
        {subtitle && <p className="bb-text-tertiary mt-1 text-xs leading-6">{subtitle}</p>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <div className="bb-card bb-text-tertiary rounded-2xl border px-5 py-12 text-center text-sm">{children}</div>;
}

function Table({ headers, rows }) {
  if (!rows.length) return <Empty>لا توجد بيانات مسجلة.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="bb-text-secondary w-full min-w-[860px] text-right text-xs">
        <thead className="bb-text-tertiary"><tr className="bb-divider border-b">{headers.map((header) => <th key={header} className="p-3">{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-[var(--bb-border-subtle)]">{rows}</tbody>
      </table>
    </div>
  );
}

function SurfaceRow({ children, className = '' }) {
  return <div className={`bb-card rounded-xl border p-3 ${className}`}>{children}</div>;
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
  const section = (requestedValid === 'commercial' && !permissions.viewCommercial) || (requestedValid === 'audit' && !permissions.viewAudit) || (requestedValid === 'settings' && !permissions.viewSettings) || (requestedValid === 'ai' && !permissions.viewAI) || (requestedValid === 'store' && !(permissions.viewPayments || permissions.viewAI)) ? 'overview' : requestedValid;

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
    ...(permissions.viewPayments ? [['payments', 'Ezone Pay التجريبي', CreditCard]] : []),
    ...((permissions.viewPayments || permissions.viewAI) ? [['store', 'عمليات المتجر', Boxes]] : []),
    ...(permissions.viewCommercial ? [['commercial', 'الباقات والأسعار', WalletCards]] : []),
    ...(permissions.viewAI ? [['ai', 'الذكاء الاصطناعي والتكاملات', Sparkles]] : []),
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

  if (loading && !payload) {
    return <div className="bb-app-canvas grid min-h-[calc(100vh-5rem)] place-items-center"><div className="bb-panel bb-text-secondary flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm"><Loader2 className="bb-text-accent animate-spin" size={19}/> جاري تحميل بيانات الإدارة الفعلية...</div></div>;
  }

  if (error && !payload) {
    return <div dir="rtl" className="bb-app-canvas grid min-h-[calc(100vh-5rem)] place-items-center px-5"><div className="bb-panel max-w-lg rounded-3xl border p-8 text-center"><span className="bb-danger-surface mx-auto grid h-14 w-14 place-items-center rounded-2xl border"><ShieldCheck size={30}/></span><h1 className="bb-text-primary mt-4 text-2xl font-black">تعذر فتح مركز الإدارة</h1><p className="bb-text-secondary mt-3 text-sm">{error}</p><Link href="/dashboard" className="bb-button-secondary mt-6 inline-flex rounded-xl border px-5 py-3 text-sm font-black">العودة إلى لوحة المستخدم</Link></div></div>;
  }

  const filteredUsers = users.filter((user) => !search.trim() || `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      <div className="mx-auto flex max-w-[1800px]">
        <aside className="bb-surface-elevated bb-divider sticky top-20 hidden h-[calc(100vh-5rem)] w-72 shrink-0 border-l p-4 lg:flex lg:flex-col">
          <div className="bb-accent-soft rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <span className="bb-button-primary grid h-11 w-11 place-items-center rounded-xl"><ShieldCheck size={21}/></span>
              <div><div className="bb-text-primary font-black">مركز الإدارة</div><div className="bb-text-secondary mt-1 text-[10px]">{ROLE_LABELS[actor.role] || actor.role}</div></div>
            </div>
            <div className="bb-text-tertiary mt-3 truncate text-[10px]">{actor.email}</div>
          </div>

          <nav className="mt-5 space-y-1">
            {nav.map(([id, label, Icon]) => (
              <button key={id} onClick={() => go(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-bold transition ${section === id ? 'bb-button-primary' : 'bb-text-secondary hover:bg-[var(--bb-hover)] hover:text-[var(--bb-text-primary)]'}`}>
                <Icon size={18}/><span className="flex-1">{label}</span>{section === id && <ArrowLeft size={14}/>} 
              </button>
            ))}
          </nav>

          <div className="bb-divider mt-auto space-y-2 border-t pt-4">
            <Link href="/admin/home-content" className="bb-text-secondary flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition hover:bg-[var(--bb-hover)] hover:text-[var(--bb-text-primary)]"><Boxes size={18}/> محتوى الصفحة الرئيسية</Link>
            <Link href="/dashboard" className="bb-text-secondary flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition hover:bg-[var(--bb-hover)] hover:text-[var(--bb-text-primary)]"><ArrowLeft size={18} className="rotate-180"/> لوحة المستخدم</Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="bb-surface-elevated bb-divider sticky top-20 z-30 border-b px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1"><div className="bb-text-accent text-[10px] font-black tracking-[.2em]">ADMIN CONTROL CENTER</div><h1 className="bb-text-primary mt-1 truncate text-xl font-black">{nav.find(([id]) => id === section)?.[1]}</h1></div>
              <span className="hidden items-center gap-2 rounded-xl border border-[var(--bb-success)] bg-[var(--bb-success-soft)] px-3 py-2 text-[10px] font-black text-[var(--bb-success)] sm:flex"><Database size={14}/> Supabase Live</span>
              <button onClick={() => void loadAll()} disabled={loading} className="bb-button-secondary flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
              {nav.map(([id, label, Icon]) => <button key={id} onClick={() => go(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${section === id ? 'bb-button-primary border-[var(--bb-accent)]' : 'bb-button-secondary'}`}><Icon size={14}/>{label}</button>)}
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            {message && <div className="bb-accent-soft rounded-xl border px-4 py-3 text-xs" role="status">{message}</div>}
            {error && <div className="bb-warning-surface rounded-xl border px-4 py-3 text-xs" role="alert">{error}</div>}

            {section === 'overview' && <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="إجمالي المستخدمين" value={metrics.totalUsers || 0} note={`${metrics.activeUsers || 0} نشط · ${metrics.suspendedUsers || 0} موقوف`} icon={Users}/>
                <Metric label="المشاريع" value={metrics.totalProjects || 0} note="من جدول projects" icon={FolderOpen}/>
                <Metric label="الإيرادات المؤكدة" value={`${Number(metrics.paidRevenueLYD || 0).toLocaleString('ar-LY')} د.ل`} note={`${metrics.activeSubscriptions || 0} اشتراك نشط`} icon={CreditCard}/>
                <Metric label="توليدات AI" value={metrics.totalGenerations || 0} note={`${metrics.completedGenerations || 0} مكتمل · ${metrics.failedGenerations || 0} فشل`} icon={Sparkles}/>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <Card title="أحدث المشاريع" subtitle="بيانات فعلية من Supabase"><div className="space-y-2">{(data.projects || []).slice(0, 5).map((p) => <SurfaceRow key={p.id}><div className="bb-text-primary font-black">{p.name}</div><div className="bb-text-tertiary mt-1 text-[10px]">{personName(peopleById.get(p.owner_id))} · {formatDate(p.updated_at)}</div></SurfaceRow>)}</div></Card>
                <Card title="آخر التوليدات" subtitle="سجل generations الفعلي"><div className="space-y-2">{(data.generations || []).slice(0, 5).map((g) => <SurfaceRow key={g.id} className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="bb-text-primary truncate font-black">{g.model || g.generation_type}</div><div className="bb-text-tertiary mt-1 text-[10px]">{g.provider} · {personName(peopleById.get(g.user_id))}</div></div><Badge value={g.status}/></SurfaceRow>)}</div></Card>
              </div>
            </>}

            {section === 'users' && <Card title="إدارة المستخدمين والصلاحيات" subtitle="الحسابات والإجراءات الحساسة تمر عبر API محمي">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <label className="bb-input flex min-w-[280px] items-center gap-2 rounded-xl border px-4"><Search size={16} className="bb-text-tertiary"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد..." className="bb-text-primary w-full bg-transparent py-3 text-xs outline-none placeholder:text-[var(--bb-placeholder)]"/></label>
                <span className="bb-text-tertiary text-xs">{filteredUsers.length} حساب</span>
              </div>
              <Table headers={['المستخدم','الاتصال','الدور','الخطة','الرصيد','الحالة','آخر ظهور','الإجراءات']} rows={filteredUsers.map((u) => <tr key={u.id}>
                <td className="p-3"><div className="bb-text-primary font-black">{[u.firstName,u.lastName].filter(Boolean).join(' ') || 'بدون اسم'}</div><div className="bb-text-tertiary mt-1 text-[10px]">{u.email}</div></td>
                <td className="p-3"><span className={u.online ? 'text-[var(--bb-success)]' : 'bb-text-disabled'}><Circle size={8} className="ml-2 inline" fill="currentColor"/>{u.online ? 'Online' : 'Offline'}</span></td>
                <td className="p-3 text-[var(--bb-info)]">{ROLE_LABELS[u.role] || u.role}</td>
                <td className="p-3 text-[var(--bb-warning)]">{String(u.planId || 'free').toUpperCase()}</td>
                <td className="bb-text-primary p-3 font-black">{Number(u.creditBalance || 0).toLocaleString('ar-LY')}</td>
                <td className="p-3"><Badge value={u.status}/></td>
                <td className="bb-text-tertiary p-3">{formatDate(u.lastSeenAt)}</td>
                <td className="p-3"><div className="flex gap-2">{permissions.manageUsers && u.role !== 'SUPER_ADMIN' && <button disabled={busyId === u.id} onClick={() => void userAction(u.status === 'active' ? 'suspend' : 'reactivate', u.id)} className="bb-button-secondary rounded-lg border px-2.5 py-2">{u.status === 'active' ? 'إيقاف' : 'تفعيل'}</button>}{permissions.manageCredits && <button onClick={() => { setCreditAmount('100'); setModal({type:'credit',user:u}); }} className="rounded-lg border border-[var(--bb-warning)] px-2.5 py-2 text-[var(--bb-warning)]"><Coins size={14}/></button>}{permissions.changeRoles && u.id !== actor.userId && <button onClick={() => { setRoleValue(u.role); setModal({type:'role',user:u}); }} className="rounded-lg border border-[var(--bb-info)] px-2.5 py-2 text-[var(--bb-info)]"><UserCog size={14}/></button>}{permissions.deleteUsers && u.id !== actor.userId && u.role !== 'SUPER_ADMIN' && <button disabled={busyId === u.id} onClick={() => void deleteUser(u)} className="rounded-lg border border-[var(--bb-danger)] px-2.5 py-2 text-[var(--bb-danger)]"><Trash2 size={14}/></button>}</div></td>
              </tr>)}/>
            </Card>}

            {section === 'projects' && <Card title="المشاريع" subtitle="المشاريع المسجلة فعليًا"><Table headers={['المشروع','المالك','النوع','المجال','آخر تحديث']} rows={(data.projects || []).map((p) => <tr key={p.id}><td className="bb-text-primary p-3 font-black">{p.name}</td><td className="p-3">{personName(peopleById.get(p.owner_id))}</td><td className="p-3 text-[var(--bb-warning)]">{p.type || '—'}</td><td className="bb-text-secondary p-3">{p.industry || '—'}</td><td className="bb-text-tertiary p-3">{formatDate(p.updated_at)}</td></tr>)}/></Card>}

            {section === 'finance' && <>
              <AdminStoreFinancialPanel/>
              <Card title="الاشتراكات" subtitle="من جدول subscriptions"><Table headers={['المستخدم','الخطة','الحالة','المزود','الانتهاء']} rows={(data.subscriptions || []).map((s) => <tr key={s.id}><td className="bb-text-primary p-3 font-black">{personName(peopleById.get(s.user_id))}</td><td className="p-3 text-[var(--bb-warning)]">{s.plan_id}</td><td className="p-3"><Badge value={s.status}/></td><td className="p-3">{s.provider}</td><td className="bb-text-tertiary p-3">{formatDate(s.current_period_end)}</td></tr>)}/></Card>
              <Card title="المدفوعات" subtitle="من payment_transactions"><Table headers={['المرجع','المستخدم','المبلغ','النوع','الحالة','التاريخ']} rows={(data.payments || []).map((p) => <tr key={p.id}><td className="p-3 font-mono text-[var(--bb-warning)]">{p.order_reference}</td><td className="bb-text-primary p-3 font-black">{personName(peopleById.get(p.user_id))}</td><td className="p-3">{Number(p.amount_lyd || 0).toLocaleString('ar-LY')} {p.currency}</td><td className="p-3">{p.item_type}</td><td className="p-3"><Badge value={p.status}/></td><td className="bb-text-tertiary p-3">{formatDate(p.created_at)}</td></tr>)}/></Card>
              {permissions.viewCredits && <Card title="سجل النقاط" subtitle="من credit_transactions"><Table headers={['المستخدم','القيمة','النوع','الوصف','التاريخ']} rows={(data.credits || []).map((t) => <tr key={t.id}><td className="p-3">{personName(peopleById.get(t.user_id))}</td><td className={`p-3 font-black ${Number(t.amount)>=0?'text-[var(--bb-success)]':'text-[var(--bb-danger)]'}`}>{t.amount}</td><td className="p-3 text-[var(--bb-warning)]">{t.transaction_type}</td><td className="p-3">{t.description}</td><td className="bb-text-tertiary p-3">{formatDate(t.created_at)}</td></tr>)}/></Card>}
            </>}

            {section === 'payments' && <AdminEzonePayPanel />}
            {section === 'store' && <AdminStoreOperationsPanel />}

            {section === 'commercial' && <div className="grid gap-5 xl:grid-cols-2">
              <Card title="خطط الاشتراك" subtitle="من plans"><div className="space-y-3">{(data.plans || []).map((p) => <div key={p.id} className="bb-card rounded-2xl border p-4"><div className="flex justify-between"><b className="bb-text-primary">{p.name}</b><Badge value={p.is_active?'active':'disabled'}/></div><div className="bb-text-secondary mt-3 text-xs">{p.price_monthly_lyd} د.ل · {p.monthly_credits} نقطة · {p.max_projects} مشروع</div></div>)}</div></Card>
              <Card title="حزم النقاط" subtitle="من credit_packages"><div className="space-y-3">{(data.packages || []).map((p) => <div key={p.id} className="bb-card flex justify-between rounded-2xl border p-4"><div><b className="bb-text-primary">{p.name}</b><div className="bb-text-tertiary mt-1 text-[10px]">{p.purchased_credits} + {p.bonus_credits} مكافأة</div></div><div className="text-left"><b className="bb-text-primary">{p.price_lyd} د.ل</b><div className="mt-1 text-[10px] text-[var(--bb-warning)]">{p.credits} نقطة</div></div></div>)}</div></Card>
            </div>}

            {section === 'ai' && <>
              <AdminAIIntegrationsPanel/>
              <Card title="سجل توليدات الذكاء الاصطناعي" subtitle="بيانات فعلية من generations"><Table headers={['المستخدم','النوع','المزود','النموذج','الحالة','النقاط','تكلفة المزود','التاريخ']} rows={(data.generations || []).map((g) => <tr key={g.id}><td className="p-3">{personName(peopleById.get(g.user_id))}</td><td className="p-3 text-[var(--bb-warning)]">{g.generation_type}</td><td className="p-3">{g.provider}</td><td className="p-3 font-mono text-[10px]">{g.model}</td><td className="p-3"><Badge value={g.status}/></td><td className="p-3">{g.credits_consumed}</td><td className="p-3">{g.provider_cost_usd ? `$${Number(g.provider_cost_usd).toFixed(4)}` : '—'}</td><td className="bb-text-tertiary p-3">{formatDate(g.created_at)}</td></tr>)}/></Card>
              <Card title="الأصول" subtitle="من assets"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(data.assets || []).map((a) => <div key={a.id} className="bb-card rounded-2xl border p-4"><FileText className="bb-text-accent" size={18}/><div className="bb-text-primary mt-3 truncate font-black">{a.name}</div><div className="bb-text-tertiary mt-1 text-[10px]">{a.mime_type} · {a.width || '—'}×{a.height || '—'}</div></div>)}</div></Card>
            </>}

            {section === 'audit' && <>
              <Card title="سجل التدقيق" subtitle="audit_logs"><Table headers={['الفاعل','الدور','الإجراء','المورد','المعرف','التاريخ']} rows={(data.auditLogs || []).map((a) => <tr key={a.id}><td className="p-3">{personName(peopleById.get(a.actor_id))}</td><td className="p-3 text-[var(--bb-info)]">{ROLE_LABELS[a.actor_role] || a.actor_role}</td><td className="p-3 font-mono text-[10px] text-[var(--bb-warning)]">{a.action}</td><td className="p-3">{a.resource}</td><td className="bb-text-tertiary max-w-[180px] truncate p-3 font-mono text-[10px]">{a.resource_id || '—'}</td><td className="bb-text-tertiary p-3">{formatDate(a.created_at)}</td></tr>)}/></Card>
              <Card title="حالة المصادر" subtitle="كل قسم في هذه الصفحة مرتبط بالمصدر المشار إليه"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Object.entries(payload.sources || {}).map(([key,value]) => <div key={key} className="bb-card rounded-xl border p-3"><div className="bb-text-tertiary font-mono text-[10px]">{key}</div><div className="mt-2"><Badge value={value}/></div></div>)}</div></Card>
            </>}

            {section === 'settings' && <AdminSettingsHub sources={payload.sources || {}} />}
          </div>
        </div>
      </div>

      {modal?.type === 'credit' && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4"><div className="bb-panel w-full max-w-md rounded-3xl border p-6 shadow-[var(--bb-shadow-lg)]"><div className="flex items-center justify-between"><h3 className="bb-text-primary font-black">إضافة رصيد</h3><button onClick={() => setModal(null)} className="bb-button-secondary rounded-lg border p-2" aria-label="إغلاق"><X size={18}/></button></div><p className="bb-text-tertiary mt-2 text-xs">{modal.user.email}</p><input type="number" min="1" value={creditAmount} onChange={(e)=>setCreditAmount(e.target.value)} className="bb-input mt-5 w-full rounded-xl border p-3"/><textarea value={creditReason} onChange={(e)=>setCreditReason(e.target.value)} className="bb-input mt-3 min-h-24 w-full rounded-xl border p-3"/><button onClick={() => void userAction('grant_credits', modal.user.id, {amount:Number(creditAmount),reason:creditReason})} className="bb-button-primary mt-4 w-full rounded-xl p-3 font-black">تأكيد</button></div></div>}

      {modal?.type === 'role' && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4"><div className="bb-panel w-full max-w-md rounded-3xl border p-6 shadow-[var(--bb-shadow-lg)]"><div className="flex items-center justify-between"><h3 className="bb-text-primary font-black">تغيير الدور</h3><button onClick={() => setModal(null)} className="bb-button-secondary rounded-lg border p-2" aria-label="إغلاق"><X size={18}/></button></div><select value={roleValue} onChange={(e)=>setRoleValue(e.target.value)} className="bb-input mt-5 w-full rounded-xl border p-3"><option value="USER">USER</option><option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option><option value="OPERATIONS_MANAGER">OPERATIONS_MANAGER</option><option value="CONTENT_MANAGER">CONTENT_MANAGER</option><option value="USER_MANAGER">USER_MANAGER</option><option value="SUPPORT_AGENT">SUPPORT_AGENT</option><option value="FINANCE_MANAGER">FINANCE_MANAGER</option><option value="MARKETING_MANAGER">MARKETING_MANAGER</option><option value="SECURITY_AUDITOR">SECURITY_AUDITOR</option><option value="ANALYST">ANALYST</option><option value="SUPER_ADMIN">SUPER_ADMIN</option></select><button onClick={() => void userAction('change_role', modal.user.id, {role:roleValue})} className="bb-button-primary mt-4 w-full rounded-xl p-3 font-black">حفظ الدور</button></div></div>}
    </main>
  );
}
