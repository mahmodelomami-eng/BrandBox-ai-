import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migration = readFileSync(join(root, 'supabase/migrations/20260902203000_support_request_attachments.sql'), 'utf8');
const uploadApi = readFileSync(join(root, 'src/app/api/v1/support-requests/attachments/route.ts'), 'utf8');
const adminApi = readFileSync(join(root, 'src/app/api/v1/admin/support-requests/route.ts'), 'utf8');
const contact = readFileSync(join(root, 'src/app/contact/page.jsx'), 'utf8');
const adminPanel = readFileSync(join(root, 'src/components/AdminSupportRequests.jsx'), 'utf8');

// Database and storage must remain private and owner-linked.
assert.ok(migration.includes('create table if not exists public.support_request_attachments'));
assert.ok(migration.includes('request_id uuid not null references public.support_requests(id) on delete cascade'));
assert.ok(migration.includes('byte_size > 0 and byte_size <= 10485760'));
assert.ok(migration.includes("content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')"));
assert.ok(migration.includes('support_request_attachments_select_own'));
assert.ok(migration.includes('auth.uid() = user_id'));
assert.ok(migration.includes('enforce_support_request_attachment_owner'));
assert.ok(migration.includes("'support-attachments'"));
assert.ok(migration.includes('false,\n  10485760'), 'support attachment bucket must be private with 10MB limit');
assert.ok(!migration.includes('create policy') || !migration.includes("bucket_id = 'support-attachments'"), 'browser storage-object policies must not be opened for the private support bucket');

// Upload is server-mediated, authenticated, owner checked, type/size restricted and one attachment per request.
assert.ok(uploadApi.includes('createPrivilegedSupabaseClient'));
assert.ok(uploadApi.includes('createServerSupabaseClient().auth.getUser(token)'));
assert.ok(uploadApi.includes(".eq('user_id', actor.user.id)"));
assert.ok(uploadApi.includes('MAX_FILE_BYTES = 10 * 1024 * 1024'));
assert.ok(uploadApi.includes('FILE_TYPE_NOT_ALLOWED'));
assert.ok(uploadApi.includes('ATTACHMENT_LIMIT_REACHED'));
assert.ok(uploadApi.includes(".from('support_request_attachments')"));
assert.ok(uploadApi.includes(".from(BUCKET)\n    .upload"));
assert.ok(uploadApi.includes(".remove([storagePath])"), 'failed metadata writes must clean up uploaded objects');

// Contact form must create the request first, then attach to that exact request and support retry without duplicating the ticket.
assert.ok(contact.includes(".insert({\n        user_id: userId"));
assert.ok(contact.includes(".select('id')"));
assert.ok(contact.includes("fetch('/api/v1/support-requests/attachments'"));
assert.ok(contact.includes("body.append('requestId', requestId)"));
assert.ok(contact.includes('attachmentRetryRequestId'));
assert.ok(contact.includes('إعادة رفع المرفق'));
assert.ok(contact.includes('JPG / PNG / WEBP / PDF — حتى 10MB'));

// Admins receive only short-lived signed links after existing admin authorization.
assert.ok(adminApi.includes(".from('support_request_attachments')"));
assert.ok(adminApi.includes(".from('support-attachments')"));
assert.ok(adminApi.includes('.createSignedUrl(attachment.storage_path, 10 * 60)'));
assert.ok(adminApi.includes("['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(role)"));
assert.ok(adminPanel.includes('المرفقات الخاصة'));
assert.ok(adminPanel.includes('فتح المرفق'));
assert.ok(adminPanel.includes('target="_blank"'));

console.log('Support request attachment security and UI tests passed.');
