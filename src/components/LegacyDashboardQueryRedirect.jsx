'use client';

import { useEffect } from 'react';

export default function LegacyDashboardQueryRedirect() {
  useEffect(() => {
    const redirectCurrentUrl = () => {
      const url = new URL(window.location.href);
      if (url.pathname === '/' && url.searchParams.get('view') === 'dashboard') {
        window.location.replace('/dashboard');
        return true;
      }
      return false;
    };

    if (redirectCurrentUrl()) return;

    const handleClick = (event) => {
      const control = event.target?.closest?.('a,button,[role="button"]');
      if (!control) return;
      const href = control.getAttribute?.('href') || '';
      const text = (control.textContent || '').replace(/\s+/g, ' ').trim();
      if (href.includes('view=dashboard') || text === 'لوحة تحكم المستخدم') {
        event.preventDefault();
        window.location.href = '/dashboard';
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
