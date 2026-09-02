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

function statusStyle(status) {
  const resolved = ['resolved', 'closed'].includes(status);
  const color = resolved ? 'var(--bb-success)' : 'var(--bb-warning)';
  return { color, background: resolved ? 'var(--bb-success-soft)' : 'var(--bb-warning-soft)', borderColor: `color-mix(in srgb, ${color} 25%, transparent)` };
}

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
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="bb-text-tertiary bb-hoverable inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-black"><ArrowRight size={14} /> العودة إلى مركز الإدارة</Link>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-black"><span className="bb-accent-soft grid h-12 w-12 place-items-center rounded-xl border"><Headphones size={24} /></span> طلبات الدعم</h1>
            <p className="bb-text-tertiary mt-2 text-sm">طلبات المستخدمين الفعلية من صفحة «اتصل بنا» مع الحالة والملاحظات الداخلية.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="bb-input rounded-xl border px-4 py-3 text-xs font-black outline-none">{STATUS_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
            <button type="button" onClick={() => void loadRequests()} disabled={loading} className="bb-button-secondary flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="الطلبات المعروضة" value={rows.length} />
          <Metric label="تحتاج متابعة" value={openCount} tone="warning" />
          <Metric label="محلولة/مغلقة" value={rows.length - openCount} tone="success" />
        </div>

        {message && <div className="bb-accent-soft mt-5 rounded-xl border px-4 py-3 text-xs">{message}</div>}
        {error && <div className="bb-danger-surface mt-5 rounded-2xl border p-5 text-sm font-bold">{error}</div>}

        <section className="mt-6 space-y-4">
          {loading ? <div className="bb-panel grid min-h-64 place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div> : rows.length === 0 ? <div className="bb-panel bb-text-tertiary rounded-3xl border p-12 text-center text-sm">لا توجد طلبات ضمن هذا الفلتر.</div> : rows.map((request) => {
            const customerName = [request.customer?.firstName, request.customer?.lastName].filter(Boolean).join(' ') || request.customer?.email || 'مستخدم';
            return (
              <article key={request.id} className="bb-panel rounded-3xl border p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="bb-card bb-text-secondary rounded-full border px-2.5 py-1 text-[10px] font-black">{CATEGORY_LABELS[request.category] || request.category}</span><span className="rounded-full border px-2.5 py-1 text-[10px] font-black" style={statusStyle(request.status)}>{STATUS_LABELS[request.status] || request.status}</span></div>
                    <h2 className="mt-3 text-lg font-black">{request.subject}</h2>
                    <p className="bb-text-secondary mt-3 whitespace-pre-wrap text-sm leading-7">{request.message}</p>
                    <div className="bb-divider bb-text-disabled mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[11px]"><span className="flex items-center gap-2"><UserRound size={14} /> {customerName}</span>{request.customer?.email && <span>{request.customer.email}</span>}{request.customer?.phone && <span dir="ltr">{request.customer.phone}</span>}<span>{new Date(request.created_at).toLocaleString('ar-LY')}</span></div>
                  </div>

                  <div className="bb-card w-full shrink-0 rounded-2xl border p-4 lg:w-[360px]">
                    <label className="bb-text-secondary text-xs font-black">الحالة
                      <select value={request.status} disabled={busyId === request.id} onChange={(event) => void updateRequest(request.id, { status: event.target.value })} className="bb-input mt-2 w-full rounded-xl border px-3 py-2.5 text-xs font-black outline-none">{STATUS_OPTIONS.filter(([id]) => id !== 'all').map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
                    </label>
                    <label className="bb-text-secondary mt-4 block text-xs font-black">ملاحظة داخلية
                      <textarea value={notes[request.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} maxLength={2000} placeholder="لا تظهر هذه الملاحظة للمستخدم." className="bb-input mt-2 min-h-24 w-full resize-y rounded-xl border p-3 text-xs leading-6 outline-none" />
                    </label>
                    <button type="button" disabled={busyId === request.id} onClick={() => void updateRequest(request.id, { adminNote: notes[request.id] ?? '' })} className="bb-button-primary mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black disabled:opacity-50">{busyId === request.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} حفظ الملاحظة</button>
                    {request.status === 'resolved' && <div className="mt-3 flex items-center gap-2 text-[10px] font-bold" style={{ color: 'var(--bb-success)' }}><CheckCircle2 size={13} /> تم الحل</div>}
                    {request.status === 'in_progress' && <div className="bb-text-warning mt-3 flex items-center gap-2 text-[10px] font-bold"><Clock3 size={13} /> قيد المتابعة</div>}
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

function Metric({ label, value, tone = 'default' }) {
  const color = tone === 'warning' ? 'var(--bb-warning)' : tone === 'success' ? 'var(--bb-success)' : 'var(--bb-text-primary)';
  const background = tone === 'warning' ? 'var(--bb-warning-soft)' : tone === 'success' ? 'var(--bb-success-soft)' : 'var(--bb-card)';
  return <div className="bb-card rounded-2xl border p-5" style={{ background }}><div className="bb-text-tertiary text-xs">{label}</div><div className="mt-2 text-3xl font-black" style={{ color }}>{value}</div></div>;
}
