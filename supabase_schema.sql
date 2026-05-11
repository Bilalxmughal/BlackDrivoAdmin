-- ============================================
-- BlackDrivo Admin — Supabase SQL Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── ROLES ENUM ────────────────────────────────────────────
create type user_role as enum (
  'super_admin', 'admin', 'ops', 'dispatcher', 'finance'
);

create type status_type as enum (
  'active', 'inactive', 'pending', 'suspended'
);

create type booking_status as enum (
  'pending', 'dispatched', 'active', 'completed', 'cancelled'
);

create type vehicle_category as enum (
  'sedan', 'suv', 'van', 'luxury'
);

create type city_type as enum (
  'lahore', 'karachi', 'islamabad', 'atlanta', 'other'
);

-- ── USERS (Admin Panel Users) ──────────────────────────────
create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  phone         text,
  role          user_role not null default 'ops',
  department    text,
  avatar_url    text,
  status        status_type not null default 'active',
  city          city_type,
  last_login_at timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  created_by    uuid references users(id)
);

-- ── PASSENGERS (App Users / Clients) ──────────────────────
create table passengers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text unique,
  phone         text,
  country       text default 'US',
  city          text,
  avatar_url    text,
  status        status_type default 'active',
  source        text default 'self_registered', -- 'self_registered' | 'admin_created'
  ride_count    int default 0,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  created_by    uuid references users(id)
);

-- ── VEHICLES (Cars) ───────────────────────────────────────
create table vehicles (
  id              uuid primary key default uuid_generate_v4(),
  company_name    text not null,
  category        vehicle_category not null,
  model_year      int,
  color           text,
  plate_number    text not null unique,
  seat_capacity   int default 4,
  status          status_type default 'active',
  city            city_type,
  -- Documents
  registration_doc_url  text,
  insurance_doc_url     text,
  inspection_doc_url    text,
  -- Meta
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  created_by      uuid references users(id)
);

-- ── DRIVERS ───────────────────────────────────────────────
create table drivers (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  email             text unique,
  phone             text not null,
  city              city_type,
  avatar_url        text,
  status            status_type default 'active',
  source            text default 'admin_created', -- 'app_registered' | 'admin_created'
  vehicle_id        uuid references vehicles(id) on delete set null,
  license_number    text,
  license_expiry    date,
  -- Documents
  license_doc_url       text,
  background_check_url  text,
  insurance_doc_url     text,
  profile_doc_url       text,
  -- Stats
  total_trips       int default 0,
  rating            numeric(3,2) default 5.00,
  -- Meta
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  created_by        uuid references users(id)
);

-- ── BOOKINGS / ORDERS ─────────────────────────────────────
create table bookings (
  id              uuid primary key default uuid_generate_v4(),
  booking_ref     text unique default ('BD-' || upper(substr(uuid_generate_v4()::text, 1, 8))),
  passenger_id    uuid references passengers(id) on delete set null,
  driver_id       uuid references drivers(id) on delete set null,
  vehicle_id      uuid references vehicles(id) on delete set null,
  -- Trip details
  pickup_address      text not null,
  dropoff_address     text not null,
  pickup_lat          numeric(10,7),
  pickup_lng          numeric(10,7),
  dropoff_lat         numeric(10,7),
  dropoff_lng         numeric(10,7),
  pickup_time         timestamptz,
  dropoff_time        timestamptz,
  -- Status & Payment
  status          booking_status default 'pending',
  city            city_type,
  fare            numeric(10,2),
  driver_amount   numeric(10,2),
  gross_amount    numeric(10,2),
  payment_method  text default 'cash',
  -- Source
  source          text default 'app', -- 'app' | 'web' | 'admin'
  notes           text,
  -- Meta
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  dispatched_by   uuid references users(id),
  created_by      uuid references users(id)
);

-- ── ACTIVITY LOGS ─────────────────────────────────────────
create table activity_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete set null,
  user_name   text,
  action      text not null,       -- 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', etc.
  entity      text,                -- 'booking', 'driver', 'passenger', etc.
  entity_id   uuid,
  description text,
  meta        jsonb default '{}',
  ip_address  text,
  created_at  timestamptz default now()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────
create table notifications (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  message       text not null,
  target_type   text not null,  -- 'all_passengers' | 'all_drivers' | 'category' | 'city'
  target_filter jsonb default '{}', -- { category: 'suv', city: 'lahore' }
  sent_count    int default 0,
  open_count    int default 0,
  click_count   int default 0,
  status        text default 'sent',
  sent_by       uuid references users(id),
  created_at    timestamptz default now()
);

-- ── COMMENTS (Internal) ───────────────────────────────────
create table comments (
  id          uuid primary key default uuid_generate_v4(),
  entity      text not null,     -- 'booking', 'driver', 'passenger'
  entity_id   uuid not null,
  author_id   uuid references users(id) on delete set null,
  author_name text,
  content     text not null,
  mentions    text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── ROLES CONFIG ──────────────────────────────────────────
create table roles_config (
  id          uuid primary key default uuid_generate_v4(),
  role        user_role not null unique,
  permissions jsonb not null default '{}',
  -- Example permissions:
  -- { "dashboard": {"view": true},
  --   "bookings":  {"view": true, "edit": true, "delete": false},
  --   "drivers":   {"view": true, "edit": true, "add": true, "delete": false} }
  updated_at  timestamptz default now(),
  updated_by  uuid references users(id)
);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger trg_passengers_updated_at
  before update on passengers
  for each row execute function update_updated_at();

create trigger trg_vehicles_updated_at
  before update on vehicles
  for each row execute function update_updated_at();

create trigger trg_drivers_updated_at
  before update on drivers
  for each row execute function update_updated_at();

create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();

-- ── DRIVER TRIP COUNT TRIGGER ─────────────────────────────
create or replace function increment_driver_trips()
returns trigger as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    update drivers set total_trips = total_trips + 1
    where id = new.driver_id;

    update passengers set ride_count = ride_count + 1
    where id = new.passenger_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_booking_completed
  after update on bookings
  for each row execute function increment_driver_trips();

-- ── DEFAULT ROLES CONFIG INSERT ───────────────────────────
insert into roles_config (role, permissions) values
('super_admin', '{
  "dashboard":        {"view": true, "edit": true},
  "bookings":         {"view": true, "edit": true, "add": true, "delete": true},
  "dispatch":         {"view": true, "edit": true},
  "passengers":       {"view": true, "edit": true, "add": true, "delete": true},
  "drivers":          {"view": true, "edit": true, "add": true, "delete": true},
  "vehicles":         {"view": true, "edit": true, "add": true, "delete": true},
  "app_settings":     {"view": true, "edit": true},
  "admin_settings":   {"view": true, "edit": true},
  "user_management":  {"view": true, "edit": true, "add": true, "delete": true},
  "activity_log":     {"view": true},
  "profile":          {"view": true, "edit": true}
}'),
('admin', '{
  "dashboard":        {"view": true, "edit": true},
  "bookings":         {"view": true, "edit": true, "add": true, "delete": false},
  "dispatch":         {"view": true, "edit": true},
  "passengers":       {"view": true, "edit": true, "add": true, "delete": false},
  "drivers":          {"view": true, "edit": true, "add": true, "delete": false},
  "vehicles":         {"view": true, "edit": true, "add": true, "delete": false},
  "app_settings":     {"view": true, "edit": true},
  "admin_settings":   {"view": false, "edit": false},
  "user_management":  {"view": true, "edit": true, "add": true, "delete": false},
  "activity_log":     {"view": true},
  "profile":          {"view": true, "edit": true}
}'),
('ops', '{
  "dashboard":        {"view": true, "edit": false},
  "bookings":         {"view": true, "edit": true, "add": true, "delete": false},
  "dispatch":         {"view": true, "edit": true},
  "passengers":       {"view": true, "edit": true, "add": true, "delete": false},
  "drivers":          {"view": true, "edit": true, "add": false, "delete": false},
  "vehicles":         {"view": true, "edit": false, "add": false, "delete": false},
  "app_settings":     {"view": false, "edit": false},
  "admin_settings":   {"view": false, "edit": false},
  "user_management":  {"view": false, "edit": false, "add": false, "delete": false},
  "activity_log":     {"view": false},
  "profile":          {"view": true, "edit": true}
}'),
('dispatcher', '{
  "dashboard":        {"view": true, "edit": false},
  "bookings":         {"view": true, "edit": true, "add": false, "delete": false},
  "dispatch":         {"view": true, "edit": true},
  "passengers":       {"view": true, "edit": false, "add": false, "delete": false},
  "drivers":          {"view": true, "edit": false, "add": false, "delete": false},
  "vehicles":         {"view": true, "edit": false, "add": false, "delete": false},
  "app_settings":     {"view": false, "edit": false},
  "admin_settings":   {"view": false, "edit": false},
  "user_management":  {"view": false, "edit": false, "add": false, "delete": false},
  "activity_log":     {"view": false},
  "profile":          {"view": true, "edit": true}
}'),
('finance', '{
  "dashboard":        {"view": true, "edit": false},
  "bookings":         {"view": true, "edit": false, "add": false, "delete": false},
  "dispatch":         {"view": false, "edit": false},
  "passengers":       {"view": true, "edit": false, "add": false, "delete": false},
  "drivers":          {"view": true, "edit": false, "add": false, "delete": false},
  "vehicles":         {"view": false, "edit": false, "add": false, "delete": false},
  "app_settings":     {"view": false, "edit": false},
  "admin_settings":   {"view": false, "edit": false},
  "user_management":  {"view": false, "edit": false, "add": false, "delete": false},
  "activity_log":     {"view": true},
  "profile":          {"view": true, "edit": true}
}');
