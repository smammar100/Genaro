-- 0064_daily_job_assignee.sql
--
-- Daily jobs: the poster can assign a job to a staff member, or leave it open
-- for anyone (request 2026-11-06). Null means open. Assigning doesn't pick
-- the job up: anyone can still pick it up, so a job isn't stuck when its
-- assignee is out. The existing company-wide update policy covers changing it.
--
-- Additive and nullable: every existing job stays open. Safe to re-run.

alter table public.daily_jobs
  add column if not exists assigned_to uuid references public.users(id) on delete set null;

comment on column public.daily_jobs.assigned_to is
  'Who the poster gave the job to; null is open to anyone (0064).';
