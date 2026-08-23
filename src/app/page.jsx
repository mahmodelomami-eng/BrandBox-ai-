'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import App from '../../App';
import HomeExperience from '../components/HomeExperience';
import AuthGate from '../components/AuthGate';
import ProjectDeleteEnhancer from '../components/ProjectDeleteEnhancer';
import LegacyProjectsRouteBridge from '../components/LegacyProjectsRouteBridge';
import AdminUserManagementEnhancer from '../components/AdminUserManagementEnhancer';
import UserExperienceEnhancer from '../components/UserExperienceEnhancer';
import SidebarPricingEnhancer from '../components/SidebarPricingEnhancer';
import PricingRouteIntentEnhancer from '../components/PricingRouteIntentEnhancer';

export default function HomePage() {
  const searchParams = useSearchParams();
  const legacyView = searchParams.get('view');

  if (!legacyView) return <HomeExperience />;

  return (
    <AuthGate>
      <ProjectDeleteEnhancer />
      <LegacyProjectsRouteBridge />
      <AdminUserManagementEnhancer />
      <UserExperienceEnhancer />
      <SidebarPricingEnhancer />
      <PricingRouteIntentEnhancer />
      <App />
    </AuthGate>
  );
}
