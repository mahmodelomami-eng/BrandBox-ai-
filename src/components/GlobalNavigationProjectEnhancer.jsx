'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROUTES = {
  '/images-ai': '/projects/images',
  '/video-ai': '/projects/video',
  '/chat-ai': '/projects/chat',
  '/audio-ai': '/projects/audio',
  '/?view=images': '/projects/images',
  '/?view=video': '/projects/video',
  '/?view=chat': '/projects/chat',
  '/?view=projects': '/projects',
};

export default function GlobalNavigationProjectEnhancer() {
  const router = useRouter();

  useEffect(() => {
    const rewrite = () => {
      document.querySelectorAll('a[href]').forEach((anchor) => {
        const raw = anchor.getAttribute('href');
        if (raw && ROUTES[raw]) {
          anchor.dataset.brandboxProjectRoute = ROUTES[raw];
          anchor.setAttribute('href', ROUTES[raw]);
        }
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
