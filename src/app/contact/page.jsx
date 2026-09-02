'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Headphones, Loader2, MessageSquareText, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

const CATEGORIES = [
  ['general', 'استفسار عام'],
  ['technical', 'دعم تقني'],
  ['billing', 'الرصيد والدفع'],
  ['store', 'المتجر والمشتريات'],
  ['print', 'الطباعة والإنتاج'],
];

const STATUS_LABELS = {
  open: 'جديد',
  in_progress: 'قيد المتابعة',
  resolved: 'تم الحل',
  closed: 'مغلق',
};

function statusStyle(status) {
  const resolved = ['resolved', 'closed'].includes(status);
  const color = resolved ? 'var(--bb-success)' : 'var(--bb-warning)';
  return { color, background: resolved ? 'var(--bb-success-soft)' : 'var(--bb-warning-soft)', borderColor: `color-mix(in srgb, ${color} 25%, transparent)` };
}

function ContactContent() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const userId = user?.id || null;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const categoryFromUrl = CATEGORIES.some(([id]) => id === searchParams.get('category')) ? searchParams.get('category') : 'general';
  const [category, setCategory] = useState(categoryFromUrl || 'general');
  const [subject, setSubject] = useState((searchParams.get('subject') || '').slice(0, 160));
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('support_requests')
      .select('id,category,subject,message,status,created_at,updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error) setRequests(data || []);
    setRequestsLoaded(true);
  }, [supabase, userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const timer = window.setTimeout(() => { void loadRequests(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests, userId]);

  async function submitRequest(event) {
    event.preventDefault();
    if (!userId || sending) return;
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (cleanSubject.length < 3 || cleanMessage.length < 10) {
      setNotice({ type: 'error', text: 'اكتب عنوانًا واضحًا ورسالة لا تقل عن 10 أحرف.' });
      return;
    }

    setSending(true);
    setNotice(null);
    const { error } = await supabase.from('support_requests').insert({
      user_id: userId,
      category,
      subject: cleanSubject,
      message: cleanMessage,
    });

    if (error) {
      setNotice({ type: 'error', text: 'تعذر إرسال الطلب الآن. حاول مرة أخرى.' });
    } else {
      setMessage('');
      setSubject('');
      setNotice({ type: 'success', text: 'تم إرسال الطلب إلى فريق Brand Box وحفظه في حسابك.' });
      await loadRequests();
    }
    setSending(false);
  }

  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="bb-dashboard-hero grid gap-8 overflow-hidden rounded-[32px] border p-6 shadow-[var(--bb-shadow-md)] sm:p-9 lg:grid-cols-[1fr_.8fr] lg:p-12">
          <div>
            <div className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black"><Headphones size={15} /> تواصل ودعم Brand Box</div>
            <h1 className="bb-text-primary mt-6 text-4xl font-black leading-tight sm:text-5xl">طلبك يصل إلى فريق الدعم داخل النظام</h1>
            <p className="bb-text-secondary mt-5 max-w-2xl text-sm leading-8">بدل نموذج شكلي، كل طلب ترسله هنا يُحفظ في حسابك ويظهر لفريق الإدارة والدعم مع حالته. استخدمه للاستفسارات التقنية، الرصيد والدفع، المتجر أو طلبات الطباعة.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="bb-card rounded-2xl border p-5"><ShieldCheck className="bb-text-accent" size={22} /><h2 className="bb-text-primary mt-4 font-black">مرتبط بحسابك</h2><p className="bb-text-tertiary mt-2 text-xs leading-6">لا يمكن لمستخدم آخر الاطلاع على طلباتك.</p></div>
            <div className="bb-card rounded-2xl border p-5"><Clock3 className="bb-text-accent" size={22} /><h2 className="bb-text-primary mt-4 font-black">حالة واضحة</h2><p className="bb-text-tertiary mt-2 text-xs leading-6">جديد، قيد المتابعة، تم الحل أو مغلق.</p></div>
          </div>
        </section>

        {loading ? (
          <div className="bb-panel mt-6 grid min-h-64 place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div>
        ) : !user ? (
          <section className="bb-panel mt-6 rounded-3xl border p-8 text-center sm:p-12">
            <MessageSquareText className="bb-text-accent mx-auto" size={34} />
            <h2 className="bb-text-primary mt-5 text-2xl font-black">سجّل الدخول لإرسال طلب ومتابعته</h2>
            <p className="bb-text-tertiary mx-auto mt-3 max-w-xl text-sm leading-7">نربط الطلب بالحساب حتى تستطيع متابعته ولا تضيع تفاصيله بين الرسائل.</p>
            <Link href="/auth?next=%2Fcontact" className="bb-button-primary mt-6 inline-flex rounded-xl px-7 py-3.5 text-sm font-black">تسجيل الدخول</Link>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]">
            <form onSubmit={submitRequest} className="bb-panel rounded-3xl border p-5 sm:p-7">
              <h2 className="bb-text-primary text-lg font-black">إرسال طلب جديد</h2>
              <p className="bb-text-tertiary mt-1 text-xs leading-6">اكتب المشكلة أو الطلب بتفاصيل كافية لمساعدتنا على التعامل معه بسرعة.</p>
              <label className="bb-text-secondary mt-6 block text-xs font-bold">نوع الطلب
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="bb-input mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none">
                  {CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label className="bb-text-secondary mt-4 block text-xs font-bold">العنوان
                <input value={subject} maxLength={160} onChange={(event) => setSubject(event.target.value)} placeholder="مثال: مشكلة في فتح مشروع الصور" className="bb-input mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none" />
              </label>
              <label className="bb-text-secondary mt-4 block text-xs font-bold">التفاصيل
                <textarea value={message} maxLength={4000} onChange={(event) => setMessage(event.target.value)} placeholder="اشرح ما حدث وما الذي كنت تحاول القيام به..." className="bb-input mt-2 min-h-36 w-full resize-y rounded-xl border px-4 py-3 text-sm leading-7 outline-none" />
              </label>
              {notice && <div className="mt-4 rounded-xl border px-4 py-3 text-xs font-bold" style={notice.type === 'success' ? { background: 'var(--bb-success-soft)', color: 'var(--bb-success)', borderColor: 'color-mix(in srgb, var(--bb-success) 25%, transparent)' } : { background: 'var(--bb-danger-soft)', color: 'var(--bb-danger)', borderColor: 'color-mix(in srgb, var(--bb-danger) 25%, transparent)' }}>{notice.text}</div>}
              <button type="submit" disabled={sending} className="bb-button-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black disabled:opacity-50">{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {sending ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
            </form>

            <section className="bb-panel rounded-3xl border p-5 sm:p-7">
              <h2 className="bb-text-primary text-lg font-black">طلباتي الأخيرة</h2>
              <p className="bb-text-tertiary mt-1 text-xs">آخر 20 طلبًا مرتبطًا بحسابك.</p>
              <div className="mt-5 space-y-3">
                {!requestsLoaded ? <div className="bb-text-tertiary py-12 text-center text-xs">جاري تحميل الطلبات...</div> : requests.length === 0 ? <div className="bb-card bb-text-tertiary rounded-2xl border p-8 text-center text-xs">لا توجد طلبات دعم بعد.</div> : requests.map((request) => (
                  <article key={request.id} className="bb-card rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="bb-text-primary truncate text-sm font-black">{request.subject}</h3><div className="bb-text-disabled mt-1 text-[10px]">{new Date(request.created_at).toLocaleString('ar-LY')}</div></div><span className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black" style={statusStyle(request.status)}>{STATUS_LABELS[request.status] || request.status}</span></div>
                    <p className="bb-text-tertiary mt-3 line-clamp-3 text-xs leading-6">{request.message}</p>
                    {request.status === 'resolved' && <div className="mt-3 flex items-center gap-2 text-[10px] font-bold" style={{ color: 'var(--bb-success)' }}><CheckCircle2 size={13} /> تم تعليم الطلب كمحلول.</div>}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ContactPage() {
  return <Suspense fallback={<main className="bb-app-canvas min-h-[calc(100vh-5rem)]" />}><ContactContent /></Suspense>;
}
