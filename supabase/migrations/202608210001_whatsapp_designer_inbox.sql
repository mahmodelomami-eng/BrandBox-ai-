-- Brand Box AI: WhatsApp company inbox + designer assignment
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  customer_name text,
  assigned_designer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open','pending','closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  meta_message_id text unique,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text',
  body text,
  sender_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'received',
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_conversations_assignee_idx on public.whatsapp_conversations(assigned_designer_id, last_message_at desc);
create index if not exists whatsapp_messages_conversation_idx on public.whatsapp_messages(conversation_id, created_at);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

-- Webhook/API writes use the server-only service role. Authenticated staff only read assigned conversations.
create policy whatsapp_conversations_assigned_read on public.whatsapp_conversations
for select to authenticated
using (assigned_designer_id = auth.uid());

create policy whatsapp_messages_assigned_read on public.whatsapp_messages
for select to authenticated
using (exists (
  select 1 from public.whatsapp_conversations c
  where c.id = conversation_id and c.assigned_designer_id = auth.uid()
));

revoke all on public.whatsapp_conversations from anon;
revoke all on public.whatsapp_messages from anon;
grant select on public.whatsapp_conversations to authenticated;
grant select on public.whatsapp_messages to authenticated;
