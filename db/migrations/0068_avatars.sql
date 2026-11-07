-- 0068_avatars.sql
--
-- Profile pictures (2026-11-07): anyone can upload their own picture in
-- Settings → My profile, and it shows wherever their initials did. Pictures
-- live in a public bucket as `<company id>/<user id>/avatar.<ext>`; each
-- person can write only their own folder. users.avatar_url (already there,
-- and already a self-edit per 0025) holds the picture's public address.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );
