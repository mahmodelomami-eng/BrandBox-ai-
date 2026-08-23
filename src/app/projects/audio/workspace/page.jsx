import AuthGate from '../../../../components/AuthGate';
import MediaProjectWorkspace from '../../../../components/MediaProjectWorkspace';

export default function AudioProjectPage({ searchParams }) {
  const projectId = searchParams?.project || '';
  return <AuthGate><MediaProjectWorkspace tool="audio" projectId={projectId} /></AuthGate>;
}
