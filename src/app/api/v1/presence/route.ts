import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';

export async function POST(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { user } = auth;

  const now = new Date().toISOString();
  const { error } = await createPrivilegedSupabaseClient()
    .from('profiles')
    .update({ last_seen_at: now, updated_at: now })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: 'PRESENCE_UPDATE_FAILED' }, { status: 503 });
  return NextResponse.json({ success: true, lastSeenAt: now });
}
