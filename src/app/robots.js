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
    host: 'https://www.brandbox-ai.com',
  };
}
