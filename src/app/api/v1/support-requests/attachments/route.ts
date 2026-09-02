import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const BUCKET = 'support-attachments';
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
]);

function safeDisplayName(value: string) {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (cleaned || 'attachment').slice(0, 255);
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { token, user: data.user };
}

export async function POST(request: NextRequest) {
  const actor = await authenticatedUser(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'INVALID_MULTIPART_BODY' }, { status: 400 });
  }

  const requestIdValue = formData.get('requestId');
  const fileValue = formData.get('file');
  const requestId = typeof requestIdValue === 'string' ? requestIdValue.trim() : '';

  if (!validUuid(requestId)) {
    return NextResponse.json({ error: 'INVALID_REQUEST_ID' }, { status: 400 });
  }
  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
  }
  if (fileValue.size <= 0 || fileValue.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'FILE_SIZE_INVALID', maxBytes: MAX_FILE_BYTES }, { status: 413 });
  }

  const extension = ALLOWED_TYPES.get(fileValue.type);
  if (!extension) {
    return NextResponse.json({ error: 'FILE_TYPE_NOT_ALLOWED' }, { status: 415 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data: supportRequest, error: requestError } = await database
    .from('support_requests')
    .select('id,user_id')
    .eq('id', requestId)
    .eq('user_id', actor.user.id)
    .maybeSingle();

  if (requestError) return NextResponse.json({ error: 'SUPPORT_REQUEST_LOOKUP_FAILED' }, { status: 503 });
  if (!supportRequest) return NextResponse.json({ error: 'SUPPORT_REQUEST_NOT_FOUND' }, { status: 404 });

  const { count: existingCount, error: countError } = await database
    .from('support_request_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId);

  if (countError) return NextResponse.json({ error: 'ATTACHMENT_LOOKUP_FAILED' }, { status: 503 });
  if ((existingCount || 0) >= 1) return NextResponse.json({ error: 'ATTACHMENT_LIMIT_REACHED' }, { status: 409 });

  const storagePath = `${actor.user.id}/${requestId}/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await fileValue.arrayBuffer());
  const { error: uploadError } = await database.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: fileValue.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ error: 'ATTACHMENT_UPLOAD_FAILED' }, { status: 503 });

  const fileName = safeDisplayName(fileValue.name);
  const { data: attachment, error: metadataError } = await database
    .from('support_request_attachments')
    .insert({
      request_id: requestId,
      user_id: actor.user.id,
      storage_path: storagePath,
      file_name: fileName,
      content_type: fileValue.type,
      byte_size: fileValue.size,
    })
    .select('id,request_id,file_name,content_type,byte_size,created_at')
    .single();

  if (metadataError) {
    await database.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: 'ATTACHMENT_METADATA_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ attachment }, { status: 201 });
}
