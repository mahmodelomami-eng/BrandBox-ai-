'use client';

import React from 'react';
import App from '../../App';
import AuthGate from '../components/AuthGate';

export default function HomePage() {
  return (
    <AuthGate>
      <App />
    </AuthGate>
  );
}
