'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Coins,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldQuestion,
  UserCog,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { useAuth } from '../context/AuthContext';

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const IDLE_WINDOW_MS = 10 * 60 * 1000;
const AUTO_REFRESH_MS = 30_000;

const STATUS_LABELS = {
  active: 'نشط',
  suspended: 'موقوف',
  pending: 'قيد المراجعة',
};

function badgeStyle(color, background) {
  return { color, background, borderColor: `color-mix(in srgb, ${color} 28%, transparent)` };
}

function roleStyle(role) {
  if (role === 'SUPER_ADMIN') return badgeStyle('var(--bb-danger)', 'var(--bb-danger-soft)');
  if (role === 'PLATFORM_ADMIN' || role === 'ADMIN') return badgeStyle('var(--bb-warning)', 'var(--bb-warning-soft)');
  if (role === 'SECURITY_AUDITOR' || role === 'ANALYST') return badgeStyle('var(--bb-info)', 'var(--bb-info-soft)');
  if (role === 'USER') return badgeStyle('var(--bb-text-secondary)', 'var(--bb-hover)');
  return badgeStyle('var(--bb-accent)', 'var(--bb-accent-soft)');
}

function statusStyle(status) {
  if (status === 'active') return badgeStyle('var(--bb-success)', 'var(--bb-success-soft)');
  if (status === 'suspended') return badgeStyle('var(--bb-danger)', 'var(--bb-danger-soft)');
  return badgeStyle('var(--bb-warning)', 'var(--bb-warning-soft)');
}

function presenceState(user, now) {
  if (!user?.lastSeenAt) return user?.presenceState || 'offline';
  const lastSeen = new Date(user.lastSeenAt).getTime();
  if (!Number.isFinite(lastSeen)) return user?.presenceState || 'offline';
  const age = Math.max(0, now - lastSeen);
  if (age <= ONLINE_WINDOW_MS) return 'online';
  if (age <= IDLE_WINDOW_MS) return 'idle';
  return 'offline';
}

function presenceMeta(state) {
  if (state === 'online') return { label: 'متصل الآن', color: 'var(--bb-success)', background: 'var(--bb-success-soft)', Icon: Wifi };
  if (state === 'idle') return { label: 'خامل', color: 'var(--bb-warning)', background: 'var(--bb-warning-soft)', Icon: Wifi };
  return { label: 'غير متصل', color: 'var(--bb-text-tertiary)', background: 'var(--bb-hover)', Icon: WifiOff };
}

function formatLastSeen(value, now) {
  if (!value) return 'لا يوجد نشاط مسجل بعد';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'غير معروف';
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes === 1) return 'منذ دقيقة';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'منذ ساعة';
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'منذ يوم';
  if (days < 7) return `منذ ${days} أيام`;
  return new Date(value).toLocaleString('ar-LY');
}

function adminErrorMessage(error) {
  const code = error instanceof Error ? error.message : String(error || '');
  if (code.includes('ROLE_UPDATE_VERIFICATION_FAILED')) return 'لم يتم تأكيد حفظ الدور الجديد في قاعدة البيانات. لم يعتبر النظام العملية ناجحة.';
  if (code.includes('SELF_DEMOTION')) return 'لا يمكنك خفض صلاحيات حسابك الإداري من هذه الشاشة.';
  if (code.includes('LAST_SUPER_ADMIN') || code.includes('last active SUPER_ADMIN')) return 'لا يمكن خفض صلاحيات آخر مدير عام نشط في المنصة.';
  if (code.includes('SUPER_ADMIN') || code.includes('FORBIDDEN') || code.includes('ROLE_ASSIGNMENT')) return 'تغيير أدوار المستخدمين متاح للمدير العام فقط وفق سياسة الصلاحيات.';
  if (code.includes('INVALID_ROLE')) return 'الدور المختار غير صالح أو غير قابل للتعيين.';
  if (code.includes('CREDIT_ADJUSTMENT_FORBIDDEN')) return 'حسابك لا يملك صلاحية تعديل رصيد هذا المستخدم.';
  if (code.includes('USER_NOT_FOUND')) return 'المستخدم غير موجود أو لم يعد متاحًا.';
  if (code.includes('UNAUTHORIZED')) return 'انتهت جلسة الإدارة أو لم تعد صالحة. أعد تسجيل الدخول.';
  return code || 'تعذر تنفيذ العملية.';
}

export default function AdminUsersRolesPanelV2() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { role, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [owner, setOwner] = useState(null);
  const [capabilities, setCapabilities] = useState({ canAssignRoles: false });
  const [actorRole, setActorRole] = useState(role);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [presenceFilter, setPresenceFilter] = useState('');
  const [adminOnly, setAdminOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleModal, setRoleModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [reason, setReason] = useState('');

  const effectiveNow = clockTick + serverOffsetMs;
  const roleMap = useMemo(() => new Map(roles.map((item) => [item.role, item])), [roles]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  }, [supabase]);

  const api = useCallback(async (url, options = {}) => {
    const token = await getToken();
    if (!token) throw new Error('UNAUTHORIZED');
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'ADMIN_ACTION_FAILED');
    return payload;
  }, [getToken]);

  const loadRoles = useCallback(async () => {
    const payload = await api('/api/v1/admin/roles');
    setRoles(Array.isArray(payload.roles) ? payload.roles : []);
    setOwner(payload.owner || null);
    setCapabilities(payload.capabilities || { canAssignRoles: false });
    setActorRole(payload.actorRole || role);
  }, [api, role]);

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else {
      setLoading(true);
      setError('');
    }

    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (query.trim()) params.set('q', query.trim());
      if (status) params.set('status', status);
      if (roleFilter) params.set('role', roleFilter);
      if (adminOnly && !roleFilter) params.set('adminOnly', '1');
      const payload = await api(`/api/v1/admin/users?${params.toString()}`);
      setUsers(Array.isArray(payload.users) ? payload.users : []);
      setPages(payload.pages || 1);
      setTotal(payload.total || 0);
      setActorRole(payload.actorRole || role);
      const serverNow = Date.parse(payload.serverNow || '');
      if (Number.isFinite(serverNow)) setServerOffsetMs(serverNow - Date.now());
      setLastRefreshAt(new Date());
    } catch (err) {
      if (!silent) setError(adminErrorMessage(err));
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [adminOnly, api, page, query, role, roleFilter, status]);

  useEffect(() => {
    if (authLoading) return undefined;
    const timer = window.setTimeout(() => {
      void Promise.all([loadRoles(), loadUsers()]).catch((err) => {
        setError(adminErrorMessage(err));
        setLoading(false);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [authLoading, loadRoles, loadUsers]);

  useEffect(() => {
    const interval = window.setInterval(() => setClockTick(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible' && !busy) void loadUsers({ silent: true });
    };
    const interval = window.setInterval(refresh, AUTO_REFRESH_MS);
    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authLoading, busy, loadUsers]);

  const executePatch = async (body) => {
    setBusy(`${body.action}:${body.userId}`);
    setError('');
    setMessage('');
    try {
      const result = await api('/api/v1/admin/users', { method: 'PATCH', body: JSON.stringify(body) });
      if (body.action === 'change_role' && result.role) {
        setUsers((current) => current.map((user) => user.id === body.userId ? { ...user, role: result.role, roleLabelAr: result.roleLabelAr || roleMap.get(result.role)?.labelAr || result.role } : user));
        setMessage(`تم تغيير دور ${selectedUser?.email || 'المستخدم'} إلى ${result.roleLabelAr || roleMap.get(result.role)?.labelAr || result.role} وتأكيد الحفظ في قاعدة البيانات.`);
      } else if (body.action === 'grant_credits') {
        setMessage(`تمت إضافة الرصيد إلى ${selectedUser?.email || 'المستخدم'} وتسجيل العملية.`);
      } else if (body.action === 'suspend') {
        setMessage(`تم إيقاف حساب ${selectedUser?.email || 'المستخدم'} وتسجيل السبب.`);
      } else if (body.action === 'reactivate') {
        setMessage('تم تفعيل الحساب من جديد.');
      }
      setRoleModal(false);
      setCreditModal(false);
      setSuspendModal(false);
      setReason('');
      setCreditAmount('');
      await loadUsers({ silent: true });
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const usersWithPresence = useMemo(() => users.map((user) => ({ ...user, livePresence: presenceState(user, effectiveNow) })), [effectiveNow, users]);
  const visibleUsers = useMemo(() => presenceFilter ? usersWithPresence.filter((user) => user.livePresence === presenceFilter) : usersWithPresence, [presenceFilter, usersWithPresence]);
  const onlineCount = usersWithPresence.filter((user) => user.livePresence === 'online').length;
  const idleCount = usersWithPresence.filter((user) => user.livePresence === 'idle').length;
  const canChangeRoles = Boolean(capabilities.canAssignRoles);
  const canAdjustCredits = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'FINANCE_MANAGER'].includes(actorRole);
  const canSuspend = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'USER_MANAGER'].includes(actorRole);
  const assignableAdminRoles = roles.filter((item) => item.assignableByActor && !item.legacy && item.role !== 'USER');
  const userRole = roles.find((item) => item.role === 'USER');
  const roleChoices = userRole?.assignableByActor ? [...assignableAdminRoles, userRole] : assignableAdminRoles;

  if (authLoading) {
    return <div className="bb-text-secondary py-20 text-center text-sm">جاري التحقق من الصلاحيات...</div>;
  }

  return (
    <div dir="rtl" className="bb-app-canvas mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="bb-panel flex flex-col gap-4 rounded-3xl border p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="bb-text-tertiary mb-2 text-xs">لوحة الإدارة / المستخدمون والأدوار</div>
          <h1 className="flex items-center gap-2 text-2xl font-black"><Users className="bb-text-accent" /> إدارة المستخدمين والأدوار</h1>
          <p className="bb-text-secondary mt-2 max-w-3xl text-sm leading-6">حالة الاتصال مبنية على نشاط فعلي من الحساب، وآخر ظهور يتحدث تلقائيًا. تغيير الدور لا يظهر ناجحًا إلا بعد تأكيد الحفظ من الخادم.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="bb-card bb-text-tertiary rounded-xl border px-3 py-2 text-[10px]">تحديث تلقائي كل 30 ثانية{lastRefreshAt ? ` · ${lastRefreshAt.toLocaleTimeString('ar-LY')}` : ''}</span>
          <Link href="/admin" className="bb-button-secondary rounded-xl border px-4 py-2 text-xs font-bold">مركز الإدارة</Link>
          <button onClick={() => { void loadRoles(); void loadUsers({ silent: true }); }} disabled={refreshing} className="bb-button-primary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> تحديث</button>
        </div>
      </div>

      {error && <div className="bb-danger-surface rounded-2xl border px-4 py-3 text-sm">{error}</div>}
      {message && <div className="flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm" style={{ background: 'var(--bb-success-soft)', color: 'var(--bb-success)', borderColor: 'color-mix(in srgb, var(--bb-success) 25%, transparent)' }}><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{message}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="إجمالي النتائج" value={total.toLocaleString('ar-LY')} />
        <Metric label="الحضور في الصفحة الحالية" value={`${onlineCount} متصل${idleCount > 0 ? ` · ${idleCount} خامل` : ''}`} tone="success" compact />
        <Metric label="دورك الحالي" value={roleMap.get(actorRole)?.labelAr || actorRole} tone="warning" compact />
        <Metric label="الأدوار القابلة للتعيين" value={assignableAdminRoles.length} />
      </div>

      <div className="bb-divider flex gap-2 border-b pb-3">
        <button onClick={() => setTab('users')} className={`rounded-xl px-4 py-2 text-xs font-black ${tab === 'users' ? 'bb-button-primary' : 'bb-button-secondary'}`}>المستخدمون</button>
        <button onClick={() => setTab('roles')} className={`rounded-xl px-4 py-2 text-xs font-black ${tab === 'roles' ? 'bb-button-primary' : 'bb-button-secondary'}`}>الأدوار والصلاحيات</button>
      </div>

      {tab === 'users' ? (
        <div className="space-y-4">
          <div className="bb-panel grid gap-3 rounded-2xl border p-4 md:grid-cols-2 xl:grid-cols-[1fr_160px_180px_180px_auto]">
            <label className="relative"><Search className="bb-text-tertiary absolute right-3 top-3" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ابحث بالاسم أو البريد..." className="bb-input w-full rounded-xl border py-2.5 pr-10 pl-3 text-sm outline-none" /></label>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="bb-input rounded-xl border px-3 py-2.5 text-sm"><option value="">كل الحالات</option><option value="active">نشط</option><option value="suspended">موقوف</option><option value="pending">قيد المراجعة</option></select>
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setAdminOnly(false); setPage(1); }} className="bb-input rounded-xl border px-3 py-2.5 text-sm"><option value="">كل الأدوار</option>{roles.map((item) => <option key={item.role} value={item.role}>{item.labelAr}</option>)}</select>
            <select value={presenceFilter} onChange={(event) => setPresenceFilter(event.target.value)} className="bb-input rounded-xl border px-3 py-2.5 text-sm"><option value="">كل حالات الاتصال</option><option value="online">متصل الآن</option><option value="idle">خامل</option><option value="offline">غير متصل</option></select>
            <div className="flex gap-2"><button onClick={() => { setAdminOnly((value) => !value); setRoleFilter(''); setPage(1); }} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${adminOnly ? 'bb-accent-soft' : 'bb-button-secondary'}`}>المسؤولون فقط</button><button onClick={() => void loadUsers({ silent: true })} className="bb-button-secondary rounded-xl border px-4 py-2.5 text-xs font-bold">تطبيق</button></div>
          </div>

          <div className="bb-panel overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[1250px] text-right text-xs">
              <thead className="bb-surface-1 bb-text-secondary bb-divider border-b"><tr><th className="p-4">المستخدم</th><th className="p-4">الاتصال</th><th className="p-4">الدور</th><th className="p-4">الخطة</th><th className="p-4">الرصيد</th><th className="p-4">الحالة</th><th className="p-4">آخر ظهور</th><th className="p-4">الإجراءات</th></tr></thead>
              <tbody className="divide-y divide-[var(--bb-border-subtle)]">
                {loading ? <tr><td colSpan="8" className="bb-text-tertiary p-12 text-center"><Loader2 size={20} className="mx-auto mb-2 animate-spin" />جاري تحميل المستخدمين...</td></tr> : visibleUsers.length === 0 ? <tr><td colSpan="8" className="bb-text-tertiary p-12 text-center">لا توجد نتائج مطابقة.</td></tr> : visibleUsers.map((user) => {
                  const presence = presenceMeta(user.livePresence);
                  const PresenceIcon = presence.Icon;
                  return <tr key={user.id} className="bb-hoverable">
                    <td className="p-4"><div className="font-bold">{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'بدون اسم'}</div><div className="bb-text-tertiary mt-1 text-[11px]">{user.email}</div></td>
                    <td className="p-4"><span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bold" style={{ color: presence.color, background: presence.background, borderColor: `color-mix(in srgb, ${presence.color} 25%, transparent)` }}><span className="h-2 w-2 rounded-full" style={{ background: presence.color }} /><PresenceIcon size={12}/>{presence.label}</span></td>
                    <td className="p-4"><span className="rounded-full border px-2.5 py-1 font-bold" style={roleStyle(user.role)}>{user.roleLabelAr || roleMap.get(user.role)?.labelAr || user.role}</span>{user.role !== 'USER' && <div className="bb-text-tertiary mt-1 text-[10px]">حساب إداري</div>}</td>
                    <td className="p-4 font-bold uppercase">{user.planId || 'free'}</td>
                    <td className="bb-text-accent p-4 font-black">{Number(user.creditBalance || 0).toLocaleString('ar-LY')}</td>
                    <td className="p-4"><span className="rounded-full border px-2.5 py-1 font-bold" style={statusStyle(user.status)}>{STATUS_LABELS[user.status] || user.status}</span></td>
                    <td className="p-4"><div className="bb-text-secondary font-bold">{formatLastSeen(user.lastSeenAt, effectiveNow)}</div>{user.lastSeenAt && <div className="bb-text-disabled mt-1 whitespace-nowrap text-[10px]">{new Date(user.lastSeenAt).toLocaleString('ar-LY')}</div>}</td>
                    <td className="p-4"><div className="flex flex-wrap gap-2">
                      {canChangeRoles && <button onClick={() => { setSelectedUser(user); setSelectedRole(user.role); setRoleModal(true); setMessage(''); }} className="bb-button-secondary rounded-lg border px-2.5 py-1.5 font-bold" style={{ color: 'var(--bb-warning)' }}><UserCog size={13} className="ml-1 inline" />الصلاحيات</button>}
                      {canAdjustCredits && <button onClick={() => { setSelectedUser(user); setCreditModal(true); setMessage(''); }} className="bb-button-secondary rounded-lg border px-2.5 py-1.5 font-bold" style={{ color: 'var(--bb-success)' }}><Coins size={13} className="ml-1 inline" />الرصيد</button>}
                      {canSuspend && user.role !== 'SUPER_ADMIN' && (user.status === 'suspended' ? <button disabled={!!busy} onClick={() => { setSelectedUser(user); void executePatch({ action: 'reactivate', userId: user.id }); }} className="bb-button-secondary rounded-lg border px-2.5 py-1.5 font-bold" style={{ color: 'var(--bb-success)' }}><BadgeCheck size={13} className="ml-1 inline" />تفعيل</button> : <button onClick={() => { setSelectedUser(user); setSuspendModal(true); setMessage(''); }} className="bb-button-secondary rounded-lg border px-2.5 py-1.5 font-bold" style={{ color: 'var(--bb-danger)' }}><Ban size={13} className="ml-1 inline" />إيقاف</button>)}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <div className="bb-text-secondary flex items-center justify-between text-xs"><span>صفحة {page} من {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="bb-button-secondary rounded-lg border px-3 py-2 disabled:opacity-30">السابق</button><button disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="bb-button-secondary rounded-lg border px-3 py-2 disabled:opacity-30">التالي</button></div></div>
        </div>
      ) : (
        <div className="space-y-4">
          {owner && <div className="bb-danger-surface rounded-2xl border p-5"><div className="flex items-center gap-2 font-black"><KeyRound size={18} /> {owner.labelAr}</div><p className="mt-2 text-sm leading-6">{owner.descriptionAr}</p><div className="mt-3 text-xs font-bold">غير قابل للتعيين أو النقل من واجهة الإدارة.</div></div>}
          <div className="grid gap-4 lg:grid-cols-2">
            {roles.filter((item) => item.role !== 'USER').map((item) => <article key={item.role} className="bb-panel rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><ShieldCheck size={18} className="bb-text-accent" /><h3 className="font-black">{item.labelAr}</h3></div><div className="bb-text-tertiary mt-1 text-xs">{item.labelEn} · {item.role}</div></div><span className="rounded-full border px-2.5 py-1 text-[10px] font-bold" style={roleStyle(item.role)}>{item.riskTier}</span></div>
              <p className="bb-text-secondary mt-4 text-sm leading-6">{item.descriptionAr}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl border p-3" style={{ background: 'var(--bb-success-soft)', borderColor: 'color-mix(in srgb, var(--bb-success) 20%, transparent)' }}><div className="text-xs font-black" style={{ color: 'var(--bb-success)' }}>المسؤوليات الرئيسية</div><ul className="bb-text-secondary mt-2 space-y-1.5 text-xs leading-5">{(item.responsibilitiesAr || []).map((text) => <li key={text}>• {text}</li>)}</ul></div><div className="bb-danger-surface rounded-xl border p-3"><div className="text-xs font-black">القيود والممنوعات</div><ul className="bb-text-secondary mt-2 space-y-1.5 text-xs leading-5">{(item.restrictionsAr || []).map((text) => <li key={text}>• {text}</li>)}</ul></div></div>
              <div className="mt-4 flex flex-wrap gap-1.5">{(item.permissions || []).slice(0, 12).map((permission) => <span key={permission} className="bb-card bb-text-secondary rounded-lg border px-2 py-1 text-[10px]">{permission}</span>)}{(item.permissions || []).length > 12 && <span className="bb-card bb-text-secondary rounded-lg border px-2 py-1 text-[10px]">+{item.permissions.length - 12}</span>}</div>
            </article>)}
          </div>
        </div>
      )}

      {roleModal && selectedUser && <ModalShell><div className="flex items-center gap-2 text-lg font-black"><ShieldQuestion className="bb-text-warning" /> تغيير صلاحيات المستخدم</div><p className="bb-text-secondary mt-2 text-sm">{selectedUser.email} · الدور الحالي: <strong>{selectedUser.roleLabelAr || roleMap.get(selectedUser.role)?.labelAr || selectedUser.role}</strong></p><div className="mt-5 grid max-h-[56vh] gap-3 overflow-y-auto">{roleChoices.map((item) => <button key={item.role} onClick={() => setSelectedRole(item.role)} className={`rounded-2xl border p-4 text-right ${selectedRole === item.role ? 'bb-accent-soft' : 'bb-card bb-hoverable'}`}><div className="font-black">{item.role === 'USER' ? 'إزالة الصلاحيات الإدارية — ' : ''}{item.labelAr} <span className="bb-text-tertiary text-xs font-normal">({item.labelEn})</span></div><p className="bb-text-secondary mt-2 text-xs leading-5">{item.descriptionAr}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl p-2 text-[11px]" style={{ background: 'var(--bb-success-soft)' }}><span className="font-bold" style={{ color: 'var(--bb-success)' }}>يسمح له:</span> <span className="bb-text-secondary">{(item.responsibilitiesAr || []).slice(0, 2).join(' · ')}</span></div><div className="bb-danger-surface rounded-xl p-2 text-[11px]"><span className="font-bold">لا يسمح له:</span> <span className="bb-text-secondary">{(item.restrictionsAr || []).slice(0, 2).join(' · ')}</span></div></div></button>)}</div><div className="bb-warning-surface mt-5 rounded-xl border p-3 text-xs leading-5">يتم التحقق من التغيير بعد الكتابة في قاعدة البيانات وتسجيله في Audit Log. لا يمكن تعيين OWNER، ولا خفض آخر SUPER_ADMIN، ولا تجاوز صلاحيات الحساب المنفذ.</div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setRoleModal(false)} className="bb-button-secondary rounded-xl border px-4 py-2 text-xs">إلغاء</button><button disabled={!selectedRole || selectedRole === selectedUser.role || !!busy} onClick={() => void executePatch({ action: 'change_role', userId: selectedUser.id, role: selectedRole })} className="bb-button-primary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-40">{busy.startsWith('change_role:') && <Loader2 size={14} className="animate-spin"/>} تأكيد تغيير الصلاحيات</button></div></ModalShell>}

      {creditModal && selectedUser && <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4"><form onSubmit={(event) => { event.preventDefault(); void executePatch({ action: 'grant_credits', userId: selectedUser.id, amount: Number(creditAmount), reason }); }} className="bb-surface-elevated w-full max-w-lg rounded-3xl border border-[var(--bb-border)] p-6"><h3 className="text-lg font-black">إضافة رصيد للمستخدم</h3><p className="bb-text-tertiary mt-1 text-xs">{selectedUser.email}</p><input type="number" min="1" step="1" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} placeholder="عدد النقاط" className="bb-input mt-5 w-full rounded-xl border p-3" required /><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب إضافة الرصيد" className="bb-input mt-3 min-h-24 w-full rounded-xl border p-3" required /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCreditModal(false)} className="bb-button-secondary rounded-xl border px-4 py-2 text-xs">إلغاء</button><button disabled={!!busy} className="rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50" style={{ background: 'var(--bb-success)', color: 'var(--bb-text-inverse)' }}>إضافة الرصيد</button></div></form></div>}

      {suspendModal && selectedUser && <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4"><form onSubmit={(event) => { event.preventDefault(); void executePatch({ action: 'suspend', userId: selectedUser.id, reason }); }} className="bb-surface-elevated w-full max-w-lg rounded-3xl border p-6" style={{ borderColor: 'color-mix(in srgb, var(--bb-danger) 24%, transparent)' }}><h3 className="text-lg font-black" style={{ color: 'var(--bb-danger)' }}>إيقاف حساب</h3><p className="bb-text-secondary mt-2 text-sm">سيتم إيقاف {selectedUser.email}. يجب تسجيل سبب واضح للعملية.</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب الإيقاف" className="bb-input mt-4 min-h-24 w-full rounded-xl border p-3" required /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setSuspendModal(false)} className="bb-button-secondary rounded-xl border px-4 py-2 text-xs">إلغاء</button><button disabled={!!busy} className="rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50" style={{ background: 'var(--bb-danger)', color: 'var(--bb-text-inverse)' }}>تأكيد الإيقاف</button></div></form></div>}
    </div>
  );
}

function Metric({ label, value, tone = 'default', compact = false }) {
  const color = tone === 'success' ? 'var(--bb-success)' : tone === 'warning' ? 'var(--bb-warning)' : 'var(--bb-text-primary)';
  const background = tone === 'success' ? 'var(--bb-success-soft)' : tone === 'warning' ? 'var(--bb-warning-soft)' : 'var(--bb-card)';
  return <div className="bb-card rounded-2xl border p-4" style={{ background }}><div className="bb-text-tertiary text-xs">{label}</div><div className={`${compact ? 'text-lg' : 'text-2xl'} mt-1 font-black`} style={{ color }}>{value}</div></div>;
}

function ModalShell({ children }) {
  return <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4"><div className="bb-surface-elevated w-full max-w-3xl rounded-3xl border border-[var(--bb-border)] p-6">{children}</div></div>;
}
