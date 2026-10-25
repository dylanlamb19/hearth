-- 0012: profile photos in Storage. Safe to re-run.
-- Files live in a private 'avatars' bucket under <user id>/<uuid>.webp. /api/avatar is the
-- normal way in (it re-encodes with sharp, which strips EXIF/GPS), but the policies below also
-- hold for direct API calls: you can only write, replace or delete inside your own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- profiles.avatar_path: the current photo, always inside the owner's own folder.
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop constraint if exists profiles_avatar_path_own_folder;
alter table public.profiles
  add constraint profiles_avatar_path_own_folder
  check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);
grant select (avatar_path) on public.profiles to authenticated;
grant update (avatar_path) on public.profiles to authenticated;

-- Readable by signed-in people who can see the profile: same rule as profiles (no blocks
-- either way). The folder name is parsed defensively so a junk name can't raise.
create or replace function public.can_see_avatar(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then not public.is_blocked_with(split_part(object_name, '/', 1)::uuid)
    else false
  end;
$$;
revoke all on function public.can_see_avatar(text) from public, anon;
grant execute on function public.can_see_avatar(text) to authenticated;

drop policy if exists "avatars readable by people who can see the profile" on storage.objects;
create policy "avatars readable by people who can see the profile"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.can_see_avatar(name));

drop policy if exists "avatars written to own folder" on storage.objects;
create policy "avatars written to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars updated in own folder" on storage.objects;
create policy "avatars updated in own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars deleted from own folder" on storage.objects;
create policy "avatars deleted from own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
