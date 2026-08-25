'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Palette, Save, Sparkles } from 'lucide-react';
import AuthGate from '../../components/AuthGate';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

const EMPTY_BRAND = {
  brandName: '',
  tagline: '',
  description: '',
  primaryColor: '#F31325',
  secondaryColor: '#090A0F',
  accentColor: '#FFFFFF',
  fontFamily: 'Tajawal (أنيق وبسيط)',
  toneOfVoice: 'احترافي وواضح',
};

function BrandKitWorkspace() {
  const { user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [brand, setBrand] = useState(EMPTY_BRAND);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!user?.id) return undefined;
    let mounted = true;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from('brand_kits')
        .select('brand_name,tagline,description,primary_color,secondary_color,accent_color,font_family,tone_of_voice')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        setNotice({ type: 'error', text: 'تعذر تحميل Brand Kit الآن.' });
      } else if (data) {
        setBrand({
          brandName: data.brand_name || '',
          tagline: data.tagline || '',
          description: data.description || '',
          primaryColor: data.primary_color || '#F31325',
          secondaryColor: data.secondary_color || '#090A0F',
          accentColor: data.accent_color || '#FFFFFF',
          fontFamily: data.font_family || 'Tajawal (أنيق وبسيط)',
          toneOfVoice: data.tone_of_voice || 'احترافي وواضح',
        });
      }
      setLoading(false);
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [supabase, user?.id]);

  const setField = (key, value) => setBrand((current) => ({ ...current, [key]: value }));

  async function handleSave(event) {
    event.preventDefault();
    if (!user?.id || saving) return;
    if (!brand.brandName.trim()) {
      setNotice({ type: 'error', text: 'أدخل اسم العلامة التجارية قبل الحفظ.' });
      return;
    }

    setSaving(true);
    setNotice(null);
    const { error } = await supabase.from('brand_kits').upsert({
      user_id: user.id,
      brand_name: brand.brandName.trim(),
      tagline: brand.tagline.trim(),
      description: brand.description.trim(),
      primary_color: brand.primaryColor,
      secondary_color: brand.secondaryColor,
      accent_color: brand.accentColor,
      font_family: brand.fontFamily,
      tone_of_voice: brand.toneOfVoice.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    setSaving(false);
    setNotice(error
      ? { type: 'error', text: 'تعذر حفظ Brand Kit. حاول مرة أخرى.' }
      : { type: 'success', text: 'تم حفظ Brand Kit وربطه بحسابك.' });
  }

  if (loading) {
    return <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#050608] text-white"><Loader2 className="h-7 w-7 animate-spin text-[#ff3344]" /></main>;
  }

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-7 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.17),transparent_40%),#0b0d12] p-6 sm:p-9 lg:grid-cols-[1fr_.78fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f31325]/25 bg-[#f31325]/7 px-4 py-2 text-xs font-black text-red-300"><Sparkles size={15} /> BRAND KIT</div>
            <h1 className="mt-5 text-4xl font-black leading-tight">هوية علامتك، محفوظة داخل حسابك</h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-gray-400">احفظ الاسم، الألوان، النبرة والخط مرة واحدة. عند تفعيل «استخدام Brand Kit» داخل استوديو الصور، تُضاف هذه البيانات فعليًا إلى تعليمات التوليد للمشروع الحالي.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11141a] p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-black text-gray-500">معاينة سريعة</span><span className="h-3 w-3 rounded-full" style={{ backgroundColor: brand.primaryColor }} /></div>
            <div className="mt-5 rounded-2xl border border-white/10 p-5" style={{ background: `linear-gradient(135deg, ${brand.secondaryColor}, #0b0d12)` }}>
              <div className="text-2xl font-black" style={{ color: brand.accentColor }}>{brand.brandName || 'اسم علامتك'}</div>
              <div className="mt-2 text-sm font-bold" style={{ color: brand.primaryColor }}>{brand.tagline || 'الشعار اللفظي للعلامة'}</div>
              <p className="mt-4 text-xs leading-6 text-gray-400">{brand.toneOfVoice || 'نبرة العلامة ستظهر هنا.'}</p>
            </div>
          </div>
        </section>

        {notice && <div className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold ${notice.type === 'success' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>{notice.type === 'success' && <CheckCircle2 size={15} />}{notice.text}</div>}

        <form onSubmit={handleSave} className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-7">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Palette size={21} /></span><div><h2 className="font-black">معلومات العلامة</h2><p className="mt-1 text-[11px] text-gray-500">السياق الذي يوجه التوليد البصري.</p></div></div>
            <label className="mt-6 block text-xs font-bold text-gray-400">اسم العلامة التجارية
              <input value={brand.brandName} maxLength={120} onChange={(event) => setField('brandName', event.target.value)} placeholder="مثال: Brand Box" className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm outline-none focus:border-[#f31325]/60" />
            </label>
            <label className="mt-4 block text-xs font-bold text-gray-400">الشعار اللفظي
              <input value={brand.tagline} maxLength={180} onChange={(event) => setField('tagline', event.target.value)} placeholder="عبارة قصيرة تعبّر عن العلامة" className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm outline-none focus:border-[#f31325]/60" />
            </label>
            <label className="mt-4 block text-xs font-bold text-gray-400">وصف النشاط والمنتجات
              <textarea value={brand.description} maxLength={1200} onChange={(event) => setField('description', event.target.value)} placeholder="ما الذي تقدمه العلامة؟ ولمن؟" className="mt-2 min-h-32 w-full resize-y rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm leading-7 outline-none focus:border-[#f31325]/60" />
            </label>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-7">
            <h2 className="font-black">الألوان ونبرة الصوت</h2>
            <p className="mt-1 text-[11px] text-gray-500">تُستخدم كقيود إبداعية عند توليد الصور مع Brand Kit.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['primaryColor', 'الرئيسي'],
                ['secondaryColor', 'الثانوي'],
                ['accentColor', 'التمييز'],
              ].map(([key, label]) => <label key={key} className="rounded-2xl border border-white/10 bg-[#11141a] p-3 text-[10px] font-black text-gray-500">{label}<div className="mt-2 flex items-center gap-2"><input type="color" value={brand[key]} onChange={(event) => setField(key, event.target.value)} className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent" /><span dir="ltr" className="font-mono text-gray-300">{brand[key]}</span></div></label>)}
            </div>
            <label className="mt-5 block text-xs font-bold text-gray-400">الخط المفضل
              <select value={brand.fontFamily} onChange={(event) => setField('fontFamily', event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm outline-none focus:border-[#f31325]/60">
                <option>Cairo (عربي عصري)</option>
                <option>Tajawal (أنيق وبسيط)</option>
                <option>Almarai (رسمي للشركات)</option>
                <option>Changa (جريء للإعلانات)</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-bold text-gray-400">نبرة الصوت
              <input value={brand.toneOfVoice} maxLength={240} onChange={(event) => setField('toneOfVoice', event.target.value)} placeholder="مثال: احترافي، مباشر، واثق" className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm outline-none focus:border-[#f31325]/60" />
            </label>
            <button type="submit" disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] px-5 py-3.5 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{saving ? 'جاري الحفظ...' : 'حفظ Brand Kit'}</button>
          </section>
        </form>
      </div>
    </main>
  );
}

export default function BrandKitPage() {
  return <AuthGate><BrandKitWorkspace /></AuthGate>;
}
