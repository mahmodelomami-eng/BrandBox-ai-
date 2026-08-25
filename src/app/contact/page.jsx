'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
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

function ContactContent() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
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
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('support_requests')
      .select('id,category,subject,message,status,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error) setRequests(data || []);
    setRequestsLoaded(true);
  }, [supabase, user?.id]);

  if (user?.id && !requestsLoaded) {
    void loadRequests();
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (!user?.id || sending) return;
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (cleanSubject.length < 3 || cleanMessage.length < 10) {
      setNotice({ type: 'error', text: 'اكتب عنوانًا واضحًا ورسالة لا تقل عن 10 أحرف.' });
      return;
    }

    setSending(true);
    setNotice(null);
    const { error } = await supabase.from('support_requests').insert({
      user_id: user.id,
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
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.18),transparent_38%),#0b0d12] p-6 sm:p-9 lg:grid-cols-[1fr_.8fr] lg:p-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[.06] px-4 py-2 text-xs font-black text-red-300"><Headphones size={15} /> تواصل ودعم Brand Box</div>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">طلبك يصل إلى فريق الدعم داخل النظام</h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-gray-400">بدل نموذج شكلي، كل طلب ترسله هنا يُحفظ في حسابك ويظهر لفريق الإدارة والدعم مع حالته. استخدمه للاستفسارات التقنية، الرصيد والدفع، المتجر أو طلبات الطباعة.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#11141a] p-5"><ShieldCheck className="text-[#ff3344]" size={22} /><h2 className="mt-4 font-black">مرتبط بحسابك</h2><p className="mt-2 text-xs leading-6 text-gray-500">لا يمكن لمستخدم آخر الاطلاع على طلباتك.</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#11141a] p-5"><Clock3 className="text-[#ff3344]" size={22} /><h2 className="mt-4 font-black">حالة واضحة</h2><p className="mt-2 text-xs leading-6 text-gray-500">جديد، قيد المتابعة، تم الحل أو مغلق.</p></div>
          </div>
        </section>

        {loading ? (
          <div className="mt-6 grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-[#0d1016]"><Loader2 className="animate-spin text-[#ff3344]" /></div>
        ) : !user ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0d1016] p-8 text-center sm:p-12">
            <MessageSquareText className="mx-auto text-[#ff3344]" size={34} />
            <h2 className="mt-5 text-2xl font-black">سجّل الدخول لإرسال طلب ومتابعته</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-500">نربط الطلب بالحساب حتى تستطيع متابعته ولا تضيع تفاصيله بين الرسائل.</p>
            <Link href="/auth?next=%2Fcontact" className="mt-6 inline-flex rounded-xl bg-[#f31325] px-7 py-3.5 text-sm font-black transition hover:bg-[#ff2637]">تسجيل الدخول</Link>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]">
            <form onSubmit={submitRequest} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-7">
              <h2 className="text-lg font-black">إرسال طلب جديد</h2>
              <p className="mt-1 text-xs leading-6 text-gray-500">اكتب المشكلة أو الطلب بتفاصيل كافية لمساعدتنا على التعامل معه بسرعة.</p>
              <label className="mt-6 block text-xs font-bold text-gray-400">نوع الطلب
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm text-white outline-none focus:border-[#f31325]/60">
                  {CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label className="mt-4 block text-xs font-bold text-gray-400">العنوان
                <input value={subject} maxLength={160} onChange={(event) => setSubject(event.target.value)} placeholder="مثال: مشكلة في فتح مشروع الصور" className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm text-white outline-none focus:border-[#f31325]/60" />
              </label>
              <label className="mt-4 block text-xs font-bold text-gray-400">التفاصيل
                <textarea value={message} maxLength={4000} onChange={(event) => setMessage(event.target.value)} placeholder="اشرح ما حدث وما الذي كنت تحاول القيام به..." className="mt-2 min-h-36 w-full resize-y rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm leading-7 text-white outline-none focus:border-[#f31325]/60" />
              </label>
              {notice && <div className={`mt-4 rounded-xl border px-4 py-3 text-xs font-bold ${notice.type === 'success' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>{notice.text}</div>}
              <button type="submit" disabled={sending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] px-5 py-3.5 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {sending ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
            </form>

            <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-7">
              <h2 className="text-lg font-black">طلباتي الأخيرة</h2>
              <p className="mt-1 text-xs text-gray-500">آخر 20 طلبًا مرتبطًا بحسابك.</p>
              <div className="mt-5 space-y-3">
                {!requestsLoaded ? <div className="py-12 text-center text-xs text-gray-500">جاري تحميل الطلبات...</div> : requests.length === 0 ? <div className="rounded-2xl border border-white/[.07] bg-[#11141a] p-8 text-center text-xs text-gray-500">لا توجد طلبات دعم بعد.</div> : requests.map((request) => (
                  <article key={request.id} className="rounded-2xl border border-white/[.07] bg-[#11141a] p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black">{request.subject}</h3><div className="mt-1 text-[10px] text-gray-600">{new Date(request.created_at).toLocaleString('ar-LY')}</div></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${['resolved', 'closed'].includes(request.status) ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{STATUS_LABELS[request.status] || request.status}</span></div>
                    <p className="mt-3 line-clamp-3 text-xs leading-6 text-gray-500">{request.message}</p>
                    {request.status === 'resolved' && <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-400"><CheckCircle2 size={13} /> تم تعليم الطلب كمحلول.</div>}
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
  return <Suspense fallback={<main className="min-h-[calc(100vh-5rem)] bg-[#050608]" />}><ContactContent /></Suspense>;
}
