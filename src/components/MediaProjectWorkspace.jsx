'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, Clock3, Loader2, Mic2, Save, Sparkles, Video } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { listUserProjects } from '../lib/projects/projects-service';
import ProjectToolNav from './ProjectToolNav';

const CONFIG = {
  video: {
    label: 'الفيديو AI',
    projectLabel: 'مشروع فيديو',
    listHref: '/projects/video',
    icon: Video,
    promptLabel: 'وصف الفيديو',
    placeholder: 'صف المشهد، الحركة، زاوية الكاميرا، الإضاءة والتسلسل الزمني...',
    model: 'Runway Gen-3 Alpha',
    notice: 'مزود الفيديو ما زال في مرحلة التجهيز. يمكنك حفظ وصف الفيديو وإعداداته داخل المشروع الآن، وسيكون جاهزًا للتوليد عند تفعيل المزود.',
    settings: [
      { key: 'ratio', label: 'النسبة', values: ['16:9', '9:16', '1:1'] },
      { key: 'duration', label: 'المدة', values: ['5 ثوانٍ', '10 ثوانٍ', '15 ثانية'] },
      { key: 'quality', label: 'الجودة', values: ['720p', '1080p'] },
    ],
  },
  audio: {
    label: 'الصوت AI',
    projectLabel: 'مشروع صوت',
    listHref: '/projects/audio',
    icon: Mic2,
    promptLabel: 'النص أو وصف الصوت',
    placeholder: 'اكتب النص المراد تحويله إلى صوت أو صف النبرة، الأسلوب واللغة...',
    model: 'Brand Box Voice',
    notice: 'مزود الصوت المباشر لم يتم تفعيله بعد. يتم حفظ النص وإعدادات الصوت داخل المشروع حتى لا تضيع تجهيزاتك.',
    settings: [
      { key: 'voice', label: 'نوع الصوت', values: ['محايد', 'إعلاني', 'وثائقي', 'هادئ'] },
      { key: 'language', label: 'اللغة', values: ['العربية', 'الإنجليزية'] },
      { key: 'speed', label: 'السرعة', values: ['0.9x', '1.0x', '1.1x'] },
    ],
  },
};

function resolveTemplateSettings(config, templateSettings = {}) {
  return Object.fromEntries(config.settings.map((field) => {
    const requested = templateSettings?.[field.key];
    return [field.key, field.values.includes(requested) ? requested : field.values[0]];
  }));
}

export default function MediaProjectWorkspace({ tool = 'video', projectId, initialPrompt = '', templateSettings = {} }) {
  const config = CONFIG[tool] || CONFIG.video;
  const Icon = config.icon;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [settings, setSettings] = useState(() => resolveTemplateSettings(config, templateSettings));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(initialPrompt ? 'تم تحميل قالب جاهز. عدّل البرومبت والإعدادات ثم احفظه داخل المشروع.' : '');

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadItems() {
    const token = await getToken();
    if (!token) return;
    const response = await fetch(`/api/v1/project-tool-items?projectId=${encodeURIComponent(projectId)}&tool=${tool}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const payload = await response.json();
    setItems(Array.isArray(payload.items) ? payload.items : []);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const projects = await listUserProjects();
        if (!mounted) return;
        const found = projects.find((item) => item.id === projectId) || null;
        if (!found) throw new Error('المشروع غير موجود أو لا تملك صلاحية الوصول إليه.');
        setProject(found);
        await loadItems();
      } catch (err) {
        if (mounted) setMessage(err instanceof Error ? err.message : 'تعذر تحميل مساحة المشروع.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId, tool]);

  async function saveDraft() {
    if (!prompt.trim() || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/project-tool-items', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, tool, prompt: prompt.trim(), settings, status: 'draft', itemType: 'draft' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.item) throw new Error(payload.error || 'تعذر حفظ المسودة.');
      setItems((current) => [payload.item, ...current]);
      setPrompt('');
      setMessage('تم حفظ المسودة وإعداداتها داخل المشروع.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'تعذر حفظ المسودة.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#050506] pt-24 text-white"><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#f31325]" /></div></main>;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#050506] text-white">
      <ProjectToolNav activeTool={tool} />
      <div className="mx-auto grid max-w-[1700px] gap-5 px-4 py-6 lg:px-6 xl:grid-cols-[1fr_390px]">
        <section className="order-2 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12] xl:order-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-xs font-black text-[#ff3344]">{config.projectLabel}</div>
              <h1 className="mt-1 text-xl font-black">{project?.name || config.projectLabel}</h1>
            </div>
            <Link href={config.listHref} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400 hover:text-white">كل مشاريع {tool === 'video' ? 'الفيديو' : 'الصوت'}</Link>
          </div>

          <div className="p-5">
            <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 text-xs leading-6 text-amber-200">
              <div className="flex items-start gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-400" /><div><div className="font-black">التوليد المباشر غير مفعل بعد</div><p className="mt-1 text-amber-100/70">{config.notice}</p></div></div>
            </div>

            <div className="min-h-[470px] rounded-3xl border border-dashed border-white/10 bg-[#080a0e] p-5">
              <div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-black">سجل المشروع</h2><span className="text-[11px] text-gray-600">{items.length} عنصر محفوظ</span></div>
              {items.length === 0 ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171a21] text-[#ff3344]"><Icon size={30} /></span>
                  <h3 className="mt-5 text-lg font-black">لا توجد عناصر محفوظة بعد</h3>
                  <p className="mt-2 max-w-md text-sm leading-7 text-gray-500">جهّز أول وصف وإعداداته من لوحة الأدوات، ثم احفظه داخل هذا المشروع.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {items.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/10 bg-[#11141a] p-4">
                      <div className="flex items-center justify-between"><span className="rounded-lg bg-[#f31325]/10 px-2 py-1 text-[10px] font-black text-[#ff3344]">مسودة</span><span className="flex items-center gap-1 text-[10px] text-gray-600"><Clock3 size={12} /> {item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}</span></div>
                      <p className="mt-4 line-clamp-5 text-sm leading-7 text-gray-300">{item.prompt}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">{Object.entries(item.settings || {}).map(([key, value]) => <span key={key} className="rounded-lg border border-white/[.07] bg-[#0b0d12] px-2 py-1 text-[10px] text-gray-500">{String(value)}</span>)}</div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="order-1 h-fit rounded-3xl border border-white/10 bg-[#0d1016] p-5 xl:order-2 xl:sticky xl:top-[150px]">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f31325]/12 text-[#ff3344]"><Icon size={22} /></span><div><div className="text-sm font-black">أدوات {config.label}</div><div className="text-[11px] text-gray-500">{config.model}</div></div></div>
          <label className="mt-6 block text-xs font-black text-gray-400">{config.promptLabel}</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={config.placeholder} className="mt-2 min-h-44 w-full resize-none rounded-2xl border border-white/10 bg-[#171a21] p-4 text-sm leading-7 outline-none placeholder:text-gray-600 focus:border-[#f31325]/55" />

          <div className="mt-5 space-y-4">
            {config.settings.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-2 block text-xs font-black text-gray-400">{field.label}</span>
                <div className="relative">
                  <select value={settings[field.key]} onChange={(e) => setSettings((current) => ({ ...current, [field.key]: e.target.value }))} className="w-full appearance-none rounded-xl border border-white/10 bg-[#171a21] px-4 py-3 text-sm font-bold outline-none focus:border-[#f31325]/55">
                    {field.values.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                </div>
              </label>
            ))}
          </div>

          {message && <div className="mt-4 rounded-xl border border-white/10 bg-[#11141a] px-3 py-2 text-xs leading-5 text-gray-300">{message}</div>}
          <button onClick={saveDraft} disabled={saving || !prompt.trim()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f31325] py-4 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ داخل المشروع
          </button>
          <button disabled className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#15171d] py-4 text-sm font-black text-gray-600"><Sparkles size={18} /> توليد — قريبًا</button>
        </aside>
      </div>
    </main>
  );
}
