'use client';

import { useEffect } from 'react';

export default function LegacyProjectsRouteBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') !== 'projects') return;

    let stopped = false;

    const openOriginalProjects = () => {
      if (stopped) return true;

      const buttons = Array.from(document.querySelectorAll('button'));
      const projectsButton = buttons.find((button) => {
        const text = (button.textContent || '').replace(/\s+/g, ' ').trim();
        return text.includes('المشاريع') && text.includes('Projects');
      });

      if (!projectsButton) return false;

      projectsButton.click();
      const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
      window.history.replaceState({}, '', cleanUrl);
      stopped = true;
      return true;
    };

    if (openOriginalProjects()) return;

    const observer = new MutationObserver(() => {
      if (openOriginalProjects()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = window.setTimeout(() => observer.disconnect(), 10000);

    return () => {
      stopped = true;
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
