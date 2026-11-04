-- 0061_daily_jobs.sql
--
-- Daily jobs: a sheet per day of small jobs for the team (call 2026-11-04).
-- "Take LS68 NYY to the car wash", "Drop the Corsa for its MOT". Anyone can
-- post a job on today or a later date, it shows who posted it, it carries a
-- priority, and staff pick a job up and mark it completed (then it is struck
-- off). Decided from /proto/daily-jobs; see docs/daily-jobs.md.

create table if not exists public.daily_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_date date not null,
  title text not null,
  -- The car the job is about, as its plate ("LS68 NYY"). Optional: not every
  -- job is about a car.
  registration text,
  priority text not null default 'normal',
  status text not null default 'pending',
  created_by uuid not null references public.users(id),
  picked_up_by uuid references public.users(id),
  picked_up_at timestamptz,
  completed_by uuid references public.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_jobs_title_length check (length(btrim(title)) between 1 and 300),
  constraint daily_jobs_registration_format check (
    registration is null or registration ~ '^[A-Z0-9 ]{2,10}$'
  ),
  constraint daily_jobs_priority check (priority in ('urgent', 'high', 'normal', 'low')),
  constraint daily_jobs_status check (status in ('pending', 'completed')),
  -- A completed job says who completed it and when.
  constraint daily_jobs_completed_has_who check (
    status <> 'completed' or (completed_by is not null and completed_at is not null)
  )
);

create index if not exists daily_jobs_company_date_idx
  on public.daily_jobs (company_id, job_date);

comment on table public.daily_jobs is
  'A day sheet of small jobs for the team: posted by anyone, picked up and completed by staff (0061).';

create or replace function public.touch_daily_jobs_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists daily_jobs_touch_updated_at on public.daily_jobs;
create trigger daily_jobs_touch_updated_at
  before update on public.daily_jobs
  for each row execute function public.touch_daily_jobs_updated_at();

-- RLS: the whole company sees, posts and works the sheet. A job is always
-- posted as the signed-in user. Only its poster can delete it, and only while
-- it is still pending, so a finished job can't quietly disappear.
alter table public.daily_jobs enable row level security;

drop policy if exists daily_jobs_select on public.daily_jobs;
create policy daily_jobs_select on public.daily_jobs for select
  using (company_id = public.current_company_id());

drop policy if exists daily_jobs_insert on public.daily_jobs;
create policy daily_jobs_insert on public.daily_jobs for insert
  with check (company_id = public.current_company_id() and created_by = (select auth.uid()));

drop policy if exists daily_jobs_update on public.daily_jobs;
create policy daily_jobs_update on public.daily_jobs for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists daily_jobs_delete on public.daily_jobs;
create policy daily_jobs_delete on public.daily_jobs for delete
  using (company_id = public.current_company_id()
    and created_by = (select auth.uid())
    and status = 'pending');
