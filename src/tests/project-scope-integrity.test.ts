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
assert.ok(generationRoute.includes(".select('id,type')"));
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

console.log('Project tool scope integrity tests passed.');
