-- ============================================
-- BlackDrivo — Internal Communications
-- Run in Supabase SQL Editor
-- ============================================

-- Messages table (group channels + private DMs)
create table if not exists messages (
  id           uuid primary key default uuid_generate_v4(),
  channel_id   text not null,       -- 'general' | 'ops' | 'dispatch' | 'finance' | 'dm_{uid1}_{uid2}'
  channel_type text not null,       -- 'group' | 'dm'
  sender_id    uuid references users(id) on delete set null,
  sender_name  text,
  sender_role  text,
  content      text,                -- text content
  image_url    text,                -- uploaded image
  is_deleted   boolean default false,
  reactions    jsonb default '{}',  -- { "👍": ["uid1","uid2"], "❤️": ["uid3"] }
  reply_to     uuid references messages(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Indexes
create index if not exists idx_messages_channel on messages(channel_id, created_at desc);
create index if not exists idx_messages_sender  on messages(sender_id);

-- RLS
alter table messages enable row level security;
create policy "messages_all" on messages for all using (auth.uid() is not null);

-- Realtime
alter publication supabase_realtime add table messages;

-- Storage bucket for message images
insert into storage.buckets (id, name, public)
values ('message-images', 'message-images', true)
on conflict (id) do nothing;

create policy "message_images_upload" on storage.objects
  for insert with check (bucket_id = 'message-images' and auth.uid() is not null);

create policy "message_images_read" on storage.objects
  for select using (bucket_id = 'message-images');
