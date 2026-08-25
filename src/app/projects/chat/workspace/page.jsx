import AuthGate from '../../../../components/AuthGate';
import ChatProjectWorkspace from '../../../../components/ChatProjectWorkspace';

export default function ChatProjectPage({ searchParams }) {
  const projectId = searchParams?.project || '';
  const initialPrompt = searchParams?.prompt || '';
  return <AuthGate><ChatProjectWorkspace projectId={projectId} initialPrompt={initialPrompt} /></AuthGate>;
}
