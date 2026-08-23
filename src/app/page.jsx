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
import ImageStudioWorkspace from '../components/ImageStudioWorkspace';
import ProjectsToolHub from '../components/ProjectsToolHub';
import UserDashboardToolChooserEnhancer from '../components/UserDashboardToolChooserEnhancer';
import AdminWorkspaceReturnFix from '../components/AdminWorkspaceReturnFix';

function LegacyDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return <div className="min-h-screen bg-[#050506]" />;
}

function RootExperience() {
  const searchParams = useSearchParams();
  const legacyView = searchParams.get('view');

  if (!legacyView) return <HomeExperience />;

  if (legacyView === 'dashboard') {
    return <LegacyDashboardRedirect />;
  }

  if (legacyView === 'projects') {
    return (
      <AuthGate>
        <ProjectsToolHub />
      </AuthGate>
    );
  }

  if (legacyView === 'images') {
    return (
      <AuthGate>
        <ImageStudioWorkspace />
      </AuthGate>
    );
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
  return <Suspense fallback={<div className="min-h-screen bg-[#050506]" />}><RootExperience /></Suspense>;
}
