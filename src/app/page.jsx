'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeExperience from '../components/HomeExperience';

const LEGACY_VIEW_MAP = {
  dashboard: '/dashboard',
  projects: '/projects',
  'project-workspace': '/projects',
  chat: '/projects/chat',
  images: '/projects/images',
  video: '/projects/video',
  audio: '/projects/audio',
  'brand-kit': '/brand-kit',
  templates: '/templates',
  billing: '/pricing',
  pricing: '/pricing',
  settings: '/dashboard/account',
  account: '/dashboard/account',
  admin: '/admin',
  'admin-shell': '/admin',
};

function RootPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');
  const legacyTarget = viewParam ? LEGACY_VIEW_MAP[viewParam] : null;

  useEffect(() => {
    if (legacyTarget) router.replace(legacyTarget);
  }, [legacyTarget, router]);

  if (legacyTarget) {
    return <div className="bb-app-canvas min-h-screen" aria-hidden="true" />;
  }

  return <HomeExperience />;
}

export default function RootPage() {
  return (
    <Suspense fallback={<div className="bb-app-canvas min-h-screen" />}>
      <RootPageContent />
    </Suspense>
  );
}
