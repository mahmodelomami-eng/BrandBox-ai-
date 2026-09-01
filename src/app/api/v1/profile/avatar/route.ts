import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';

export async function POST(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { user } = auth;

  let body: { avatarUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const avatarUrl = body.avatarUrl?.trim();
  if (!avatarUrl || avatarUrl.length > 2048) {
    return NextResponse.json({ error: 'INVALID_AVATAR_URL' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(avatarUrl);
  } catch {
    return NextResponse.json({ error: 'INVALID_AVATAR_URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !parsed.pathname.includes('/storage/v1/object/public/profile-avatars/')) {
    return NextResponse.json({ error: 'AVATAR_SOURCE_NOT_ALLOWED' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const { error } = await database
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: 'AVATAR_UPDATE_FAILED' }, { status: 503 });
  return NextResponse.json({ success: true, avatarUrl });
}
