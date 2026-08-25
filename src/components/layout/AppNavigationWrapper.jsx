'use client';

import React from 'react';
import GlobalNavigation from '../GlobalNavigation';

export default function AppNavigationWrapper({ children }) {
  return (
    <>
      <GlobalNavigation />
      <div className="pt-20">{children}</div>
    </>
  );
}
