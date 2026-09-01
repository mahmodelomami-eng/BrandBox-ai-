import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const gate = readFileSync(join(root, 'src/components/ProjectWorkspaceGate.jsx'), 'utf8');
const imagePage = readFileSync(join(root, 'src/app/projects/images/workspace/page.jsx'), 'utf8');
const chatPage = readFileSync(join(root, 'src/app/projects/chat/workspace/page.jsx'), 'utf8');
const videoPage = readFileSync(join(root, 'src/app/projects/video/workspace/page.jsx'), 'utf8');
const audioPage = readFileSync(join(root, 'src/app/projects/audio/workspace/page.jsx'), 'utf8');

assert.ok(gate.includes('listUserProjects()'), 'Workspace guard must verify the project against the authenticated user project list.');
assert.ok(gate.includes('projectToolFromType(project.type) !== tool'), 'Workspace guard must reject projects that belong to a different AI tool.');
assert.ok(gate.includes("if (!projectId)"), 'Workspace guard must reject a missing project id explicitly.');
assert.ok(gate.includes("status: 'invalid'"), 'Workspace guard must expose an explicit invalid/unowned-project state.');
assert.ok(gate.includes("status: 'mismatch'"), 'Workspace guard must expose an explicit wrong-tool state.');
assert.ok(gate.includes('المشروع غير موجود أو لا تملك صلاحية الوصول إليه.'), 'The invalid project message must not disclose another tenant project.');

for (const [name, source, tool] of [
  ['images', imagePage, 'images'],
  ['chat', chatPage, 'chat'],
  ['video', videoPage, 'video'],
  ['audio', audioPage, 'audio'],
] as const) {
  assert.ok(source.includes('ProjectWorkspaceGate'), `${name} workspace route must be wrapped by ProjectWorkspaceGate.`);
  assert.ok(source.includes(`tool="${tool}"`), `${name} workspace route must validate the expected tool.`);
  assert.ok(source.includes('const params = await searchParams;'), `${name} workspace route must resolve Next.js searchParams before reading project id.`);
  assert.ok(source.includes("const projectId = params?.project || '';"), `${name} workspace route must pass the requested project id into the guard.`);
}

console.log('Project workspace route guard tests passed.');
