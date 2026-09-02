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

function roleTone(role) {
  if (role === 'SUPER_ADMIN') return 'border-red-500/35 bg-red-500/10 text-red-300';
  if (role === 'PLATFORM_ADMIN' || role === 'ADMIN') return 'border-amber-500/35 bg-amber-500/10 text-amber-300';
  if (role === 'SECURITY_AUDITOR' || role === 'ANALYST') return 'border-sky-500/35 bg-sky-500/10 text-sky-300';
  if (role === 'USER') return 'border-white/10 bg-white/5 text-gray-300';
  return 'border-violet-500/35 bg-violet-500/10 text-violet-300';
}

function statusTone(status) {
  if (status === 'active') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
  if (status === 'suspended') return 'border-red-500/25 bg-red-500/10 text-red-300';
  return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
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
  if (state === 'online') {
    return { label: 'متصل الآن', cls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400', Icon: Wifi };
  }
  if (state === 'idle') {
    return { label: 'خامل', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400', Icon: Wifi };
  }
  return { label: 'غير متصل', cls: 'border-white/10 bg-white/5 text-gray-400', dot: 'bg-gray-500', Icon: WifiOff };
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
        setUsers((current) => current.map((user) => user.id === body.userId
          ? { ...user, role: result.role, roleLabelAr: result.roleLabelAr || roleMap.get(result.role)?.labelAr || result.role }
          : user));
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

  const usersWithPresence = useMemo(() => users.map((user) => ({
    ...user,
    livePresence: presenceState(user, effectiveNow),
  })), [effectiveNow, users]);

  const visibleUsers = useMemo(() => presenceFilter
    ? usersWithPresence.filter((user) => user.livePresence === presenceFilter)
    : usersWithPresence, [presenceFilter, usersWithPresence]);

  const onlineCount = usersWithPresence.filter((user) => user.livePresence === 'online').length;
  const idleCount = usersWithPresence.filter((user) => user.livePresence === 'idle').length;
  const canChangeRoles = Boolean(capabilities.canAssignRoles);
  const canAdjustCredits = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'FINANCE_MANAGER'].includes(actorRole);
  const canSuspend = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'USER_MANAGER'].includes(actorRole);
  const assignableAdminRoles = roles.filter((item) => item.assignableByActor && !item.legacy && item.role !== 'USER');
  const userRole = roles.find((item) => item.role === 'USER');
  const roleChoices = userRole?.assignableByActor ? [...assignableAdminRoles, userRole] : assignableAdminRoles;

  if (authLoading) {
    return <div className="py-20 text-center text-sm text-gray-400">جاري التحقق من الصلاحيات...</div>;
  }

  return (
    <div dir="rtl" className="mx-auto max-w-[1600px] space-y-6 p-4 text-white sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-gray-500">لوحة الإدارة / المستخدمون والأدوار</div>
          <h1 className="flex items-center gap-2 text-2xl font-black"><Users className="text-[#FF2E4C]" /> إدارة المستخدمين والأدوار</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">حالة الاتصال مبنية على نشاط فعلي من الحساب، وآخر ظهور يتحدث تلقائيًا. تغيير الدور لا يظهر ناجحًا إلا بعد تأكيد الحفظ من الخادم.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-gray-500">تحديث تلقائي كل 30 ثانية{lastRefreshAt ? ` · ${lastRefreshAt.toLocaleTimeString('ar-LY')}` : ''}</span>
          <Link href="/admin" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 hover:text-white">مركز الإدارة</Link>
          <button onClick={() => { void loadRoles(); void loadUsers({ silent: true }); }} disabled={refreshing} className="flex items-center gap-2 rounded-xl bg-[#FF2E4C] px-4 py-2 text-xs font-black disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> تحديث</button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {message && <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{message}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-4"><div className="text-xs text-gray-500">إجمالي النتائج</div><div className="mt-1 text-2xl font-black">{total.toLocaleString('ar-LY')}</div></div>
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4"><div className="text-xs text-gray-500">الحضور في الصفحة الحالية</div><div className="mt-1 flex items-baseline gap-2"><span className="text-2xl font-black text-emerald-400">{onlineCount}</span><span className="text-xs text-gray-500">متصل</span>{idleCount > 0 && <span className="text-xs text-amber-400">· {idleCount} خامل</span>}</div></div>
        <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-4"><div className="text-xs text-gray-500">دورك الحالي</div><div className="mt-1 text-lg font-black text-amber-300">{roleMap.get(actorRole)?.labelAr || actorRole}</div></div>
        <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-4"><div className="text-xs text-gray-500">الأدوار القابلة للتعيين</div><div className="mt-1 text-2xl font-black">{assignableAdminRoles.length}</div></div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-3">
        <button onClick={() => setTab('users')} className={`rounded-xl px-4 py-2 text-xs font-black ${tab === 'users' ? 'bg-[#FF2E4C]' : 'bg-white/5 text-gray-400'}`}>المستخدمون</button>
        <button onClick={() => setTab('roles')} className={`rounded-xl px-4 py-2 text-xs font-black ${tab === 'roles' ? 'bg-[#FF2E4C]' : 'bg-white/5 text-gray-400'}`}>الأدوار والصلاحيات</button>
      </div>

      {tab === 'users' ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#0f1118] p-4 md:grid-cols-2 xl:grid-cols-[1fr_160px_180px_180px_auto]">
            <label className="relative"><Search className="absolute right-3 top-3 text-gray-500" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ابحث بالاسم أو البريد..." className="w-full rounded-xl border border-white/10 bg-[#07080c] py-2.5 pr-10 pl-3 text-sm outline-none focus:border-[#FF2E4C]/50" /></label>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-[#07080c] px-3 py-2.5 text-sm"><option value="">كل الحالات</option><option value="active">نشط</option><option value="suspended">موقوف</option><option value="pending">قيد المراجعة</option></select>
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setAdminOnly(false); setPage(1); }} className="rounded-xl border border-white/10 bg-[#07080c] px-3 py-2.5 text-sm"><option value="">كل الأدوار</option>{roles.map((item) => <option key={item.role} value={item.role}>{item.labelAr}</option>)}</select>
            <select value={presenceFilter} onChange={(event) => setPresenceFilter(event.target.value)} className="rounded-xl border border-white/10 bg-[#07080c] px-3 py-2.5 text-sm"><option value="">كل حالات الاتصال</option><option value="online">متصل الآن</option><option value="idle">خامل</option><option value="offline">غير متصل</option></select>
            <div className="flex gap-2"><button onClick={() => { setAdminOnly((value) => !value); setRoleFilter(''); setPage(1); }} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${adminOnly ? 'border-[#FF2E4C]/50 bg-[#FF2E4C]/10 text-[#ff5364]' : 'border-white/10 bg-white/5 text-gray-300'}`}>المسؤولون فقط</button><button onClick={() => void loadUsers({ silent: true })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold">تطبيق</button></div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f1118]">
            <table className="w-full min-w-[1250px] text-right text-xs">
              <thead className="border-b border-white/10 bg-[#090a0f] text-gray-400"><tr><th className="p-4">المستخدم</th><th className="p-4">الاتصال</th><th className="p-4">الدور</th><th className="p-4">الخطة</th><th className="p-4">الرصيد</th><th className="p-4">الحالة</th><th className="p-4">آخر ظهور</th><th className="p-4">الإجراءات</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {loading ? <tr><td colSpan="8" className="p-12 text-center text-gray-500"><Loader2 size={20} className="mx-auto mb-2 animate-spin" />جاري تحميل المستخدمين...</td></tr> : visibleUsers.length === 0 ? <tr><td colSpan="8" className="p-12 text-center text-gray-500">لا توجد نتائج مطابقة.</td></tr> : visibleUsers.map((user) => {
                  const presence = presenceMeta(user.livePresence);
                  const PresenceIcon = presence.Icon;
                  return <tr key={user.id} className="hover:bg-white/[.02]">
                    <td className="p-4"><div className="font-bold text-white">{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'بدون اسم'}</div><div className="mt-1 text-[11px] text-gray-500">{user.email}</div></td>
                    <td className="p-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bold ${presence.cls}`}><span className={`h-2 w-2 rounded-full ${presence.dot}`} /><PresenceIcon size={12}/>{presence.label}</span></td>
                    <td className="p-4"><span className={`rounded-full border px-2.5 py-1 font-bold ${roleTone(user.role)}`}>{user.roleLabelAr || roleMap.get(user.role)?.labelAr || user.role}</span>{user.role !== 'USER' && <div className="mt-1 text-[10px] text-gray-500">حساب إداري</div>}</td>
                    <td className="p-4 font-bold uppercase">{user.planId || 'free'}</td>
                    <td className="p-4 font-black text-[#ff4a5d]">{Number(user.creditBalance || 0).toLocaleString('ar-LY')}</td>
                    <td className="p-4"><span className={`rounded-full border px-2.5 py-1 font-bold ${statusTone(user.status)}`}>{STATUS_LABELS[user.status] || user.status}</span></td>
                    <td className="p-4"><div className="font-bold text-gray-300">{formatLastSeen(user.lastSeenAt, effectiveNow)}</div>{user.lastSeenAt && <div className="mt-1 whitespace-nowrap text-[10px] text-gray-600">{new Date(user.lastSeenAt).toLocaleString('ar-LY')}</div>}</td>
                    <td className="p-4"><div className="flex flex-wrap gap-2">
                      {canChangeRoles && <button onClick={() => { setSelectedUser(user); setSelectedRole(user.role); setRoleModal(true); setMessage(''); }} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 font-bold text-amber-300"><UserCog size={13} className="ml-1 inline" />الصلاحيات</button>}
                      {canAdjustCredits && <button onClick={() => { setSelectedUser(user); setCreditModal(true); setMessage(''); }} className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 font-bold text-emerald-300"><Coins size={13} className="ml-1 inline" />الرصيد</button>}
                      {canSuspend && user.role !== 'SUPER_ADMIN' && (user.status === 'suspended' ? <button disabled={!!busy} onClick={() => { setSelectedUser(user); void executePatch({ action: 'reactivate', userId: user.id }); }} className="rounded-lg border border-emerald-500/25 px-2.5 py-1.5 font-bold text-emerald-300"><BadgeCheck size={13} className="ml-1 inline" />تفعيل</button> : <button onClick={() => { setSelectedUser(user); setSuspendModal(true); setMessage(''); }} className="rounded-lg border border-red-500/25 px-2.5 py-1.5 font-bold text-red-300"><Ban size={13} className="ml-1 inline" />إيقاف</button>)}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400"><span>صفحة {page} من {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">السابق</button><button disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">التالي</button></div></div>
        </div>
      ) : (
        <div className="space-y-4">
          {owner && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5"><div className="flex items-center gap-2 font-black text-red-200"><KeyRound size={18} /> {owner.labelAr}</div><p className="mt-2 text-sm leading-6 text-red-100/70">{owner.descriptionAr}</p><div className="mt-3 text-xs font-bold text-red-300">غير قابل للتعيين أو النقل من واجهة الإدارة.</div></div>}
          <div className="grid gap-4 lg:grid-cols-2">
            {roles.filter((item) => item.role !== 'USER').map((item) => <article key={item.role} className="rounded-2xl border border-white/10 bg-[#0f1118] p-5">
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#ff4354]" /><h3 className="font-black">{item.labelAr}</h3></div><div className="mt-1 text-xs text-gray-500">{item.labelEn} · {item.role}</div></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${roleTone(item.role)}`}>{item.riskTier}</span></div>
              <p className="mt-4 text-sm leading-6 text-gray-400">{item.descriptionAr}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3"><div className="text-xs font-black text-emerald-300">المسؤوليات الرئيسية</div><ul className="mt-2 space-y-1.5 text-xs leading-5 text-gray-400">{(item.responsibilitiesAr || []).map((text) => <li key={text}>• {text}</li>)}</ul></div><div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3"><div className="text-xs font-black text-red-300">القيود والممنوعات</div><ul className="mt-2 space-y-1.5 text-xs leading-5 text-gray-400">{(item.restrictionsAr || []).map((text) => <li key={text}>• {text}</li>)}</ul></div></div>
              <div className="mt-4 flex flex-wrap gap-1.5">{(item.permissions || []).slice(0, 12).map((permission) => <span key={permission} className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-gray-400">{permission}</span>)}{(item.permissions || []).length > 12 && <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-gray-400">+{item.permissions.length - 12}</span>}</div>
            </article>)}
          </div>
        </div>
      )}

      {roleModal && selectedUser && <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-4"><div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0d0f15] p-6 shadow-2xl"><div className="flex items-center gap-2 text-lg font-black"><ShieldQuestion className="text-amber-300" /> تغيير صلاحيات المستخدم</div><p className="mt-2 text-sm text-gray-400">{selectedUser.email} · الدور الحالي: <strong className="text-white">{selectedUser.roleLabelAr || roleMap.get(selectedUser.role)?.labelAr || selectedUser.role}</strong></p><div className="mt-5 grid max-h-[56vh] gap-3 overflow-y-auto">{roleChoices.map((item) => <button key={item.role} onClick={() => setSelectedRole(item.role)} className={`rounded-2xl border p-4 text-right ${selectedRole === item.role ? 'border-[#FF2E4C] bg-[#FF2E4C]/10' : 'border-white/10 bg-white/[.02]'}`}><div className="font-black">{item.role === 'USER' ? 'إزالة الصلاحيات الإدارية — ' : ''}{item.labelAr} <span className="text-xs font-normal text-gray-500">({item.labelEn})</span></div><p className="mt-2 text-xs leading-5 text-gray-400">{item.descriptionAr}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-emerald-500/5 p-2 text-[11px] text-gray-400"><span className="font-bold text-emerald-300">يسمح له:</span> {(item.responsibilitiesAr || []).slice(0, 2).join(' · ')}</div><div className="rounded-xl bg-red-500/5 p-2 text-[11px] text-gray-400"><span className="font-bold text-red-300">لا يسمح له:</span> {(item.restrictionsAr || []).slice(0, 2).join(' · ')}</div></div></button>)}</div><div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100/80">يتم التحقق من التغيير بعد الكتابة في قاعدة البيانات وتسجيله في Audit Log. لا يمكن تعيين OWNER، ولا خفض آخر SUPER_ADMIN، ولا تجاوز صلاحيات الحساب المنفذ.</div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setRoleModal(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs">إلغاء</button><button disabled={!selectedRole || selectedRole === selectedUser.role || !!busy} onClick={() => void executePatch({ action: 'change_role', userId: selectedUser.id, role: selectedRole })} className="flex items-center gap-2 rounded-xl bg-[#FF2E4C] px-4 py-2 text-xs font-black disabled:opacity-40">{busy.startsWith('change_role:') && <Loader2 size={14} className="animate-spin"/>} تأكيد تغيير الصلاحيات</button></div></div></div>}

      {creditModal && selectedUser && <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-4"><form onSubmit={(event) => { event.preventDefault(); void executePatch({ action: 'grant_credits', userId: selectedUser.id, amount: Number(creditAmount), reason }); }} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d0f15] p-6"><h3 className="text-lg font-black">إضافة رصيد للمستخدم</h3><p className="mt-1 text-xs text-gray-500">{selectedUser.email}</p><input type="number" min="1" step="1" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} placeholder="عدد النقاط" className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 p-3" required /><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب إضافة الرصيد" className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3" required /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCreditModal(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs">إلغاء</button><button disabled={!!busy} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black disabled:opacity-50">إضافة الرصيد</button></div></form></div>}

      {suspendModal && selectedUser && <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-4"><form onSubmit={(event) => { event.preventDefault(); void executePatch({ action: 'suspend', userId: selectedUser.id, reason }); }} className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#0d0f15] p-6"><h3 className="text-lg font-black text-red-300">إيقاف حساب</h3><p className="mt-2 text-sm text-gray-400">سيتم إيقاف {selectedUser.email}. يجب تسجيل سبب واضح للعملية.</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب الإيقاف" className="mt-4 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3" required /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setSuspendModal(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs">إلغاء</button><button disabled={!!busy} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black disabled:opacity-50">تأكيد الإيقاف</button></div></form></div>}
    </div>
  );
}
