-- 0005: orphan upload cleanup and moderation hardening. Run after 0004.

-- Uploads are tracked so files that never get attached to a Moment can be cleaned up.
-- Written only by the server (service role); clients have no access.
create table if not exists public.media_uploads (
  path text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  attached boolean not null default false
);
create index if not exists media_uploads_unattached_idx
  on public.media_uploads (created_at) where not attached;
alter table public.media_uploads enable row level security;
revoke all on public.media_uploads from anon, authenticated;

-- Attach on create: when a Moment is saved with a photo, mark that upload attached.
create or replace function public.attach_moment_media()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.media_path is not null then
    update public.media_uploads
       set attached = true
     where path = new.media_path and owner_id = new.author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists attach_moment_media on public.moments;
create trigger attach_moment_media
  after insert on public.moments
  for each row execute function public.attach_moment_media();

-- reports -> moments: make sure the FK cascades even on databases that ran an older 0004.
alter table public.reports drop constraint if exists reports_moment_id_fkey;
alter table public.reports
  add constraint reports_moment_id_fkey
  foreign key (moment_id) references public.moments (id) on delete cascade;

-- flagged_accounts.first_flagged_at -> last_flagged_at: it now moves on every re-flag.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'flagged_accounts' and column_name = 'first_flagged_at'
  ) then
    alter table public.flagged_accounts rename column first_flagged_at to last_flagged_at;
  end if;
end;
$$;

-- Any update that leaves the account open (a new flag) refreshes last_flagged_at. Resolving
-- doesn't. Kept in a trigger so every version of hide_after_reports gets it.
create or replace function public.touch_flagged_account()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'open' then
    new.last_flagged_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists touch_flagged_account on public.flagged_accounts;
create trigger touch_flagged_account
  before update on public.flagged_accounts
  for each row execute function public.touch_flagged_account();

-- Re-flagging an account refreshes its reason and timestamp (and reopens it).
create or replace function public.hide_after_reports()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  author uuid;
begin
  select m.author_id into author from public.moments m where m.id = new.moment_id;

  if new.needs_account_review and author is not null then
    insert into public.flagged_accounts (user_id, reason)
    values (author, new.reason)
    on conflict (user_id) do update
      -- Re-flagging reopens and refreshes the reason; the trigger below bumps last_flagged_at.
      set status = 'open',
          reason = excluded.reason;
  end if;

  if (
    select count(distinct r.reporter_id)
      from public.reports r
      join auth.users u on u.id = r.reporter_id
     where r.moment_id = new.moment_id
       and r.status = 'open'
       and u.created_at <= now() - interval '3 days'
  ) >= 3 then
    update public.moments set hidden_pending_review = true where id = new.moment_id;
  end if;
  return new;
end;
$$;

-- Who restored or removed what. Server-only.
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  action text not null check (action in ('restore', 'remove', 'resolve_flag')),
  target_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Attaching: only tracked uploads from the last 24h (older ones may be mid-cleanup).
-- ---------------------------------------------------------------------------
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
  if tg_op = 'INSERT' or new.media_path is distinct from old.media_path then
    if not exists (
      select 1 from public.media_uploads u
       where u.path = new.media_path
         and u.owner_id = new.author_id
         and u.created_at > now() - interval '24 hours'
    ) then
      raise exception 'Upload expired or unknown' using errcode = 'P0002';
    end if;
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

-- Deleting a Moment (user RPC or admin Remove) marks its upload unattached, so the daily
-- cleanup retries the file if the immediate removal failed.
create or replace function public.detach_moment_media()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null and new.media_path is not null then
    update public.media_uploads set attached = false where path = new.media_path;
  end if;
  return new;
end;
$$;

drop trigger if exists detach_moment_media on public.moments;
create trigger detach_moment_media
  after update of deleted_at on public.moments
  for each row execute function public.detach_moment_media();

-- ---------------------------------------------------------------------------
-- Cleanup helpers for /api/cron/media-cleanup (service role only).
-- ---------------------------------------------------------------------------
-- Claims unattached uploads older than 24h: deletes their rows and returns the paths, so
-- only those files are removed and nothing can attach them afterwards.
create or replace function public.claim_orphan_uploads(max_rows int default 500)
returns setof text
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.media_uploads
   where path in (
     select path from public.media_uploads
      where not attached and created_at < now() - interval '24 hours'
      order by created_at
      limit greatest(1, least(max_rows, 1000))
      for update skip locked
   )
  returning path;
$$;

-- Bucket-vs-moments sweep for files from before media_uploads existed: objects older than
-- 24h that aren't tracked and aren't attached to a live Moment. Bounded per run.
create or replace function public.find_untracked_media(max_rows int default 200)
returns setof text
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'moment-media'
     and o.created_at < now() - interval '24 hours'
     and not exists (select 1 from public.media_uploads u where u.path = o.name)
     and not exists (
       select 1 from public.moments m where m.media_path = o.name and m.deleted_at is null
     )
   order by o.created_at
   limit greatest(1, least(max_rows, 500));
$$;

revoke all on function public.claim_orphan_uploads(int) from public, anon, authenticated;
revoke all on function public.find_untracked_media(int) from public, anon, authenticated;
grant execute on function public.claim_orphan_uploads(int) to service_role;
grant execute on function public.find_untracked_media(int) to service_role;
