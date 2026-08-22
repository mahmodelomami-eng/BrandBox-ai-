import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const { data: existingNotifications, error } = await database
    .from('user_notifications')
    .select('id,title,body,kind,is_read,action_url,created_at,read_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: 'NOTIFICATIONS_UNAVAILABLE' }, { status: 503 });

  let notifications = existingNotifications || [];
  if (!notifications.length) {
    const { data: created } = await database
      .from('user_notifications')
      .insert({
        user_id: user.id,
        title: 'مرحبًا بك في Brand Box AI',
        body: 'ستظهر هنا تنبيهات الرصيد، المشاريع، الاشتراكات والتحديثات المهمة.',
        kind: 'info',
      })
      .select('id,title,body,kind,is_read,action_url,created_at,read_at')
      .single();
    notifications = created ? [created] : [];
  }

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.is_read).length,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { id?: string; markAllRead?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();
  let query = database
    .from('user_notifications')
    .update({ is_read: true, read_at: now })
    .eq('user_id', user.id);

  if (!body.markAllRead) {
    if (!body.id) return NextResponse.json({ error: 'NOTIFICATION_ID_REQUIRED' }, { status: 400 });
    query = query.eq('id', body.id);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: 'NOTIFICATION_UPDATE_FAILED' }, { status: 503 });
  return NextResponse.json({ success: true });
}
