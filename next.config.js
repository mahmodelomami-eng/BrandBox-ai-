/** @type {import('next').NextConfig} */
const { execFileSync } = require('node:child_process');

if (
  process.env.VERCEL === '1' &&
  process.env.VERCEL_ENV === 'preview' &&
  process.env.VERCEL_GIT_COMMIT_REF === 'launch/97-image-runtime-smoke'
) {
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/rc-image-runtime-smoke.ts'], {
    stdio: 'inherit',
  });
}

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
