'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Image as ImageIcon, MessageSquare, PanelRightOpen, Video, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const VIEW_MATCHERS = {
  dashboard: ['لوحة التحكم'],
  projects: ['المشاريع', 'Projects'],
  'brand-kit': ['مدير الهوية', 'Brand Kit'],
  templates: ['مكتبة القوالب', 'Templates'],
  billing: ['المحفظة والاستهلاك'],
  pricing: ['شراء رصيد'],
  settings: ['الإعدادات'],
  chat: ['المساعد الذكي', 'AI Chat'],
  images: ['توليد الصور'],
  video: ['توليد الفيديو'],
};

const TOOL_ITEMS = [
  {
    view: 'images',
    label: 'الصور AI',
    description: 'توليد وتحرير الصور',
    icon: ImageIcon,
  },
  {
    view: 'video',
    label: 'الفيديو AI',
    description: 'إنشاء فيديو بالذكاء الاصطناعي',
    icon: Video,
  },
  {
    view: 'chat',
    label: 'شات AI',
    description: 'كتابة وأفكار ومحتوى',
    icon: MessageSquare,
  },
];

const CHROMELESS_VIEWS = new Set(['projects', 'images', 'video', 'chat']);
const TOOL_VIEWS = new Set(['projects', 'images', 'video', 'chat']);

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function matchesView(text, view) {
  const tokens = VIEW_MATCHERS[view] || VIEW_MATCHERS.dashboard;
  return tokens.every((token) => text.includes(token)) || tokens.some((token) => text.includes(token));
}

function inferView(text) {
  const normalized = normalize(text);
  if (!normalized) return null;

  const ordered = [
    'projects',
    'brand-kit',
    'templates',
    'billing',
    'pricing',
    'settings',
    'chat',
    'images',
    'video',
    'dashboard',
  ];

  for (const view of ordered) {
    if (matchesView(normalized, view)) return view;
  }
  return null;
}

function ToolDock({ activeView, compact, onNavigate }) {
  return (
    <div
      dir="rtl"
      className={`workspace-tool-dock fixed left-1/2 z-[145] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#090b10]/95 shadow-[0_18px_60px_rgba(0,0,0,.5)] backdrop-blur-xl ${compact ? 'top-[92px] p-1.5' : 'top-[104px] p-2.5'}`}
    >
      <div className="flex items-stretch gap-1.5">
        {TOOL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`group flex items-center gap-2 rounded-xl border text-right transition-all ${compact ? 'px-3 py-2' : 'min-w-[170px] px-4 py-3'} ${active ? 'border-[#f31325]/70 bg-[#f31325]/12 text-white shadow-[0_0_24px_rgba(243,19,37,.14)]' : 'border-white/[.07] bg-[#10131a] text-gray-300 hover:-translate-y-0.5 hover:border-[#f31325]/45 hover:bg-[#f31325]/7 hover:text-white'}`}
            >
              <span className={`flex shrink-0 items-center justify-center rounded-xl border ${compact ? 'h-9 w-9' : 'h-11 w-11'} ${active ? 'border-[#ff3344]/50 bg-[#f31325] text-white' : 'border-white/10 bg-[#171a21] text-[#ff3344] group-hover:border-[#ff3344]/35'}`}>
                <Icon size={compact ? 18 : 22} />
              </span>
              <span className={compact ? 'hidden sm:block' : 'block'}>
                <span className="block text-xs font-black sm:text-sm">{item.label}</span>
                {!compact && <span className="mt-0.5 block text-[10px] font-semibold text-gray-500">{item.description}</span>}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className={`group flex items-center gap-2 rounded-xl border text-right transition-all ${compact ? 'px-3 py-2' : 'min-w-[150px] px-4 py-3'} ${activeView === 'projects' ? 'border-[#f31325]/70 bg-[#f31325]/12 text-white' : 'border-white/[.07] bg-[#10131a] text-gray-300 hover:border-[#f31325]/45 hover:text-white'}`}
        >
          <span className={`flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#171a21] text-[#ff3344] ${compact ? 'h-9 w-9' : 'h-11 w-11'}`}><FolderOpen size={compact ? 18 : 22} /></span>
          <span className={compact ? 'hidden md:block text-xs font-black' : 'text-sm font-black'}>المشاريع</span>
        </button>
      </div>
    </div>
  );
}

export default function LegacyWorkspaceStateBridge({ view = 'dashboard', children }) {
  const rootRef = useRef(null);
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const targetView = VIEW_MATCHERS[view] ? view : 'dashboard';
  const chromeless = CHROMELESS_VIEWS.has(targetView);
  const showToolDock = TOOL_VIEWS.has(targetView);

  useLayoutEffect(() => {
    let cancelled = false;
    let targetApplied = false;
    let expectedIdentity = '';
    let observer = null;

    const root = rootRef.current;
    if (!root) return undefined;

    const setUrlView = (nextView) => {
      if (!nextView) return;
      const url = new URL(window.location.href);
      if (url.searchParams.get('view') === nextView) return;
      url.searchParams.set('view', nextView);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    };

    const findTargetControl = () => {
      const controls = Array.from(root.querySelectorAll('button, [role="button"]'));
      return controls.find((control) => matchesView(normalize(control.textContent), targetView)) || null;
    };

    const identityIsReady = () => {
      if (!expectedIdentity) return false;
      const text = normalize(root.textContent).toLowerCase();
      return text.includes(expectedIdentity.toLowerCase());
    };

    const maybeReveal = () => {
      if (cancelled || !targetApplied || !identityIsReady()) return;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    };

    const applyTarget = () => {
      if (targetApplied) {
        maybeReveal();
        return;
      }
      const control = findTargetControl();
      if (!control) return;
      targetApplied = true;
      control.click();
      setUrlView(targetView);
      maybeReveal();
    };

    const handleClick = (event) => {
      const control = event.target?.closest?.('button, [role="button"]');
      if (!control || !root.contains(control)) return;
      const nextView = inferView(control.textContent);
      if (nextView) setUrlView(nextView);
    };

    root.addEventListener('click', handleClick, true);

    observer = new MutationObserver(() => {
      applyTarget();
      maybeReveal();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name,last_name')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;
      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
      expectedIdentity = fullName || user.email?.split('@')[0] || user.id;
      applyTarget();
      maybeReveal();
    })();

    applyTarget();

    return () => {
      cancelled = true;
      observer?.disconnect();
      root.removeEventListener('click', handleClick, true);
    };
  }, [supabase, targetView]);

  useLayoutEffect(() => {
    setSidebarOpen(false);
  }, [targetView]);

  const navigateWorkspace = (nextView) => {
    setSidebarOpen(false);
    router.push(`/?view=${encodeURIComponent(nextView)}`);
  };

  return (
    <div
      ref={rootRef}
      className={`legacy-workspace-shell relative min-h-screen ${chromeless ? 'workspace-chromeless' : ''} ${sidebarOpen ? 'workspace-drawer-open' : ''} ${showToolDock ? 'workspace-tool-view' : ''} ${targetView === 'projects' ? 'workspace-projects-view' : ''}`}
    >
      {!ready && (
        <div className="fixed inset-0 z-[195] flex items-center justify-center bg-[#050506] text-white">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1016] px-5 py-4 text-sm font-bold text-gray-300 shadow-2xl">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#f31325]" />
            جاري فتح مساحة العمل...
          </div>
        </div>
      )}

      {ready && showToolDock && (
        <ToolDock activeView={targetView} compact={targetView !== 'projects'} onNavigate={navigateWorkspace} />
      )}

      {ready && chromeless && (
        <>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed right-0 top-1/2 z-[150] flex -translate-y-1/2 items-center gap-2 rounded-l-xl border border-r-0 border-[#f31325]/35 bg-[#0d1016]/95 px-2.5 py-3 text-[#ff3344] shadow-xl backdrop-blur-xl transition hover:bg-[#f31325]/10 hover:text-white"
            aria-label="فتح قائمة مساحة العمل"
            title="قائمة مساحة العمل"
          >
            <PanelRightOpen size={19} />
            <span className="hidden text-[10px] font-black xl:inline">القائمة</span>
          </button>
          {sidebarOpen && (
            <button
              type="button"
              className="fixed inset-0 z-[155] bg-black/60 backdrop-blur-[2px]"
              onClick={() => setSidebarOpen(false)}
              aria-label="إغلاق قائمة مساحة العمل"
            />
          )}
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="fixed right-[268px] top-[92px] z-[175] rounded-xl border border-white/10 bg-[#10131a] p-2.5 text-gray-300 shadow-xl hover:text-white"
              aria-label="إغلاق القائمة"
            >
              <X size={18} />
            </button>
          )}
        </>
      )}

      <div style={{ visibility: ready ? 'visible' : 'hidden' }} aria-hidden={!ready}>
        {children}
      </div>

      <style jsx global>{`
        .legacy-workspace-shell.workspace-chromeless aside {
          display: none !important;
        }
        .legacy-workspace-shell.workspace-drawer-open aside {
          display: flex !important;
          position: fixed !important;
          right: 0 !important;
          top: 80px !important;
          bottom: 0 !important;
          width: 16rem !important;
          height: calc(100vh - 80px) !important;
          transform: translateX(0) !important;
          z-index: 170 !important;
          box-shadow: -28px 0 80px rgba(0, 0, 0, .55) !important;
        }
        .legacy-workspace-shell.workspace-tool-view main {
          padding-top: 7.75rem !important;
        }
        .legacy-workspace-shell.workspace-projects-view main {
          padding-top: 9.5rem !important;
        }
        @media (max-width: 640px) {
          .workspace-tool-dock {
            width: calc(100vw - 24px);
            overflow-x: auto;
          }
          .workspace-tool-dock > div {
            min-width: max-content;
          }
          .legacy-workspace-shell.workspace-tool-view main,
          .legacy-workspace-shell.workspace-projects-view main {
            padding-top: 7.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
