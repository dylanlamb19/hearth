-- 0007: reactions (Love) and comments (#26). Run after 0006.

-- Whether the current user can see a Moment (same rules as the moments read policy).
create or replace function public.can_see_moment(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.moments m
     where m.id = target
       and m.deleted_at is null
       and (
         m.author_id = auth.uid()
         or (m.visibility = 'public' and not m.hidden_pending_review
             and not public.is_blocked_between(auth.uid(), m.author_id))
       )
  );
$$;
revoke all on function public.can_see_moment(uuid) from public;
grant execute on function public.can_see_moment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reactions: one Love per person per Moment.
-- ---------------------------------------------------------------------------
create table if not exists public.reactions (
  moment_id uuid not null references public.moments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null default 'love' check (kind in ('love')),
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id)
);
alter table public.reactions enable row level security;
revoke all on public.reactions from anon, authenticated;
grant select (moment_id, user_id, kind, created_at) on public.reactions to authenticated;
grant insert (moment_id, kind) on public.reactions to authenticated;
grant delete on public.reactions to authenticated;

drop policy if exists "reactions readable with their moment" on public.reactions;
create policy "reactions readable with their moment"
  on public.reactions for select to authenticated
  using (public.can_see_moment(moment_id) and not public.is_blocked_between(auth.uid(), user_id));

drop policy if exists "users react as themselves" on public.reactions;
create policy "users react as themselves"
  on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_moment(moment_id));

drop policy if exists "users remove own reactions" on public.reactions;
create policy "users remove own reactions"
  on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Comments: soft delete through delete_comment(); blocks hide comments both ways.
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  hidden_pending_review boolean not null default false
);
create index if not exists comments_moment_idx on public.comments (moment_id, created_at);

alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select (id, moment_id, author_id, body, created_at) on public.comments to authenticated;
grant insert (moment_id, body) on public.comments to authenticated;
-- No update or delete grants: comments aren't editable, and deletion goes through the RPC.

drop policy if exists "comments readable with their moment" on public.comments;
create policy "comments readable with their moment"
  on public.comments for select to authenticated
  using (
    deleted_at is null
    and public.can_see_moment(moment_id)
    and not public.is_blocked_between(auth.uid(), author_id)
    and (not hidden_pending_review or author_id = auth.uid())
  );

drop policy if exists "users comment as themselves" on public.comments;
create policy "users comment as themselves"
  on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_moment(moment_id));

-- The comment's author or the Moment's author can delete (soft) a comment.
create or replace function public.delete_comment(comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.comments c
     set deleted_at = now()
    from public.moments m
   where c.id = comment_id
     and m.id = c.moment_id
     and c.deleted_at is null
     and (c.author_id = auth.uid() or m.author_id = auth.uid());
  if not found then
    raise exception 'comment not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.delete_comment(uuid) from public;
grant execute on function public.delete_comment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reporting comments: reports gains an optional comment_id (moment_id stays required and
-- must be the comment's Moment). One report per person per Moment, and per comment.
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists comment_id uuid references public.comments (id) on delete cascade;
alter table public.reports drop constraint if exists reports_one_per_reporter;
create unique index if not exists reports_one_per_reporter_moment
  on public.reports (reporter_id, moment_id) where comment_id is null;
create unique index if not exists reports_one_per_reporter_comment
  on public.reports (reporter_id, comment_id) where comment_id is not null;
grant insert (comment_id) on public.reports to authenticated;

create or replace function public.can_report_comment(target uuid, parent uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.comments c
      join public.moments m on m.id = c.moment_id
     where c.id = target
       and c.moment_id = parent
       and c.deleted_at is null
       and m.deleted_at is null
  );
$$;
revoke all on function public.can_report_comment(uuid, uuid) from public;
grant execute on function public.can_report_comment(uuid, uuid) to authenticated;

drop policy if exists "users file their own reports" on public.reports;
create policy "users file their own reports"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and (
      (comment_id is null and public.can_report_moment(moment_id))
      or (comment_id is not null and public.can_report_comment(comment_id, moment_id))
    )
  );

-- Superset of the 0006 version: comment reports count per comment and hide the comment;
-- Moment reports work as before.
create or replace function public.hide_after_reports()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_author uuid;
begin
  if new.comment_id is not null then
    select c.author_id into target_author from public.comments c where c.id = new.comment_id;
  else
    select m.author_id into target_author from public.moments m where m.id = new.moment_id;
  end if;

  if new.needs_account_review and target_author is not null then
    insert into public.flagged_accounts (user_id, reason)
    values (target_author, new.reason)
    on conflict (user_id) do update
      -- Re-flagging reopens and refreshes the reason (0005 also bumps last_flagged_at).
      set status = 'open',
          reason = excluded.reason;
  end if;

  -- Qualifying reporters: account at least 3 days old and not blocked with the author.
  if (
    select count(distinct r.reporter_id)
      from public.reports r
      join auth.users u on u.id = r.reporter_id
     where r.moment_id = new.moment_id
       and r.comment_id is not distinct from new.comment_id
       and r.status = 'open'
       and u.created_at <= now() - interval '3 days'
       and not public.is_blocked_between(r.reporter_id, target_author)
  ) >= 3 then
    if new.comment_id is not null then
      update public.comments set hidden_pending_review = true where id = new.comment_id;
    else
      update public.moments set hidden_pending_review = true where id = new.moment_id;
    end if;
  end if;
  return new;
end;
$$;
