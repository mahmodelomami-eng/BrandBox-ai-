'use client';

import { useEffect } from 'react';

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export default function AdminWorkspaceReturnFix() {
  useEffect(() => {
    const handleClick = (event) => {
      const control = event.target?.closest?.('button, [role="button"], a');
      if (!control) return;

      const label = normalize(control.textContent);
      if (!label.includes('العودة لمساحة العمل')) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      // The legacy admin switch only flips internal React state. After role-based
      // admin routing (notably SUPPORT), that can leave the shell in a mixed
      // admin/workspace state. A full route transition remounts the workspace
      // with a clean dashboard state and keeps the session intact.
      window.location.assign('/?view=dashboard');
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
