-- 0054_appointment_type.sql
--
-- What an appointment is for: a viewing, the customer collecting the car, or
-- delivering it to them (call 2026-10-31). Every existing appointment was a
-- viewing, which is the default.

alter table public.appointments
  add column if not exists appointment_type text not null default 'viewing';

alter table public.appointments
  drop constraint if exists appointments_appointment_type_check;
alter table public.appointments
  add constraint appointments_appointment_type_check
  check (appointment_type in ('viewing', 'collection', 'delivery'));

comment on column public.appointments.appointment_type is
  'viewing / collection / delivery (0054). Defaults to viewing.';
