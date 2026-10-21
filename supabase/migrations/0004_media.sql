-- Hearth #24: photos and videos on Moments. Run after 0003_moments.sql. Safe to re-run.
--
-- Private bucket: nothing is public. Reads use short-lived signed URLs, which Storage only
-- issues when the object belongs to a Moment the reader can see and that isn't deleted.
-- Writes: clients can't insert into the bucket. Photos go through /api/media (re-encoded on the
-- server, metadata stripped); videos get a one-time signed upload URL from the same route.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moment-media', 'moment-media', false,
  52428800, -- 50 MB: the video cap. Photos are capped lower (4 MB) by /api/media.
  array['image/jpeg', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Media on a Moment: one object, path "<author uuid>/<random uuid>.<ext>". Never the original filename.
alter table public.moments add column if not exists media_path text;
alter table public.moments add column if not exists media_type text;
alter table public.moments drop constraint if exists moments_media_type_check;
alter table public.moments add constraint moments_media_type_check
  check (media_type is null or media_type in ('image', 'video'));
alter table public.moments drop constraint if exists moments_media_path_format;
alter table public.moments add constraint moments_media_path_format
  check (media_path is null or media_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|mp4|webm|mov)$');

grant select (media_path, media_type) on public.moments to authenticated;
grant insert (media_path, media_type) on public.moments to authenticated;

-- Authors may only attach objects from their own folder.
drop policy if exists "authors insert own moments" on public.moments;
create policy "authors insert own moments"
  on public.moments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (media_path is null or split_part(media_path, '/', 1) = auth.uid()::text)
  );

-- Storage: read (and so sign) only objects attached to a visible, non-deleted Moment.
-- The moments subquery runs under the reader's RLS, which already hides deleted rows.
drop policy if exists "moment media readable with its moment" on storage.objects;
create policy "moment media readable with its moment"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'moment-media'
    and exists (select 1 from public.moments m where m.media_path = storage.objects.name)
  );

-- Owners can delete their own objects (first folder segment = their user id).
-- There is deliberately no insert/update policy: clients can't write to the bucket directly.
drop policy if exists "owners delete own moment media" on storage.objects;
create policy "owners delete own moment media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'moment-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- delete_moment now returns the media path so the app can remove the object right away.
-- (Supabase doesn't support deleting Storage files from SQL; the read policy above already
-- stops signing once the Moment is deleted, and existing signed URLs expire within minutes.)
drop function if exists public.delete_moment(uuid);
create or replace function public.delete_moment(moment_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  path text;
begin
  update public.moments
     set deleted_at = now()
   where id = moment_id
     and author_id = auth.uid()
     and deleted_at is null
  returning media_path into path;
  if not found then
    raise exception 'Moment not found' using errcode = 'P0002';
  end if;
  return path;
end;
$$;

revoke all on function public.delete_moment(uuid) from public, anon;
grant execute on function public.delete_moment(uuid) to authenticated;
