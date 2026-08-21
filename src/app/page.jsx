'use client';

import React from 'react';
import App from '../../App';
import AuthGate from '../components/AuthGate';
import ProjectDeleteEnhancer from '../components/ProjectDeleteEnhancer';

export default function HomePage() {
  return (
    <AuthGate>
      <ProjectDeleteEnhancer />
      <App />
    </AuthGate>
  );
}
