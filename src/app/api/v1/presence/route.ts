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

  const now = new Date().toISOString();
  const { error } = await createPrivilegedSupabaseClient()
    .from('profiles')
    .update({ last_seen_at: now, updated_at: now })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: 'PRESENCE_UPDATE_FAILED' }, { status: 503 });
  return NextResponse.json({ success: true, lastSeenAt: now });
}
