'use client';

import React from 'react';
import App from '../../App';
import AuthGate from '../components/AuthGate';
import RealUserDataBridge from '../components/RealUserDataBridge';

export default function HomePage() {
  return (
    <AuthGate>
      <RealUserDataBridge>
        <App />
      </RealUserDataBridge>
    </AuthGate>
  );
}
