'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FolderOpen, ImageIcon, MessageSquare, Palette, Printer, ShoppingBag, Sparkles, Video, WandSparkles } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const quick = [
  { href: '/projects/images', label: 'توليد الصور', text: 'إنشاء صور وتصاميم بالذكاء الاصطناعي', icon: ImageIcon },
  { href: '/video-ai', label: 'توليد الفيديو', text: 'حوّل الأفكار والمشاهد إلى فيديو', icon: Video },
  { href: '/chat-ai', label: 'شات AI', text: 'كتابة محتوى وأفكار ومساعدة ذكية', icon: MessageSquare },
  { href: '/projects', label: 'المشاريع', text: 'إدارة كل أعمالك من مكان واحد', icon: FolderOpen },
];

const specialties = [
  { href: '/dashboard/brand', label: 'الهوية البصرية', icon: Palette },
  { href: '/dashboard/marketing', label: 'التسويق والمحتوى', icon: Sparkles },
  { href: '/dashboard/print', label: 'الطباعة والإنتاج', icon: Printer },
  { href: '/dashboard/commerce', label: 'المتجر والمشتريات', icon: ShoppingBag },
];

export default function UserDashboardOverview() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [stats, setStats] = useState({ projects: 0, generations: 0, assets: 0, credits: 0 });
  const [name, setName] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      const [profileRes, projectsRes, generationsRes, assetsRes] = await Promise.all([
        supabase.from('profiles').select('first_name,last_name,credit_balance').eq('id', user.id).maybeSingle(),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('generations').select('id', { count: 'exact', head: true }),
        supabase.from('assets').select('id', { count: 'exact', head: true }),
      ]);
      if (!mounted) return;
      const p = profileRes.data;
      setName([p?.first_name, p?.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || '');
      setStats({
        projects: projectsRes.count || 0,
        generations: generationsRes.count || 0,
        assets: assetsRes.count || 0,
        credits: Number(p?.credit_balance || 0),
      });
    })();
    return () => { mounted = false; };
  }, [supabase]);

  return <div className="space-y-7">
    <section className="overflow-hidden rounded-3xl border border-[#f31325]/20 bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.18),transparent_34%),#10131a] p-6 sm:p-8">
      <div className="max-w-3xl">
        <div className="text-xs font-black text-[#ff6674]">BRAND BOX WORKSPACE</div>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl">مرحبًا {name || 'بك'} 👋</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">لوحة تحكم موحدة لإدارة مشاريع الذكاء الاصطناعي، الهوية، التسويق، الطباعة والمشتريات بدون التنقل بين واجهات منفصلة.</p>
        <Link href="/dashboard/studio" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f31325] px-5 py-3 text-sm font-black">ابدأ عملاً جديدًا <ArrowLeft size={17}/></Link>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['الرصيد', stats.credits.toLocaleString('ar-LY'), 'نقطة'],
        ['المشاريع', stats.projects.toLocaleString('ar-LY'), 'مشروع'],
        ['عمليات التوليد', stats.generations.toLocaleString('ar-LY'), 'عملية'],
        ['الأصول', stats.assets.toLocaleString('ar-LY'), 'ملف'],
      ].map(([label, value, unit]) => <div key={label} className="rounded-2xl border border-white/8 bg-[#10131a] p-5"><div className="text-xs text-gray-500">{label}</div><div className="mt-3 text-3xl font-black">{value}</div><div className="mt-1 text-[11px] text-gray-600">{unit}</div></div>)}
    </section>

    <section>
      <div className="mb-4 flex items-end justify-between gap-4"><div><h3 className="text-xl font-black">أدواتك الأساسية</h3><p className="mt-1 text-xs text-gray-500">وصول مباشر إلى أكثر وظائف المنصة استخدامًا</p></div></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{quick.map(({ href, label, text, icon: Icon }) => <Link key={href} href={href} className="group rounded-2xl border border-white/8 bg-[#10131a] p-5 transition hover:-translate-y-0.5 hover:border-[#f31325]/35"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Icon size={21}/></span><h4 className="mt-4 font-black">{label}</h4><p className="mt-2 text-xs leading-6 text-gray-500">{text}</p></Link>)}</div>
    </section>

    <section>
      <h3 className="text-xl font-black">مساحات العمل المتخصصة</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{specialties.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#0d1016] p-4 text-sm font-black text-gray-200 hover:border-[#f31325]/35 hover:text-white"><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-[#ff3344]"><Icon size={18}/></span><span className="flex-1">{label}</span><ArrowLeft size={16} className="text-gray-600"/></Link>)}</div>
    </section>
  </div>;
}
