'use client';

import { useSearchParams } from 'next/navigation';
import AuthGate from '../../../../components/AuthGate';
import ChatProjectWorkspace from '../../../../components/ChatProjectWorkspace';

export default function ChatProjectPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') || '';
  return <AuthGate><ChatProjectWorkspace projectId={projectId} /></AuthGate>;
}
