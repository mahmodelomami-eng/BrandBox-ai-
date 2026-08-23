'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export default function LegacyAdminStateBridge({ children }) {
  const rootRef = useRef(null);
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    let cancelled = false;
    let observer = null;
    let fallbackTimer = null;
    let expectedRole = '';
    let adminActivated = false;
    const root = rootRef.current;
    if (!root) return undefined;

    const reveal = () => {
      if (cancelled || adminActivated) return;
      adminActivated = true;
      observer?.disconnect();
      observer = null;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    };

    const tryActivateAdmin = () => {
      if (cancelled || !expectedRole || !ADMIN_ROLES.has(expectedRole)) return false;

      // App starts with legacy seed state, so never click the admin switch until
      // the authenticated profile role has actually appeared in the rendered shell.
      const shellText = normalize(root.textContent);
      if (!shellText.includes(expectedRole)) return false;

      const controls = Array.from(root.querySelectorAll('button, [role="button"]'));
      const toggle = controls.find((control) => normalize(control.textContent).includes('لوحة التحكم الإدارية'));
      if (!toggle) return false;

      toggle.click();
      reveal();
      return true;
    };

    const handleClick = (event) => {
      const control = event.target?.closest?.('button, [role="button"], a');
      if (!control || !root.contains(control)) return;
      const label = normalize(control.textContent);
      if (!label.includes('العودة لمساحة العمل')) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      router.push('/dashboard');
    };

    root.addEventListener('click', handleClick, true);

    (async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sessionData.session?.user;
        if (!user) return;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role,status')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (cancelled) return;

        expectedRole = profile?.role || 'USER';
        if (profile?.status === 'suspended' || !ADMIN_ROLES.has(expectedRole)) {
          setError('لا يملك هذا الحساب صلاحية دخول لوحة الإدارة.');
          window.setTimeout(() => router.replace('/dashboard'), 900);
          return;
        }

        if (tryActivateAdmin()) return;

        observer = new MutationObserver(() => {
          tryActivateAdmin();
        });
        observer.observe(root, { childList: true, subtree: true, characterData: true });

        fallbackTimer = window.setTimeout(() => {
          if (!tryActivateAdmin() && !cancelled) {
            setError('تعذر تهيئة لوحة الإدارة. أعد فتحها من قائمة الحساب.');
          }
        }, 4000);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'تعذر التحقق من صلاحية الإدارة.');
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      root.removeEventListener('click', handleClick, true);
    };
  }, [router, supabase]);

  return (
    <div ref={rootRef} className="relative min-h-screen">
      {!ready && (
        <div className="fixed inset-0 z-[195] flex items-center justify-center bg-[#050506] px-5 text-white">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1016] p-7 text-center shadow-2xl">
            <ShieldCheck className="mx-auto text-[#ff3344]" size={34} />
            <div className="mt-4 text-base font-black">{error || 'جاري تجهيز لوحة الإدارة...'}</div>
            {!error && <div className="mt-2 text-xs leading-6 text-gray-500">يتم التحقق من الجلسة والدور الإداري قبل إظهار أدوات التحكم.</div>}
          </div>
        </div>
      )}
      <div style={{ visibility: ready ? 'visible' : 'hidden' }} aria-hidden={!ready}>
        {children}
      </div>
    </div>
  );
}
