import AuthGate from '../../../../components/AuthGate';
import ProjectWorkspaceGate from '../../../../components/ProjectWorkspaceGate';
import VideoProjectWorkspace from '../../../../components/VideoProjectWorkspace';

function stringParam(value) {
  return typeof value === 'string' ? value : '';
}

export default async function VideoProjectPage({ searchParams }) {
  const params = await searchParams;
  const projectId = params?.project || '';
  const initialPrompt = stringParam(params?.prompt);
  const templateSettings = {
    ratio: stringParam(params?.ratio),
    duration: stringParam(params?.duration),
    quality: stringParam(params?.quality),
  };

  return (
    <AuthGate>
      <ProjectWorkspaceGate tool="video" projectId={projectId}>
        <VideoProjectWorkspace
          projectId={projectId}
          initialPrompt={initialPrompt}
          templateSettings={templateSettings}
        />
      </ProjectWorkspaceGate>
    </AuthGate>
  );
}
