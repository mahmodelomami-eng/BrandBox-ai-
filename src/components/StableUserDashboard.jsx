'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Crown, Folder, FolderOpen, ImageIcon, Info, Layers3, Menu,
  MessageSquare, Mic2, MoreVertical, PlayCircle, Sparkles, Star, TrendingUp,
  Video, WandSparkles, X
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const toolCards = [
  { href: '/images-ai', label: 'الصور AI', text: 'توليد وتحرير الصور بذكاء اصطناعي', icon: ImageIcon },
  { href: '/video-ai', label: 'الفيديو AI', text: 'إنشاء فيديوهات احترافية بذكاء اصطناعي', icon: Video },
  { href: '/chat-ai', label: 'الشات AI', text: 'محادثة ذكية ومساعدك الإبداعي', icon: MessageSquare },
  { href: '/audio-ai', label: 'الصوت AI', text: 'توليد الصوت والتعليق الصوتي الاحترافي', icon: Mic2 },
];

function MetricCard({ label, value, helper, action, href, icon: Icon, red = false }) {
  return (
    <div className="rounded-[18px] border border-white/[.08] bg-[linear-gradient(145deg,#111318,#0b0d11)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-400">{label}<Info size={14} /></div>
          <div className="mt-4 text-3xl font-black tracking-tight text-white">{value}</div>
          <div className="mt-2 text-xs text-gray-500">{helper}</div>
        </div>
        <div className={`grid h-16 w-16 place-items-center rounded-2xl ${red ? 'bg-[linear-gradient(135deg,#f31325,#980612)] text-white' : 'bg-white/[.07] text-gray-200'}`}>
          <Icon size={30} />
        </div>
      </div>
      <div className="mt-5 border-t border-white/[.06] pt-4">
        <Link href={href} className={`inline-flex items-center gap-2 text-sm font-black ${red ? 'text-[#ff3344]' : 'text-gray-300 hover:text-white'}`}>
          {action}<ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  );
}

export default function StableUserDashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [resolved, setResolved] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [stats, setStats] = useState({ projects: 0, generations: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fallback = window.setTimeout(() => mounted && setResolved(true), 1800);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const current = data.session || null;
        setSession(current);
        setResolved(true);
        if (!current?.user) return;

        const [profileRes, projectsRes, generationsRes, projectCountRes, generationCountRes] = await Promise.allSettled([
          supabase.from('profiles').select('first_name,last_name,avatar_url,role,credit_balance,status').eq('id', current.user.id).maybeSingle(),
          supabase.from('projects').select('id,name,type,thumbnail_url,updated_at,is_favorite').eq('owner_id', current.user.id).order('updated_at', { ascending: false }).limit(3),
          supabase.from('generations').select('id,generation_type,prompt,created_at,result_url').order('created_at', { ascending: false }).limit(3),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('owner_id', current.user.id),
          supabase.from('generations').select('id', { count: 'exact', head: true }),
        ]);

        if (!mounted) return;
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data || null);
        if (projectsRes.status === 'fulfilled' && !projectsRes.value.error) setProjects(projectsRes.value.data || []);
        if (generationsRes.status === 'fulfilled' && !generationsRes.value.error) setGenerations(generationsRes.value.data || []);
        setStats({
          projects: projectCountRes.status === 'fulfilled' ? projectCountRes.value.count || 0 : 0,
          generations: generationCountRes.status === 'fulfilled' ? generationCountRes.value.count || 0 : 0,
        });
      } catch (error) {
        console.error('Dashboard load error:', error);
        if (mounted) setResolved(true);
      }
    })();

    return () => {
      mounted = false;
      window.clearTimeout(fallback);
    };
  }, [supabase]);

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || session?.user?.email?.split('@')[0] || 'المستخدم';
  const firstName = profile?.first_name || displayName.split(' ')[0] || 'أحمد';
  const credits = Number(profile?.credit_balance || 0);

  if (resolved && !session?.user) {
    return (
      <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] px-5 py-12 text-white">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0d0f13] p-8 text-center">
          <h1 className="text-2xl font-black">لوحة تحكم Brand Box</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">يلزم تسجيل الدخول لعرض لوحة التحكم الخاصة بك.</p>
          <Link href="/auth?next=%2Fdashboard" className="mt-6 inline-flex rounded-xl bg-[#f31325] px-6 py-3 text-sm font-black">تسجيل الدخول</Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex justify-end lg:hidden">
          <button type="button" onClick={() => setMobileMenuOpen((v) => !v)} className="rounded-xl border border-white/10 bg-[#0d0f13] p-2.5"><Menu size={20}/></button>
        </div>

        <section className="relative overflow-hidden rounded-[20px] border border-white/[.08] bg-[radial-gradient(circle_at_13%_40%,rgba(183,10,22,.42),transparent_28%),linear-gradient(130deg,#0a0b0f,#12141a)] px-6 py-8 sm:px-9 lg:min-h-[180px] lg:px-16 lg:py-10">
          <div className="absolute left-8 top-1/2 hidden h-28 w-28 -translate-y-1/2 rotate-45 rounded-[18px] border border-red-600/20 bg-[linear-gradient(145deg,#111,#020202)] shadow-[0_0_45px_rgba(243,19,37,.14)] lg:block" />
          <div className="absolute left-24 top-1/2 hidden -translate-y-1/2 rounded-xl border border-red-500/20 bg-black/70 px-3 py-2 text-xl font-black text-[#ff2637] shadow-[0_0_25px_rgba(243,19,37,.24)] lg:block">AI</div>
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-3xl font-black sm:text-4xl lg:text-5xl">مرحبًا بك، {firstName} 👋</h1>
            <p className="mt-4 text-sm leading-7 text-gray-400 sm:text-base">جاهز لتحويل أفكارك إلى محتوى استثنائي باستخدام الذكاء الاصطناعي.</p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="الاشتراك" value="باقة برو" helper="الخطة الحالية" action="إدارة الاشتراك" href="/pricing" icon={Crown} red />
          <MetricCard label="عمليات التوليد" value={stats.generations.toLocaleString('ar-LY')} helper="إجمالي العمليات" action="عرض التقارير" href="/dashboard/studio" icon={TrendingUp} red />
          <MetricCard label="المشاريع النشطة" value={stats.projects.toLocaleString('ar-LY')} helper="مشروع في حسابك" action="عرض جميع المشاريع" href="/projects" icon={Folder} />
          <MetricCard label="الرصيد" value={credits.toLocaleString('ar-LY')} helper="كريدت متاح" action="شحن الرصيد" href="/pricing" icon={Layers3} red />
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {toolCards.map(({ href, label, text, icon: Icon }) => (
            <div key={href} className="rounded-[18px] border border-white/[.1] bg-[linear-gradient(145deg,#101217,#0b0d11)] p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center text-[#ff2637]"><Icon size={38}/></div>
                <div><h2 className="text-xl font-black">{label}</h2><p className="mt-2 text-sm leading-7 text-gray-400">{text}</p></div>
              </div>
              <Link href={href} className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-red-500/35 bg-red-500/[.06] px-4 py-3 text-sm font-black text-[#ff3344] transition hover:bg-red-500/[.12]">
                عرض المشاريع <ArrowLeft size={17}/>
              </Link>
            </div>
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.9fr]">
          <div className="rounded-[18px] border border-white/[.08] bg-[linear-gradient(145deg,#101217,#0b0d11)] p-5">
            <div className="flex items-center justify-between"><h3 className="text-lg font-black">التوليدات الأخيرة</h3><Link href="/dashboard/studio" className="text-sm font-black text-[#ff3344]">عرض الكل</Link></div>
            <div className="mt-4 space-y-3">
              {(generations.length ? generations : [
                { id: 'sample-1', prompt: 'صورة احترافية لمشروعك', generation_type: 'image' },
                { id: 'sample-2', prompt: 'فيديو ترويجي جديد', generation_type: 'video' },
                { id: 'sample-3', prompt: 'محتوى تسويقي مبتكر', generation_type: 'chat' },
              ]).slice(0, 3).map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[.05] bg-black/15 p-3">
                  <div className="grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#e8dfd4,#82796f)] text-black/60">
                    {item.generation_type === 'video' ? <PlayCircle size={26}/> : item.generation_type === 'chat' ? <MessageSquare size={24}/> : <ImageIcon size={24}/>} 
                  </div>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{item.prompt || `توليد جديد ${index + 1}`}</div><div className="mt-1 text-[11px] text-gray-500">أحدث نشاط</div></div>
                  <MoreVertical size={18} className="text-gray-500"/>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-white/[.08] bg-[linear-gradient(145deg,#101217,#0b0d11)] p-5">
            <div className="flex items-center justify-between"><h3 className="text-lg font-black">المشاريع الأخيرة</h3><Link href="/projects" className="text-sm font-black text-[#ff3344]">عرض الكل</Link></div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(projects.length ? projects : [
                { id: 'p1', name: 'هوية العلامة التجارية', type: 'هوية' },
                { id: 'p2', name: 'حملة الساعات الذكية', type: 'تسويق' },
                { id: 'p3', name: 'إطلاق منتج العناية', type: 'صور' },
              ]).slice(0, 3).map((project, index) => (
                <Link key={project.id} href="/projects" className="overflow-hidden rounded-xl border border-white/[.08] bg-[#0a0b0e] transition hover:border-red-500/30">
                  <div className="relative h-36 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,.18),transparent_30%),linear-gradient(135deg,#2a1a1d,#0b0d11)]">
                    {project.thumbnail_url ? <img src={project.thumbnail_url} alt={project.name} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-[#ff2637]"><Sparkles size={42}/></div>}
                    <button type="button" onClick={(e) => e.preventDefault()} className="absolute left-3 top-3 rounded-full bg-black/55 p-2 text-gray-300"><Star size={15}/></button>
                    <div className="absolute right-3 top-3 rounded-full bg-black/55 p-2 text-gray-300"><Info size={15}/></div>
                  </div>
                  <div className="p-4"><div className="truncate font-black">{project.name}</div><div className="mt-1 text-[11px] text-gray-500">{project.type || `مشروع ${index + 1}`}</div></div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_2fr]">
          <div className="rounded-[18px] border border-white/[.08] bg-[linear-gradient(145deg,#101217,#0b0d11)] p-5">
            <h3 className="text-lg font-black">اشتراكك</h3>
            <div className="mt-4 flex items-center gap-3"><Crown className="text-[#ff2637]"/><span className="rounded-xl border border-red-500/30 px-4 py-2 font-black text-[#ff3344]">باقة برو</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-4/5 bg-[#f31325]"/></div>
            <div className="mt-2 text-xs text-gray-500">استهلاك الرصيد ضمن خطتك الحالية</div>
            <Link href="/pricing" className="mt-5 block rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-center text-sm font-black">إدارة الاشتراك</Link>
          </div>
          <div className="rounded-[18px] border border-white/[.08] bg-[radial-gradient(circle_at_20%_50%,rgba(243,19,37,.10),transparent_30%),#0d0f13] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-lg font-black">ابدأ مشروعًا جديدًا</h3><p className="mt-2 text-sm text-gray-500">اختر أداة من أدوات Brand Box AI وابدأ العمل مباشرة.</p></div><Link href="/dashboard/studio" className="inline-flex items-center gap-2 rounded-xl bg-[#f31325] px-5 py-3 text-sm font-black"><WandSparkles size={18}/> فتح الاستوديو</Link></div>
          </div>
        </section>
      </div>

      {mobileMenuOpen && <button type="button" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-[200] bg-black/70 lg:hidden" aria-label="إغلاق"/>}
      <aside className={`fixed right-0 top-20 z-[210] h-[calc(100vh-5rem)] w-[86vw] max-w-80 border-l border-white/10 bg-[#0b0d12] p-4 transition-transform lg:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <button type="button" onClick={() => setMobileMenuOpen(false)} className="mb-4 rounded-xl border border-white/10 p-2.5"><X size={20}/></button>
        <div className="rounded-2xl border border-white/10 bg-[#11141b] p-4"><div className="font-black">{displayName}</div><div className="mt-1 text-xs text-gray-500">مساحة المستخدم</div></div>
        <nav className="mt-4 space-y-2">
          <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl bg-[#f31325] px-4 py-3 text-sm font-black">لوحة التحكم</Link>
          <Link href="/projects" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl border border-white/10 px-4 py-3 text-sm font-black">مشاريعي</Link>
          <Link href="/dashboard/studio" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl border border-white/10 px-4 py-3 text-sm font-black">استوديو AI</Link>
          <Link href="/dashboard/account" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl border border-white/10 px-4 py-3 text-sm font-black">الحساب والرصيد</Link>
        </nav>
      </aside>
    </main>
  );
}
