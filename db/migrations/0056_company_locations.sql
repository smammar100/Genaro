-- 0056_company_locations.sql
--
-- A dealership's own places for its cars, beside the built-in ones: "Yard 2",
-- a second showroom, a unit down the road (call 2026-10-31). Admins add,
-- rename and remove them in Settings; each garage names its sites its own way.
--
-- A custom place is stored on vehicles.current_location and on movements by
-- its slug, "loc_" and ten hex characters, which never changes, so a rename
-- is a label change only. Removing a place archives it: history still shows
-- its name, and it can't be removed while a car is there.

create table if not exists public.company_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  slug text not null default ('loc_' || substr(md5(gen_random_uuid()::text), 1, 10)),
  label text not null,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint company_locations_slug_format check (slug ~ '^loc_[a-z0-9]{4,32}$'),
  constraint company_locations_label_length check (length(btrim(label)) between 1 and 40),
  constraint company_locations_slug_unique unique (company_id, slug)
);

-- One live place per name per company ("Yard 2" twice would be ambiguous).
create unique index if not exists company_locations_live_label_unique
  on public.company_locations (company_id, lower(btrim(label)))
  where archived_at is null;

comment on table public.company_locations is
  'A company''s own vehicle locations beside the built-in ones (0056).';

-- RLS: everyone in the company reads them (labels show everywhere); only
-- settings managers change them, the same gate as the other catalogues (0053).
alter table public.company_locations enable row level security;

drop policy if exists company_locations_select on public.company_locations;
create policy company_locations_select on public.company_locations for select
  using (company_id = public.current_company_id());
drop policy if exists company_locations_insert on public.company_locations;
create policy company_locations_insert on public.company_locations for insert
  with check (company_id = public.current_company_id()
    and public.auth_has_any_capability(array['admin:manage_settings']));
drop policy if exists company_locations_update on public.company_locations;
create policy company_locations_update on public.company_locations for update
  using (company_id = public.current_company_id()
    and public.auth_has_any_capability(array['admin:manage_settings']))
  with check (company_id = public.current_company_id()
    and public.auth_has_any_capability(array['admin:manage_settings']));
-- No delete policy: a place is archived, never deleted.

-- A place can't be archived while a car is there.
create or replace function public.guard_company_location_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is not null and old.archived_at is null and exists (
    select 1 from public.vehicles v
     where v.company_id = new.company_id and v.current_location = new.slug
  ) then
    raise exception 'Move the cars out of % before removing it', old.label
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_company_locations_archive on public.company_locations;
create trigger trg_company_locations_archive
  before update of archived_at on public.company_locations
  for each row execute function public.guard_company_location_archive();

-- Locations may now be a built-in value or a custom slug. The shape is
-- checked here; that the slug is a live place of the car's company is checked
-- by the trigger below (a check constraint can't look at another table).
alter table public.vehicles
  drop constraint if exists vehicles_current_location_check;
alter table public.vehicles
  add constraint vehicles_current_location_check
  check (current_location ~ '^(forecourt|yard|garage|staff|courtesy_car|sold|returned_to_owner|loc_[a-z0-9]{4,32})$');

alter table public.location_movements
  drop constraint if exists location_movements_from_location_check;
alter table public.location_movements
  add constraint location_movements_from_location_check
  check (from_location is null or from_location ~ '^(forecourt|yard|garage|staff|courtesy_car|sold|returned_to_owner|loc_[a-z0-9]{4,32})$');

alter table public.location_movements
  drop constraint if exists location_movements_to_location_check;
alter table public.location_movements
  add constraint location_movements_to_location_check
  check (to_location ~ '^(forecourt|yard|garage|staff|courtesy_car|sold|returned_to_owner|loc_[a-z0-9]{4,32})$');

create or replace function public.guard_vehicle_custom_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.current_location like 'loc\_%' and (tg_op = 'INSERT' or new.current_location is distinct from old.current_location)
     and not exists (
       select 1 from public.company_locations l
        where l.company_id = new.company_id
          and l.slug = new.current_location
          and l.archived_at is null
     ) then
    raise exception 'That location no longer exists' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vehicles_custom_location on public.vehicles;
create trigger trg_vehicles_custom_location
  before insert or update of current_location on public.vehicles
  for each row execute function public.guard_vehicle_custom_location();

comment on column public.vehicles.current_location is
  'forecourt/yard/garage/staff/courtesy_car or a company_locations slug '
  '(0056); sold / returned_to_owner once sale_status says so (0051, 0055). '
  'NOT NULL — Decision D-A2.';
