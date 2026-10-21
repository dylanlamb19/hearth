-- 0009: threaded replies polish. Love on comments, and reporter_blocked for Moment and
-- comment reports. Run after 0008. Safe to re-run.

-- ---------------------------------------------------------------------------
-- reporter_blocked for Moment and comment reports (0008 added it for person reports).
-- A report filed by someone the author has blocked is saved (so the reporter's duplicate
-- checks behave the same), but it never flags an account, never counts toward auto-hide,
-- and stays out of /admin/reports. Set server-side; clients can't insert this column.
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists reporter_blocked boolean not null default false;

-- Named so it runs before flag_report_for_review (same timing, alphabetical order), which
-- keeps needs_account_review false for reporter_blocked reports.
create or replace function public.mark_reporter_blocked()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_author uuid;
begin
  if new.moment_id is null then
    -- Person reports: report_user sets reporter_blocked itself.
    return new;
  end if;
  if new.comment_id is not null then
    select c.author_id into target_author from public.comments c where c.id = new.comment_id;
  else
    select m.author_id into target_author from public.moments m where m.id = new.moment_id;
  end if;
  new.reporter_blocked := target_author is not null and exists (
    select 1 from public.blocks b where b.blocker_id = target_author and b.blocked_id = new.reporter_id
  );
  return new;
end;
$$;

drop trigger if exists a_mark_reporter_blocked on public.reports;
create trigger a_mark_reporter_blocked
  before insert on public.reports
  for each row execute function public.mark_reporter_blocked();

-- Final version (supersedes 0007). Same as 0007, plus reporter_blocked reports never flag an
-- account and never count toward auto-hide.
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

  if new.needs_account_review and not new.reporter_blocked and target_author is not null then
    insert into public.flagged_accounts (user_id, reason)
    values (target_author, new.reason)
    on conflict (user_id) do update
      set status = 'open',
          reason = excluded.reason;
  end if;

  if new.moment_id is not null and not new.reporter_blocked and (
    select count(distinct r.reporter_id)
      from public.reports r
      join auth.users u on u.id = r.reporter_id
     where r.moment_id = new.moment_id
       and r.comment_id is not distinct from new.comment_id
       and r.status = 'open'
       and not r.reporter_blocked
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

-- ---------------------------------------------------------------------------
-- Love on comments ("time · Love · Reply"). One love per person per comment.
-- Not readable or writable directly: counts come from list_comments, changes go through
-- toggle_comment_love. Delete: un-love, and cascades with the comment or account.
-- Block: blocking removes loves between the two people, and loves from someone blocked with
-- the viewer aren't counted. Report: a love has no content of its own; report the comment.
-- ---------------------------------------------------------------------------
create table if not exists public.comment_loves (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists comment_loves_user_idx on public.comment_loves (user_id);
alter table public.comment_loves enable row level security;
revoke all on public.comment_loves from anon, authenticated;

-- Love or un-love a comment you can see. Returns whether you love it now. Same generic error
-- (HCLV1) for a missing, removed, hidden or blocked comment.
create or replace function public.toggle_comment_love(target_comment uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  c record;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select cm.id, cm.moment_id, cm.author_id into c
    from public.comments cm
   where cm.id = target_comment
     and cm.deleted_at is null
     and (not cm.hidden_pending_review or cm.author_id = me);
  if not found
     or not public.can_see_moment(c.moment_id)
     or public.is_blocked_between(me, c.author_id) then
    raise exception 'HEARTH_COMMENT_LOVE_FAILED' using errcode = 'HCLV1';
  end if;
  delete from public.comment_loves where comment_id = target_comment and user_id = me;
  if found then
    return false;
  end if;
  insert into public.comment_loves (comment_id, user_id) values (target_comment, me) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.toggle_comment_love(uuid) from public, anon;
grant execute on function public.toggle_comment_love(uuid) to authenticated;

-- Blocking removes loves either person left on the other's comments.
create or replace function public.unlove_on_block()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.comment_loves l
   using public.comments c
   where c.id = l.comment_id
     and ((l.user_id = new.blocker_id and c.author_id = new.blocked_id)
       or (l.user_id = new.blocked_id and c.author_id = new.blocker_id));
  return new;
end;
$$;
drop trigger if exists unlove_on_block on public.blocks;
create trigger unlove_on_block
  after insert on public.blocks
  for each row execute function public.unlove_on_block();

-- list_comments gains love_count and loved_by_me (return type changes, so drop first).
-- Same visibility as 0007: Moment visible, no blocks with the author, removed comments with
-- replies become placeholders.
drop function if exists public.list_comments(uuid);
create function public.list_comments(target uuid)
returns table (
  id uuid,
  parent_id uuid,
  author_id uuid,
  author_name text,
  body text,
  deleted boolean,
  created_at timestamptz,
  love_count integer,
  loved_by_me boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with visible as (
    select c.*
      from public.comments c
     where c.moment_id = target
       and public.can_see_moment(target)
       and not public.is_blocked_between(auth.uid(), c.author_id)
  ),
  live as (
    select v.* from visible v
     where v.deleted_at is null
       and (not v.hidden_pending_review or v.author_id = auth.uid())
  )
  select l.id, l.parent_id, l.author_id, p.name, l.body, false, l.created_at,
         (select count(*)::integer from public.comment_loves cl
           where cl.comment_id = l.id and not public.is_blocked_between(auth.uid(), cl.user_id)),
         exists (select 1 from public.comment_loves cl where cl.comment_id = l.id and cl.user_id = auth.uid())
    from live l
    left join public.profiles p on p.id = l.author_id
   where l.parent_id is null
      or exists (select 1 from live top where top.id = l.parent_id)
      or exists (select 1 from visible top where top.id = l.parent_id)
  union all
  select v.id, null::uuid, null::uuid, null::text, null::text, true, v.created_at, 0, false
    from visible v
   where v.parent_id is null
     and not exists (select 1 from live l where l.id = v.id)
     and exists (select 1 from live r where r.parent_id = v.id)
  order by 7
  limit 400;
$$;
revoke all on function public.list_comments(uuid) from public, anon;
grant execute on function public.list_comments(uuid) to authenticated;
