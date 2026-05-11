-- ============================================
-- BlackDrivo — Migration v3
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Add country_code to vehicles
alter table vehicles add column if not exists country_code text default 'US';

-- 2. Update existing vehicles based on city
update vehicles set country_code = 'PK'
where city in ('lahore', 'karachi', 'islamabad');

update vehicles set country_code = 'US'
where city in ('atlanta', 'new_york', 'chicago', 'houston', 'miami');

-- 3. Enable Supabase Realtime on bookings table
-- Go to Supabase Dashboard → Database → Replication
-- Toggle ON for: bookings table
-- OR run this:
alter publication supabase_realtime add table bookings;

-- 4. Index for faster dispatch queries
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_vehicle_status on bookings(vehicle_id, status);
create index if not exists idx_bookings_driver_status on bookings(driver_id, status);
create index if not exists idx_bookings_country on bookings(country_code);
create index if not exists idx_passengers_country on passengers(country_code);
create index if not exists idx_drivers_country on drivers(country_code);
create index if not exists idx_vehicles_country on vehicles(country_code);
create index if not exists idx_drivers_vehicle on drivers(vehicle_id);
