'use client';

import { useSearchParams } from 'next/navigation';
import AuthGate from '../../../../components/AuthGate';
import MediaProjectWorkspace from '../../../../components/MediaProjectWorkspace';

export default function AudioProjectPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') || '';
  return <AuthGate><MediaProjectWorkspace tool="audio" projectId={projectId} /></AuthGate>;
}
