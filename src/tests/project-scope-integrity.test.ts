import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import {
  generationTypeToProjectTool,
  projectToolFromType,
  projectTypeMatchesTool,
} from '../lib/projects/project-scope';

const root = process.cwd();
const generationRoute = readFileSync(join(root, 'src/app/api/v1/generations/route.ts'), 'utf8');
const toolItemsRoute = readFileSync(join(root, 'src/app/api/v1/project-tool-items/route.ts'), 'utf8');
const relationshipRlsMigration = readFileSync(
  join(root, 'supabase/migrations/20260901130907_project_relationship_rls_hardening.sql'),
  'utf8',
);

assert.equal(projectToolFromType('صورة'), 'images');
assert.equal(projectToolFromType('image'), 'images');
assert.equal(projectToolFromType('فيديو'), 'video');
assert.equal(projectToolFromType('audio'), 'audio');
assert.equal(projectToolFromType('محادثة'), 'chat');
assert.equal(projectToolFromType('text'), 'chat');
assert.equal(projectToolFromType(''), 'images');
assert.equal(projectToolFromType('legacy-general-project'), 'images');

assert.equal(generationTypeToProjectTool('image'), 'images');
assert.equal(generationTypeToProjectTool('chat'), 'chat');
assert.equal(generationTypeToProjectTool('video'), 'video');
assert.equal(projectTypeMatchesTool('فيديو', 'video'), true);
assert.equal(projectTypeMatchesTool('فيديو', 'audio'), false);
assert.equal(projectTypeMatchesTool('محادثة', 'chat'), true);
assert.equal(projectTypeMatchesTool('محادثة', 'images'), false);

assert.ok(generationRoute.includes("generationType !== 'chat' && generationType !== 'image'"));
const generationProjectSelect = generationRoute.match(/\.from\('projects'\)[\s\S]{0,250}?\.select\('([^']+)'\)/)?.[1]?.split(',') || [];
assert.ok(generationProjectSelect.includes('id'), 'Generation project lookup must include project id.');
assert.ok(generationProjectSelect.includes('type'), 'Generation project lookup must include project type for tool-scope validation.');
assert.ok(generationRoute.includes("error: 'PROJECT_TOOL_MISMATCH'"));
assert.ok(generationRoute.includes('generationTypeToProjectTool(generationType)'));
assert.ok(generationRoute.includes('projectTypeMatchesTool(project.type, expectedTool)'));
const generationMismatch = generationRoute.indexOf("error: 'PROJECT_TOOL_MISMATCH'");
const generationExecution = generationRoute.indexOf('GenerationEngine.executeGeneration');
assert.ok(generationMismatch >= 0 && generationExecution > generationMismatch, 'Project tool mismatch must be rejected before generation execution/credit deduction.');

assert.ok(toolItemsRoute.includes(".select('id,type')"));
assert.ok(toolItemsRoute.includes("error: 'PROJECT_TOOL_MISMATCH'"));
assert.ok(toolItemsRoute.includes('projectTypeMatchesTool(project.type, tool as ProjectTool)'));
const mismatchOccurrences = toolItemsRoute.match(/PROJECT_TOOL_MISMATCH/g) || [];
assert.equal(mismatchOccurrences.length, 2, 'Both GET and POST must enforce project/tool scope.');
const lastMismatch = toolItemsRoute.lastIndexOf('PROJECT_TOOL_MISMATCH');
const insertIndex = toolItemsRoute.indexOf(".from('project_tool_items')\n    .insert(");
assert.ok(lastMismatch >= 0 && insertIndex > lastMismatch, 'POST mismatch must be rejected before saving a tool item.');

const normalizedRls = relationshipRlsMigration.replace(/\s+/g, ' ');
assert.ok(normalizedRls.includes('ALTER POLICY "Users can manage own generations" ON public.generations'));
assert.ok(normalizedRls.includes('ALTER POLICY "Users can manage own assets" ON public.assets'));
assert.equal((relationshipRlsMigration.match(/WITH CHECK\s*\(/gi) || []).length, 2, 'Generations and assets must both enforce write-time relationship checks.');
assert.ok((relationshipRlsMigration.match(/p\.owner_id\s*=\s*auth\.uid\(\)/g) || []).length >= 2, 'Both policies must require project ownership for project-linked writes.');
assert.ok(relationshipRlsMigration.includes('g.user_id = auth.uid()'), 'Asset writes must only reference generations owned by the same authenticated user.');
assert.ok(normalizedRls.includes('project_id IS NULL'), 'Unscoped generation/asset records must remain supported where project_id is optional.');
assert.ok(normalizedRls.includes('generation_id IS NULL'), 'Assets without a generation link must remain supported.');
assert.ok(!/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(relationshipRlsMigration), 'The project relationship migration must never disable RLS.');

console.log('Project tool scope and relationship RLS integrity tests passed.');
