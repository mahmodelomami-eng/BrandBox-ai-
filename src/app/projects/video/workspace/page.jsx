'use client';

import { useSearchParams } from 'next/navigation';
import AuthGate from '../../../../components/AuthGate';
import MediaProjectWorkspace from '../../../../components/MediaProjectWorkspace';

export default function VideoProjectPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') || '';
  return <AuthGate><MediaProjectWorkspace tool="video" projectId={projectId} /></AuthGate>;
}
