'use client';

import { useEffect } from 'react';

export default function SidebarPricingEnhancer() {
  useEffect(() => {
    const install = () => {
      if (document.querySelector('[data-brandbox-plans-nav]')) return;
      const candidates = Array.from(document.querySelectorAll('button'));
      const purchaseCredits = candidates.find((node) => node.textContent?.trim() === 'شراء رصيد');
      if (!purchaseCredits?.parentElement) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.brandboxPlansNav = 'true';
      button.className = purchaseCredits.className;
      button.setAttribute('aria-label', 'الباقات');
      button.innerHTML = `
        <span aria-hidden="true" class="text-[#FF2E4C]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7Z"></path>
            <path d="M5 18h14"></path>
          </svg>
        </span>
        <span>الباقات</span>`;
      button.addEventListener('click', () => window.location.assign('/pricing'));
      purchaseCredits.insertAdjacentElement('afterend', button);
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
