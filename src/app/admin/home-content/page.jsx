'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, EyeOff, ImagePlus, Megaphone, Trash2, Upload } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

const emptyBanner = { title: '', subtitle: '', media_url: '', media_type: 'image', link_url: '', duration_seconds: 7, sort_order: 0, is_active: true, starts_at: '', ends_at: '' };
const emptyTicker = { text: '', link_url: '', duration_seconds: 8, sort_order: 0, is_active: true, starts_at: '', ends_at: '' };

export default function HomeContentAdmin() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [allowed, setAllowed] = useState(null);
  const [tab, setTab] = useState('banners');
  const [banners, setBanners] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [bannerForm, setBannerForm] = useState(emptyBanner);
  const [tickerForm, setTickerForm] = useState(emptyTicker);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) { setAllowed(false); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.session.user.id).maybeSingle();
    const ok = ['ADMIN','SUPER_ADMIN'].includes(profile?.role);
    setAllowed(ok);
    if (!ok) return;
    const [{ data: bannerRows }, { data: tickerRows }] = await Promise.all([
      supabase.from('home_banners').select('*').order('sort_order').order('created_at'),
      supabase.from('home_tickers').select('*').order('sort_order').order('created_at'),
    ]);
    setBanners(bannerRows || []);
    setTickers(tickerRows || []);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setMessage('');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('home-banners').upload(path, file, { contentType: file.type, upsert: false });
    if (error) setMessage(error.message);
    else {
      const { data } = supabase.storage.from('home-banners').getPublicUrl(path);
      setBannerForm((value) => ({ ...value, media_url: data.publicUrl, media_type: file.type.startsWith('video/') ? 'video' : 'image' }));
    }
    setUploading(false);
  }

  async function saveBanner(event) {
    event.preventDefault(); setMessage('');
    if (!bannerForm.title.trim() || !bannerForm.media_url.trim()) { setMessage('العنوان والوسائط مطلوبان.'); return; }
    const payload = { ...bannerForm, title: bannerForm.title.trim(), subtitle: bannerForm.subtitle.trim() || null, link_url: bannerForm.link_url.trim() || null, duration_seconds: Number(bannerForm.duration_seconds), sort_order: Number(bannerForm.sort_order), starts_at: bannerForm.starts_at || null, ends_at: bannerForm.ends_at || null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('home_banners').insert(payload);
    if (error) setMessage(error.message); else { setBannerForm(emptyBanner); setMessage('تم نشر البنر بنجاح.'); await load(); }
  }

  async function saveTicker(event) {
    event.preventDefault(); setMessage('');
    if (!tickerForm.text.trim()) { setMessage('نص الشريط مطلوب.'); return; }
    const payload = { ...tickerForm, text: tickerForm.text.trim(), link_url: tickerForm.link_url.trim() || null, duration_seconds: Number(tickerForm.duration_seconds), sort_order: Number(tickerForm.sort_order), starts_at: tickerForm.starts_at || null, ends_at: tickerForm.ends_at || null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('home_tickers').insert(payload);
    if (error) setMessage(error.message); else { setTickerForm(emptyTicker); setMessage('تم نشر إعلان الشريط الأحمر.'); await load(); }
  }

  async function toggle(table, item) {
    await supabase.from(table).update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id);
    await load();
  }

  async function remove(table, id) {
    if (!window.confirm('هل تريد حذف هذا العنصر؟')) return;
    await supabase.from(table).delete().eq('id', id);
    await load();
  }

  const field = 'bb-input w-full rounded-xl border p-3.5 outline-none';

  if (allowed === null) return <main className="bb-app-canvas min-h-screen p-10" dir="rtl">جاري التحقق من الصلاحيات...</main>;
  if (!allowed) return <main className="bb-app-canvas min-h-screen p-10" dir="rtl"><div className="bb-panel max-w-lg rounded-3xl border p-7"><h1 className="text-2xl font-black">غير مصرح</h1><p className="bb-text-tertiary mt-3">هذه الصفحة مخصصة للإدارة.</p></div></main>;

  return <main dir="rtl" className="bb-app-canvas min-h-screen px-4 py-10 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="bb-text-tertiary bb-hoverable inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs"><ArrowRight size={16}/> العودة لمركز الإدارة</Link>
      <div className="bb-panel mt-5 rounded-3xl border p-6"><div className="bb-text-accent text-xs font-black">ADMIN CONTROL CENTER</div><h1 className="mt-2 text-4xl font-black">إدارة محتوى الرئيسية</h1><p className="bb-text-tertiary mt-2 text-sm">تحكم في البنر الكبير وشريط العروض الأحمر من مكان واحد.</p></div>

      <div className="bb-panel mt-6 flex gap-2 rounded-2xl border p-2">
        <button onClick={() => { setTab('banners'); setMessage(''); }} className={`rounded-xl px-5 py-3 text-sm font-black ${tab === 'banners' ? 'bb-button-primary' : 'bb-button-secondary'}`}>البنر الكبير</button>
        <button onClick={() => { setTab('ticker'); setMessage(''); }} className={`rounded-xl px-5 py-3 text-sm font-black ${tab === 'ticker' ? 'bb-button-primary' : 'bb-button-secondary'}`}>شريط العروض الأحمر</button>
      </div>

      {tab === 'banners' ? <div className="mt-6 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <form onSubmit={saveBanner} className="bb-panel rounded-[24px] border p-5 sm:p-6">
          <h2 className="font-black">إضافة إعلان / عرض جديد</h2><div className="mt-5 space-y-3">
            <input value={bannerForm.title} onChange={(event) => setBannerForm({ ...bannerForm, title: event.target.value })} placeholder="عنوان البنر" className={field}/>
            <textarea value={bannerForm.subtitle} onChange={(event) => setBannerForm({ ...bannerForm, subtitle: event.target.value })} placeholder="وصف مختصر" rows={3} className={field}/>
            <label className="bb-accent-soft flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-sm font-black"><Upload size={18}/>{uploading ? 'جاري الرفع...' : 'رفع بوستر أو فيديو'}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={upload} className="hidden"/></label>
            <input value={bannerForm.media_url} onChange={(event) => setBannerForm({ ...bannerForm, media_url: event.target.value })} placeholder="أو رابط الصورة / الفيديو" dir="ltr" className={field}/>
            <input value={bannerForm.link_url} onChange={(event) => setBannerForm({ ...bannerForm, link_url: event.target.value })} placeholder="رابط عند النقر - اختياري" dir="ltr" className={field}/>
            <ScheduleFields form={bannerForm} setForm={setBannerForm} field={field}/>
            {bannerForm.media_url && <div className="bb-border overflow-hidden rounded-xl border">{bannerForm.media_type === 'video' ? <video src={bannerForm.media_url} controls className="h-36 w-full object-cover"/> : <img src={bannerForm.media_url} alt="معاينة" className="h-36 w-full object-cover"/>}</div>}
            {message && <div className="bb-card bb-text-secondary rounded-xl border p-3 text-xs">{message}</div>}
            <button className="bb-button-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black"><ImagePlus size={18}/> نشر البنر</button>
          </div>
        </form>
        <List title="البنرات الحالية" items={banners} type="banner" onToggle={(item) => toggle('home_banners', item)} onRemove={(id) => remove('home_banners', id)}/>
      </div> : <div className="mt-6 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <form onSubmit={saveTicker} className="bb-panel rounded-[24px] border p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-black"><Megaphone size={18} className="bb-text-accent"/> إضافة رسالة للشريط الأحمر</h2><div className="mt-5 space-y-3">
            <textarea value={tickerForm.text} onChange={(event) => setTickerForm({ ...tickerForm, text: event.target.value })} placeholder="مثال: خصم 20% على الباقة الاحترافية حتى نهاية الأسبوع" rows={4} className={field}/>
            <input value={tickerForm.link_url} onChange={(event) => setTickerForm({ ...tickerForm, link_url: event.target.value })} placeholder="رابط عند النقر - اختياري" dir="ltr" className={field}/>
            <ScheduleFields form={tickerForm} setForm={setTickerForm} field={field}/>
            {message && <div className="bb-card bb-text-secondary rounded-xl border p-3 text-xs">{message}</div>}
            <button className="bb-button-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black"><Megaphone size={18}/> نشر في الشريط الأحمر</button>
          </div>
        </form>
        <List title="رسائل الشريط الحالية" items={tickers} type="ticker" onToggle={(item) => toggle('home_tickers', item)} onRemove={(id) => remove('home_tickers', id)}/>
      </div>}
    </div>
  </main>;
}

function ScheduleFields({ form, setForm, field }) {
  return <><div className="grid grid-cols-2 gap-3"><label className="bb-text-tertiary text-xs">مدة الظهور بالثواني<input type="number" min="3" max="120" value={form.duration_seconds} onChange={(event) => setForm({ ...form, duration_seconds: event.target.value })} className={`mt-2 ${field}`}/></label><label className="bb-text-tertiary text-xs">ترتيب الظهور<input type="number" min="0" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} className={`mt-2 ${field}`}/></label></div><div className="grid grid-cols-2 gap-3"><label className="bb-text-tertiary text-xs">يبدأ - اختياري<input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} className={`mt-2 ${field}`}/></label><label className="bb-text-tertiary text-xs">ينتهي - اختياري<input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} className={`mt-2 ${field}`}/></label></div></>;
}

function List({ title, items, type, onToggle, onRemove }) {
  return <section className="bb-panel rounded-[24px] border p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="font-black">{title}</h2><span className="bb-text-disabled text-xs">{items.length} عنصر</span></div><div className="mt-5 space-y-3">{items.length === 0 ? <div className="bb-card bb-text-disabled rounded-xl border border-dashed p-10 text-center text-sm">لا توجد عناصر بعد.</div> : items.map((item) => <article key={item.id} className="bb-card rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black">{type === 'ticker' ? item.text : item.title}</h3>{type === 'banner' && item.subtitle && <p className="bb-text-tertiary mt-1 line-clamp-2 text-xs">{item.subtitle}</p>}<div className="bb-text-disabled mt-3 flex flex-wrap items-center gap-2 text-[10px]"><span>{item.duration_seconds} ث</span><span>• ترتيب {item.sort_order}</span>{item.starts_at && <span>• يبدأ {new Date(item.starts_at).toLocaleString('ar-LY')}</span>}{item.ends_at && <span>• ينتهي {new Date(item.ends_at).toLocaleString('ar-LY')}</span>}</div></div><span className="rounded-full border px-2 py-1 text-[10px] font-black" style={{ background: item.is_active ? 'var(--bb-success-soft)' : 'var(--bb-hover)', color: item.is_active ? 'var(--bb-success)' : 'var(--bb-text-tertiary)', borderColor: item.is_active ? 'color-mix(in srgb, var(--bb-success) 25%, transparent)' : 'var(--bb-border)' }}>{item.is_active ? 'منشور' : 'مخفي'}</span></div><div className="mt-3 flex justify-end gap-2"><button onClick={() => onToggle(item)} className="bb-button-secondary rounded-lg border p-2">{item.is_active ? <EyeOff size={14}/> : <Eye size={14}/>}</button><button onClick={() => onRemove(item.id)} className="bb-button-secondary rounded-lg border p-2" style={{ color: 'var(--bb-danger)' }}><Trash2 size={14}/></button></div></article>)}</div></section>;
}
