-- ============================================
-- BlackDrivo — Temp Password User System
-- Run in Supabase SQL Editor
-- ============================================

-- 1. invitation_status column
alter table users add column if not exists invitation_status text default 'active';
update users set invitation_status = 'active' where invitation_status is null;

-- 2. When admin creates user via signUp, auto-insert basic record
--    (full record will be upserted from app code right after)
create or replace function handle_new_auth_user()
returns trigger as $$
begin
  -- Insert a placeholder — app code will upsert with full details immediately after
  insert into users (id, name, email, status, invitation_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'active',
    'password_change_required'
  )
  on conflict (id) do nothing;  -- app code will upsert with full data

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- 3. Verify
select name, email, status, invitation_status from users;
