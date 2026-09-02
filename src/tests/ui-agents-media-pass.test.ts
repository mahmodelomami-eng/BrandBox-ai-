import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const media = readFileSync(join(root, 'src/components/MediaProjectWorkspace.jsx'), 'utf8');

// Tool/project scope must be enforced before draft actions are exposed.
assert.ok(media.includes('matchesProject: (type) => /فيديو|video/i.test(type || \'\')'));
assert.ok(media.includes('matchesProject: (type) => /صوت|audio/i.test(type || \'\')'));
assert.ok(media.includes('item.id === projectId && config.matchesProject(item.type)'));
assert.ok(media.includes('!config.matchesProject(project.type)'));

// Monitoring & Maintenance: stale records, explicit load failures and recovery.
assert.ok(media.includes('const [itemsOwnerId, setItemsOwnerId]'));
assert.ok(media.includes('const [itemsError, setItemsError]'));
assert.ok(media.includes('const [workspaceError, setWorkspaceError]'));
assert.ok(media.includes('const visibleItems = itemsOwnerId === projectId ? items : []'));
assert.ok(media.includes('إعادة تحميل السجل'));
assert.ok(media.includes('تعذر فتح مساحة المشروع'));
assert.ok(media.includes('إعادة المحاولة'));
assert.ok(media.includes("cache: 'no-store'"));

// Product & Business: drafts remain reusable and UI does not imply live generation.
assert.ok(media.includes('function reuseDraft(item)'));
assert.ok(media.includes('استخدام كنقطة بداية'));
assert.ok(media.includes('أي حفظ جديد سيُنشئ نسخة مسودة جديدة'));
assert.ok(media.includes('حفظ نسخة مسودة'));
assert.ok(media.includes('أبقينا النص في المحرر'));
assert.ok(media.includes('حفظ المسودة لا يشغّل مزودًا خارجيًا ولا يخصم نقاطًا'));
assert.ok(media.includes('التوليد غير متاح حتى تفعيل المزود'));
assert.ok(!media.includes("setPrompt('');"));

// Long-form audio/video descriptions have a visible, bounded editor.
assert.ok(media.includes('maxLength={4000}'));
assert.ok(media.includes('{prompt.length} / 4000'));
assert.ok(media.includes('id="media-draft-prompt"'));

// Theme & Design System Expert: draft workspace chrome must use semantic primitives.
assert.ok(media.includes('bb-app-canvas'));
assert.ok(media.includes('bb-panel'));
assert.ok(media.includes('bb-card'));
assert.ok(media.includes('bb-input'));
assert.ok(media.includes('bb-button-primary'));
assert.ok(media.includes('bb-button-secondary'));
assert.ok(media.includes('bb-warning-surface'));
assert.ok(media.includes('bb-danger-surface'));
assert.ok(!media.includes('bg-[#050506]'));
assert.ok(!media.includes('bg-[#0b0d12]'));
assert.ok(!media.includes('bg-[#080a0e]'));
assert.ok(!media.includes('bg-[#0d1016]'));
assert.ok(!media.includes('bg-[#11141a]'));
assert.ok(!media.includes('bg-[#171a21]'));
assert.ok(!media.includes('text-gray-'));
assert.ok(!media.includes('border-white/10'));
assert.ok(!media.includes('border-white/[.07]'));

console.log('Product/Monitoring/Theme media workspace interface pass guard passed.');
