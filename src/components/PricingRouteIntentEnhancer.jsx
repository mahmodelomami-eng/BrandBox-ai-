'use client';

import { useEffect } from 'react';

export default function PricingRouteIntentEnhancer() {
  useEffect(() => {
    const planId = localStorage.getItem('brandbox.pending.subscription.plan');
    if (!planId) return;

    const install = () => {
      const accountArea = Array.from(document.querySelectorAll('p')).find((node) => node.textContent?.trim() === 'الحساب والدفع');
      if (!accountArea) return;
      const existing = document.querySelector('[data-brandbox-subscription-intent]');
      if (existing) return;

      const notice = document.createElement('div');
      notice.dataset.brandboxSubscriptionIntent = 'true';
      notice.className = 'mx-3 mb-3 rounded-xl border border-[#FF2E4C]/30 bg-[#FF2E4C]/10 px-3 py-2 text-[10px] leading-5 text-red-200';
      notice.textContent = `الباقة المختارة: ${planId.toUpperCase()} — أكمل إدارة اشتراكك من صفحة الباقات.`;
      accountArea.insertAdjacentElement('afterend', notice);
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
