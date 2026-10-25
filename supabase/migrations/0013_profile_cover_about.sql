-- 0013: profile cover photo and About card. Safe to re-run. Run after 0012_avatars.sql.
-- Covers follow the avatar rules: private 'covers' bucket under <user id>/<uuid>.webp, /api/cover
-- re-encodes with sharp (EXIF/GPS stripped) and writes with the service role, reads are hidden
-- across blocks. People can't upload to the bucket or set cover_path directly, so every stored
-- cover went through the EXIF-stripping pipeline.
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
alter table public.profiles add column if not exists cover_alt text;
alter table public.profiles drop constraint if exists profiles_cover_alt_len;
alter table public.profiles
  add constraint profiles_cover_alt_len check (cover_alt is null or char_length(cover_alt) <= 120);
grant select (cover_path, cover_alt) on public.profiles to authenticated;
-- cover_path is only written by /api/cover (service role). cover_alt is yours to edit.
revoke update (cover_path) on public.profiles from authenticated;
grant update (cover_alt) on public.profiles to authenticated;

-- Per-person cover upload log for the rate limit (10 per 10 minutes). Service role only.
create table if not exists public.cover_upload_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists cover_upload_attempts_user_idx
  on public.cover_upload_attempts (user_id, created_at);
alter table public.cover_upload_attempts enable row level security;
revoke all on public.cover_upload_attempts from anon, authenticated;

-- Atomic check-and-log, same shape as claim_account_delete_attempt. True when the upload may go ahead.
create or replace function public.claim_cover_upload(uid uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if uid is null then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cover_upload:' || uid::text, 0));
  delete from public.cover_upload_attempts where user_id = uid and created_at < now() - interval '1 day';
  if (
    select count(*) from public.cover_upload_attempts
     where user_id = uid and created_at > now() - interval '10 minutes'
  ) >= 10 then
    return false;
  end if;
  insert into public.cover_upload_attempts (user_id) values (uid);
  return true;
end;
$$;
revoke all on function public.claim_cover_upload(uuid) from public, anon, authenticated;
grant execute on function public.claim_cover_upload(uuid) to service_role;

-- About. bio (0001) and city are NOT readable as columns: both are read only through
-- get_profile_about() / list_people(), which apply each field's Friends/Everyone setting.
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists city_visibility text not null default 'friends';
alter table public.profiles drop constraint if exists profiles_city_len;
alter table public.profiles add constraint profiles_city_len check (city is null or char_length(city) <= 60);
alter table public.profiles drop constraint if exists profiles_city_visibility_check;
alter table public.profiles
  add constraint profiles_city_visibility_check check (city_visibility in ('friends', 'everyone'));
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 160) not valid;
alter table public.profiles add column if not exists bio_visibility text not null default 'everyone';
alter table public.profiles drop constraint if exists profiles_bio_visibility_check;
alter table public.profiles
  add constraint profiles_bio_visibility_check check (bio_visibility in ('friends', 'everyone'));
revoke select (bio) on public.profiles from authenticated;
grant update (city, city_visibility, bio_visibility) on public.profiles to authenticated;

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

-- No insert/update policies: uploads only come through /api/cover (service role), so nobody can
-- put a raw, un-stripped photo in the bucket. Drop the ones an earlier draft of 0013 created.
drop policy if exists "covers written to own folder" on storage.objects;
drop policy if exists "covers updated in own folder" on storage.objects;

drop policy if exists "covers deleted from own folder" on storage.objects;
create policy "covers deleted from own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- The About card for one person, as the caller may see it. Nothing across a block; bio and city
-- only when set to Everyone, the caller is a friend, or it's the caller's own profile.
-- Return type changed (bio_visibility, cover_alt), so drop first.
drop function if exists public.get_profile_about(uuid);
create or replace function public.get_profile_about(target uuid)
returns table (bio text, bio_visibility text, city text, city_visibility text, interests text[],
               joined_at timestamptz, cover_alt text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when p.id = auth.uid()
                or p.bio_visibility = 'everyone'
                or public.are_friends(auth.uid(), p.id)
              then p.bio end,
         case when p.id = auth.uid() then p.bio_visibility end,
         case when p.id = auth.uid()
                or p.city_visibility = 'everyone'
                or public.are_friends(auth.uid(), p.id)
              then p.city end,
         case when p.id = auth.uid() then p.city_visibility end,
         p.interests,
         date_trunc('month', p.created_at),
         p.cover_alt
  from public.profiles p
  where p.id = target
    and auth.uid() is not null
    and not public.is_blocked_with(p.id);
$$;
revoke all on function public.get_profile_about(uuid) from public, anon;
grant execute on function public.get_profile_about(uuid) to authenticated;

-- /people list with bio only where the caller may see it. Blocked people are left out.
create or replace function public.list_people(max_rows int default 100)
returns table (id uuid, name text, handle text, bio text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.name, p.handle,
         case when p.id = auth.uid()
                or p.bio_visibility = 'everyone'
                or public.are_friends(auth.uid(), p.id)
              then p.bio end
  from public.profiles p
  where auth.uid() is not null
    and not public.is_blocked_with(p.id)
  order by p.created_at desc
  limit greatest(1, least(max_rows, 200));
$$;
revoke all on function public.list_people(int) from public, anon;
grant execute on function public.list_people(int) to authenticated;

-- Cover files no profile points at, older than a day (failed saves, takedowns that left files).
create or replace function public.find_orphan_covers(max_rows int default 200)
returns setof text
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'covers'
     and o.created_at < now() - interval '24 hours'
     and not exists (select 1 from public.profiles p where p.cover_path = o.name)
   order by o.created_at
   limit greatest(1, least(max_rows, 500));
$$;
revoke all on function public.find_orphan_covers(int) from public, anon, authenticated;
grant execute on function public.find_orphan_covers(int) to service_role;
