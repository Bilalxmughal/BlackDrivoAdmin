-- ============================================
-- BlackDrivo — User Invite System Fix
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Create a pending_invites table to store invite data
--    before the user accepts and creates their auth account
create table if not exists pending_invites (
  id              uuid primary key default uuid_generate_v4(),
  email           text not null unique,
  name            text not null,
  phone           text,
  department      text,
  role            text not null default 'ops',
  country_access  text not null default 'US',
  invited_by      uuid references users(id),
  created_at      timestamptz default now()
);

-- 2. Disable RLS on pending_invites (app controls access)
alter table pending_invites enable row level security;
create policy "invites_all" on pending_invites for all using (auth.uid() is not null);

-- 3. When auth user is created (after accepting invite),
--    auto-create their users record from pending_invites
create or replace function handle_new_auth_user()
returns trigger as $$
declare
  invite_record pending_invites%rowtype;
begin
  -- Look for a pending invite for this email
  select * into invite_record
  from pending_invites
  where lower(email) = lower(new.email)
  limit 1;

  if invite_record.id is not null then
    -- Create users record from invite data
    insert into users (
      id, name, email, phone, department,
      role, country_access, status, invitation_status, created_at
    ) values (
      new.id,
      invite_record.name,
      new.email,
      invite_record.phone,
      invite_record.department,
      invite_record.role::user_role,
      invite_record.country_access,
      'active',
      'active',
      now()
    )
    on conflict (id) do update set
      invitation_status = 'active',
      status = 'active';

    -- Clean up invite
    delete from pending_invites where id = invite_record.id;
  else
    -- No invite found — create basic record
    insert into users (id, name, email, status, invitation_status)
    values (new.id, split_part(new.email, '@', 1), new.email, 'active', 'active')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- 4. Add invitation_status column if not exists
alter table users add column if not exists invitation_status text default 'active';

-- Update existing users
update users set invitation_status = 'active'
where invitation_status is null or invitation_status = '';
