-- 0063_allowed_values_function.sql
--
-- For the release check (scripts/check-db-values.mjs, bug list 2026-11-06).
-- CarGurus leads failed because the app wrote a value ('cargurus') that a
-- column's check didn't allow, and nothing compared the two. This lists every
-- allowed-values check in the public schema so the check can compare them
-- with the values the app writes, before each build.
--
-- Read-only: it returns constraint definitions, never table data. Only the
-- service role may call it (the release check runs with the server key).
-- Safe to re-run.

create or replace function public.allowed_values()
returns table (table_name text, constraint_name text, definition text)
language sql
stable
set search_path = ''
as $$
  select c.relname::text, con.conname::text, pg_catalog.pg_get_constraintdef(con.oid)
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and con.contype = 'c'
   order by 1, 2;
$$;

comment on function public.allowed_values() is
  'Allowed-values checks in public, for the release check (0063). Service role only.';

revoke all on function public.allowed_values() from public, anon, authenticated;
grant execute on function public.allowed_values() to service_role;
