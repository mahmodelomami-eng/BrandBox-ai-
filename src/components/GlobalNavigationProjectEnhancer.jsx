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

export default function GlobalNavigationProjectEnhancer() {
  const router = useRouter();

  useEffect(() => {
    const rewriteAnchor = (anchor, target) => {
      anchor.dataset.brandboxProjectRoute = target;
      anchor.setAttribute('href', target);
    };

    const rewrite = () => {
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
