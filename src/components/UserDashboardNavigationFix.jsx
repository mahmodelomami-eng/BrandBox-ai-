'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserDashboardNavigationFix() {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event) => {
      const link = event.target?.closest?.('a[href="/?view=dashboard"]');
      if (!link) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      router.push('/dashboard');
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [router]);

  return null;
}
