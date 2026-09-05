import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TARGET_BRANCH = 'launch/97-openrouter-runtime-probe';
const MODEL = 'bytedance/seedance-2.0-mini';
const markerPath = join(process.cwd(), '.rc-openrouter-video-smoke-state.json');
const isTargetPreview = process.env.VERCEL === '1'
  && process.env.VERCEL_ENV === 'preview'
  && process.env.VERCEL_GIT_COMMIT_REF === TARGET_BRANCH;

if (!isTargetPreview) process.exit(0);
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) process.exit(1);

const headers = { Authorization: `Bearer ${apiKey}` };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let job;
try {
  if (existsSync(markerPath)) {
    const state = JSON.parse(readFileSync(markerPath, 'utf8'));
    if (state?.status === 'success') {
      console.log('RC OpenRouter video smoke: already completed in this build workspace.');
      process.exit(0);
    }
    if (typeof state?.id !== 'string' || typeof state?.polling_url !== 'string') process.exit(1);
    job = { id: state.id, polling_url: state.polling_url, status: state.status || 'pending' };
  } else {
    const submit = await fetch('https://openrouter.ai/api/v1/videos', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://brandbox-ai.com',
        'X-OpenRouter-Title': 'BrandBox AI',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: 'A cinematic four-second product shot of a matte black cube on a neutral studio surface, soft moving light, slow camera push-in, no text.',
        duration: 4,
        resolution: '480p',
        aspect_ratio: '16:9',
        generate_audio: false,
      }),
    });
    if (submit.status !== 202 && !submit.ok) process.exit(1);
    job = await submit.json();
    if (typeof job?.id !== 'string' || typeof job?.polling_url !== 'string') process.exit(1);
    writeFileSync(markerPath, JSON.stringify({ id: job.id, polling_url: job.polling_url, status: job.status || 'pending' }), 'utf8');
  }

  const terminalErrors = new Set(['failed', 'cancelled', 'expired']);
  const deadline = Date.now() + 8 * 60 * 1000;
  while (job.status !== 'completed') {
    if (terminalErrors.has(job.status)) process.exit(1);
    if (!['pending', 'in_progress'].includes(job.status)) process.exit(1);
    if (Date.now() >= deadline) process.exit(1);
    await sleep(30_000);
    const pollingUrl = new URL(job.polling_url, 'https://openrouter.ai');
    const response = await fetch(pollingUrl, { headers });
    if (!response.ok) process.exit(1);
    job = await response.json();
    writeFileSync(markerPath, JSON.stringify({ id: job.id, polling_url: job.polling_url || pollingUrl.toString(), status: job.status }), 'utf8');
  }

  const unsignedUrls = Array.isArray(job.unsigned_urls) ? job.unsigned_urls : [];
  const contentUrl = unsignedUrls[0] || `https://openrouter.ai/api/v1/videos/${encodeURIComponent(job.id)}/content?index=0`;
  const content = await fetch(contentUrl, { headers: { ...headers, Range: 'bytes=0-1023' } });
  if (!content.ok) process.exit(1);
  const contentType = content.headers.get('content-type') || '';
  const bytes = new Uint8Array(await content.arrayBuffer());
  if (!contentType.toLowerCase().includes('video') || bytes.length === 0) process.exit(1);

  writeFileSync(markerPath, JSON.stringify({ id: job.id, polling_url: job.polling_url, status: 'success' }), 'utf8');
  console.log('RC OpenRouter video smoke: success.');
} catch {
  process.exit(1);
}
