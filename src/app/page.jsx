'use client';

import React from 'react';
import App from '../../App';
import AuthGate from '../components/AuthGate';
import ProjectDeleteEnhancer from '../components/ProjectDeleteEnhancer';
import LegacyProjectsRouteBridge from '../components/LegacyProjectsRouteBridge';
import AdminUserManagementEnhancer from '../components/AdminUserManagementEnhancer';
import UserExperienceEnhancer from '../components/UserExperienceEnhancer';

export default function HomePage() {
  return (
    <AuthGate>
      <ProjectDeleteEnhancer />
      <LegacyProjectsRouteBridge />
      <AdminUserManagementEnhancer />
      <UserExperienceEnhancer />
      <App />
    </AuthGate>
  );
}
