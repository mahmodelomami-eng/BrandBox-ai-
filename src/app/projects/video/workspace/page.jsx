import AuthGate from '../../../../components/AuthGate';
import MediaProjectWorkspace from '../../../../components/MediaProjectWorkspace';
import ProjectWorkspaceGate from '../../../../components/ProjectWorkspaceGate';

function stringParam(value) {
  return typeof value === 'string' ? value : '';
}

export default async function VideoProjectPage({ searchParams }) {
  const params = await Promise.resolve(searchParams);
  const projectId = stringParam(params?.project);
  const initialPrompt = stringParam(params?.prompt);
  const templateSettings = {
    ratio: stringParam(params?.ratio),
    duration: stringParam(params?.duration),
    quality: stringParam(params?.quality),
  };

  return (
    <AuthGate>
      <ProjectWorkspaceGate tool="video" projectId={projectId}>
        <MediaProjectWorkspace
          tool="video"
          projectId={projectId}
          initialPrompt={initialPrompt}
          templateSettings={templateSettings}
        />
      </ProjectWorkspaceGate>
    </AuthGate>
  );
}
