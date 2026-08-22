'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, ChevronDown, Image as ImageIcon, MessageSquare, Play, SlidersHorizontal, Sparkles, Video } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const IMAGE_RESULTS = [
  { src: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&auto=format&fit=crop&q=80', ratio: 'aspect-square', title: 'هوية إعلانية فنية' },
  { src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80', ratio: 'aspect-[4/5]', title: 'مشهد سينمائي' },
  { src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80', ratio: 'aspect-[16/10]', title: 'تصميم تجاري حديث' },
  { src: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=900&auto=format&fit=crop&q=80', ratio: 'aspect-[3/4]', title: 'ملصق بصري إبداعي' },
];

const VIDEO_RESULTS = [
  { src: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&auto=format&fit=crop&q=80', ratio: 'aspect-video', title: 'إعلان سينمائي' },
  { src: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=900&auto=format&fit=crop&q=80', ratio: 'aspect-[4/5]', title: 'ريلز منتج' },
  { src: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&auto=format&fit=crop&q=80', ratio: 'aspect-video', title: 'مشهد قصصي' },
  { src: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&auto=format&fit=crop&q=80', ratio: 'aspect-square', title: 'موشن بصري' },
];

const CHAT_RESULTS = [
  ['اكتب إعلانًا لمقهى جديد', 'إليك فكرة إعلان مختصرة تركز على التجربة والهوية بدل الخصم المباشر.'],
  ['جهز خطة محتوى أسبوعية', 'سأقسم الأسبوع إلى توعية، تفاعل، إثبات اجتماعي، عرض، ومحتوى قصصي.'],
  ['اقترح أسماء لحملة', 'يمكن بناء الأسماء حول الوعد الأساسي للحملة ونبرة العلامة والجمهور المستهدف.'],
  ['حلل فكرة هذا المنشور', 'الفكرة جيدة بصريًا، ويمكن تقويتها بعنوان أوضح ودعوة إجراء واحدة مباشرة.'],
];

const CONFIG = {
  image: {
    eyebrow: 'إنشاء داخل المشروع',
    title: 'مولد الصور AI',
    subtitle: 'جرّب شكل مساحة التوليد وشاهد أمثلة للنتائج. التوليد الفعلي يتم بعد تسجيل الدخول واختيار مشروع.',
    prompt: 'صف البوستر، العناصر، الألوان والأسلوب البصري...',
    model: 'GPT Image 2',
    provider: 'OpenRouter · OpenAI',
    icon: ImageIcon,
  },
  video: {
    eyebrow: 'إنشاء داخل المشروع',
    title: 'مولد الفيديو AI',
    subtitle: 'استكشف تجربة توليد الفيديو قبل الدخول. عند البدء ستنتقل إلى مشاريعك لحفظ كل فيديو ضمن سياقه.',
    prompt: 'صف المشهد، الحركة، زاوية الكاميرا والإضاءة...',
    model: 'Video AI',
    provider: 'مزود الفيديو داخل Brand Box',
    icon: Video,
  },
  chat: {
    eyebrow: 'محادثة داخل المشروع',
    title: 'شات AI',
    subtitle: 'شاهد أمثلة لكيفية استخدام المساعد في المحتوى والتسويق. المحادثات الفعلية تحفظ داخل مشاريع المستخدم.',
    prompt: 'اكتب سؤالك أو المهمة التي تريد من المساعد تنفيذها...',
    model: 'Brand Box Chat',
    provider: 'نماذج متعددة',
    icon: MessageSquare,
  },
};

export default function PublicGenerationDemo({ type = 'image' }) {
  const config = CONFIG[type] || CONFIG.image;
  const Icon = config.icon;
  const [sessionUser, setSessionUser] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [resultCount, setResultCount] = useState(1);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionUser(data.session?.user || null);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessionUser(session?.user || null);
      setChecking(false);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const samples = useMemo(() => (type === 'video' ? VIDEO_RESULTS : IMAGE_RESULTS), [type]);

  function continueToGeneration() {
    if (checking) return;
    if (sessionUser) {
      window.location.href = '/projects';
      return;
    }
    window.location.href = '/auth?mode=login&next=/projects';
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#080a0f] pb-10 pt-24 text-white">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[#242936] bg-[#0d1018] px-5 py-4">
          <div>
            <div className="text-xs font-black text-[#ff3344]">{config.eyebrow}</div>
            <h1 className="mt-1 text-2xl font-black">{config.title}</h1>
            <p className="mt-1 max-w-3xl text-xs leading-6 text-gray-500">{config.subtitle}</p>
          </div>
          <button onClick={continueToGeneration} className="rounded-xl bg-[#f31325] px-5 py-3 text-sm font-black transition hover:bg-[#ff2637]">
            {sessionUser ? 'الانتقال إلى مشاريعي' : 'سجل الدخول وابدأ التوليد'}
          </button>
        </div>

        <div className="grid min-h-[690px] overflow-hidden rounded-2xl border border-[#252b3a] bg-[#07090e] xl:grid-cols-[1fr_405px]">
          <section className="order-2 border-t border-[#252b3a] p-4 xl:order-1 xl:border-l xl:border-t-0 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-xl bg-[#10131b] p-1 text-xs font-bold text-gray-500">
                <span className="rounded-lg bg-[#262b37] px-5 py-3 text-white">الكل</span>
                <span className="px-5 py-3">الصور</span>
                <span className="px-5 py-3">الفيديو</span>
                <span className="px-5 py-3">المحادثات</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <Sparkles size={17} className="text-[#ff3344]" /> أمثلة توضيحية لنتائج Brand Box AI
              </div>
            </div>

            {type === 'chat' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {CHAT_RESULTS.map(([question, answer], index) => (
                  <div key={question} className={`rounded-2xl border border-[#252b3a] bg-[#10131b] p-5 ${index === 0 ? 'md:row-span-2' : ''}`}>
                    <div className="mb-4 flex items-center gap-2 text-sm font-black"><Bot size={18} className="text-[#ff3344]" /> مثال محادثة</div>
                    <div className="rounded-xl bg-[#1a1e28] p-4 text-sm text-gray-200">{question}</div>
                    <div className="mt-3 rounded-xl border border-[#292f3d] p-4 text-sm leading-7 text-gray-400">{answer}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                {samples.map((item, index) => (
                  <article key={item.src} className={`group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[#252b3a] bg-[#10131b] ${index === 0 ? 'sm:col-span-2' : ''}`}>
                    <img src={item.src} alt={item.title} className={`w-full ${item.ratio} object-cover opacity-90 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-100`} />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                      <div><div className="text-sm font-black">{item.title}</div><div className="mt-1 text-[10px] text-gray-400">مثال توليد</div></div>
                      {type === 'video' && <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"><Play size={17} fill="currentColor" /></span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="order-1 bg-[#0e1119] xl:order-2">
            <div className="flex items-center justify-between border-b border-[#252b3a] px-5 py-5">
              <div><div className="text-xs font-black text-[#ff3344]">{config.eyebrow}</div><div className="mt-1 text-lg font-black">معاينة الأداة</div></div>
              <span className="rounded-xl border border-[#283040] p-3 text-gray-400"><SlidersHorizontal size={19} /></span>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-black">الوصف</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onFocus={continueToGeneration} placeholder={config.prompt} className="h-52 w-full resize-none rounded-2xl border border-[#303747] bg-[#191d27] p-4 text-sm leading-7 text-white outline-none placeholder:text-gray-600 focus:border-[#f31325]" />
              </div>

              {type !== 'chat' && <div>
                <label className="mb-2 block text-sm font-black">الحجم / النسبة</label>
                <button onClick={continueToGeneration} className="flex w-full items-center justify-between rounded-2xl border border-[#303747] bg-[#151923] px-4 py-4 text-sm font-black"><span className="flex items-center gap-2"><Icon size={18} className="text-gray-500" /> 1:1</span><ChevronDown size={17} className="text-gray-500" /></button>
              </div>}

              <div>
                <label className="mb-2 block text-sm font-black">نموذج التوليد</label>
                <button onClick={continueToGeneration} className="flex w-full items-center justify-between rounded-2xl border border-[#303747] bg-[#151923] px-4 py-4 text-right"><span><span className="block text-sm font-black">{config.model}</span><span className="mt-1 block text-[11px] text-gray-500">{config.provider}</span></span><ChevronDown size={17} className="text-gray-500" /></button>
              </div>

              {type === 'image' && <div className="flex items-center justify-between rounded-2xl border border-[#303747] bg-[#151923] p-4"><span className="text-sm font-black">عدد النتائج</span><div className="flex gap-1">{[1, 2, 4].map((count) => <button key={count} onClick={() => { setResultCount(count); continueToGeneration(); }} className={`h-10 w-10 rounded-lg text-sm font-black ${resultCount === count ? 'bg-white text-black' : 'text-gray-500 hover:bg-white/5'}`}>{count}</button>)}</div></div>}

              <button onClick={continueToGeneration} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f31325] py-4 text-sm font-black shadow-[0_14px_40px_rgba(243,19,37,.18)] transition hover:bg-[#ff2637]">
                <Sparkles size={18} /> {sessionUser ? 'اختر مشروعًا وابدأ التوليد' : 'ابدأ التوليد'}
              </button>
              <p className="text-center text-[11px] leading-5 text-gray-600">الأمثلة أعلاه للعرض فقط. لن يتم استهلاك نقاط قبل تسجيل الدخول وبدء توليد حقيقي داخل مشروع.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
