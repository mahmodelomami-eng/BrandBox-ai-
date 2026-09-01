export type ProjectTool = 'images' | 'video' | 'chat' | 'audio';

export function projectToolFromType(type?: string | null): ProjectTool {
  const value = String(type || '').trim();

  if (/فيديو|video/i.test(value)) return 'video';
  if (/صوت|audio/i.test(value)) return 'audio';
  if (/محادثة|chat|نص|text/i.test(value)) return 'chat';
  if (/صورة|image/i.test(value)) return 'images';

  // Preserve legacy behavior: projects without a recognized type historically
  // opened in the image workspace, so they remain image-compatible.
  return 'images';
}

export function projectTypeMatchesTool(type: string | null | undefined, tool: ProjectTool) {
  return projectToolFromType(type) === tool;
}

export function generationTypeToProjectTool(generationType: 'chat' | 'image'): ProjectTool {
  return generationType === 'chat' ? 'chat' : 'images';
}
