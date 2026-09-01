import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const templatesPage = readFileSync(join(root, 'src/app/templates/page.jsx'), 'utf8');
const templatesComponent = readFileSync(join(root, 'src/components/TemplatesLivingLibrary.jsx'), 'utf8');
const imageWorkspace = readFileSync(join(root, 'src/components/ImageStudioWorkspace.jsx'), 'utf8');
const mediaWorkspace = readFileSync(join(root, 'src/components/MediaProjectWorkspace.jsx'), 'utf8');
const chatPage = readFileSync(join(root, 'src/app/projects/chat/workspace/page.jsx'), 'utf8');
const videoPage = readFileSync(join(root, 'src/app/projects/video/workspace/page.jsx'), 'utf8');
const audioPage = readFileSync(join(root, 'src/app/projects/audio/workspace/page.jsx'), 'utf8');

assert.ok(templatesPage.includes("import TemplatesLivingLibrary from '../../components/TemplatesLivingLibrary'"));
assert.ok(templatesPage.includes('<TemplatesLivingLibrary />'));

const templateIds = templatesComponent.match(/id: '[^']+'/g) || [];
assert.ok(templateIds.length >= 15, `expected at least 15 live-library templates, found ${templateIds.length}`);

for (const requiredId of [
  'product-hero',
  'greeting-card',
  'campaign-copy-pack',
  'service-reel',
  'article-voiceover',
  'cinematic-restyle',
  'cartoon-restyle',
]) {
  assert.ok(templatesComponent.includes(`id: '${requiredId}'`), `missing template ${requiredId}`);
}

assert.ok(templatesComponent.includes("active: { label: 'فعّال الآن'"));
assert.ok(templatesComponent.includes("draft: { label: 'جهّز الآن'"));
assert.ok(templatesComponent.includes("reference: { label: 'يتطلب صورة مرجعية'"));
assert.ok(templatesComponent.includes("template.status === 'reference'"), 'reference-image templates must not pretend to be active');

assert.ok(templatesComponent.includes("images: { label: 'الصور AI', projectType: 'صورة'"));
assert.ok(templatesComponent.includes("chat: { label: 'الشات AI', projectType: 'محادثة'"));
assert.ok(templatesComponent.includes("video: { label: 'الفيديو AI', projectType: 'فيديو'"));
assert.ok(templatesComponent.includes("audio: { label: 'الصوت AI', projectType: 'صوت'"));
assert.ok(templatesComponent.includes('type: tool.projectType'), 'template project type must follow the selected tool');
assert.ok(templatesComponent.includes("new URLSearchParams({ project: project.id, prompt: promptOverride || template.prompt })"));
assert.ok(templatesComponent.includes('const QUICK_FIELDS = {'));
assert.ok(templatesComponent.includes("token: '[اسم المنتج]'"));
assert.ok(templatesComponent.includes("token: '[الموضوع]'"));
assert.ok(templatesComponent.includes("token: '[الصق المقال أو النص هنا]'"));
assert.ok(templatesComponent.includes('function applyQuickValues'));
assert.ok(templatesComponent.includes('const preparedPrompt = applyQuickValues'));
assert.ok(templatesComponent.includes('handleUseTemplate(template, preparedPrompt)'));
assert.ok(templatesComponent.includes("'أكمل الحقول أولاً'"));
assert.ok(templatesComponent.includes('useEffect(() => {'));
assert.ok(templatesComponent.includes("event.key === 'Escape'"));
assert.ok(templatesComponent.includes('role="dialog"'));
assert.ok(templatesComponent.includes('aria-modal="true"'));
assert.ok(templatesComponent.includes('aria-labelledby="template-preview-title"'));
assert.ok(templatesComponent.includes('sticky bottom-0'));

assert.ok(templatesComponent.includes('const MOBILE_INITIAL_LIMIT = 6'));
assert.ok(templatesComponent.includes('function MobileTemplateCard'));
assert.ok(templatesComponent.includes('md:hidden'), 'mobile templates should use a compact dedicated list');
assert.ok(templatesComponent.includes('hidden gap-5 md:grid'), 'desktop templates should retain the full card grid');
assert.ok(templatesComponent.includes('function ToolPreviewArtwork'));
assert.ok(templatesComponent.includes("template.tool === 'video'"));
assert.ok(templatesComponent.includes("template.tool === 'audio'"));
assert.ok(templatesComponent.includes("template.tool === 'chat'"));

assert.ok(imageWorkspace.includes("searchParams.get('prompt')"));
assert.ok(imageWorkspace.includes("searchParams.get('style')"));
assert.ok(imageWorkspace.includes("searchParams.get('aspect')"));
assert.ok(imageWorkspace.includes('useState(promptFromUrl.slice(0, 1000))'));
assert.ok(imageWorkspace.includes('useState(initialStyleId)'));
assert.ok(imageWorkspace.includes('useState(initialAspectRatio)'));

assert.ok(mediaWorkspace.includes("initialPrompt = ''"));
assert.ok(mediaWorkspace.includes('templateSettings = {}'));
assert.ok(mediaWorkspace.includes('resolveTemplateSettings(config, templateSettings)'));
assert.ok(mediaWorkspace.includes('useState(initialPrompt)'));

for (const route of [chatPage, videoPage, audioPage]) {
  assert.ok(route.includes('const params = await searchParams;'), 'workspace route must resolve Next.js searchParams before template handoff');
  assert.ok(route.includes('ProjectWorkspaceGate'), 'template handoff must preserve the authenticated project workspace guard');
  assert.ok(route.includes("const projectId = params?.project || '';"), 'template handoff must preserve the canonical project id input');
}
assert.ok(videoPage.includes('initialPrompt={initialPrompt}'));
assert.ok(videoPage.includes('templateSettings={templateSettings}'));
assert.ok(audioPage.includes('initialPrompt={initialPrompt}'));
assert.ok(audioPage.includes('templateSettings={templateSettings}'));
assert.ok(chatPage.includes('initialPrompt={initialPrompt}'));

console.log('Templates living-library regression guard passed.');
