-- 0066_hidden_locations.sql
--
-- A dealership can remove a built-in place it doesn't use (Staff, Courtesy
-- car, …) in Settings → Locations, as it can its own places (0056), and put it
-- back (2026-11-07). A removed built-in is a row here: it stops being a tab on
-- All vehicles and somewhere to move a car, and cars' history keeps its name.
-- Restoring it deletes the row.
--
-- Its own table rather than a column on companies: the app reads the company
-- with a fixed column list at sign-in, so a missing column would stop it
-- loading; a missing table only means no place is removed yet.

create table if not exists public.company_hidden_locations (
  company_id uuid not null references public.companies(id) on delete cascade,
  location text not null,
  hidden_at timestamptz not null default now(),
  primary key (company_id, location),
  constraint company_hidden_locations_builtin
    check (location in ('forecourt', 'yard', 'garage', 'staff', 'courtesy_car'))
);

comment on table public.company_hidden_locations is
  'Built-in vehicle locations a company removed in Settings → Locations (0066).';

-- RLS: everyone in the company reads them (every Move dialog and the All
-- vehicles tabs leave them out); only settings managers change them, as for
-- company_locations (0056).
alter table public.company_hidden_locations enable row level security;

drop policy if exists company_hidden_locations_select on public.company_hidden_locations;
create policy company_hidden_locations_select on public.company_hidden_locations for select
  using (company_id = public.current_company_id());
drop policy if exists company_hidden_locations_insert on public.company_hidden_locations;
create policy company_hidden_locations_insert on public.company_hidden_locations for insert
  with check (company_id = public.current_company_id()
    and public.auth_has_any_capability(array['admin:manage_settings']));
drop policy if exists company_hidden_locations_delete on public.company_hidden_locations;
create policy company_hidden_locations_delete on public.company_hidden_locations for delete
  using (company_id = public.current_company_id()
    and public.auth_has_any_capability(array['admin:manage_settings']));

-- A place can't be removed while a car is there.
create or replace function public.guard_hidden_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.vehicles v
     where v.company_id = new.company_id and v.current_location = new.location
  ) then
    raise exception 'Move the cars out of % before removing it',
      case new.location when 'courtesy_car' then 'Courtesy car' else initcap(new.location) end
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_company_hidden_locations_guard on public.company_hidden_locations;
create trigger trg_company_hidden_locations_guard
  before insert on public.company_hidden_locations
  for each row execute function public.guard_hidden_location();

-- And no car moves into a removed place, from any screen or job.
create or replace function public.guard_vehicle_hidden_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or new.current_location is distinct from old.current_location)
     and exists (
       select 1 from public.company_hidden_locations h
        where h.company_id = new.company_id and h.location = new.current_location
     ) then
    raise exception 'That location was removed in Settings' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vehicles_hidden_location on public.vehicles;
create trigger trg_vehicles_hidden_location
  before insert or update of current_location on public.vehicles
  for each row execute function public.guard_vehicle_hidden_location();
