'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function findButtonByLabel(label) {
  const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
  return buttons.find((button) => normalize(button.textContent) === label)
    || buttons.find((button) => normalize(button.textContent).includes(label));
}

export default function AdminRoleRouteGuardEnhancer() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const roleRef = useRef('USER');
  const redirectingRef = useRef(false);

  useLayoutEffect(() => {
    let cancelled = false;
    let observer = null;

    const routeToFirstAllowedAdminScreen = () => {
      if (cancelled || roleRef.current !== 'SUPPORT' || redirectingRef.current) return;

      const bodyText = normalize(document.body?.textContent);
      const isForbiddenDashboard = bodyText.includes('FORBIDDEN 403')
        && bodyText.includes('ANALYTICS_READ')
        && bodyText.includes('SUPPORT');

      if (!isForbiddenDashboard) return;

      const usersButton = findButtonByLabel('المستخدمين');
      if (!usersButton) return;

      redirectingRef.current = true;

      const forbiddenCard = Array.from(document.querySelectorAll('div, section, main'))
        .find((node) => normalize(node.textContent).includes('FORBIDDEN 403') && normalize(node.textContent).includes('ANALYTICS_READ'));

      if (forbiddenCard instanceof HTMLElement) {
        forbiddenCard.style.visibility = 'hidden';
      }

      usersButton.click();

      window.requestAnimationFrame(() => {
        if (forbiddenCard instanceof HTMLElement) {
          forbiddenCard.style.visibility = '';
        }
        redirectingRef.current = false;
      });
    };

    observer = new MutationObserver(routeToFirstAllowedAdminScreen);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;
      roleRef.current = profile?.role || 'USER';
      routeToFirstAllowedAdminScreen();
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [supabase]);

  return null;
}
