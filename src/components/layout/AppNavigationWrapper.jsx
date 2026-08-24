'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import GlobalNavigation from '../GlobalNavigation';

const WORKSPACE_ROUTES = [
  '/dashboard',
  '/projects',
  '/chat-ai',
  '/images-ai',
  '/video-ai',
  '/audio-ai',
  '/brand-kit',
  '/admin',
];

export default function AppNavigationWrapper({ children }) {
  const pathname = usePathname();

  const isWorkspaceRoute = WORKSPACE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isWorkspaceRoute) {
    // In workspace routes, WorkspaceLayout handles the header, sidebar, and layout
    return <>{children}</>;
  }

  // In public and marketing routes (including /pricing, /store, /print, etc.), render GlobalNavigation
  return (
    <>
      <GlobalNavigation />
      <div className="pt-20">{children}</div>
    </>
  );
}
