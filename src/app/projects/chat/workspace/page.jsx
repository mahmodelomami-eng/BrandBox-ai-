import AuthGate from '../../../../components/AuthGate';
import ChatProjectWorkspace from '../../../../components/ChatProjectWorkspace';
import ProjectWorkspaceGate from '../../../../components/ProjectWorkspaceGate';

function stringParam(value) {
  return typeof value === 'string' ? value : '';
}

export default async function ChatProjectPage({ searchParams }) {
  const params = await searchParams;
  const projectId = params?.project || '';
  const initialPrompt = stringParam(params?.prompt);

  return (
    <AuthGate>
      <ProjectWorkspaceGate tool="chat" projectId={projectId}>
        <ChatProjectWorkspace projectId={projectId} initialPrompt={initialPrompt} />
      </ProjectWorkspaceGate>
    </AuthGate>
  );
}
