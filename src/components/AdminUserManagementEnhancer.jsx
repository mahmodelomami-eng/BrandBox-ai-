'use client';

import { useEffect, useMemo, useState } from 'react';
import { Circle, Coins, RefreshCw, Search, ShieldCheck, Trash2, UserCog, Users, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const ROLE_LABELS = {
  SUPER_ADMIN: 'المدير العام',
  ADMIN: 'مدير',
  SUPPORT: 'مشرف دعم',
  USER: 'مستخدم',
};

export default function AdminUserManagementEnhancer() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [visible, setVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [actorRole, setActorRole] = useState('USER');
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [creditTarget, setCreditTarget] = useState(null);
  const [roleTarget, setRoleTarget] = useState(null);
  const [creditAmount, setCreditAmount] = useState('100');
  const [creditReason, setCreditReason] = useState('إضافة رصيد بواسطة المدير العام');
  const [message, setMessage] = useState('');

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadUsers() {
    const accessToken = await token();
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('تعذر تحميل قائمة المستخدمين.');
      const result = await response.json();
      setUsers(Array.isArray(result.users) ? result.users : []);
      setActorRole(result.actorRole || 'USER');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحميل المستخدمين.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const detect = () => {
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,div'));
      const active = headings.some((node) => node.textContent?.trim() === 'إدارة مستخدمي المنصة');
      setVisible(active);
    };
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    loadUsers();
    const interval = window.setInterval(loadUsers, 15_000);
    return () => window.clearInterval(interval);
  }, [visible]);

  async function perform(action, userId, extra = {}) {
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
      await loadUsers();
      setCreditTarget(null);
      setRoleTarget(null);
      setMessage('تم تنفيذ الإجراء بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تنفيذ الإجراء.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`هل تريد حذف حساب ${user.firstName || ''} ${user.lastName || ''} نهائيًا؟`)) return;
    const accessToken = await token();
    if (!accessToken) return;
    setBusyId(user.id);
    try {
      const response = await fetch(`/api/v1/admin/users?userId=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر حذف المستخدم.');
      await loadUsers();
      setMessage('تم حذف المستخدم.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف المستخدم.');
    } finally {
      setBusyId(null);
    }
  }

  if (!visible) return null;

  const normalized = search.trim().toLowerCase();
  const filtered = users.filter((user) => {
    const roleMatch = tab === 'admins' ? user.role !== 'USER' : user.role === 'USER';
    if (!roleMatch) return false;
    if (!normalized) return true;
    return `${user.firstName} ${user.lastName} ${user.email || ''}`.toLowerCase().includes(normalized);
  });

  const onlineCount = users.filter((user) => user.online).length;
  const adminCount = users.filter((user) => user.role !== 'USER').length;

  return (
    <div dir="rtl" className="fixed bottom-0 left-0 right-0 top-[9.05rem] z-[35] overflow-y-auto bg-[#090A0F] px-4 py-5 text-white lg:right-64 lg:px-7">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-black text-[#ff3344]">إدارة حقيقية من Supabase</div>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-black"><Users className="text-[#ff3344]" size={24} /> إدارة مستخدمي المنصة</h2>
            <p className="mt-2 text-xs leading-6 text-gray-500">أي حساب جديد يظهر تلقائيًا هنا. حالة الاتصال تُحدّث دوريًا، وصلاحيات الرصيد والحذف محمية من الخادم.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-xl border border-[#293041] bg-[#11151d] px-3 py-2">الإجمالي: <b>{users.length}</b></span>
            <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-300">متصل الآن: <b>{onlineCount}</b></span>
            <span className="rounded-xl border border-[#ff3344]/20 bg-[#ff3344]/5 px-3 py-2 text-red-300">الإدارة: <b>{adminCount}</b></span>
            <button onClick={loadUsers} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[#303747] px-3 py-2 font-black text-gray-300 hover:border-[#ff3344]/50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث</button>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-xl border border-[#252b3a] bg-[#0e1118] p-1">
            <button onClick={() => setTab('users')} className={`rounded-lg px-5 py-2.5 text-xs font-black ${tab === 'users' ? 'bg-[#f31325] text-white' : 'text-gray-500'}`}>المستخدمون</button>
            <button onClick={() => setTab('admins')} className={`rounded-lg px-5 py-2.5 text-xs font-black ${tab === 'admins' ? 'bg-[#f31325] text-white' : 'text-gray-500'}`}>المديرون والمشرفون</button>
          </div>
          <label className="flex min-w-[280px] items-center gap-2 rounded-xl border border-[#293041] bg-[#11151d] px-4">
            <Search size={16} className="text-gray-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="البحث بالاسم أو البريد..." className="w-full bg-transparent py-3 text-xs outline-none placeholder:text-gray-600" />
          </label>
        </div>

        {message && <div className="mb-4 rounded-xl border border-[#ff3344]/20 bg-[#ff3344]/5 px-4 py-3 text-xs text-red-200">{message}</div>}

        <div className="overflow-hidden rounded-2xl border border-[#252b3a] bg-[#0d1018]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right text-xs">
              <thead className="border-b border-[#252b3a] bg-[#11151d] text-gray-400">
                <tr>
                  <th className="px-5 py-4">المستخدم</th>
                  <th className="px-5 py-4">الاتصال</th>
                  <th className="px-5 py-4">الدور</th>
                  <th className="px-5 py-4">الخطة</th>
                  <th className="px-5 py-4">الرصيد</th>
                  <th className="px-5 py-4">الحالة</th>
                  <th className="px-5 py-4">آخر ظهور</th>
                  <th className="px-5 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202632]">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.015]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#303747] bg-[#171b24]">
                          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-black text-[#ff3344]">{(user.firstName || user.email || '?').slice(0, 1).toUpperCase()}</div>}
                        </div>
                        <div><div className="font-black text-white">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'بدون اسم'}</div><div className="mt-1 text-[10px] text-gray-500">{user.email}</div></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-black ${user.online ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gray-500/10 text-gray-500'}`}><Circle size={8} fill="currentColor" /> {user.online ? 'Online' : 'Offline'}</span></td>
                    <td className="px-5 py-4"><span className="font-black text-cyan-300">{ROLE_LABELS[user.role] || user.role}</span></td>
                    <td className="px-5 py-4"><span className="font-black text-amber-300">{String(user.planId || 'free').toUpperCase()}</span></td>
                    <td className="px-5 py-4 font-black">{user.creditBalance} نقطة</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-3 py-1.5 font-black ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>{user.status === 'active' ? 'نشط' : 'موقوف'}</span></td>
                    <td className="px-5 py-4 text-gray-500">{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('ar-LY') : 'لم يُسجل بعد'}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {['SUPER_ADMIN', 'ADMIN'].includes(actorRole) && user.role !== 'SUPER_ADMIN' && (
                          <button disabled={busyId === user.id} onClick={() => perform(user.status === 'active' ? 'suspend' : 'reactivate', user.id)} className="rounded-lg border border-[#303747] px-3 py-2 font-black text-gray-300 hover:border-[#ff3344]/50">{user.status === 'active' ? 'إيقاف' : 'تفعيل'}</button>
                        )}
                        {actorRole === 'SUPER_ADMIN' && (
                          <button onClick={() => setCreditTarget(user)} className="flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 font-black text-amber-300"><Coins size={14} /> نقاط</button>
                        )}
                        {actorRole === 'SUPER_ADMIN' && user.id !== document.documentElement.dataset.brandboxUserId && (
                          <button onClick={() => setRoleTarget(user)} className="flex items-center gap-1 rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 font-black text-cyan-300"><UserCog size={14} /> الدور</button>
                        )}
                        {actorRole === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN' && (
                          <button disabled={busyId === user.id} onClick={() => deleteUser(user)} className="flex items-center gap-1 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 font-black text-red-300"><Trash2 size={14} /> حذف</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={8} className="px-5 py-14 text-center text-gray-500">لا توجد حسابات مطابقة.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {creditTarget && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-[#303747] bg-[#11151d] p-6">
            <button onClick={() => setCreditTarget(null)} className="absolute left-5 top-5 text-gray-500 hover:text-white"><X size={20} /></button>
            <h3 className="flex items-center gap-2 text-xl font-black"><Coins className="text-amber-300" /> إضافة نقاط</h3>
            <p className="mt-2 text-xs text-gray-500">{creditTarget.email}</p>
            <input type="number" min="1" max="1000000" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} className="mt-5 w-full rounded-xl border border-[#303747] bg-[#181c25] p-4 outline-none focus:border-amber-400" />
            <input value={creditReason} onChange={(event) => setCreditReason(event.target.value)} className="mt-3 w-full rounded-xl border border-[#303747] bg-[#181c25] p-4 text-sm outline-none focus:border-amber-400" />
            <button onClick={() => perform('grant_credits', creditTarget.id, { amount: Number(creditAmount), reason: creditReason })} disabled={busyId === creditTarget.id || Number(creditAmount) <= 0} className="mt-4 w-full rounded-xl bg-amber-400 py-3.5 font-black text-black disabled:opacity-40">إضافة الرصيد</button>
            <p className="mt-3 text-center text-[10px] text-gray-600">هذه العملية متاحة للمدير العام فقط ويتم تسجيلها في سجل المراجعة.</p>
          </div>
        </div>
      )}

      {roleTarget && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-[#303747] bg-[#11151d] p-6">
            <button onClick={() => setRoleTarget(null)} className="absolute left-5 top-5 text-gray-500 hover:text-white"><X size={20} /></button>
            <h3 className="flex items-center gap-2 text-xl font-black"><ShieldCheck className="text-cyan-300" /> تغيير الدور الإداري</h3>
            <p className="mt-2 text-xs text-gray-500">{roleTarget.email}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {['USER', 'SUPPORT', 'ADMIN'].map((role) => <button key={role} onClick={() => perform('change_role', roleTarget.id, { role })} className="rounded-xl border border-[#303747] bg-[#181c25] px-3 py-3 font-black hover:border-cyan-400/50">{ROLE_LABELS[role]}</button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
