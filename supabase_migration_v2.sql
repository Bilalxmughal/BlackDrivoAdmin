-- ============================================
-- BlackDrivo — Migration: Unique IDs + Country
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Add unique_id columns
alter table passengers  add column if not exists unique_id text unique;
alter table drivers     add column if not exists unique_id text unique;
alter table bookings    add column if not exists unique_id text unique;

-- 2. Add country column to passengers and drivers
alter table passengers  add column if not exists country_code text default 'US';
alter table drivers     add column if not exists country_code text default 'US';
alter table bookings    add column if not exists country_code text default 'US';
alter table bookings    add column if not exists ride_type    text default 'city_to_city';

-- 3. Function to generate unique 6-digit ID
create or replace function generate_unique_id(prefix text)
returns text as $$
declare
  new_id text;
  exists boolean;
begin
  loop
    new_id := prefix || '-' || floor(random() * 900000 + 100000)::text;
    -- Check uniqueness across all tables
    select true into exists
    from (
      select unique_id from passengers where unique_id = new_id
      union all
      select unique_id from drivers    where unique_id = new_id
      union all
      select unique_id from bookings   where unique_id = new_id
    ) t;
    exit when exists is null;
  end loop;
  return new_id;
end;
$$ language plpgsql;

-- 4. Auto-assign unique_id on passenger insert
create or replace function set_passenger_unique_id()
returns trigger as $$
declare
  prefix text;
begin
  -- Determine prefix by country + city
  prefix := case
    when new.city = 'lahore'    then 'PL'
    when new.city = 'karachi'   then 'PK'
    when new.city = 'islamabad' then 'PI'
    when new.city = 'atlanta'   then 'AA'
    when new.city = 'new_york'  then 'AN'
    when new.city = 'chicago'   then 'AC'
    when new.city = 'houston'   then 'AH'
    when new.city = 'miami'     then 'AM'
    when new.country_code = 'PK' then 'PP'
    when new.country_code = 'US' then 'AU'
    else 'XX'
  end;
  if new.unique_id is null then
    new.unique_id := generate_unique_id(prefix);
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_passenger_unique_id
  before insert on passengers
  for each row execute function set_passenger_unique_id();

-- 5. Auto-assign unique_id on driver insert
create or replace function set_driver_unique_id()
returns trigger as $$
declare
  prefix text;
begin
  prefix := case
    when new.city = 'lahore'    then 'DL'
    when new.city = 'karachi'   then 'DK'
    when new.city = 'islamabad' then 'DI'
    when new.city = 'atlanta'   then 'DA'
    when new.city = 'new_york'  then 'DN'
    when new.city = 'chicago'   then 'DC'
    when new.city = 'houston'   then 'DH'
    when new.city = 'miami'     then 'DM'
    when new.country_code = 'PK' then 'DP'
    when new.country_code = 'US' then 'DU'
    else 'DR'
  end;
  if new.unique_id is null then
    new.unique_id := generate_unique_id(prefix);
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_driver_unique_id
  before insert on drivers
  for each row execute function set_driver_unique_id();

-- 6. Auto-assign booking_ref based on country+city
create or replace function set_booking_ref()
returns trigger as $$
declare
  prefix text;
  new_ref text;
  exists_check boolean;
begin
  prefix := case
    when new.city = 'lahore'    then 'PL'
    when new.city = 'karachi'   then 'PK'
    when new.city = 'islamabad' then 'PI'
    when new.city = 'atlanta'   then 'AA'
    when new.city = 'new_york'  then 'AN'
    when new.city = 'chicago'   then 'AC'
    when new.city = 'houston'   then 'AH'
    when new.city = 'miami'     then 'AM'
    when new.country_code = 'PK' then 'PB'
    when new.country_code = 'US' then 'AB'
    else 'BD'
  end;
  loop
    new_ref := prefix || '-' || floor(random() * 9000 + 1000)::text;
    select true into exists_check from bookings where booking_ref = new_ref;
    exit when exists_check is null;
  end loop;
  new.booking_ref := new_ref;
  new.unique_id   := new_ref;
  return new;
end;
$$ language plpgsql;

-- Drop old booking_ref trigger if exists and recreate
drop trigger if exists trg_booking_ref on bookings;
create trigger trg_booking_ref
  before insert on bookings
  for each row
  when (new.booking_ref is null)
  execute function set_booking_ref();

-- 7. Add country_code to city_type check (if needed)
-- city_type enum already has all cities, just add new_york, chicago, houston, miami
alter type city_type add value if not exists 'new_york';
alter type city_type add value if not exists 'chicago';
alter type city_type add value if not exists 'houston';
alter type city_type add value if not exists 'miami';

-- 8. Add ride_type to bookings if not enum — keep as text for flexibility
-- Already added above as text column

-- 9. Add user country access control
alter table users add column if not exists country_access text[] default array['PK','US'];
-- This array controls which countries this admin user can see data for
