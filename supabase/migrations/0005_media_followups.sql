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
      set status = 'open',
          reason = excluded.reason,
          first_flagged_at = now();
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
