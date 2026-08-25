'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Ban,
  Coins,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldQuestion,
  UserCog,
  Users,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { useAuth } from '../context/AuthContext';

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

async function getToken() {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export default function AdminUsersRolesPanel() {
  const { role, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [owner, setOwner] = useState(null);
  const [actorRole, setActorRole] = useState(role);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleModal, setRoleModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [reason, setReason] = useState('');

  const roleMap = useMemo(() => new Map(roles.map((item) => [item.role, item])), [roles]);

  const api = useCallback(async (url, options = {}) => {
    const token = await getToken();
    if (!token) throw new Error('انتهت جلسة الدخول. أعد تسجيل الدخول.');
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
    if (!response.ok) throw new Error(payload.error || 'تعذر تنفيذ العملية');
    return payload;
  }, []);

  const loadRoles = useCallback(async () => {
    const payload = await api('/api/v1/admin/roles');
    setRoles(Array.isArray(payload.roles) ? payload.roles : []);
    setOwner(payload.owner || null);
    setActorRole(payload.actorRole || role);
  }, [api, role]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (query.trim()) params.set('q', query.trim());
      if (status) params.set('status', status);
      if (roleFilter) params.set('role', roleFilter);
      const payload = await api(`/api/v1/admin/users?${params.toString()}`);
      setUsers(Array.isArray(payload.users) ? payload.users : []);
      setPages(payload.pages || 1);
      setTotal(payload.total || 0);
      setActorRole(payload.actorRole || role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, [api, page, query, role, roleFilter, status]);

  useEffect(() => {
    if (authLoading) return;
    Promise.all([loadRoles(), loadUsers()]).catch((err) => {
      setError(err instanceof Error ? err.message : 'تعذر تحميل مركز إدارة المستخدمين');
      setLoading(false);
    });
  }, [authLoading, loadRoles, loadUsers]);

  const executePatch = async (body) => {
    setBusy(`${body.action}:${body.userId}`);
    setError('');
    try {
      await api('/api/v1/admin/users', { method: 'PATCH', body: JSON.stringify(body) });
      setRoleModal(false);
      setCreditModal(false);
      setSuspendModal(false);
      setReason('');
      setCreditAmount('');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تنفيذ العملية');
    } finally {
      setBusy('');
    }
  };

  const assignableRoles = roles.filter((item) => item.assignable && !item.legacy && item.role !== 'USER');
  const canChangeRoles = actorRole === 'SUPER_ADMIN';
  const canAdjustCredits = ['SUPER_ADMIN', 'FINANCE_MANAGER'].includes(actorRole);
  const canSuspend = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'USER_MANAGER'].includes(actorRole);

  if (authLoading) {
    return <div className="py-20 text-center text-sm text-gray-400">جاري التحقق من الصلاحيات...</div>;
  }

  return (
    <div dir="rtl" className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-gray-500">لوحة الإدارة / المستخدمون والأدوار</div>
          <h1 className="flex items-center gap-2 text-2xl font-black"><Users className="text-[#FF2E4C]" /> إدارة المستخدمين والأدوار</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">إدارة الحسابات والأرصدة والحالات، مع شرح وظيفة كل دور وصلاحياته قبل منحه لأي مستخدم.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 hover:text-white">مركز الإدارة</Link>
          <button onClick={() => { void loadRoles(); void loadUsers(); }} className="flex items-center gap-2 rounded-xl bg-[#FF2E4C] px-4 py-2 text-xs font-black"><RefreshCw size={15} /> تحديث</button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-4"><div className="text-xs text-gray-500">إجمالي النتائج</div><div className="mt-1 text-2xl font-black">{total.toLocaleString('ar-LY')}</div></div>
        <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-4"><div className="text-xs text-gray-500">دورك الحالي</div><div className="mt-1 text-lg font-black text-amber-300">{roleMap.get(actorRole)?.labelAr || actorRole}</div></div>
        <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-4"><div className="text-xs text-gray-500">الأدوار الإدارية المعرفة</div><div className="mt-1 text-2xl font-black">{assignableRoles.length}</div></div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-3">
        <button onClick={() => setTab('users')} className={`rounded-xl px-4 py-2 text-xs font-black ${tab === 'users' ? 'bg-[#FF2E4C]' : 'bg-white/5 text-gray-400'}`}>المستخدمون</button>
        <button onClick={() => setTab('roles')} className={`rounded-xl px-4 py-2 text-xs font-black ${tab === 'roles' ? 'bg-[#FF2E4C]' : 'bg-white/5 text-gray-400'}`}>الأدوار والصلاحيات</button>
      </div>

      {tab === 'users' ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#0f1118] p-4 md:grid-cols-[1fr_180px_220px_auto]">
            <label className="relative"><Search className="absolute right-3 top-3 text-gray-500" size={16} /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="ابحث بالاسم أو البريد..." className="w-full rounded-xl border border-white/10 bg-[#07080c] py-2.5 pr-10 pl-3 text-sm outline-none focus:border-[#FF2E4C]/50" /></label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-[#07080c] px-3 py-2.5 text-sm"><option value="">كل الحالات</option><option value="active">نشط</option><option value="suspended">موقوف</option><option value="pending">قيد المراجعة</option></select>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-[#07080c] px-3 py-2.5 text-sm"><option value="">كل الأدوار</option>{roles.map((item) => <option key={item.role} value={item.role}>{item.labelAr}</option>)}</select>
            <button onClick={() => void loadUsers()} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold">تطبيق</button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f1118]">
            <table className="min-w-[1050px] w-full text-right text-xs">
              <thead className="border-b border-white/10 bg-[#090a0f] text-gray-400"><tr><th className="p-4">المستخدم</th><th className="p-4">الدور</th><th className="p-4">الحالة</th><th className="p-4">الخطة</th><th className="p-4">الرصيد</th><th className="p-4">آخر نشاط</th><th className="p-4">الإجراءات</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {loading ? <tr><td colSpan="7" className="p-10 text-center text-gray-500">جاري تحميل المستخدمين...</td></tr> : users.length === 0 ? <tr><td colSpan="7" className="p-10 text-center text-gray-500">لا توجد نتائج مطابقة.</td></tr> : users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[.02]">
                    <td className="p-4"><div className="font-bold text-white">{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'بدون اسم'}</div><div className="mt-1 text-[11px] text-gray-500">{user.email}</div></td>
                    <td className="p-4"><span className={`rounded-full border px-2.5 py-1 font-bold ${roleTone(user.role)}`}>{user.roleLabelAr || roleMap.get(user.role)?.labelAr || user.role}</span></td>
                    <td className="p-4"><span className={user.status === 'active' ? 'text-emerald-400' : user.status === 'suspended' ? 'text-red-400' : 'text-amber-400'}>{STATUS_LABELS[user.status] || user.status}</span>{user.online && <div className="mt-1 text-[10px] text-emerald-500">● متصل الآن</div>}</td>
                    <td className="p-4 font-bold">{user.planId}</td>
                    <td className="p-4 font-black text-[#ff4a5d]">{Number(user.creditBalance || 0).toLocaleString('ar-LY')}</td>
                    <td className="p-4 text-gray-500">{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('ar-LY') : '—'}</td>
                    <td className="p-4"><div className="flex flex-wrap gap-2">
                      {canChangeRoles && <button onClick={() => { setSelectedUser(user); setSelectedRole(user.role); setRoleModal(true); }} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-amber-300"><UserCog size={13} className="inline ml-1" />الدور</button>}
                      {canAdjustCredits && <button onClick={() => { setSelectedUser(user); setCreditModal(true); }} className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-300"><Coins size={13} className="inline ml-1" />رصيد</button>}
                      {canSuspend && user.role !== 'SUPER_ADMIN' && (user.status === 'suspended' ? <button disabled={!!busy} onClick={() => void executePatch({ action: 'reactivate', userId: user.id })} className="rounded-lg border border-emerald-500/25 px-2.5 py-1.5 text-emerald-300"><BadgeCheck size={13} className="inline ml-1" />تفعيل</button> : <button onClick={() => { setSelectedUser(user); setSuspendModal(true); }} className="rounded-lg border border-red-500/25 px-2.5 py-1.5 text-red-300"><Ban size={13} className="inline ml-1" />إيقاف</button>)}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400"><span>صفحة {page} من {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">السابق</button><button disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">التالي</button></div></div>
        </div>
      ) : (
        <div className="space-y-4">
          {owner && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5"><div className="flex items-center gap-2 font-black text-red-200"><KeyRound size={18} /> {owner.labelAr}</div><p className="mt-2 text-sm leading-6 text-red-100/70">{owner.descriptionAr}</p><div className="mt-3 text-xs font-bold text-red-300">غير قابل للتعيين من واجهة الإدارة.</div></div>}
          <div className="grid gap-4 lg:grid-cols-2">
            {roles.filter((item) => item.role !== 'USER').map((item) => (
              <article key={item.role} className="rounded-2xl border border-white/10 bg-[#0f1118] p-5">
                <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#ff4354]" /><h3 className="font-black">{item.labelAr}</h3></div><div className="mt-1 text-xs text-gray-500">{item.labelEn} · {item.role}</div></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${roleTone(item.role)}`}>{item.riskTier}</span></div>
                <p className="mt-4 text-sm leading-6 text-gray-400">{item.descriptionAr}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">{(item.permissions || []).slice(0, 12).map((permission) => <span key={permission} className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-gray-400">{permission}</span>)}{(item.permissions || []).length > 12 && <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-gray-400">+{item.permissions.length - 12}</span>}</div>
                <div className="mt-4 border-t border-white/5 pt-3 text-[11px] text-gray-500">{item.legacy ? 'دور قديم للتوافق فقط، لا يوصى بمنحه لحسابات جديدة.' : item.assignable ? 'يمكن تعيين هذا الدور وفق سياسة الصلاحيات.' : 'غير قابل للتعيين.'}</div>
              </article>
            ))}
          </div>
        </div>
      )}

      {roleModal && selectedUser && <div className="fixed inset-0 z-[200] grid place-items-center bg-black/75 p-4"><div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d0f15] p-6 shadow-2xl"><div className="flex items-center gap-2 text-lg font-black"><ShieldQuestion className="text-amber-300" /> تعيين دور إداري</div><p className="mt-2 text-sm text-gray-400">المستخدم: {selectedUser.email}</p><div className="mt-5 grid max-h-[55vh] gap-3 overflow-y-auto">{assignableRoles.map((item) => <button key={item.role} onClick={() => setSelectedRole(item.role)} className={`rounded-2xl border p-4 text-right ${selectedRole === item.role ? 'border-[#FF2E4C] bg-[#FF2E4C]/10' : 'border-white/10 bg-white/[.02]'}`}><div className="font-black">{item.labelAr} <span className="text-xs font-normal text-gray-500">({item.labelEn})</span></div><p className="mt-2 text-xs leading-5 text-gray-400">{item.descriptionAr}</p><div className="mt-2 text-[10px] text-gray-500">الصلاحيات: {(item.permissions || []).slice(0, 8).join(' · ')}</div></button>)}</div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setRoleModal(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs">إلغاء</button><button disabled={!selectedRole || !!busy} onClick={() => void executePatch({ action: 'change_role', userId: selectedUser.id, role: selectedRole })} className="rounded-xl bg-[#FF2E4C] px-4 py-2 text-xs font-black disabled:opacity-40">تأكيد تعيين الدور</button></div></div></div>}

      {creditModal && selectedUser && <div className="fixed inset-0 z-[200] grid place-items-center bg-black/75 p-4"><form onSubmit={(e) => { e.preventDefault(); void executePatch({ action: 'grant_credits', userId: selectedUser.id, amount: Number(creditAmount), reason }); }} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d0f15] p-6"><h3 className="text-lg font-black">إضافة رصيد للمستخدم</h3><p className="mt-1 text-xs text-gray-500">{selectedUser.email}</p><input type="number" min="1" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="عدد النقاط" className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 p-3" required /><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب إضافة الرصيد (يسجل في Audit Log)" className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3" required /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCreditModal(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs">إلغاء</button><button disabled={!!busy} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black">إضافة الرصيد</button></div></form></div>}

      {suspendModal && selectedUser && <div className="fixed inset-0 z-[200] grid place-items-center bg-black/75 p-4"><form onSubmit={(e) => { e.preventDefault(); void executePatch({ action: 'suspend', userId: selectedUser.id, reason }); }} className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#0d0f15] p-6"><h3 className="text-lg font-black text-red-300">إيقاف حساب</h3><p className="mt-2 text-sm text-gray-400">سيتم إيقاف {selectedUser.email}. يجب تسجيل سبب واضح للعملية.</p><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الإيقاف" className="mt-4 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3" required /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setSuspendModal(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs">إلغاء</button><button disabled={!!busy} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black">تأكيد الإيقاف</button></div></form></div>}
    </div>
  );
}
