-- 0052_courtesy_car_location.sql
--
-- Adds "courtesy_car" as a vehicle location: a stock car lent to a customer
-- while their own is off the road (call 2026-10-24). Unlike sold (0051) it is
-- a place a car is moved to and back from, so the app offers it as a move
-- destination and gives it its own Locations tab. No extra columns: the
-- movement's notes carry who has the car.

alter table public.vehicles
  drop constraint if exists vehicles_current_location_check;
alter table public.vehicles
  add constraint vehicles_current_location_check
  check (current_location in ('forecourt', 'yard', 'garage', 'staff', 'courtesy_car', 'sold'));

alter table public.location_movements
  drop constraint if exists location_movements_from_location_check;
alter table public.location_movements
  add constraint location_movements_from_location_check
  check (from_location is null or from_location in ('forecourt', 'yard', 'garage', 'staff', 'courtesy_car', 'sold'));

alter table public.location_movements
  drop constraint if exists location_movements_to_location_check;
alter table public.location_movements
  add constraint location_movements_to_location_check
  check (to_location in ('forecourt', 'yard', 'garage', 'staff', 'courtesy_car', 'sold'));

comment on column public.vehicles.current_location is
  'forecourt/yard/garage/staff/courtesy_car, or sold once sale_status is sold '
  '(0051). NOT NULL — Decision D-A2 (one location at a time).';
