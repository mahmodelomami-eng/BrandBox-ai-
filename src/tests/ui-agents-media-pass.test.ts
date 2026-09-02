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

console.log('Product/Monitoring media workspace interface pass guard passed.');
