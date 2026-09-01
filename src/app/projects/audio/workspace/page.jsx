import AuthGate from '../../../../components/AuthGate';
import MediaProjectWorkspace from '../../../../components/MediaProjectWorkspace';
import ProjectWorkspaceGate from '../../../../components/ProjectWorkspaceGate';

export default async function AudioProjectPage({ searchParams }) {
  const params = await searchParams;
  const projectId = params?.project || '';

  return (
    <AuthGate>
      <ProjectWorkspaceGate tool="audio" projectId={projectId}>
        <MediaProjectWorkspace tool="audio" projectId={projectId} />
      </ProjectWorkspaceGate>
    </AuthGate>
  );
}
