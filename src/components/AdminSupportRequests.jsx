'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, Headphones, Loader2, RefreshCw, Save, UserRound } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const STATUS_OPTIONS = [
  ['all', 'كل الحالات'],
  ['open', 'جديد'],
  ['in_progress', 'قيد المتابعة'],
  ['resolved', 'تم الحل'],
  ['closed', 'مغلق'],
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.filter(([id]) => id !== 'all'));
const CATEGORY_LABELS = {
  general: 'استفسار عام',
  technical: 'دعم تقني',
  billing: 'الرصيد والدفع',
  store: 'المتجر والمشتريات',
  print: 'الطباعة والإنتاج',
};

export default function AdminSupportRequests() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const accessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await accessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const query = filter === 'all' ? '' : `?status=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/v1/admin/support-requests${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'لا تملك صلاحية فتح طلبات الدعم.' : payload.error || 'تعذر تحميل الطلبات.');
      const requests = Array.isArray(payload.requests) ? payload.requests : [];
      setRows(requests);
      setNotes(Object.fromEntries(requests.map((item) => [item.id, item.admin_note || ''])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل طلبات الدعم.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRequests(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  async function updateRequest(requestId, patch) {
    setBusyId(requestId);
    setMessage('');
    try {
      const token = await accessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/support-requests', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, ...patch }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر تحديث الطلب.');
      setMessage('تم تحديث طلب الدعم.');
      await loadRequests();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'تعذر تحديث الطلب.');
    } finally {
      setBusyId(null);
    }
  }

  const openCount = rows.filter((item) => ['open', 'in_progress'].includes(item.status)).length;

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#07090d] text-white">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black text-gray-500 transition hover:text-white"><ArrowRight size={14} /> العودة إلى مركز الإدارة</Link>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-black"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#f31325]/12 text-[#ff3344]"><Headphones size={24} /></span> طلبات الدعم</h1>
            <p className="mt-2 text-sm text-gray-500">طلبات المستخدمين الفعلية من صفحة «اتصل بنا» مع الحالة والملاحظات الداخلية.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black outline-none focus:border-[#f31325]/50">{STATUS_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
            <button type="button" onClick={() => void loadRequests()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#10131a] p-5"><div className="text-xs text-gray-500">الطلبات المعروضة</div><div className="mt-2 text-3xl font-black">{rows.length}</div></div>
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[.04] p-5"><div className="text-xs text-gray-500">تحتاج متابعة</div><div className="mt-2 text-3xl font-black text-amber-300">{openCount}</div></div>
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[.04] p-5"><div className="text-xs text-gray-500">محلولة/مغلقة</div><div className="mt-2 text-3xl font-black text-emerald-300">{rows.length - openCount}</div></div>
        </div>

        {message && <div className="mt-5 rounded-xl border border-[#f31325]/20 bg-[#f31325]/5 px-4 py-3 text-xs text-red-200">{message}</div>}
        {error && <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/[.06] p-5 text-sm font-bold text-red-300">{error}</div>}

        <section className="mt-6 space-y-4">
          {loading ? <div className="grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-[#0d1016]"><Loader2 className="animate-spin text-[#ff3344]" /></div> : rows.length === 0 ? <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-12 text-center text-sm text-gray-500">لا توجد طلبات ضمن هذا الفلتر.</div> : rows.map((request) => {
            const customerName = [request.customer?.firstName, request.customer?.lastName].filter(Boolean).join(' ') || request.customer?.email || 'مستخدم';
            return (
              <article key={request.id} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/10 bg-[#151820] px-2.5 py-1 text-[10px] font-black text-gray-400">{CATEGORY_LABELS[request.category] || request.category}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${['resolved', 'closed'].includes(request.status) ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{STATUS_LABELS[request.status] || request.status}</span></div>
                    <h2 className="mt-3 text-lg font-black">{request.subject}</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-400">{request.message}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[.07] pt-4 text-[11px] text-gray-600"><span className="flex items-center gap-2"><UserRound size={14} /> {customerName}</span>{request.customer?.email && <span>{request.customer.email}</span>}{request.customer?.phone && <span dir="ltr">{request.customer.phone}</span>}<span>{new Date(request.created_at).toLocaleString('ar-LY')}</span></div>
                  </div>

                  <div className="w-full shrink-0 rounded-2xl border border-white/[.07] bg-[#11141a] p-4 lg:w-[360px]">
                    <label className="text-xs font-black text-gray-400">الحالة
                      <select value={request.status} disabled={busyId === request.id} onChange={(event) => void updateRequest(request.id, { status: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#171a21] px-3 py-2.5 text-xs font-black outline-none focus:border-[#f31325]/50">{STATUS_OPTIONS.filter(([id]) => id !== 'all').map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
                    </label>
                    <label className="mt-4 block text-xs font-black text-gray-400">ملاحظة داخلية
                      <textarea value={notes[request.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} maxLength={2000} placeholder="لا تظهر هذه الملاحظة للمستخدم." className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-[#171a21] p-3 text-xs leading-6 text-white outline-none focus:border-[#f31325]/50" />
                    </label>
                    <button type="button" disabled={busyId === request.id} onClick={() => void updateRequest(request.id, { adminNote: notes[request.id] ?? '' })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] py-3 text-xs font-black disabled:opacity-50">{busyId === request.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} حفظ الملاحظة</button>
                    {request.status === 'resolved' && <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-400"><CheckCircle2 size={13} /> تم الحل</div>}
                    {request.status === 'in_progress' && <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-amber-300"><Clock3 size={13} /> قيد المتابعة</div>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
