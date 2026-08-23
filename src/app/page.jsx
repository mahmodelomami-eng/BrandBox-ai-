'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import App from '../../App';
import HomeExperience from '../components/HomeExperience';
import AuthGate from '../components/AuthGate';
import ProjectDeleteEnhancer from '../components/ProjectDeleteEnhancer';
import LegacyWorkspaceStateBridge from '../components/LegacyWorkspaceStateBridge';
import AdminUserManagementEnhancer from '../components/AdminUserManagementEnhancer';
import AdminNavigationStabilizer from '../components/AdminNavigationStabilizer';
import UserExperienceEnhancer from '../components/UserExperienceEnhancer';
import SidebarPricingEnhancer from '../components/SidebarPricingEnhancer';
import PricingRouteIntentEnhancer from '../components/PricingRouteIntentEnhancer';
import UserDashboardToolChooserEnhancer from '../components/UserDashboardToolChooserEnhancer';
import AdminWorkspaceReturnFix from '../components/AdminWorkspaceReturnFix';

function CanonicalRedirect({ target }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(target);
  }, [router, target]);

  return <div className="min-h-screen bg-[#050506]" />;
}

function RootExperience() {
  const searchParams = useSearchParams();
  const legacyView = searchParams.get('view');
  const projectId = searchParams.get('project');

  if (!legacyView) return <HomeExperience />;

  const canonicalTargets = {
    dashboard: '/dashboard',
    admin: '/admin',
    projects: '/projects',
    images: projectId ? `/projects/images/workspace?project=${encodeURIComponent(projectId)}` : '/projects/images',
    video: '/projects/video',
    chat: '/projects/chat',
    audio: '/projects/audio',
  };

  if (canonicalTargets[legacyView]) {
    return <CanonicalRedirect target={canonicalTargets[legacyView]} />;
  }

  return (
    <AuthGate>
      <LegacyWorkspaceStateBridge view={legacyView}>
        <ProjectDeleteEnhancer />
        <AdminNavigationStabilizer>
          <AdminUserManagementEnhancer />
        </AdminNavigationStabilizer>
        <AdminWorkspaceReturnFix />
        <UserExperienceEnhancer />
        <SidebarPricingEnhancer />
        <PricingRouteIntentEnhancer />
        <UserDashboardToolChooserEnhancer />
        <App />
      </LegacyWorkspaceStateBridge>
    </AuthGate>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050506]" />}>
      <RootExperience />
    </Suspense>
  );
}
