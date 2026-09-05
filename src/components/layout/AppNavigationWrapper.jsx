'use client';

import React from 'react';
import GlobalNavigation from '../GlobalNavigation';
import ThemeToggle from '../ThemeToggle';
import UserExperienceEnhancer from '../UserExperienceEnhancer';
import { ThemeProvider } from '../../context/ThemeContext';

export default function AppNavigationWrapper({ children }) {
  return (
    <ThemeProvider>
      <a
        href="#main-content"
        className="bb-button-primary fixed left-4 top-4 z-[200] -translate-y-24 rounded-xl px-4 py-3 text-sm font-black transition-transform focus:translate-y-0 focus-visible:outline-none"
      >
        تجاوز إلى المحتوى الرئيسي
      </a>
      <GlobalNavigation />
      <UserExperienceEnhancer />
      <main id="main-content" tabIndex={-1} className="brandbox-theme-scope min-h-screen pt-20">
        {children}
      </main>
      <ThemeToggle />
    </ThemeProvider>
  );
}
