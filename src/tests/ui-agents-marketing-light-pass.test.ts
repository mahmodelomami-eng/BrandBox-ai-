import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const home = readFileSync(join(root, 'src/components/HomeExperience.jsx'), 'utf8');
const about = readFileSync(join(root, 'src/app/about/page.jsx'), 'utf8');
const contact = readFileSync(join(root, 'src/app/contact/page.jsx'), 'utf8');
const dashboardPreview = readFileSync(join(root, 'src/components/MarketingDashboardPreview.jsx'), 'utf8');
const rootLayout = readFileSync(join(root, 'src/app/layout.jsx'), 'utf8');
const robots = readFileSync(join(root, 'src/app/robots.js'), 'utf8');
const sitemap = readFileSync(join(root, 'src/app/sitemap.js'), 'utf8');

for (const [name, source] of [
  ['Home', home],
  ['About', about],
  ['Contact', contact],
  ['Marketing dashboard preview', dashboardPreview],
] as const) {
  assert.ok(source.includes('bb-'), `${name} must use semantic Brand Box theme primitives`);
  assert.ok(!source.includes('bg-[#050506]'), `${name} must not restore the legacy black canvas`);
  assert.ok(!source.includes('bg-[#0d1016]'), `${name} must not restore legacy dark panels`);
  assert.ok(!source.includes('text-gray-'), `${name} must not rely on legacy gray typography`);
}

// Approved landing composition: light dashboard + three real protected AI tool entries.
assert.ok(home.includes("import MarketingDashboardPreview from './MarketingDashboardPreview'"));
assert.ok(home.includes('إبداعك بلا حدود.'));
assert.ok(home.includes('تجربتك متكاملة.'));
assert.ok(home.includes("openProtected('/projects/images')"));
assert.ok(home.includes("href: '/projects/chat'"));
assert.ok(home.includes("href: '/projects/video'"));
assert.ok(home.includes("href: '/projects/images'"));
assert.ok(home.includes(".from('home_banners')"), 'landing must preserve managed homepage banners');
assert.ok(home.includes(".from('home_tickers')"), 'landing must preserve managed announcement tickers');

// About page must implement the approved full information architecture, not only recolor the old hero.
assert.ok(about.includes('من نحن'));
assert.ok(about.includes('الذكاء الاصطناعي داخل المشاريع'));
assert.ok(about.includes('التصميم والهوية'));
assert.ok(about.includes('من الفكرة إلى التنفيذ'));
assert.ok(about.includes('أمان وخصوصية بياناتك'));
assert.ok(about.includes('ثلاث خطوات من الفكرة إلى مشروع ناجح'));
assert.ok(about.includes('بكل فكرة، نصنع فرقًا.'));
assert.ok(about.includes('<MarketingDashboardPreview compact />'));

// Contact remains a real account-linked support workflow while using the approved light composition.
assert.ok(contact.includes('الدعم والتواصل'));
assert.ok(contact.includes('مرتبط بحسابك'));
assert.ok(contact.includes('حالة واضحة'));
assert.ok(contact.includes(".from('support_requests')"));
assert.ok(contact.includes('.limit(20)'));
assert.ok(contact.includes('user_id: userId'));
assert.ok(contact.includes('إرسال الطلب'));
assert.ok(contact.includes("href=\"/auth?next=%2Fcontact\""));

// Launch SEO policy: public metadata has an explicit canonical host base and crawlers are kept out of private surfaces.
assert.ok(rootLayout.includes("const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.brandbox-ai.com'"));
assert.ok(rootLayout.includes('metadataBase: new URL(siteUrl)'));
assert.ok(rootLayout.includes("locale: 'ar_LY'"));
assert.ok(robots.includes("host: siteUrl"));
assert.ok(robots.includes("sitemap: `${siteUrl}/sitemap.xml`"), 'robots must advertise the canonical sitemap');
for (const privatePath of ['/admin', '/api', '/auth', '/dashboard', '/projects', '/brand-kit', '/support']) {
  assert.ok(robots.includes(`'${privatePath}'`), `robots policy must disallow ${privatePath}`);
}

// Sitemap must enumerate only intentional public launch surfaces and never private/authenticated areas.
for (const publicPath of ['/', '/about', '/contact', '/pricing', '/templates', '/marketing-plans', '/store', '/print']) {
  assert.ok(sitemap.includes(`'${publicPath}'`), `sitemap must include public route ${publicPath}`);
}
for (const privatePath of ['/admin', '/api', '/auth', '/dashboard', '/projects', '/brand-kit', '/support', '/billing', '/settings']) {
  assert.ok(!sitemap.includes(`'${privatePath}'`), `sitemap must not include private route ${privatePath}`);
}
assert.ok(sitemap.includes("process.env.NEXT_PUBLIC_SITE_URL || 'https://www.brandbox-ai.com'"));

console.log('Approved marketing light-theme and launch metadata guard passed.');
