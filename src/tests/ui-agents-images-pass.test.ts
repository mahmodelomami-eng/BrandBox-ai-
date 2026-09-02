import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const studio = readFileSync(join(root, 'src/components/ImageStudioWorkspace.jsx'), 'utf8');

// Tool/project scope must remain explicit in the UI before the server guard.
assert.ok(studio.includes('function isImageProject(project)'));
assert.ok(studio.includes('rows.map(normalizeProject).filter(isImageProject)'));
assert.ok(studio.includes("type: 'صورة'"));
assert.ok(studio.includes('مشروع الصور الحالي'));

// Monitoring & Maintenance: stale-project/history/load recovery.
assert.ok(studio.includes('const [galleryProjectId, setGalleryProjectId]'));
assert.ok(studio.includes('const [historyError, setHistoryError]'));
assert.ok(studio.includes('const [workspaceLoadFailed, setWorkspaceLoadFailed]'));
assert.ok(studio.includes('galleryProjectId === activeProject.id'));
assert.ok(studio.includes('جاري تحميل معرض المشروع'));
assert.ok(studio.includes('إعادة تحميل المعرض'));
assert.ok(studio.includes('إعادة المحاولة'));
assert.ok(studio.includes('لم نفقد البرومبت أو إعداداتك الحالية'));
assert.ok(studio.includes("if (event.key === 'Escape')"));
assert.ok(studio.includes("aria-current={active ? 'page' : undefined}"));

// Product & Business: price clarity and preflight credit friction reduction.
assert.ok(studio.includes('const requiredCredits = selectedModel ? selectedModel.cost * count : 0'));
assert.ok(studio.includes('const insufficientCredits ='));
assert.ok(studio.includes('رصيدك غير كافٍ لهذه العملية'));
assert.ok(studio.includes('href="/pricing"'));
assert.ok(studio.includes('التكلفة المتوقعة'));
assert.ok(studio.includes('نقاط للصورة'));
assert.ok(studio.includes('disabled={generating || !activeProject || !selectedModel || !imageModelsAvailable || insufficientCredits}'));

// Errors shown to users should be normalized, while successful generation keeps the prompt reusable.
assert.ok(studio.includes('function friendlyImageError(value)'));
assert.ok(studio.includes('friendlyImageError(raw)'));
assert.ok(studio.includes('احتفظنا بالوصف لتعديله أو إعادة استخدامه'));
assert.ok(studio.includes('اقتراح جاهز'));
assert.ok(!studio.includes('إلهام عشوائي'));

// Gallery actions must be usable on touch devices, not hover-only.
assert.ok(studio.includes('translate-y-0 bg-gradient-to-t'));
assert.ok(studio.includes('sm:translate-y-full sm:group-hover:translate-y-0 sm:group-focus-within:translate-y-0'));
assert.ok(studio.includes('فتح الصورة بحجم كامل'));
assert.ok(studio.includes('نسخ رابط مؤقت للصورة'));
assert.ok(studio.includes('قد تنتهي صلاحيته لاحقًا'));

// Selection controls expose pressed/listbox state to assistive tech.
assert.ok(studio.includes('aria-pressed={pressed}'));
assert.ok(studio.includes('pressed={styleId === style.id}'));
assert.ok(studio.includes('pressed={aspectRatio === item.value}'));
assert.ok(studio.includes('pressed={resolution === item.value}'));
assert.ok(studio.includes('aria-pressed={useBrandKit}'));
assert.ok(studio.includes('aria-haspopup="listbox"'));

// Theme & Design System Expert: app chrome is semantic; only media previews may stay dark.
assert.ok(studio.includes('bb-app-canvas'));
assert.ok(studio.includes('bb-surface-2'));
assert.ok(studio.includes('bb-input'));
assert.ok(studio.includes('bb-menu'));
assert.ok(studio.includes('bb-button-primary'));
assert.ok(studio.includes('bb-button-secondary'));
assert.ok(studio.includes('bb-media-control'));
assert.ok(!studio.includes('bg-[#050506]'));
assert.ok(!studio.includes('bg-[#07080b]'));
assert.ok(!studio.includes('bg-[#0b0e14]'));
assert.ok(!studio.includes('bg-[#0d1016]'));
assert.ok(!studio.includes('bg-[#11141b]'));
assert.ok(!studio.includes('bg-[#151820]'));
assert.ok(!studio.includes('text-gray-'));
assert.ok(!studio.includes('border-white/10'));
assert.ok(!studio.includes('border-white/[.07]'));

console.log('Product/Monitoring/Theme AI Images interface pass guard passed.');
