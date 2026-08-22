import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

function normalizePhone(value: unknown) {
  return String(value || '').trim().replace(/[\s()-]/g, '');
}

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { phone?: string; whatsappPhone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const phone = normalizePhone(body.phone);
  const whatsappPhone = normalizePhone(body.whatsappPhone);

  if (!/^\+?\d{8,15}$/.test(phone)) {
    return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
  }
  if (whatsappPhone && !/^\+?\d{8,15}$/.test(whatsappPhone)) {
    return NextResponse.json({ error: 'INVALID_WHATSAPP_PHONE' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await database
    .from('profiles')
    .update({
      phone,
      whatsapp_phone: whatsappPhone || null,
      onboarding_completed_at: now,
      updated_at: now,
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'PROFILE_ONBOARDING_UPDATE_FAILED' }, { status: 503 });
  }

  await database.from('user_notifications').insert({
    user_id: user.id,
    title: 'تم استكمال بيانات حسابك',
    body: whatsappPhone
      ? 'تم حفظ رقم الهاتف ورقم واتساب لاستقبال الإشعارات.'
      : 'تم حفظ رقم الهاتف. يمكنك إضافة رقم واتساب لاحقًا من الإعدادات.',
    kind: 'account',
  });

  return NextResponse.json({ success: true, phone, whatsappPhone: whatsappPhone || null });
}
