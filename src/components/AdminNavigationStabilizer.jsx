'use client';

import { useEffect, useState } from 'react';
import { ROLE_PERMISSIONS_MATRIX } from '../../App';

// SUPPORT needs read-only access to the overview so the Dashboard entry remains
// visible. No manage permission is added here.
if (ROLE_PERMISSIONS_MATRIX?.SUPPORT) {
  ROLE_PERMISSIONS_MATRIX.SUPPORT.add('ANALYTICS_READ');
}

const ADMIN_LABELS = new Set([
  'لوحة التحكم (Dashboard)',
  'لوحة التحكم',
  'المستخدمين',
  'المشاريع',
  'الاشتراكات',
  'المدفوعات (Ezone)',
  'سجل النقاط والتسويات',
  'خطط الاشتراكات',
  'حزم النقاط',
  'مزودو الذكاء',
  'النماذج والأسعار',
  'توليدات AI',
  'أصول المنصة',
  'سجل المراجعة (Audit)',
  'أخطاء النظام',
  'الإعدادات',
]);

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function labelFor(control) {
  return normalize(control?.textContent);
}

function findActiveAdminItem() {
  const controls = Array.from(document.querySelectorAll('aside button, aside [role="button"]'));
  return controls.find((control) => {
    const label = labelFor(control);
    if (!ADMIN_LABELS.has(label)) return false;
    const classes = String(control.className || '');
    return classes.includes('bg-[#FF2E4C]') || control.getAttribute('aria-current') === 'page';
  }) || null;
}

export default function AdminNavigationStabilizer({ children }) {
  const [usersActive, setUsersActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer = null;

    const syncFromSidebar = () => {
      if (cancelled) return true;
      const active = findActiveAdminItem();
      if (active) {
        setUsersActive(labelFor(active) === 'المستخدمين');
        return true;
      }
      return false;
    };

    const bootstrap = () => {
      if (syncFromSidebar()) return;
      attempts += 1;
      if (attempts < 20) timer = window.setTimeout(bootstrap, 75);
    };

    const handleClick = (event) => {
      const control = event.target?.closest?.('aside button, aside [role="button"]');
      if (!control) return;
      const label = labelFor(control);
      if (!ADMIN_LABELS.has(label)) return;

      // Unmount the fixed users enhancer before another admin screen renders.
      // This prevents it from remaining above Projects/Subscriptions/etc.
      setUsersActive(label === 'المستخدمين');

      // Keep a cheap route hint for diagnostics and future refresh persistence.
      document.documentElement.dataset.brandboxAdminSection = label;
    };

    document.addEventListener('click', handleClick, true);
    timer = window.setTimeout(bootstrap, 0);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return usersActive ? children : null;
}
