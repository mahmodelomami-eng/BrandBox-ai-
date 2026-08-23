'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
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

export default function LegacyWorkspaceStateBridge({ view = 'dashboard', children }) {
  const rootRef = useRef(null);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    let cancelled = false;
    let targetApplied = false;
    let expectedIdentity = '';
    let observer = null;

    const root = rootRef.current;
    if (!root) return undefined;

    const targetView = VIEW_MATCHERS[view] ? view : 'dashboard';

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
  }, [supabase, view]);

  return (
    <div ref={rootRef} className="relative min-h-screen">
      {!ready && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050506] text-white">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1016] px-5 py-4 text-sm font-bold text-gray-300 shadow-2xl">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#f31325]" />
            جاري فتح مساحة العمل...
          </div>
        </div>
      )}
      <div style={{ visibility: ready ? 'visible' : 'hidden' }} aria-hidden={!ready}>
        {children}
      </div>
    </div>
  );
}
