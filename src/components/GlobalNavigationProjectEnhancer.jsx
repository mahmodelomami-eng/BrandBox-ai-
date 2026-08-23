'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HEADER_ROUTES = {
  '/images-ai': '/projects/images',
  '/video-ai': '/projects/video',
  '/chat-ai': '/projects/chat',
  '/audio-ai': '/projects/audio',
};

const LEGACY_ROUTES = {
  '/?view=images': '/projects/images',
  '/?view=video': '/projects/video',
  '/?view=chat': '/projects/chat',
  '/?view=projects': '/projects',
};

const DASHBOARD_ROUTE = '/?view=dashboard';

export default function GlobalNavigationProjectEnhancer() {
  const router = useRouter();

  useEffect(() => {
    const rewriteAnchor = (anchor, target) => {
      anchor.dataset.brandboxProjectRoute = target;
      anchor.setAttribute('href', target);
    };

    const ensureDashboardLink = () => {
      document.querySelectorAll('.brandbox-global-nav nav').forEach((nav) => {
        if (nav.querySelector('a[data-brandbox-dashboard-link="true"]')) return;

        const homeAnchor = Array.from(nav.querySelectorAll('a[href="/"]'))
          .find((anchor) => anchor.textContent?.trim() === 'الرئيسية');
        if (!homeAnchor) return;

        const dashboardAnchor = document.createElement('a');
        dashboardAnchor.href = DASHBOARD_ROUTE;
        dashboardAnchor.dataset.brandboxDashboardLink = 'true';
        dashboardAnchor.textContent = 'لوحة تحكم المستخدم';
        dashboardAnchor.title = 'لوحة تحكم المستخدم';

        const isDesktopNav = nav.className.includes('xl:flex');
        dashboardAnchor.className = isDesktopNav
          ? 'whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-bold text-gray-300 transition hover:bg-white/5 hover:text-white'
          : 'block rounded-xl px-4 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/5 hover:text-white';

        homeAnchor.insertAdjacentElement('afterend', dashboardAnchor);
      });
    };

    const rewrite = () => {
      ensureDashboardLink();

      document.querySelectorAll('.brandbox-global-nav a[href]').forEach((anchor) => {
        const raw = anchor.getAttribute('href');
        if (raw && HEADER_ROUTES[raw]) rewriteAnchor(anchor, HEADER_ROUTES[raw]);
      });

      document.querySelectorAll('a[href^="/?view="]').forEach((anchor) => {
        const raw = anchor.getAttribute('href');
        if (raw && LEGACY_ROUTES[raw]) rewriteAnchor(anchor, LEGACY_ROUTES[raw]);
      });
    };

    const handleClick = (event) => {
      const dashboardAnchor = event.target?.closest?.('a[data-brandbox-dashboard-link="true"]');
      if (dashboardAnchor) {
        event.preventDefault();
        router.push(DASHBOARD_ROUTE);
        return;
      }

      const anchor = event.target?.closest?.('a[data-brandbox-project-route]');
      if (!anchor) return;
      const target = anchor.dataset.brandboxProjectRoute;
      if (!target) return;
      event.preventDefault();
      router.push(target);
    };

    rewrite();
    const observer = new MutationObserver(rewrite);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', handleClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
    };
  }, [router]);

  return null;
}
