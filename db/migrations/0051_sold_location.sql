-- 0051_sold_location.sql
--
-- Adds "sold" as a vehicle location. A car whose master sheet AVAILABLE / SOLD
-- (sale_status) reads SOLD is recorded at location 'sold'; every other car
-- keeps a physical place, 'forecourt' by default (migration 0010).
--
-- Sold is not somewhere a car is moved to, so the app never offers it as a
-- move destination. A trigger sets it instead, the moment sale_status turns
-- SOLD, and moves the car back to the forecourt if the sale is undone. A
-- trigger rather than the service layer, following 0049: a car is marked sold
-- from a won deal, from the master sheet, from the vehicle page and by the
-- legacy importer, and only the database sees all of them.
--
-- When a signed-in user makes the change, the trigger also writes the
-- location_movements row, so the vehicle's location history shows the sale
-- and re-deriving the location from that history (deleting a movement) keeps
-- it. Service-role writes (the importer) have no user to record and write
-- none, like every other import.

-- 1. Allow 'sold' wherever a location is stored.
alter table public.vehicles
  drop constraint if exists vehicles_current_location_check;
alter table public.vehicles
  add constraint vehicles_current_location_check
  check (current_location in ('forecourt', 'yard', 'garage', 'staff', 'sold'));

alter table public.location_movements
  drop constraint if exists location_movements_from_location_check;
alter table public.location_movements
  add constraint location_movements_from_location_check
  check (from_location is null or from_location in ('forecourt', 'yard', 'garage', 'staff', 'sold'));

alter table public.location_movements
  drop constraint if exists location_movements_to_location_check;
alter table public.location_movements
  add constraint location_movements_to_location_check
  check (to_location in ('forecourt', 'yard', 'garage', 'staff', 'sold'));

comment on column public.vehicles.current_location is
  'forecourt/yard/garage/staff, or sold once sale_status is sold (0051). '
  'NOT NULL — Decision D-A2 (one location at a time).';

-- 2. Backfill. Snapshot first, following 0045 / 0049, so the change can be
-- checked and undone.
create table if not exists public.vehicle_location_backfill_20261022 as
select id, registration, current_location as previous_location,
       location_since as previous_location_since, now() as captured_at
  from public.vehicles
 where sale_status = 'sold' and current_location <> 'sold';

alter table public.vehicle_location_backfill_20261022 enable row level security;

-- Sold cars → Sold, dated from the sale where there is one.
update public.vehicles
   set current_location = 'sold',
       location_since = coalesce(date_sold::timestamp at time zone 'UTC', location_since)
 where sale_status = 'sold'
   and current_location <> 'sold';

-- 3. Keep it in step from now on.
create or replace function public.sync_sold_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  was_sold boolean := false;
  from_location text := null;
begin
  if tg_op = 'UPDATE' then
    was_sold := coalesce(old.sale_status = 'sold', false);
    from_location := old.current_location;
  end if;

  if new.sale_status = 'sold' and not was_sold and new.current_location <> 'sold' then
    new.current_location := 'sold';
  elsif was_sold and new.sale_status is distinct from 'sold' and new.current_location = 'sold' then
    new.current_location := 'forecourt';
  else
    return new;
  end if;
  new.location_since := now();

  -- The vehicle row already exists on UPDATE, so its movement can be written
  -- here; an INSERT has no history to add to.
  if tg_op = 'UPDATE' and auth.uid() is not null then
    insert into public.location_movements
      (vehicle_id, from_location, to_location, notes, created_by)
    values
      (new.id, from_location, new.current_location,
       case when new.current_location = 'sold' then 'Marked sold' else 'Sale undone' end,
       auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vehicles_sold_location on public.vehicles;
create trigger trg_vehicles_sold_location
  before insert or update of sale_status on public.vehicles
  for each row execute function public.sync_sold_location();

comment on function public.sync_sold_location() is
  'Moves a vehicle to location sold when sale_status turns sold, and back to '
  'the forecourt when the sale is undone (0051).';
