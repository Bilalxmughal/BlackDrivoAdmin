-- ============================================
-- BlackDrivo PassApp DB — Sync to Admin
-- Run in qhwuojqnljgxeegvydjo (PassApp DB)
-- ============================================

-- Sync passenger to Admin DB via HTTP webhook
create or replace function sync_passenger_to_admin()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://wxszxhgunipgvcxlrock.supabase.co/rest/v1/app_passengers',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4c3p4aGd1bmlwZ3ZjeGxyb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjIwMjYsImV4cCI6MjA5Mzk5ODAyNn0.zJcxbBNttu1yjl5hKfCgF_b8-xkrGLddMwKweVrCPRw',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4c3p4aGd1bmlwZ3ZjeGxyb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjIwMjYsImV4cCI6MjA5Mzk5ODAyNn0.zJcxbBNttu1yjl5hKfCgF_b8-xkrGLddMwKweVrCPRw',
      'Prefer',        'resolution=merge-duplicates'
    ),
    body := jsonb_build_object(
      'id',           new.id,
      'name',         new.name,
      'email',        new.email,
      'phone',        new.phone,
      'country_code', new.country_code,
      'avatar_url',   new.avatar_url,
      'status',       new.status,
      'ride_count',   new.ride_count,
      'synced_at',    now(),
      'created_at',   new.created_at
    )
  );
  return new;
exception when others then
  -- Never block passenger creation even if sync fails
  return new;
end;
$$ language plpgsql security definer;

-- Sync booking to Admin DB
create or replace function sync_booking_to_admin()
returns trigger as $$
declare
  p_name  text;
  p_email text;
begin
  -- Get passenger details
  select name, email into p_name, p_email
  from passengers where id = new.passenger_id;

  perform net.http_post(
    url := 'https://wxszxhgunipgvcxlrock.supabase.co/rest/v1/app_bookings',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4c3p4aGd1bmlwZ3ZjeGxyb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjIwMjYsImV4cCI6MjA5Mzk5ODAyNn0.zJcxbBNttu1yjl5hKfCgF_b8-xkrGLddMwKweVrCPRw',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4c3p4aGd1bmlwZ3ZjeGxyb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjIwMjYsImV4cCI6MjA5Mzk5ODAyNn0.zJcxbBNttu1yjl5hKfCgF_b8-xkrGLddMwKweVrCPRw',
      'Prefer',        'resolution=merge-duplicates'
    ),
    body := jsonb_build_object(
      'id',               new.id,
      'booking_ref',      new.booking_ref,
      'passenger_id',     new.passenger_id,
      'passenger_name',   p_name,
      'passenger_email',  p_email,
      'ride_type',        new.ride_type,
      'vehicle_category', new.vehicle_category,
      'pickup_address',   new.pickup_address,
      'dropoff_address',  new.dropoff_address,
      'pickup_time',      new.pickup_time,
      'hours',            new.hours,
      'status',           new.status,
      'fare',             new.fare,
      'currency',         new.currency,
      'country_code',     new.country_code,
      'source',           new.source,
      'synced_at',        now(),
      'created_at',       new.created_at
    )
  );
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer;

-- Triggers
drop trigger if exists trg_sync_passenger on passengers;
create trigger trg_sync_passenger
  after insert or update on passengers
  for each row execute function sync_passenger_to_admin();

drop trigger if exists trg_sync_booking on bookings;
create trigger trg_sync_booking
  after insert or update on bookings
  for each row execute function sync_booking_to_admin();

-- Enable pg_net extension for HTTP calls
create extension if not exists pg_net;
