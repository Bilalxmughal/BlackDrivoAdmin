-- ============================================
-- BlackDrivo — Country Fix (Run this fully)
-- ============================================

-- Step 1: Ensure country_code columns exist
alter table vehicles   add column if not exists country_code text;
alter table drivers    add column if not exists country_code text;
alter table passengers add column if not exists country_code text;
alter table bookings   add column if not exists country_code text;

-- Step 2: Update vehicles based on city
update vehicles set country_code = 'PK'
where city in ('lahore','karachi','islamabad') or lower(city) in ('lahore','karachi','islamabad');

update vehicles set country_code = 'US'
where city in ('atlanta','new_york','chicago','houston','miami') or lower(city) in ('atlanta','new_york','chicago','houston','miami');

-- Fallback for vehicles with no city
update vehicles set country_code = 'US' where country_code is null;

-- Step 3: Update drivers based on city
update drivers set country_code = 'PK'
where city in ('lahore','karachi','islamabad') or lower(city::text) in ('lahore','karachi','islamabad');

update drivers set country_code = 'US'
where city in ('atlanta','new_york','chicago','houston','miami') or lower(city::text) in ('atlanta','new_york','chicago','houston','miami');

update drivers set country_code = 'US' where country_code is null;

-- Step 4: Update passengers
update passengers set country_code = 'PK'
where country ilike '%pakistan%' or country = 'PK' or city in ('lahore','karachi','islamabad');

update passengers set country_code = 'US'
where country ilike '%united states%' or country ilike '%america%' or country = 'US'
   or city in ('atlanta','new_york','chicago','houston','miami');

update passengers set country_code = 'US' where country_code is null;

-- Step 5: Update bookings based on city
update bookings set country_code = 'PK'
where city in ('lahore','karachi','islamabad');

update bookings set country_code = 'US'
where city in ('atlanta','new_york','chicago','houston','miami');

update bookings set country_code = 'US' where country_code is null;

-- Step 6: Set NOT NULL defaults going forward
alter table vehicles   alter column country_code set default 'US';
alter table drivers    alter column country_code set default 'US';
alter table passengers alter column country_code set default 'US';
alter table bookings   alter column country_code set default 'US';

-- Step 7: Indexes for fast country filtering
create index if not exists idx_vehicles_country   on vehicles(country_code);
create index if not exists idx_drivers_country    on drivers(country_code);
create index if not exists idx_passengers_country on passengers(country_code);
create index if not exists idx_bookings_country   on bookings(country_code);
create index if not exists idx_drivers_vehicle    on drivers(vehicle_id);
create index if not exists idx_bookings_status    on bookings(status);
create index if not exists idx_bookings_vehicle   on bookings(vehicle_id, status);
create index if not exists idx_bookings_driver    on bookings(driver_id, status);

-- Step 8: Realtime on bookings
alter publication supabase_realtime add table bookings;

-- Verify counts
select 'vehicles' as table_name, country_code, count(*) from vehicles group by country_code
union all
select 'drivers',   country_code, count(*) from drivers   group by country_code
union all
select 'passengers',country_code, count(*) from passengers group by country_code;
