import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

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
