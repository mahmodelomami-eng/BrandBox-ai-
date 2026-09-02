import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const workspace = readFileSync(join(root, 'src/components/ToolProjectsWorkspace.jsx'), 'utf8');
const hub = readFileSync(join(root, 'src/components/ProjectsToolHub.jsx'), 'utf8');
const trash = readFileSync(join(root, 'src/components/ProjectTrashWorkspace.jsx'), 'utf8');
const gate = readFileSync(join(root, 'src/components/ProjectWorkspaceGate.jsx'), 'utf8');
const toolNav = readFileSync(join(root, 'src/components/ProjectToolNav.jsx'), 'utf8');
const shell = readFileSync(join(root, 'src/components/WorkspaceDashboardShell.jsx'), 'utf8');

// Monitoring & Maintenance: loading/retry/degraded stats/search states.
assert.ok(workspace.includes('const [loadFailed, setLoadFailed]'));
assert.ok(workspace.includes('const [statsWarning, setStatsWarning]'));
assert.ok(workspace.includes('const [reloadTick, setReloadTick]'));
assert.ok(workspace.includes('function retryProjects()'));
assert.ok(workspace.includes('إعادة المحاولة'));
assert.ok(workspace.includes('المشاريع نفسها ما زالت متاحة'));
assert.ok(workspace.includes('const searchHasNoResults ='));
assert.ok(workspace.includes('لا توجد نتائج مطابقة'));
assert.ok(workspace.includes('مسح البحث'));
assert.ok(workspace.includes('role="status"'));
assert.ok(workspace.includes('role="alert"'));

// Create-project dialog reliability and accessibility.
assert.ok(workspace.includes("if (event.key === 'Escape' && !creating)"));
assert.ok(workspace.includes("document.body.style.overflow = 'hidden'"));
assert.ok(workspace.includes('role="dialog"'));
assert.ok(workspace.includes('aria-modal="true"'));
assert.ok(workspace.includes('aria-labelledby="create-project-title"'));
assert.ok(workspace.includes('aria-label="إغلاق نافذة إنشاء المشروع"'));
assert.ok(workspace.includes('id="new-project-name"'));
assert.ok(workspace.includes('autoFocus'));

// Navigation/touch/focus states for project tools.
assert.ok(workspace.includes("aria-current={active ? 'page' : undefined}"));
assert.ok(workspace.includes('focus-visible:ring-2'));
assert.ok(workspace.includes('aria-label={`البحث في ${config.title}`}'));
assert.ok(workspace.includes('aria-label={project.isFavorite ?'));
assert.ok(workspace.includes('aria-label={`نقل ${project.name} إلى سلة المحذوفات`}'));

// Product & Business: accurate capability wording and action-first empty states.
assert.ok(workspace.includes('التوليد يتاح عندما يكون مزود الفيديو مفعّلًا'));
assert.ok(workspace.includes('التوليد يتاح حسب المزود المفعّل'));
assert.ok(workspace.includes("allToolProjects.length ? 'إنشاء مشروع آخر' : 'أنشئ أول مشروع'"));
assert.ok(workspace.includes("'مشروع جاهز لبدء العمل.'"));
assert.ok(hub.includes('التوليد يتاح حسب مزود الفيديو المفعّل'));
assert.ok(hub.includes('التوليد يتاح حسب المزود المفعّل'));
assert.ok(hub.includes('فتح مشاريع {label}'));
assert.ok(hub.includes('focus-visible:ring-2'));

// Theme & Design System Expert: migrated project family must consume semantic theme primitives.
for (const source of [workspace, hub, trash, gate, toolNav, shell]) {
  assert.ok(source.includes('bb-'), 'migrated project surface must consume semantic Brand Box classes');
  assert.ok(!source.includes('bg-[#050506]'));
  assert.ok(!source.includes('bg-[#050608]'));
  assert.ok(!source.includes('bg-[#0b0d12]'));
  assert.ok(!source.includes('bg-[#0d1016]'));
  assert.ok(!source.includes('bg-[#101217]'));
  assert.ok(!source.includes('text-gray-'));
  assert.ok(!source.includes('border-white/10'));
}

assert.ok(workspace.includes('bb-app-canvas'));
assert.ok(workspace.includes('bb-panel'));
assert.ok(workspace.includes('bb-input'));
assert.ok(workspace.includes('bb-media-canvas'));
assert.ok(workspace.includes('bb-surface-elevated'));
assert.ok(hub.includes('bb-card'));
assert.ok(trash.includes('bb-danger-surface'));
assert.ok(gate.includes('bb-button-primary'));
assert.ok(toolNav.includes('bb-button-secondary'));
assert.ok(shell.includes('bb-app-canvas'));

console.log('Product/Monitoring/Theme projects interface pass guard passed.');
