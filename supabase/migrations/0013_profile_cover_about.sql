-- 0013: profile cover photo and About card. Safe to re-run. Run after 0012_avatars.sql.
-- Covers follow the avatar rules: private 'covers' bucket under <user id>/<uuid>.webp, /api/cover
-- re-encodes with sharp (EXIF/GPS stripped), reads are hidden across blocks, and writes,
-- replaces and deletes are only allowed inside your own folder.
-- About: all fields optional. No phone, address or birthday, on purpose.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles add column if not exists cover_path text;
alter table public.profiles drop constraint if exists profiles_cover_path_own_folder;
alter table public.profiles
  add constraint profiles_cover_path_own_folder
  check (cover_path is null or split_part(cover_path, '/', 1) = id::text);
grant select (cover_path) on public.profiles to authenticated;
grant update (cover_path) on public.profiles to authenticated;

-- About. bio already exists (0001, readable by signed-in people). city is NOT granted for select:
-- it is only read through get_profile_about(), which applies the Friends/Everyone setting.
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists city_visibility text not null default 'friends';
alter table public.profiles drop constraint if exists profiles_city_len;
alter table public.profiles add constraint profiles_city_len check (city is null or char_length(city) <= 60);
alter table public.profiles drop constraint if exists profiles_city_visibility_check;
alter table public.profiles
  add constraint profiles_city_visibility_check check (city_visibility in ('friends', 'everyone'));
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 160) not valid;
grant update (city, city_visibility) on public.profiles to authenticated;

-- Same rule as can_see_avatar: signed in, valid folder name, no block either way.
create or replace function public.can_see_cover(object_name text)
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
revoke all on function public.can_see_cover(text) from public, anon;
grant execute on function public.can_see_cover(text) to authenticated;

drop policy if exists "covers readable by people who can see the profile" on storage.objects;
create policy "covers readable by people who can see the profile"
  on storage.objects for select to authenticated
  using (bucket_id = 'covers' and public.can_see_cover(name));

drop policy if exists "covers written to own folder" on storage.objects;
create policy "covers written to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "covers updated in own folder" on storage.objects;
create policy "covers updated in own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "covers deleted from own folder" on storage.objects;
create policy "covers deleted from own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- The About card for one person, as the caller may see it. Nothing across a block; city only
-- when it's set to Everyone, the caller is a friend, or it's the caller's own profile.
create or replace function public.get_profile_about(target uuid)
returns table (bio text, city text, city_visibility text, interests text[], joined_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.bio,
         case when p.id = auth.uid()
                or p.city_visibility = 'everyone'
                or public.are_friends(auth.uid(), p.id)
              then p.city end,
         case when p.id = auth.uid() then p.city_visibility end,
         p.interests,
         date_trunc('month', p.created_at)
  from public.profiles p
  where p.id = target
    and auth.uid() is not null
    and not public.is_blocked_with(p.id);
$$;
revoke all on function public.get_profile_about(uuid) from public, anon;
grant execute on function public.get_profile_about(uuid) to authenticated;
