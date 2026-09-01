import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const projectService = readFileSync(join(root, 'src/lib/projects/projects-service.js'), 'utf8');
const projectList = readFileSync(join(root, 'src/components/ToolProjectsWorkspace.jsx'), 'utf8');
const projectTrash = readFileSync(join(root, 'src/components/ProjectTrashWorkspace.jsx'), 'utf8');
const generationsRoute = readFileSync(join(root, 'src/app/api/v1/generations/route.ts'), 'utf8');
const toolItemsRoute = readFileSync(join(root, 'src/app/api/v1/project-tool-items/route.ts'), 'utf8');
const statsRoute = readFileSync(join(root, 'src/app/api/v1/project-stats/route.ts'), 'utf8');
const retentionMigration = readFileSync(join(root, 'supabase/migrations/20260901160129_project_retention_and_trash.sql'), 'utf8');
const timestampHardening = readFileSync(join(root, 'supabase/migrations/20260901160850_project_retention_trigger_insert_safety.sql'), 'utf8');

assert.ok(projectService.includes(".is('deleted_at', null)"), 'Normal project lists must exclude trashed projects.');
assert.ok(projectService.includes('listDeletedUserProjects'), 'The user must be able to list their trashed projects.');
assert.ok(projectService.includes('restoreUserProject'), 'The user must be able to restore a trashed project.');
assert.ok(projectService.includes('.update({ deleted_at: deletedAt, updated_at: deletedAt })'), 'User deletion must be a soft delete.');
assert.ok(!projectService.includes('.delete()'), 'The browser project service must never hard-delete a project.');

assert.ok(projectList.includes('سلة المحذوفات'), 'Project deletion copy must describe the recoverable trash.');
assert.ok(projectList.includes('يمكنك استعادته خلال 30 يومًا'), 'Single-project deletion must disclose the 30-day recovery window.');
assert.ok(!projectList.includes('لا يمكن التراجع عن الحذف'), 'The project UI must not claim trash deletion is irreversible.');
assert.ok(projectTrash.includes('restoreUserProject'), 'Trash UI must expose project restore.');
assert.ok(projectTrash.includes('نافذة الاستعادة'), 'Trash UI must show recovery-window state.');

for (const [name, source] of [
  ['generations', generationsRoute],
  ['project tool items', toolItemsRoute],
  ['project stats', statsRoute],
] as const) {
  assert.ok(source.includes(".is('deleted_at', null)"), `${name} must treat trashed projects as inactive.`);
}

assert.ok(retentionMigration.includes("ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ"), 'Projects need a soft-delete timestamp.');
assert.ok(retentionMigration.includes("ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ"), 'Projects need a cleanup eligibility timestamp.');
assert.ok(retentionMigration.includes("INTERVAL '30 days'"), 'The recovery window must be 30 days.');
assert.ok(retentionMigration.includes('Admins can permanently delete projects'), 'Normal users must not have direct hard-delete policy.');
assert.ok(timestampHardening.includes("IF TG_OP = 'INSERT'"), 'Retention trigger must handle INSERT safely.');
assert.ok(timestampHardening.includes('NEW.deleted_at := NOW()'), 'Database must authoritatively stamp trash time.');
assert.ok(timestampHardening.includes('NEW.deleted_at := OLD.deleted_at'), 'A trashed project must not extend its recovery window.');
assert.ok(timestampHardening.includes("NEW.purge_after := OLD.deleted_at + INTERVAL '30 days'"), 'Recovery eligibility must remain anchored to the original trash timestamp.');

console.log('Project retention and trash regression guard passed.');
