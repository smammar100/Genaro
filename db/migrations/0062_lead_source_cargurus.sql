-- 0062_lead_source_cargurus.sql
--
-- CarGurus leads couldn't be saved (bug list 2026-11-06). Migration 0059 added
-- CarGurus as a lead channel, and Create lead writes the channel's slug into
-- the legacy leads.source column, but that column's check (from the base
-- schema, not in this repo) never allowed 'cargurus', so every CarGurus lead
-- was rejected with "Couldn't create the lead."
--
-- Drops whichever check guards leads.source, whatever the base schema named
-- it, and adds it back with the full list the app writes (LEAD_SOURCES in
-- src/lib/types.ts). Every existing lead's source is already on the list.
-- Safe to re-run.

do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.leads'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ~ '\msource\M'
  loop
    execute format('alter table public.leads drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.leads
  add constraint leads_source_check
  check (source in (
    'website', 'phone', 'walk_in', 'autotrader', 'cargurus',
    'ebay', 'facebook', 'referral', 'other'
  ));
