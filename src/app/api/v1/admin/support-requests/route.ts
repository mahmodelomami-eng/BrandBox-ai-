import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'USER';
type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const database = createPrivilegedSupabaseClient();
  const { data: profile, error: profileError } = await database
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status === 'suspended') return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(role)) return null;
  return { userId: data.user.id, email: profile.email || data.user.email || '', role };
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const requestedStatus = request.nextUrl.searchParams.get('status');
  let query = database
    .from('support_requests')
    .select('id,user_id,category,subject,message,status,admin_note,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (requestedStatus && ['open', 'in_progress', 'resolved', 'closed'].includes(requestedStatus)) {
    query = query.eq('status', requestedStatus);
  }

  const { data: requests, error } = await query;
  if (error) return NextResponse.json({ error: 'SUPPORT_REQUESTS_UNAVAILABLE' }, { status: 503 });

  const userIds = [...new Set((requests || []).map((item) => item.user_id).filter(Boolean))];
  const profileById = new Map<string, Record<string, unknown>>();
  if (userIds.length) {
    const { data: profiles } = await database
      .from('profiles')
      .select('id,email,first_name,last_name,phone')
      .in('id', userIds);
    for (const profile of profiles || []) profileById.set(profile.id, profile as Record<string, unknown>);
  }

  const rows = (requests || []).map((item) => {
    const profile = profileById.get(item.user_id) || {};
    return {
      ...item,
      customer: {
        email: profile.email || null,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || null,
      },
    };
  });

  return NextResponse.json({ requests: rows, actorRole: actor.role, total: rows.length });
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { requestId?: string; status?: SupportStatus; adminNote?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.requestId) return NextResponse.json({ error: 'REQUEST_ID_REQUIRED' }, { status: 400 });
  if (body.status && !['open', 'in_progress', 'resolved', 'closed'].includes(body.status)) {
    return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
  }
  if (body.adminNote !== undefined && body.adminNote !== null && body.adminNote.length > 2000) {
    return NextResponse.json({ error: 'ADMIN_NOTE_TOO_LONG' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) patch.status = body.status;
  if (body.adminNote !== undefined) patch.admin_note = body.adminNote?.trim() || null;

  const database = createPrivilegedSupabaseClient();
  const { data: updated, error } = await database
    .from('support_requests')
    .update(patch)
    .eq('id', body.requestId)
    .select('id,user_id,category,subject,message,status,admin_note,created_at,updated_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'SUPPORT_REQUEST_UPDATE_FAILED' }, { status: 500 });
  if (!updated) return NextResponse.json({ error: 'SUPPORT_REQUEST_NOT_FOUND' }, { status: 404 });

  await database.from('audit_logs').insert({
    actor_id: actor.userId,
    actor_role: actor.role,
    action: 'ADMIN_UPDATED_SUPPORT_REQUEST',
    resource: 'support_requests',
    resource_id: body.requestId,
    metadata: { status: body.status || null, note_changed: body.adminNote !== undefined },
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, request: updated });
}
