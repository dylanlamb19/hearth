-- Hearth #24: photos and videos on Moments. Run after 0003_moments.sql. Safe to re-run.
--
-- Private bucket: nothing is public. Reads use short-lived signed URLs, which Storage only
-- issues when the object belongs to a Moment the reader can see and that isn't deleted.
-- Writes: clients can't insert into the bucket. Photos go through /api/media (re-encoded on the
-- server, metadata stripped). Video uploads are off for now.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moment-media', 'moment-media', false,
  4194304, -- 4 MB: photos only (re-encoded JPEG from /api/media).
  -- Video is off for real accounts until its metadata (e.g. location) can be stripped server-side.
  array['image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Media on a Moment: one object, path "<author uuid>/<random uuid>.<ext>". Never the original filename.
alter table public.moments add column if not exists media_path text;
alter table public.moments add column if not exists media_type text;
-- Hidden for everyone but the author once 3+ different people report it, until reviewed.
alter table public.moments add column if not exists hidden_pending_review boolean not null default false;
alter table public.moments drop constraint if exists moments_media_type_check;
alter table public.moments add constraint moments_media_type_check
  check (media_type is null or media_type = 'image');
alter table public.moments drop constraint if exists moments_media_path_format;
alter table public.moments add constraint moments_media_path_format
  check (media_path is null or media_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');

grant select (media_path, media_type) on public.moments to authenticated;
grant select (hidden_pending_review) on public.moments to authenticated;
-- Only media_path is client-writable; media_type is derived on the server (trigger below).
grant insert (media_path) on public.moments to authenticated;

-- media_type comes from the stored file, never from the client.
-- The path must point at a file that actually exists in the bucket (uploaded by /api/media).
create or replace function public.set_moment_media_type()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  mime text;
begin
  if new.media_path is null then
    new.media_type := null;
    return new;
  end if;
  select o.metadata ->> 'mimetype' into mime
    from storage.objects o
   where o.bucket_id = 'moment-media' and o.name = new.media_path;
  if mime is null then
    raise exception 'Unknown media' using errcode = 'P0002';
  end if;
  new.media_type := case when mime = 'image/jpeg' then 'image' else null end;
  if new.media_type is null then
    raise exception 'Unsupported media' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists set_moment_media_type on public.moments;
create trigger set_moment_media_type
  before insert or update of media_path on public.moments
  for each row execute function public.set_moment_media_type();

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

-- No insert, update or delete policies: clients can't write to or delete from the bucket.
-- Uploads go through /api/media; files are removed by /api/moments/delete with the admin client.
drop policy if exists "owners delete own moment media" on storage.objects;
-- Orphan cleanup (uploads never attached to a Moment) is a follow-up: forge/chore-media-orphan-cleanup.

-- delete_moment now returns the media path so /api/moments/delete can remove the object.
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

-- Reads: also hide Moments pending review from everyone except their author.
drop policy if exists "moments readable when public or own" on public.moments;
create policy "moments readable when public or own"
  on public.moments for select
  to authenticated
  using (
    deleted_at is null
    and (
      auth.uid() = author_id
      or (visibility = 'public' and not hidden_pending_review)
    )
  );
-- TODO(friends): friends-visibility clause, also excluding hidden_pending_review.

-- Reports. Anyone signed in can file one (once per Moment); nobody can read them through the
-- API. Admins review them at /admin/reports (server-side, admin client).
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  moment_id uuid references public.moments (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 80),
  note text check (note is null or char_length(note) <= 280),
  status text not null default 'open' check (status in ('open', 'resolved')),
  needs_account_review boolean not null default false,
  created_at timestamptz not null default now(),
  constraint reports_one_per_reporter unique (reporter_id, moment_id)
);

alter table public.reports add column if not exists status text not null default 'open';

-- "Someone under 13" flags the account for review.
create or replace function public.flag_report_for_review()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.needs_account_review := (new.reason = 'Someone under 13');
  new.status := 'open';
  return new;
end;
$$;

drop trigger if exists flag_report_for_review on public.reports;
create trigger flag_report_for_review
  before insert on public.reports
  for each row execute function public.flag_report_for_review();

-- 3 or more different reporters: hide the Moment for everyone but its author until reviewed.
create or replace function public.hide_after_reports()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.moment_id is not null and (
    select count(distinct reporter_id) from public.reports
     where moment_id = new.moment_id and status = 'open'
  ) >= 3 then
    update public.moments set hidden_pending_review = true where id = new.moment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists hide_after_reports on public.reports;
create trigger hide_after_reports
  after insert on public.reports
  for each row execute function public.hide_after_reports();

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant insert (moment_id, reason, note) on public.reports to authenticated;

drop policy if exists "users file their own reports" on public.reports;
create policy "users file their own reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());
-- No select policy: reports can't be read through the API, not even by the reporter.
