export const PROJECT_TOOLS = ['images', 'video', 'chat', 'audio'];

export function projectToolFromType(type = '') {
  const value = String(type || '').trim();

  if (/فيديو|video/i.test(value)) return 'video';
  if (/صوت|audio/i.test(value)) return 'audio';
  if (/صورة|image/i.test(value)) return 'images';
  if (/محادثة|chat|نص|text/i.test(value)) return 'chat';

  return 'images';
}

export function projectWorkspaceHref(projectId, type = '') {
  const tool = projectToolFromType(type);
  return `/projects/${tool}/workspace?project=${encodeURIComponent(projectId)}`;
}
