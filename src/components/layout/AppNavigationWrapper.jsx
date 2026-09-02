'use client';

import React from 'react';
import GlobalNavigation from '../GlobalNavigation';
import UserExperienceEnhancer from '../UserExperienceEnhancer';

export default function AppNavigationWrapper({ children }) {
  return (
    <>
      <GlobalNavigation />
      <UserExperienceEnhancer />
      <div className="pt-20">{children}</div>
    </>
  );
}
