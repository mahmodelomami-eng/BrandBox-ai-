import AuthGate from '../../../../components/AuthGate';
import MediaProjectWorkspace from '../../../../components/MediaProjectWorkspace';

export default function VideoProjectPage({ searchParams }) {
  const projectId = searchParams?.project || '';
  return <AuthGate><MediaProjectWorkspace tool="video" projectId={projectId} /></AuthGate>;
}
