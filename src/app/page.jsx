'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import App from '../../App';
import HomeExperience from '../components/HomeExperience';
import AuthGate from '../components/AuthGate';
import ProjectDeleteEnhancer from '../components/ProjectDeleteEnhancer';
import LegacyWorkspaceStateBridge from '../components/LegacyWorkspaceStateBridge';
import AdminUserManagementEnhancer from '../components/AdminUserManagementEnhancer';
import UserExperienceEnhancer from '../components/UserExperienceEnhancer';
import SidebarPricingEnhancer from '../components/SidebarPricingEnhancer';
import PricingRouteIntentEnhancer from '../components/PricingRouteIntentEnhancer';
import ImageStudioWorkspace from '../components/ImageStudioWorkspace';

function RootExperience() {
  const searchParams = useSearchParams();
  const legacyView = searchParams.get('view');

  if (!legacyView) return <HomeExperience />;

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
        <AdminUserManagementEnhancer />
        <UserExperienceEnhancer />
        <SidebarPricingEnhancer />
        <PricingRouteIntentEnhancer />
        <App />
      </LegacyWorkspaceStateBridge>
    </AuthGate>
  );
}

export default function HomePage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#050506]" />}><RootExperience /></Suspense>;
}
