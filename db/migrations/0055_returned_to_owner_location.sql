-- 0055_returned_to_owner_location.sql
--
-- A car handed back to its owner leaves the stock views the way a sold one
-- does (call 2026-10-31): setting the master sheet's AVAILABLE / SOLD to
-- RETURNED TO OWNER moves it to a "returned_to_owner" location. Like sold
-- (0051) it is not a move destination; the trigger sets it.

-- 1. Allow the value.
alter table public.vehicles
  drop constraint if exists vehicles_current_location_check;
alter table public.vehicles
  add constraint vehicles_current_location_check
  check (current_location in ('forecourt', 'yard', 'garage', 'staff', 'courtesy_car', 'sold', 'returned_to_owner'));

alter table public.location_movements
  drop constraint if exists location_movements_from_location_check;
alter table public.location_movements
  add constraint location_movements_from_location_check
  check (from_location is null or from_location in ('forecourt', 'yard', 'garage', 'staff', 'courtesy_car', 'sold', 'returned_to_owner'));

alter table public.location_movements
  drop constraint if exists location_movements_to_location_check;
alter table public.location_movements
  add constraint location_movements_to_location_check
  check (to_location in ('forecourt', 'yard', 'garage', 'staff', 'courtesy_car', 'sold', 'returned_to_owner'));

comment on column public.vehicles.current_location is
  'forecourt/yard/garage/staff/courtesy_car, or sold / returned_to_owner once '
  'sale_status says so (0051, 0055). NOT NULL — Decision D-A2.';

-- 2. Backfill the cars already returned. Snapshot first, as 0051 did, so the
-- change can be checked and undone.
create table if not exists public.vehicle_location_backfill_20261101 as
select id, registration, current_location as previous_location,
       location_since as previous_location_since, now() as captured_at
  from public.vehicles
 where sale_status = 'returned_to_owner' and current_location <> 'returned_to_owner';

alter table public.vehicle_location_backfill_20261101 enable row level security;
revoke all on public.vehicle_location_backfill_20261101 from anon, authenticated;

update public.vehicles
   set current_location = 'returned_to_owner',
       location_since = now()
 where sale_status = 'returned_to_owner'
   and current_location <> 'returned_to_owner';

-- 3. Keep it in step: the 0051 trigger, for both statuses that end a car's
-- time in stock.
create or replace function public.sync_sold_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_place text := case new.sale_status
    when 'sold' then 'sold'
    when 'returned_to_owner' then 'returned_to_owner'
  end;
  old_place text := null;
  from_location text := null;
begin
  if tg_op = 'UPDATE' then
    old_place := case old.sale_status
      when 'sold' then 'sold'
      when 'returned_to_owner' then 'returned_to_owner'
    end;
    from_location := old.current_location;
  end if;

  if new_place is not null and new_place is distinct from old_place
     and new.current_location <> new_place then
    new.current_location := new_place;
  elsif new_place is null and old_place is not null
     and new.current_location = old_place then
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
       case new.current_location
         when 'sold' then 'Marked sold'
         when 'returned_to_owner' then 'Returned to owner'
         else case old_place when 'sold' then 'Sale undone' else 'Back in stock' end
       end,
       auth.uid());
  end if;

  return new;
end;
$$;

comment on function public.sync_sold_location() is
  'Moves a vehicle to location sold or returned_to_owner when sale_status '
  'says so, and back to the forecourt when that is undone (0051, 0055).';
