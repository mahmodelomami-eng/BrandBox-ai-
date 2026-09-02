'use client';

import React from 'react';
import GlobalNavigation from '../GlobalNavigation';
import ThemeToggle from '../ThemeToggle';
import UserExperienceEnhancer from '../UserExperienceEnhancer';
import { ThemeProvider } from '../../context/ThemeContext';

export default function AppNavigationWrapper({ children }) {
  return (
    <ThemeProvider>
      <GlobalNavigation />
      <UserExperienceEnhancer />
      <div className="brandbox-theme-scope min-h-screen pt-20">{children}</div>
      <ThemeToggle />
    </ThemeProvider>
  );
}
