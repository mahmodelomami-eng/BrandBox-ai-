'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, EyeOff, ImagePlus, Trash2, Upload } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

const empty = { title: '', subtitle: '', media_url: '', media_type: 'image', link_url: '', duration_seconds: 7, sort_order: 0, is_active: true, starts_at: '', ends_at: '' };

export default function HomeContentAdmin() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [allowed, setAllowed] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) { setAllowed(false); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.session.user.id).maybeSingle();
    const ok = ['ADMIN','SUPER_ADMIN'].includes(profile?.role);
    setAllowed(ok);
    if (!ok) return;
    const { data } = await supabase.from('home_banners').select('*').order('sort_order').order('created_at');
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function upload(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true); setMessage('');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('home-banners').upload(path, file, { contentType: file.type, upsert: false });
    if (error) setMessage(error.message);
    else {
      const { data } = supabase.storage.from('home-banners').getPublicUrl(path);
      setForm((v) => ({ ...v, media_url: data.publicUrl, media_type: file.type.startsWith('video/') ? 'video' : 'image' }));
    }
    setUploading(false);
  }

  async function save(event) {
    event.preventDefault(); setMessage('');
    if (!form.title.trim() || !form.media_url.trim()) { setMessage('العنوان والوسائط مطلوبان.'); return; }
    const payload = { ...form, title: form.title.trim(), subtitle: form.subtitle.trim() || null, link_url: form.link_url.trim() || null, duration_seconds: Number(form.duration_seconds), sort_order: Number(form.sort_order), starts_at: form.starts_at || null, ends_at: form.ends_at || null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('home_banners').insert(payload);
    if (error) setMessage(error.message); else { setForm(empty); setMessage('تم نشر البنر بنجاح.'); await load(); }
  }

  async function toggle(item) { await supabase.from('home_banners').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id); await load(); }
  async function remove(id) { if (!window.confirm('حذف هذا البنر؟')) return; await supabase.from('home_banners').delete().eq('id', id); await load(); }

  if (allowed === null) return <main className="min-h-screen bg-[#07080b] p-10 text-white" dir="rtl">جاري التحقق من الصلاحيات...</main>;
  if (!allowed) return <main className="min-h-screen bg-[#07080b] p-10 text-white" dir="rtl"><h1 className="text-2xl font-black">غير مصرح</h1><p className="mt-3 text-gray-500">هذه الصفحة مخصصة للإدارة.</p></main>;

  return <main dir="rtl" className="min-h-screen bg-[#07080b] px-4 py-10 text-white sm:px-8">
    <div className="mx-auto max-w-6xl">
      <a href="/" className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-white"><ArrowRight size={16}/> العودة للرئيسية</a>
      <div className="mt-5"><div className="text-xs font-black text-[#f31325]">Admin Control Center</div><h1 className="mt-2 text-4xl font-black">إدارة بنرات الرئيسية</h1><p className="mt-2 text-sm text-gray-500">ارفع بوستر أو فيديو، حدد مدة العرض والترتيب وفترة النشر، وسيظهر في الشاشة الرئيسية.</p></div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <form onSubmit={save} className="rounded-[24px] border border-white/10 bg-[#101217] p-5 sm:p-6">
          <h2 className="font-black">إضافة إعلان / عرض جديد</h2>
          <div className="mt-5 space-y-3">
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="عنوان البنر" className="w-full rounded-xl border border-white/10 bg-[#171a21] p-3.5 outline-none focus:border-[#f31325]" />
            <textarea value={form.subtitle} onChange={e=>setForm({...form,subtitle:e.target.value})} placeholder="وصف مختصر" rows={3} className="w-full rounded-xl border border-white/10 bg-[#171a21] p-3.5 outline-none focus:border-[#f31325]" />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#f31325]/45 bg-red-500/[.04] p-5 text-sm font-black"><Upload size={18}/>{uploading ? 'جاري الرفع...' : 'رفع بوستر أو فيديو'}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={upload} className="hidden" /></label>
            <input value={form.media_url} onChange={e=>setForm({...form,media_url:e.target.value})} placeholder="أو رابط الصورة / الفيديو" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#171a21] p-3 text-left text-xs outline-none" />
            <input value={form.link_url} onChange={e=>setForm({...form,link_url:e.target.value})} placeholder="رابط عند النقر - اختياري" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#171a21] p-3 text-left text-xs outline-none" />
            <div className="grid grid-cols-2 gap-3"><label className="text-xs text-gray-500">مدة الشاشة بالثواني<input type="number" min="3" max="120" value={form.duration_seconds} onChange={e=>setForm({...form,duration_seconds:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#171a21] p-3 text-white" /></label><label className="text-xs text-gray-500">ترتيب الظهور<input type="number" min="0" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#171a21] p-3 text-white" /></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs text-gray-500">يبدأ - اختياري<input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#171a21] p-3 text-white" /></label><label className="text-xs text-gray-500">ينتهي - اختياري<input type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#171a21] p-3 text-white" /></label></div>
            {form.media_url && <div className="overflow-hidden rounded-xl border border-white/10">{form.media_type==='video'?<video src={form.media_url} controls className="h-36 w-full object-cover"/>:<img src={form.media_url} alt="معاينة" className="h-36 w-full object-cover"/>}</div>}
            {message && <div className="rounded-xl bg-white/5 p-3 text-xs text-gray-300">{message}</div>}
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] py-3.5 text-sm font-black"><ImagePlus size={18}/> نشر البنر</button>
          </div>
        </form>

        <section className="rounded-[24px] border border-white/10 bg-[#101217] p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="font-black">البنرات الحالية</h2><span className="text-xs text-gray-600">{items.length} عنصر</span></div><div className="mt-5 space-y-3">{items.length===0?<div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-gray-600">لا توجد بنرات مضافة بعد.</div>:items.map(item=><article key={item.id} className="flex gap-4 rounded-2xl border border-white/10 bg-[#0b0d12] p-3"><div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-black">{item.media_type==='video'?<video src={item.media_url} muted className="h-full w-full object-cover"/>:<img src={item.media_url} alt="" className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="truncate text-sm font-black">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.subtitle}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.is_active?'bg-emerald-500/10 text-emerald-300':'bg-white/5 text-gray-500'}`}>{item.is_active?'منشور':'مخفي'}</span></div><div className="mt-3 flex items-center gap-2 text-[10px] text-gray-600"><span>{item.duration_seconds} ث</span><span>• ترتيب {item.sort_order}</span><button onClick={()=>toggle(item)} className="mr-auto rounded-lg border border-white/10 p-1.5 text-gray-400">{item.is_active?<EyeOff size={14}/>:<Eye size={14}/>}</button><button onClick={()=>remove(item.id)} className="rounded-lg border border-red-500/20 p-1.5 text-red-400"><Trash2 size={14}/></button></div></div></article>)}</div></section>
      </div>
    </div>
  </main>;
}
