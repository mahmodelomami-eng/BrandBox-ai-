'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeExperience from '../components/HomeExperience';

const LEGACY_VIEW_MAP = {
  dashboard: '/dashboard',
  projects: '/projects',
  'project-workspace': '/projects',
  chat: '/chat-ai',
  images: '/projects/images',
  video: '/video-ai',
  audio: '/audio-ai',
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

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && LEGACY_VIEW_MAP[viewParam]) {
      router.replace(LEGACY_VIEW_MAP[viewParam]);
    }
  }, [searchParams, router]);

  return <HomeExperience />;
}

export default function RootPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050506]" />}>
      <RootPageContent />
    </Suspense>
  );
}
