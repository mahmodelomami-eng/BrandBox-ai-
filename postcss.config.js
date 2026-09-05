const { execFileSync } = require('node:child_process');

if (
  process.env.VERCEL === '1' &&
  process.env.VERCEL_ENV === 'preview' &&
  process.env.VERCEL_GIT_COMMIT_REF === 'launch/97-openrouter-runtime-probe'
) {
  execFileSync(process.execPath, ['scripts/rc-openrouter-video-smoke.mjs'], { stdio: 'inherit' });
}

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
