-- 0067_backup_storage.sql
--
-- Nightly data backups (2026-11-07): api/cron/backup saves each company's
-- workbook to a private bucket as `<company id>/<YYYY-MM-DD>.xlsx` and keeps
-- the last 30. The job writes with the service role; people who manage
-- settings can list and download their own company's files from
-- Settings → Backup. Nobody else can read them.

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

drop policy if exists backups_select on storage.objects;
create policy backups_select on storage.objects for select
  using (
    bucket_id = 'backups'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.auth_has_any_capability(array['admin:manage_settings'])
  );
