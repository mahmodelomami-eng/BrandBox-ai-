import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

function verifyMetaSignature(raw: string, signature: string, appSecret: string) {
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(raw).digest('hex')}`;
  const receivedBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function getMessageBody(message: any) {
  switch (message?.type) {
    case 'text':
      return message?.text?.body ?? null;
    case 'button':
      return message?.button?.text ?? null;
    case 'interactive':
      return (
        message?.interactive?.button_reply?.title ??
        message?.interactive?.list_reply?.title ??
        null
      );
    case 'image':
    case 'video':
    case 'document':
      return message?.[message.type]?.caption ?? null;
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signature = request.headers.get('x-hub-signature-256');

  if (!appSecret) {
    console.error('[whatsapp-webhook] WHATSAPP_APP_SECRET is missing');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  if (!signature || !verifyMetaSignature(raw, signature, appSecret)) {
    console.warn('[whatsapp-webhook] Invalid or missing Meta signature');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.warn('[whatsapp-webhook] Invalid JSON payload');
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Meta also sends status updates and test payloads through this endpoint.
  // Acknowledge valid signed events even when they contain no inbound messages.
  const changes = payload?.entry?.flatMap((entry: any) => entry?.changes ?? []) ?? [];
  const messageChanges = changes.filter((change: any) => change?.field === 'messages');
  const inboundCount = messageChanges.reduce(
    (count: number, change: any) => count + (change?.value?.messages?.length ?? 0),
    0
  );

  console.info('[whatsapp-webhook] Signed event received', {
    object: payload?.object ?? null,
    changes: changes.length,
    inboundMessages: inboundCount,
  });

  if (inboundCount === 0) {
    return NextResponse.json({ received: true, messages: 0 });
  }

  try {
    const db = createPrivilegedSupabaseClient();
    let storedMessages = 0;

    for (const change of messageChanges) {
      const value = change?.value;
      const contacts = value?.contacts ?? [];

      for (const message of value?.messages ?? []) {
        const waId = message?.from;
        const metaMessageId = message?.id;
        if (!waId || !metaMessageId) continue;

        const customerName =
          contacts.find((contact: any) => contact?.wa_id === waId)?.profile?.name ?? null;
        const messageTimestamp = message?.timestamp
          ? new Date(Number(message.timestamp) * 1000).toISOString()
          : new Date().toISOString();

        const { data: conversation, error: conversationError } = await db
          .from('whatsapp_conversations')
          .upsert(
            {
              wa_id: waId,
              customer_name: customerName,
              last_message_at: messageTimestamp,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'wa_id' }
          )
          .select('id')
          .single();

        if (conversationError || !conversation) {
          console.error('[whatsapp-webhook] Conversation upsert failed', {
            code: conversationError?.code ?? null,
            message: conversationError?.message ?? 'No conversation returned',
          });
          throw conversationError ?? new Error('Conversation upsert failed');
        }

        const { error: messageError } = await db.from('whatsapp_messages').upsert(
          {
            conversation_id: conversation.id,
            meta_message_id: metaMessageId,
            direction: 'inbound',
            message_type: message?.type ?? 'unknown',
            body: getMessageBody(message),
            status: 'received',
          },
          { onConflict: 'meta_message_id', ignoreDuplicates: true }
        );

        if (messageError) {
          console.error('[whatsapp-webhook] Message upsert failed', {
            code: messageError.code ?? null,
            message: messageError.message ?? null,
          });
          throw messageError;
        }

        storedMessages += 1;
      }
    }

    console.info('[whatsapp-webhook] Inbound messages stored', { storedMessages });
    return NextResponse.json({ received: true, messages: storedMessages });
  } catch (error: any) {
    console.error('[whatsapp-webhook] Processing failed', {
      name: error?.name ?? 'Error',
      message: error?.message ?? 'Unknown webhook processing error',
    });
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
