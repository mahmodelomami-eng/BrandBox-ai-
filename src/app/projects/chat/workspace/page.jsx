import AuthGate from '../../../../components/AuthGate';
import ChatProjectWorkspace from '../../../../components/ChatProjectWorkspace';

export default function ChatProjectPage({ searchParams }) {
  const projectId = searchParams?.project || '';
  return <AuthGate><ChatProjectWorkspace projectId={projectId} /></AuthGate>;
}
