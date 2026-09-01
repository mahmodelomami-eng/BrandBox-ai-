import AuthGate from '../../../../components/AuthGate';
import MediaProjectWorkspace from '../../../../components/MediaProjectWorkspace';
import ProjectWorkspaceGate from '../../../../components/ProjectWorkspaceGate';

export default async function VideoProjectPage({ searchParams }) {
  const params = await searchParams;
  const projectId = params?.project || '';

  return (
    <AuthGate>
      <ProjectWorkspaceGate tool="video" projectId={projectId}>
        <MediaProjectWorkspace tool="video" projectId={projectId} />
      </ProjectWorkspaceGate>
    </AuthGate>
  );
}
