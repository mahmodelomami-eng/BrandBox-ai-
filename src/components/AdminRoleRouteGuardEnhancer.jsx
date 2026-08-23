'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function findAdminUsersButton() {
  const buttons = Array.from(document.querySelectorAll('aside button, aside [role="button"]'));
  return buttons.find((button) => normalize(button.textContent) === 'المستخدمين')
    || buttons.find((button) => normalize(button.textContent).includes('المستخدمين'))
    || null;
}

function isSupportForbiddenDashboard() {
  const text = normalize(document.body?.textContent);
  return text.includes('FORBIDDEN 403')
    && text.includes('ANALYTICS_READ')
    && text.includes('SUPPORT');
}

export default function AdminRoleRouteGuardEnhancer() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const roleRef = useRef('USER');
  const cancelledRef = useRef(false);
  const pendingFrameRef = useRef(null);

  useEffect(() => {
    cancelledRef.current = false;

    const cancelPendingFrame = () => {
      if (pendingFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingFrameRef.current);
        pendingFrameRef.current = null;
      }
    };

    const routeSupportToUsers = (attempt = 0) => {
      if (cancelledRef.current || roleRef.current !== 'SUPPORT') return;

      const usersButton = findAdminUsersButton();
      if (usersButton) {
        usersButton.click();
        cancelPendingFrame();
        return;
      }

      if (attempt >= 18) {
        cancelPendingFrame();
        return;
      }

      pendingFrameRef.current = window.requestAnimationFrame(() => {
        routeSupportToUsers(attempt + 1);
      });
    };

    const handleAdminEntry = (event) => {
      if (roleRef.current !== 'SUPPORT') return;
      const control = event.target?.closest?.('button, [role="button"], a');
      if (!control) return;
      const label = normalize(control.textContent);
      if (!label.includes('لوحة التحكم الإدارية')) return;

      cancelPendingFrame();
      window.setTimeout(() => routeSupportToUsers(0), 0);
    };

    document.addEventListener('click', handleAdminEntry, true);

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || cancelledRef.current) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelledRef.current) return;
      roleRef.current = profile?.role || 'USER';

      // Covers refresh/direct entry while already on the forbidden SUPPORT dashboard.
      if (roleRef.current === 'SUPPORT' && isSupportForbiddenDashboard()) {
        routeSupportToUsers(0);
      }
    })();

    return () => {
      cancelledRef.current = true;
      cancelPendingFrame();
      document.removeEventListener('click', handleAdminEntry, true);
    };
  }, [supabase]);

  return null;
}
