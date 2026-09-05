const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.brandbox-ai.com').replace(/\/+$/, '');

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/pricing',
  '/templates',
  '/marketing-plans',
  '/store',
  '/print',
];

export default function sitemap() {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
