const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.brandbox-ai.com').replace(/\/+$/, '');

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/auth',
          '/dashboard',
          '/projects',
          '/brand-kit',
          '/support',
          '/billing',
          '/settings',
        ],
      },
    ],
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
