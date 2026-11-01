-- 0057_user_recovery_email.sql
--
-- Where a password reset link goes for staff who sign in with a username
-- (call 2026-10-31). Their account email is an internal address that never
-- receives mail (lib/auth/username), so Forgot password needs a real one. A
-- user sets it on My profile; accounts that sign in with an email use that.

alter table public.users
  add column if not exists recovery_email text;

alter table public.users
  drop constraint if exists users_recovery_email_format;
alter table public.users
  add constraint users_recovery_email_format
  check (recovery_email is null or recovery_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

comment on column public.users.recovery_email is
  'Where Forgot password sends the reset link for a username account (0057).';
