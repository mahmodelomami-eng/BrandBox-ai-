import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signature = request.headers.get('x-hub-signature-256');
  if (!appSecret || !signature) return new NextResponse('Unauthorized', { status: 401 });

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(raw).digest('hex')}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = JSON.parse(raw);
  const db = createPrivilegedSupabaseClient();
  const changes = payload?.entry?.flatMap((e: any) => e.changes ?? []) ?? [];

  for (const change of changes) {
    const value = change?.value;
    const contacts = value?.contacts ?? [];
    for (const message of value?.messages ?? []) {
      const waId = message.from;
      if (!waId) continue;
      const customerName = contacts.find((c: any) => c.wa_id === waId)?.profile?.name ?? null;
      const { data: conversation, error: conversationError } = await db
        .from('whatsapp_conversations')
        .upsert({ wa_id: waId, customer_name: customerName, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'wa_id' })
        .select('id')
        .single();
      if (conversationError || !conversation) throw conversationError ?? new Error('Conversation upsert failed');

      const body = message?.text?.body ?? message?.button?.text ?? null;
      await db.from('whatsapp_messages').upsert({
        conversation_id: conversation.id,
        meta_message_id: message.id,
        direction: 'inbound',
        message_type: message.type ?? 'unknown',
        body,
        status: 'received',
      }, { onConflict: 'meta_message_id', ignoreDuplicates: true });
    }
  }

  return NextResponse.json({ received: true });
}
