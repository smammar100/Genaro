-- 0058_lead_type.sql
--
-- What a lead is coming in for: a viewing, collecting the car, or having it
-- delivered (call 2026-10-31). Picked on Create lead; every existing lead was
-- a viewing, which is the default.

alter table public.leads
  add column if not exists lead_type text not null default 'viewing';

alter table public.leads
  drop constraint if exists leads_lead_type_check;
alter table public.leads
  add constraint leads_lead_type_check
  check (lead_type in ('viewing', 'collection', 'delivery'));

comment on column public.leads.lead_type is
  'viewing / collection / delivery (0058). Defaults to viewing.';
