'use client';

import { useEffect } from 'react';

export default function UserDashboardNavigationFix() {
  useEffect(() => {
    const fixLinks = () => {
      document.querySelectorAll('a').forEach((link) => {
        const href = link.getAttribute('href') || '';
        const text = (link.textContent || '').replace(/\s+/g, ' ').trim();
        if (href.includes('view=dashboard') || text === 'لوحة تحكم المستخدم') {
          link.setAttribute('href', '/dashboard');
        }
      });
    };

    const handleClick = (event) => {
      const control = event.target?.closest?.('a,button,[role="button"]');
      if (!control) return;
      const href = control.getAttribute?.('href') || '';
      const text = (control.textContent || '').replace(/\s+/g, ' ').trim();
      if (href.includes('view=dashboard') || text === 'لوحة تحكم المستخدم') {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        window.location.assign('/dashboard');
      }
    };

    fixLinks();
    const observer = new MutationObserver(fixLinks);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', handleClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}
