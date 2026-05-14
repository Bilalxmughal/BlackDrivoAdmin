-- ============================================
-- BlackDrivo Admin DB — App Data Sync Tables
-- Run in wxszxhgunipgvcxlrock (Admin DB)
-- ============================================

-- App passengers mirror table
create table if not exists app_passengers (
  id           uuid primary key,
  name         text,
  email        text unique,
  phone        text,
  country_code text default 'US',
  avatar_url   text,
  status       text default 'active',
  ride_count   int default 0,
  synced_at    timestamptz default now(),
  created_at   timestamptz
);

alter table app_passengers enable row level security;
create policy "ap_all" on app_passengers for all using (auth.uid() is not null);

-- App bookings mirror table
create table if not exists app_bookings (
  id               uuid primary key,
  booking_ref      text unique,
  passenger_id     uuid,
  passenger_name   text,
  passenger_email  text,
  ride_type        text,
  vehicle_category text,
  pickup_address   text,
  dropoff_address  text,
  pickup_time      text,
  hours            int,
  status           text default 'pending',
  fare             numeric(10,2),
  currency         text default 'USD',
  country_code     text default 'US',
  passenger_rating int,
  source           text default 'app',
  synced_at        timestamptz default now(),
  created_at       timestamptz
);

alter table app_bookings enable row level security;
create policy "ab_all" on app_bookings for all using (auth.uid() is not null);

-- Indexes
create index if not exists idx_app_passengers_country on app_passengers(country_code);
create index if not exists idx_app_bookings_country   on app_bookings(country_code);
create index if not exists idx_app_bookings_status    on app_bookings(status);
create index if not exists idx_app_bookings_passenger on app_bookings(passenger_id);

-- Realtime
alter publication supabase_realtime add table app_passengers;
alter publication supabase_realtime add table app_bookings;
