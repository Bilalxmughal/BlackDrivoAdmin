-- ============================================
-- BlackDrivo Admin — Row Level Security (RLS)
-- Run this AFTER schema.sql
-- ============================================

-- Enable RLS on all tables
alter table users           enable row level security;
alter table passengers      enable row level security;
alter table vehicles        enable row level security;
alter table drivers         enable row level security;
alter table bookings        enable row level security;
alter table activity_logs   enable row level security;
alter table notifications   enable row level security;
alter table comments        enable row level security;
alter table roles_config    enable row level security;

-- ── Helper: Get current user role ─────────────────────────
create or replace function get_my_role()
returns text as $$
  select role::text from users where id = auth.uid()
$$ language sql security definer stable;

-- ── USERS ─────────────────────────────────────────────────
create policy "users_read"   on users for select
  using (auth.uid() = id or get_my_role() in ('super_admin','admin'));

create policy "users_insert" on users for insert
  with check (get_my_role() = 'super_admin');

create policy "users_update" on users for update
  using (auth.uid() = id or get_my_role() in ('super_admin','admin'));

create policy "users_delete" on users for delete
  using (get_my_role() = 'super_admin');

-- ── PASSENGERS ────────────────────────────────────────────
create policy "passengers_read" on passengers for select
  using (get_my_role() in ('super_admin','admin','ops','dispatcher','finance'));

create policy "passengers_insert" on passengers for insert
  with check (get_my_role() in ('super_admin','admin','ops'));

create policy "passengers_update" on passengers for update
  using (get_my_role() in ('super_admin','admin','ops'));

create policy "passengers_delete" on passengers for delete
  using (get_my_role() in ('super_admin','admin'));

-- ── VEHICLES ──────────────────────────────────────────────
create policy "vehicles_read" on vehicles for select
  using (get_my_role() in ('super_admin','admin','ops','dispatcher','finance'));

create policy "vehicles_insert" on vehicles for insert
  with check (get_my_role() in ('super_admin','admin','ops'));

create policy "vehicles_update" on vehicles for update
  using (get_my_role() in ('super_admin','admin','ops'));

create policy "vehicles_delete" on vehicles for delete
  using (get_my_role() in ('super_admin','admin'));

-- ── DRIVERS ───────────────────────────────────────────────
create policy "drivers_read" on drivers for select
  using (get_my_role() in ('super_admin','admin','ops','dispatcher','finance'));

create policy "drivers_insert" on drivers for insert
  with check (get_my_role() in ('super_admin','admin','ops'));

create policy "drivers_update" on drivers for update
  using (get_my_role() in ('super_admin','admin','ops'));

create policy "drivers_delete" on drivers for delete
  using (get_my_role() in ('super_admin','admin'));

-- ── BOOKINGS ──────────────────────────────────────────────
create policy "bookings_read" on bookings for select
  using (get_my_role() in ('super_admin','admin','ops','dispatcher','finance'));

create policy "bookings_insert" on bookings for insert
  with check (get_my_role() in ('super_admin','admin','ops','dispatcher'));

create policy "bookings_update" on bookings for update
  using (get_my_role() in ('super_admin','admin','ops','dispatcher'));

create policy "bookings_delete" on bookings for delete
  using (get_my_role() in ('super_admin','admin'));

-- ── ACTIVITY LOGS ─────────────────────────────────────────
create policy "logs_read" on activity_logs for select
  using (get_my_role() in ('super_admin','admin','finance'));

create policy "logs_insert" on activity_logs for insert
  with check (auth.uid() is not null);

-- Logs kabhi update/delete nahi honge (immutable audit trail)

-- ── NOTIFICATIONS ─────────────────────────────────────────
create policy "notif_read" on notifications for select
  using (get_my_role() in ('super_admin','admin','ops'));

create policy "notif_write" on notifications for all
  using (get_my_role() in ('super_admin','admin'));

-- ── COMMENTS ──────────────────────────────────────────────
create policy "comments_read" on comments for select
  using (get_my_role() in ('super_admin','admin','ops','dispatcher','finance'));

create policy "comments_insert" on comments for insert
  with check (auth.uid() is not null);

create policy "comments_update" on comments for update
  using (author_id = auth.uid() or get_my_role() in ('super_admin','admin'));

create policy "comments_delete" on comments for delete
  using (get_my_role() in ('super_admin','admin'));

-- ── ROLES CONFIG ──────────────────────────────────────────
create policy "roles_read" on roles_config for select
  using (auth.uid() is not null);

create policy "roles_write" on roles_config for all
  using (get_my_role() = 'super_admin');
