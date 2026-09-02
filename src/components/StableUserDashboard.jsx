'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Crown,
  Folder,
  ImageIcon,
  Layers3,
  Loader2,
  MessageSquare,
  Mic2,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Video,
  Wallet,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { setUserProjectFavorite } from '../lib/projects/projects-service';
import { useAuth } from '../context/AuthContext';

const TOOL_CARDS = [
  { href: '/projects/images', label: 'الصور AI', text: 'مشاريع توليد وتحرير الصور', icon: ImageIcon },
  { href: '/projects/video', label: 'الفيديو AI', text: 'مشاريع الفيديو والمشاهد', icon: Video },
  { href: '/projects/chat', label: 'الشات AI', text: 'محادثات ومشاريع المحتوى', icon: MessageSquare },
  { href: '/projects/audio', label: 'الصوت AI', text: 'مشاريع الصوت والتعليق الصوتي', icon: Mic2 },
];

const ROLE_LABELS = {
  USER: 'مستخدم',
  SUPPORT: 'مشرف',
  ADMIN: 'مدير',
  SUPER_ADMIN: 'مدير عام',
};

function projectTool(type = '') {
  if (/فيديو|video/i.test(type)) return 'video';
  if (/محادثة|chat|نص/i.test(type)) return 'chat';
  if (/صوت|audio/i.test(type)) return 'audio';
  return 'images';
}

function projectHref(project) {
  const tool = projectTool(project?.type);
  return `/projects/${tool}/workspace?project=${encodeURIComponent(project.id)}`;
}

function generationHref(item) {
  const type = item?.generation_type || 'image';
  const tool = type === 'video' ? 'video' : type === 'chat' ? 'chat' : type === 'audio' ? 'audio' : 'images';
  return item?.project_id
    ? `/projects/${tool}/workspace?project=${encodeURIComponent(item.project_id)}`
    : `/projects/${tool}`;
}

function MetricCard({ label, value, helper, action, href, icon: Icon, accent = false }) {
  return (
    <div className="rounded-[20px] border border-white/[.08] bg-[linear-gradient(145deg,#111318,#0b0d11)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-gray-400">{label}</div>
          <div className="mt-4 text-3xl font-black tracking-tight text-white">{value}</div>
          <div className="mt-2 text-xs text-gray-500">{helper}</div>
        </div>
        <div className={`grid h-14 w-14 place-items-center rounded-2xl ${accent ? 'bg-[linear-gradient(135deg,#f31325,#980612)] text-white' : 'bg-white/[.06] text-gray-200'}`}>
          <Icon size={27} />
        </div>
      </div>
      <div className="mt-5 border-t border-white/[.06] pt-4">
        <Link href={href} className={`inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70 ${accent ? 'text-[#ff3344]' : 'text-gray-300 hover:text-white'}`}>
          {action}<ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  );
}

function LoadingRows({ count = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-xl border border-white/[.05] bg-white/[.025]" />
      ))}
    </div>
  );
}

export default function StableUserDashboard() {
  const { user: authUser, profile: authProfile, roleLabel, creditBalance: authCredits, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [projects, setProjects] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [stats, setStats] = useState({ projects: 0, generations: 0 });
  const [favoriteBusy, setFavoriteBusy] = useState(() => new Set());
  const [error, setError] = useState('');
  const [errorOwnerId, setErrorOwnerId] = useState(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [dataOwnerId, setDataOwnerId] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (authLoading || !authUser?.id) return undefined;

    const targetUserId = authUser.id;

    const loadBusinessData = async () => {
      try {
        const [projectsRes, generationsRes, projectCountRes, generationCountRes, subscriptionRes] = await Promise.allSettled([
          supabase.from('projects').select('id,name,type,description,thumbnail_url,updated_at,is_favorite').eq('owner_id', targetUserId).is('deleted_at', null).order('is_favorite', { ascending: false }).order('updated_at', { ascending: false }).limit(4),
          supabase.from('generations').select('id,project_id,generation_type,prompt,created_at,result_url').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(4),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('owner_id', targetUserId).is('deleted_at', null),
          supabase.from('generations').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId),
          supabase.from('subscriptions').select('plan_id,status,created_at').eq('user_id', targetUserId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (!mounted) return;

        if (projectsRes.status === 'fulfilled' && !projectsRes.value.error) setProjects(projectsRes.value.data || []);
        if (generationsRes.status === 'fulfilled' && !generationsRes.value.error) setGenerations(generationsRes.value.data || []);
        if (subscriptionRes.status === 'fulfilled' && !subscriptionRes.value.error) setSubscription(subscriptionRes.value.data || null);
        setStats({
          projects: projectCountRes.status === 'fulfilled' && !projectCountRes.value.error ? projectCountRes.value.count || 0 : 0,
          generations: generationCountRes.status === 'fulfilled' && !generationCountRes.value.error ? generationCountRes.value.count || 0 : 0,
        });

        const hasPartialFailure = [projectsRes, generationsRes, projectCountRes, generationCountRes, subscriptionRes]
          .some((result) => result.status === 'rejected' || Boolean(result.value?.error));
        if (hasPartialFailure) {
          setErrorOwnerId(targetUserId);
          setError('تعذر تحديث بعض بيانات لوحة التحكم. يمكنك إعادة المحاولة دون مغادرة الصفحة.');
        } else {
          setErrorOwnerId(null);
          setError('');
        }
      } catch {
        if (mounted) {
          setErrorOwnerId(targetUserId);
          setError('تعذر تحميل بيانات لوحة التحكم. حاول مرة أخرى.');
        }
      } finally {
        if (mounted) {
          setDataOwnerId(targetUserId);
          setBusinessLoading(false);
        }
      }
    };

    void loadBusinessData();

    return () => {
      mounted = false;
    };
  }, [supabase, authUser?.id, authLoading, reloadTick]);

  const displayName = [authProfile?.first_name, authProfile?.last_name].filter(Boolean).join(' ')
    || authUser?.email?.split('@')[0]
    || 'المستخدم';
  const firstName = authProfile?.first_name || displayName.split(' ')[0] || 'المستخدم';
  const credits = authCredits ?? 0;
  const currentRoleLabel = roleLabel || (authProfile?.role ? (ROLE_LABELS[authProfile.role] || 'مستخدم') : 'مستخدم');
  const businessReady = Boolean(authUser?.id && dataOwnerId === authUser.id && !businessLoading);
  const visibleError = Boolean(authUser?.id && errorOwnerId === authUser.id && error);
  const planLabel = businessReady ? String(subscription?.plan_id || 'FREE').toUpperCase() : '—';
  const planHelper = businessReady
    ? (subscription ? 'الخطة النشطة في حسابك' : 'ابدأ بالخطة المناسبة لاحتياجك')
    : 'جار تحديث بيانات الخطة';
  const planAction = subscription ? 'عرض الباقات' : 'استكشف الباقات';

  function retryBusinessData() {
    setBusinessLoading(true);
    setDataOwnerId(null);
    setErrorOwnerId(null);
    setError('');
    setReloadTick((value) => value + 1);
  }

  async function toggleFavorite(project) {
    if (favoriteBusy.has(project.id)) return;
    setFavoriteBusy((current) => new Set(current).add(project.id));
    setErrorOwnerId(null);
    setError('');
    try {
      const updated = await setUserProjectFavorite(project.id, !project.is_favorite);
      setProjects((current) => current
        .map((item) => item.id === project.id ? { ...item, is_favorite: Boolean(updated?.is_favorite) } : item)
        .sort((a, b) => Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite)) || new Date(b.updated_at || 0) - new Date(a.updated_at || 0)));
    } catch {
      setErrorOwnerId(authUser?.id || null);
      setError('تعذر تحديث المفضلة. حاول مرة أخرى.');
    } finally {
      setFavoriteBusy((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  }

  if (authLoading) {
    return (
      <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
        <div className="flex min-h-[65vh] items-center justify-center" aria-live="polite">
          <div className="flex items-center gap-3 text-sm font-bold text-gray-400"><Loader2 className="h-7 w-7 animate-spin text-[#f31325]" /> جار تجهيز حسابك...</div>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] px-5 py-12 text-white">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0d0f13] p-8 text-center">
          <h1 className="text-2xl font-black">لوحة تحكم Brand Box</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">يلزم تسجيل الدخول لعرض مساحة العمل الخاصة بك.</p>
          <Link href="/auth?next=%2Fdashboard" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#f31325] px-6 py-3 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">تسجيل الدخول</Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8">
        {visibleError && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/[.06] px-4 py-3 text-sm font-bold text-red-300 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span>{error}</span>
            <button type="button" onClick={retryBusinessData} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-400/25 px-3 text-xs font-black text-red-200 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60">
              <RefreshCw size={14} /> إعادة المحاولة
            </button>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[24px] border border-white/[.08] bg-[radial-gradient(circle_at_13%_40%,rgba(183,10,22,.42),transparent_28%),linear-gradient(130deg,#0a0b0f,#12141a)] px-6 py-8 sm:px-9 lg:min-h-[190px] lg:px-16 lg:py-10">
          <div className="absolute left-12 top-1/2 hidden h-28 w-28 -translate-y-1/2 rotate-45 rounded-[22px] border border-red-600/20 bg-[linear-gradient(145deg,#111,#020202)] shadow-[0_0_45px_rgba(243,19,37,.14)] lg:block" />
          <div className="absolute left-28 top-1/2 hidden -translate-y-1/2 rounded-xl border border-red-500/20 bg-black/75 px-3 py-2 text-xl font-black text-[#ff2637] lg:block">AI</div>
          <div className="relative z-10 max-w-3xl">
            <div className="mb-3 text-xs font-black text-[#ff3344]">{currentRoleLabel} · {planLabel}</div>
            <h1 className="text-3xl font-black sm:text-4xl lg:text-5xl">مرحبًا بك، {firstName}</h1>
            <p className="mt-4 text-sm leading-7 text-gray-400 sm:text-base">ابدأ من الأداة المناسبة، أو افتح أحد مشاريعك الأخيرة وواصل العمل مباشرة.</p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy={!businessReady}>
          <MetricCard label="الاشتراك" value={planLabel} helper={planHelper} action={planAction} href="/pricing" icon={Crown} accent />
          <MetricCard label="عمليات التوليد" value={businessReady ? stats.generations.toLocaleString('ar-LY') : '—'} helper={businessReady ? 'إجمالي العمليات في حسابك' : 'جار تحديث النشاط'} action="فتح المشاريع" href="/projects" icon={TrendingUp} accent />
          <MetricCard label="المشاريع" value={businessReady ? stats.projects.toLocaleString('ar-LY') : '—'} helper={businessReady ? 'المشاريع النشطة فقط' : 'جار تحديث المشاريع'} action="عرض المشاريع" href="/projects" icon={Folder} />
          <MetricCard label="الرصيد" value={credits.toLocaleString('ar-LY')} helper="نقطة متاحة للاستخدام" action="شحن الرصيد" href="/pricing" icon={Wallet} accent />
        </section>

        <section className="mt-4 rounded-[22px] border border-white/[.08] bg-[#0b0d11] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div><div className="text-xs font-black text-[#ff3344]">ابدأ الآن</div><h2 className="mt-1 text-xl font-black">مساحات الذكاء الاصطناعي</h2></div>
            <Link href="/projects" className="inline-flex min-h-10 items-center text-xs font-black text-gray-500 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">عرض كل المشاريع</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {TOOL_CARDS.map(({ href, label, text, icon: Icon }) => (
              <Link key={href} href={href} className="group rounded-[18px] border border-white/[.08] bg-[linear-gradient(145deg,#111318,#0b0d11)] p-5 transition hover:-translate-y-0.5 hover:border-[#f31325]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f31325]/10 text-[#ff2637] transition group-hover:bg-[#f31325] group-hover:text-white"><Icon size={25} /></div>
                  <div><h3 className="text-lg font-black">{label}</h3><p className="mt-1 text-xs leading-6 text-gray-500">{text}</p></div>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-white/[.06] pt-4 text-sm font-black text-[#ff3344]">فتح المساحة <ArrowLeft size={15} /></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.65fr]">
          <div className="rounded-[22px] border border-white/[.08] bg-[#0b0d11] p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-black">التوليدات الأخيرة</h3><Link href="/projects" className="inline-flex min-h-10 items-center text-xs font-black text-[#ff3344]">عرض المشاريع</Link></div>
            <div className="mt-4" aria-live="polite">
              {!businessReady ? (
                <LoadingRows />
              ) : generations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
                  <div className="text-sm font-bold text-gray-400">لا توجد توليدات بعد.</div>
                  <Link href="/projects/images" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#f31325] px-4 text-xs font-black text-white">ابدأ أول توليد</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {generations.map((item) => (
                    <Link key={item.id} href={generationHref(item)} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-black/15 p-3 transition hover:border-[#f31325]/30 hover:bg-white/[.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">
                      <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#2a1a1d,#0b0d11)] text-[#ff3344]">
                        {item.result_url && item.generation_type === 'image' ? <img src={item.result_url} alt="" className="h-full w-full object-cover" /> : item.generation_type === 'video' ? <PlayCircle size={25} /> : item.generation_type === 'chat' ? <MessageSquare size={23} /> : item.generation_type === 'audio' ? <Mic2 size={23} /> : <ImageIcon size={23} />}
                      </div>
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{item.prompt || 'توليد جديد'}</div><div className="mt-1 text-[11px] text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : 'أحدث نشاط'}</div></div>
                      <ArrowLeft size={16} className="shrink-0 text-gray-600" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/[.08] bg-[#0b0d11] p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-black">المشاريع الأخيرة</h3><Link href="/projects" className="inline-flex min-h-10 items-center text-xs font-black text-[#ff3344]">عرض الكل</Link></div>
            {!businessReady ? (
              <div className="mt-4"><LoadingRows count={2} /></div>
            ) : projects.length === 0 ? (
              <Link href="/projects" className="mt-4 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 px-5 text-center text-sm font-bold text-gray-500 transition hover:border-[#f31325]/35 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">اختر مساحة AI وأنشئ أول مشروع</Link>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {projects.map((project) => (
                  <article key={project.id} className="group overflow-hidden rounded-xl border border-white/[.08] bg-[#090b0e] transition hover:border-red-500/30">
                    <div className="relative h-32 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,.12),transparent_30%),linear-gradient(135deg,#2a1a1d,#0b0d11)]">
                      <Link href={projectHref(project)} className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f31325]/70">
                        {project.thumbnail_url ? <img src={project.thumbnail_url} alt={project.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-[#ff2637]"><Sparkles size={38} /></div>}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(project)}
                        disabled={favoriteBusy.has(project.id)}
                        className={`absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70 ${project.is_favorite ? 'border-[#f31325] bg-[#f31325] text-white' : 'border-white/10 bg-black/75 text-gray-300 hover:text-[#ff3344]'}`}
                        title={project.is_favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                        aria-label={project.is_favorite ? `إزالة ${project.name} من المفضلة` : `إضافة ${project.name} إلى المفضلة`}
                      >
                        {favoriteBusy.has(project.id) ? <Loader2 size={14} className="animate-spin" /> : <Star size={15} fill={project.is_favorite ? 'currentColor' : 'none'} />}
                      </button>
                    </div>
                    <Link href={projectHref(project)} className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f31325]/70">
                      <div className="truncate font-black">{project.name}</div>
                      <div className="mt-1 text-[11px] text-gray-500">{project.type || 'مشروع'}</div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-black text-[#ff3344]">فتح المشروع <ArrowLeft size={13} /></div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <Link href="/templates" className="group rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#111318,#0b0d11)] p-6 transition hover:border-[#f31325]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">
            <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[.06] text-gray-200"><Layers3 size={24} /></div><div><h3 className="font-black">مكتبة القوالب</h3><p className="mt-1 text-xs text-gray-500">ابدأ من قالب جاهز ثم خصّصه لمشروعك.</p></div></div>
          </Link>
          <Link href="/dashboard/account" className="group rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#111318,#0b0d11)] p-6 transition hover:border-[#f31325]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">
            <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f31325]/10 text-[#ff3344]"><Sparkles size={24} /></div><div><h3 className="font-black">إعدادات الحساب</h3><p className="mt-1 text-xs text-gray-500">الصورة الشخصية وبيانات الاتصال وتفضيلات الحساب.</p></div></div>
          </Link>
        </section>
      </div>
    </main>
  );
}
