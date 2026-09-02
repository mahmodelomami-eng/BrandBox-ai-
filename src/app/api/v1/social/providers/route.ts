import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';

type ProviderDefinition = {
  id: string;
  name: string;
  required: string[];
  enableFlag: string;
  capabilities: string[];
};

const providers: ProviderDefinition[] = [
  { id: 'meta', name: 'Facebook & Instagram', required: ['META_APP_ID', 'META_APP_SECRET', 'META_OAUTH_REDIRECT_URI'], enableFlag: 'BRANDBOX_META_PUBLISHING_ENABLED', capabilities: ['connect', 'pages', 'publish', 'insights'] },
  { id: 'tiktok', name: 'TikTok', required: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_OAUTH_REDIRECT_URI'], enableFlag: 'BRANDBOX_TIKTOK_PUBLISHING_ENABLED', capabilities: ['connect', 'upload', 'publish'] },
  { id: 'youtube', name: 'YouTube', required: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REDIRECT_URI'], enableFlag: 'BRANDBOX_YOUTUBE_PUBLISHING_ENABLED', capabilities: ['connect', 'upload', 'publish', 'analytics'] },
  { id: 'linkedin', name: 'LinkedIn', required: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_OAUTH_REDIRECT_URI'], enableFlag: 'BRANDBOX_LINKEDIN_PUBLISHING_ENABLED', capabilities: ['connect', 'publish'] },
];

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  return NextResponse.json({
    providers: providers.map((provider) => {
      const oauthConfigured = provider.required.every((key) => Boolean(process.env[key]?.trim()));
      const publishingEnabled = oauthConfigured && process.env[provider.enableFlag] === 'true';
      return {
        id: provider.id,
        name: provider.name,
        oauthConfigured,
        publishingEnabled,
        capabilities: provider.capabilities,
      };
    }),
  });
}
