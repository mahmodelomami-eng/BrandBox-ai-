'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Headphones,
  Loader2,
  MessageSquareText,
  Paperclip,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

const CATEGORIES = [
  ['general', 'استفسار عام'],
  ['technical', 'دعم تقني'],
  ['billing', 'الرصيد والدفع'],
  ['store', 'المتجر والمشتريات'],
  ['print', 'الطباعة والإنتاج'],
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const STATUS_LABELS = {
  open: 'جديد',
  in_progress: 'قيد المتابعة',
  resolved: 'تم الحل',
  closed: 'مغلق',
};

function statusStyle(status) {
  if (status === 'open') {
    return { color: 'var(--bb-info)', background: 'var(--bb-info-soft)', borderColor: 'color-mix(in srgb, var(--bb-info) 25%, transparent)' };
  }
  if (status === 'in_progress') {
    return { color: 'var(--bb-warning)', background: 'var(--bb-warning-soft)', borderColor: 'color-mix(in srgb, var(--bb-warning) 25%, transparent)' };
  }
  return { color: 'var(--bb-success)', background: 'var(--bb-success-soft)', borderColor: 'color-mix(in srgb, var(--bb-success) 25%, transparent)' };
}

function noticeStyle(type) {
  if (type === 'success') {
    return { background: 'var(--bb-success-soft)', color: 'var(--bb-success)', borderColor: 'color-mix(in srgb, var(--bb-success) 25%, transparent)' };
  }
  if (type === 'warning') {
    return { background: 'var(--bb-warning-soft)', color: 'var(--bb-warning)', borderColor: 'color-mix(in srgb, var(--bb-warning) 25%, transparent)' };
  }
  return { background: 'var(--bb-danger-soft)', color: 'var(--bb-danger)', borderColor: 'color-mix(in srgb, var(--bb-danger) 25%, transparent)' };
}

function requestNumber(id) {
  const suffix = String(id || '').replaceAll('-', '').slice(-6).toUpperCase() || '000000';
  return `#BR-${suffix}`;
}

function fileSizeLabel(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ContactContent() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const userId = user?.id || null;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const fileInputRef = useRef(null);
  const categoryFromUrl = CATEGORIES.some(([id]) => id === searchParams.get('category')) ? searchParams.get('category') : 'general';
  const [category, setCategory] = useState(categoryFromUrl || 'general');
  const [subject, setSubject] = useState((searchParams.get('subject') || '').slice(0, 160));
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentRetryRequestId, setAttachmentRetryRequestId] = useState('');
  const [requests, setRequests] = useState([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
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

  function clearAttachment() {
    setAttachment(null);
    setAttachmentRetryRequestId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function chooseAttachment(event) {
    const file = event.target.files?.[0] || null;
    setNotice(null);
    if (!file) {
      clearAttachment();
      return;
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      event.target.value = '';
      setAttachment(null);
      setNotice({ type: 'error', text: 'المرفق يجب أن يكون JPG أو PNG أو WEBP أو PDF.' });
      return;
    }
    if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
      event.target.value = '';
      setAttachment(null);
      setNotice({ type: 'error', text: 'حجم المرفق يجب ألا يتجاوز 10MB.' });
      return;
    }
    setAttachment(file);
  }

  async function uploadAttachment(requestId, file) {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error('انتهت جلسة الدخول قبل رفع المرفق.');

    const body = new FormData();
    body.append('requestId', requestId);
    body.append('file', file);

    const response = await fetch('/api/v1/support-requests/attachments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      body,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'تعذر رفع المرفق.');
    return payload.attachment;
  }

  async function retryAttachmentUpload() {
    if (!attachmentRetryRequestId || !attachment || uploadingAttachment) return;
    setUploadingAttachment(true);
    setNotice(null);
    try {
      await uploadAttachment(attachmentRetryRequestId, attachment);
      clearAttachment();
      setNotice({ type: 'success', text: 'تم رفع المرفق وربطه بطلب الدعم بنجاح.' });
    } catch {
      setNotice({ type: 'warning', text: 'الطلب محفوظ، لكن رفع المرفق لم ينجح بعد. يمكنك إعادة المحاولة.' });
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (!userId || sending || uploadingAttachment) return;
    if (attachmentRetryRequestId) {
      setNotice({ type: 'warning', text: 'طلبك السابق محفوظ. أكمل رفع المرفق أو احذفه قبل إرسال طلب جديد.' });
      return;
    }

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (cleanSubject.length < 3 || cleanMessage.length < 10) {
      setNotice({ type: 'error', text: 'اكتب عنوانًا واضحًا ورسالة لا تقل عن 10 أحرف.' });
      return;
    }

    setSending(true);
    setNotice(null);
    const { data: createdRequest, error } = await supabase
      .from('support_requests')
      .insert({
        user_id: userId,
        category,
        subject: cleanSubject,
        message: cleanMessage,
      })
      .select('id')
      .single();

    if (error || !createdRequest?.id) {
      setNotice({ type: 'error', text: 'تعذر إرسال الطلب الآن. حاول مرة أخرى.' });
      setSending(false);
      return;
    }

    let attachmentUploaded = true;
    if (attachment) {
      setUploadingAttachment(true);
      try {
        await uploadAttachment(createdRequest.id, attachment);
      } catch {
        attachmentUploaded = false;
        setAttachmentRetryRequestId(createdRequest.id);
      } finally {
        setUploadingAttachment(false);
      }
    }

    setMessage('');
    setSubject('');
    if (attachmentUploaded) {
      clearAttachment();
      setNotice({ type: 'success', text: attachment ? 'تم إرسال الطلب ورفع المرفق إلى فريق Brand Box.' : 'تم إرسال الطلب إلى فريق Brand Box وحفظه في حسابك.' });
    } else {
      setNotice({ type: 'warning', text: 'تم حفظ طلب الدعم، لكن تعذر رفع المرفق. اضغط «إعادة رفع المرفق» دون إنشاء طلب جديد.' });
    }
    await loadRequests();
    setSending(false);
  }

  return (
    <main dir="rtl" className="bb-app-canvas relative min-h-[calc(100vh-5rem)] overflow-hidden">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#f31325]/10 blur-[100px]" />
      <div className="pointer-events-none absolute right-8 top-14 h-28 w-28 opacity-25" style={{ backgroundImage: 'radial-gradient(var(--bb-accent) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

      <div className="relative mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="text-center">
          <div className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black"><Headphones size={15} /> نحن هنا لمساعدتك</div>
          <h1 className="bb-text-primary mt-5 text-4xl font-black sm:text-5xl">الدعم والتواصل</h1>
          <p className="bb-text-secondary mx-auto mt-4 max-w-2xl text-sm leading-8">فريق Brand Box جاهز للإجابة على استفساراتك ومساعدتك في كل ما تحتاجه. جميع الطلبات <span className="bb-text-accent font-black">تُدار وتُتابع</span> من داخل حسابك.</p>
        </section>

        <section className="mx-auto mt-7 grid max-w-4xl gap-4 sm:grid-cols-2">
          <article className="bb-card rounded-2xl border p-5">
            <div className="flex items-center gap-4">
              <span className="bb-accent-soft grid h-12 w-12 shrink-0 place-items-center rounded-xl border"><UserRound size={21} /></span>
              <div><h2 className="bb-text-primary text-sm font-black">مرتبط بحسابك</h2><p className="bb-text-tertiary mt-1.5 text-xs leading-6">جميع محادثاتك وطلباتك يتم حفظها في حسابك لتسهيل المتابعة والرجوع إليها.</p></div>
            </div>
          </article>
          <article className="bb-card rounded-2xl border p-5">
            <div className="flex items-center gap-4">
              <span className="bb-accent-soft grid h-12 w-12 shrink-0 place-items-center rounded-xl border"><Clock3 size={21} /></span>
              <div><h2 className="bb-text-primary text-sm font-black">حالة واضحة</h2><p className="bb-text-tertiary mt-1.5 text-xs leading-6">كل طلب يحصل على حالة واضحة لتستطيع متابعته خطوة بخطوة حتى الحل.</p></div>
            </div>
          </article>
        </section>

        {loading ? (
          <div className="bb-panel mx-auto mt-7 grid min-h-64 max-w-5xl place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div>
        ) : !user ? (
          <section className="bb-panel mx-auto mt-7 max-w-3xl rounded-3xl border p-8 text-center sm:p-12">
            <MessageSquareText className="bb-text-accent mx-auto" size={36} />
            <h2 className="bb-text-primary mt-5 text-2xl font-black">سجّل الدخول لإرسال طلب ومتابعته</h2>
            <p className="bb-text-tertiary mx-auto mt-3 max-w-xl text-sm leading-7">نربط الطلب بحسابك حتى تستطيع معرفة حالته ومتابعة تفاصيله في أي وقت.</p>
            <Link href="/auth?next=%2Fcontact" className="bb-button-primary mt-6 inline-flex rounded-xl px-7 py-3.5 text-sm font-black">تسجيل الدخول</Link>
          </section>
        ) : (
          <div dir="ltr" className="mt-7 grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
            <section dir="rtl" className="bb-panel rounded-3xl border p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><span className="bb-accent-soft grid h-10 w-10 place-items-center rounded-xl border"><MessageSquareText size={18} /></span><div><h2 className="bb-text-primary text-lg font-black">طلباتي الأخيرة</h2><p className="bb-text-tertiary mt-1 text-[10px]">آخر الطلبات المرتبطة بحسابك.</p></div></div>
                <span className="bb-text-accent text-[10px] font-black">{requests.length} طلب</span>
              </div>

              <div className="space-y-3">
                {!requestsLoaded ? (
                  <div className="bb-text-tertiary py-14 text-center text-xs"><Loader2 className="bb-text-accent mx-auto mb-2 animate-spin" size={18} /> جاري تحميل الطلبات...</div>
                ) : requests.length === 0 ? (
                  <div className="bb-card bb-text-tertiary rounded-2xl border p-10 text-center text-xs">لا توجد طلبات دعم بعد. سيظهر أول طلب ترسله هنا مباشرة.</div>
                ) : requests.map((request) => (
                  <article key={request.id} className="bb-card rounded-2xl border p-4 transition hover:-translate-y-0.5">
                    <div className="flex items-center gap-3">
                      <span className="bb-button-secondary grid h-8 w-8 shrink-0 place-items-center rounded-lg border"><ChevronLeft size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0"><h3 className="bb-text-primary truncate text-xs font-black sm:text-sm">{request.subject}</h3><div className="bb-text-tertiary mt-1 text-[9px]">{CATEGORY_LABELS[request.category] || request.category}</div></div>
                          <div className="text-left"><div className="bb-text-tertiary font-mono text-[9px]">{requestNumber(request.id)}</div><div className="bb-text-disabled mt-1 text-[9px]">{new Date(request.created_at).toLocaleString('ar-LY')}</div></div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="rounded-full border px-2.5 py-1 text-[9px] font-black" style={statusStyle(request.status)}>{STATUS_LABELS[request.status] || request.status}</span>
                          {request.status === 'resolved' && <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: 'var(--bb-success)' }}><CheckCircle2 size={11} /> تم الحل</span>}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="bb-surface-1 mt-5 flex flex-col gap-3 rounded-2xl border bb-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="bb-text-primary text-xs font-black">تحتاج مساعدة قبل إرسال الطلب؟</div><div className="bb-text-tertiary mt-1 text-[10px]">اكتب وصفًا واضحًا واذكر الخطوات التي سبقت المشكلة لتسريع المعالجة.</div></div>
                <ShieldCheck size={20} className="bb-text-accent shrink-0" />
              </div>
            </section>

            <form dir="rtl" onSubmit={submitRequest} className="bb-panel rounded-3xl border p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="bb-accent-soft grid h-10 w-10 place-items-center rounded-xl border"><Send size={17} /></span><div><h2 className="bb-text-primary text-lg font-black">أرسل طلب دعم جديد</h2><p className="bb-text-tertiary mt-1 text-[10px]">سيتم حفظه في حسابك ومتابعته من فريق الدعم.</p></div></div>

              <label className="bb-text-secondary mt-6 block text-xs font-bold">نوع الطلب <span className="bb-text-accent">*</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="bb-input mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none">
                  {CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>

              <label className="bb-text-secondary mt-4 block text-xs font-bold">الموضوع <span className="bb-text-accent">*</span>
                <input value={subject} maxLength={160} onChange={(event) => setSubject(event.target.value)} placeholder="اكتب موضوع الطلب باختصار" className="bb-input mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none" />
              </label>

              <label className="bb-text-secondary mt-4 block text-xs font-bold">تفاصيل الطلب <span className="bb-text-accent">*</span>
                <textarea value={message} maxLength={4000} onChange={(event) => setMessage(event.target.value)} placeholder="يرجى وصف ما تحتاجه بالتفصيل، مع ذكر أي خطوات قمت بها إن أمكن." className="bb-input mt-2 min-h-44 w-full resize-y rounded-xl border px-4 py-3 text-sm leading-7 outline-none" />
                <span className="bb-text-disabled mt-1 block text-left text-[9px]">{message.length}/4000</span>
              </label>

              <div className="mt-4">
                <div className="bb-text-secondary mb-2 text-xs font-bold">أضف مرفقًا <span className="bb-text-tertiary font-normal">(اختياري)</span></div>
                {attachment ? (
                  <div className="bb-surface-1 flex items-center justify-between gap-3 rounded-2xl border border-dashed bb-border p-4">
                    <div className="flex min-w-0 items-center gap-3"><span className="bb-accent-soft grid h-10 w-10 shrink-0 place-items-center rounded-xl border"><Paperclip size={17} /></span><div className="min-w-0"><div className="bb-text-primary truncate text-xs font-black">{attachment.name}</div><div className="bb-text-tertiary mt-1 text-[9px]">{fileSizeLabel(attachment.size)} · ملف خاص لا يُنشر للعامة</div></div></div>
                    <button type="button" onClick={clearAttachment} disabled={sending || uploadingAttachment} className="bb-button-secondary grid h-9 w-9 shrink-0 place-items-center rounded-lg border disabled:opacity-40" aria-label="حذف المرفق"><X size={15} /></button>
                  </div>
                ) : (
                  <label className="bb-surface-1 bb-hoverable flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bb-border p-5 text-center">
                    <Paperclip size={20} className="bb-text-accent" />
                    <span className="bb-text-primary mt-2 text-xs font-black">اختر صورة أو PDF</span>
                    <span className="bb-text-tertiary mt-1 text-[9px]">JPG / PNG / WEBP / PDF — حتى 10MB</span>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={chooseAttachment} disabled={sending || uploadingAttachment} className="hidden" />
                  </label>
                )}
              </div>

              {notice && <div className="mt-4 rounded-xl border px-4 py-3 text-xs font-bold" style={noticeStyle(notice.type)}>{notice.text}</div>}

              {attachmentRetryRequestId && attachment && (
                <button type="button" onClick={() => void retryAttachmentUpload()} disabled={uploadingAttachment} className="bb-button-secondary mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-xs font-black disabled:opacity-50">
                  {uploadingAttachment ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />} إعادة رفع المرفق
                </button>
              )}

              <button type="submit" disabled={sending || uploadingAttachment || Boolean(attachmentRetryRequestId)} className="bb-button-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black disabled:opacity-50">{sending || uploadingAttachment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {uploadingAttachment ? 'جاري رفع المرفق...' : sending ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
              <p className="bb-text-disabled mt-3 text-center text-[9px]">سيظهر الطلب في هذه الصفحة مباشرة بعد الحفظ، والمرفقات تُخزن بشكل خاص.</p>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ContactPage() {
  return <Suspense fallback={<main className="bb-app-canvas min-h-[calc(100vh-5rem)]" />}><ContactContent /></Suspense>;
}
