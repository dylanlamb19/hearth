-- 0006: follows and blocks (#25). Run after 0005. hide_after_reports below is a superset of
-- the 0005 version.

-- ---------------------------------------------------------------------------
-- Blocks: symmetric in effect, private to the blocker. The blocked person is never told
-- and can't read the row.
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated;
grant select (blocker_id, blocked_id, created_at) on public.blocks to authenticated;
grant insert (blocked_id) on public.blocks to authenticated;
grant delete on public.blocks to authenticated;

drop policy if exists "blockers read own blocks" on public.blocks;
create policy "blockers read own blocks"
  on public.blocks for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "blockers insert own blocks" on public.blocks;
create policy "blockers insert own blocks"
  on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "blockers delete own blocks" on public.blocks;
create policy "blockers delete own blocks"
  on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- True when either person has blocked the other. Security definer so RLS on other tables can
-- ask without exposing the blocks table itself.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocks
     where (blocker_id = a and blocked_id = b)
        or (blocker_id = b and blocked_id = a)
  );
$$;
-- Not callable by clients (it would let anyone probe who blocked whom). Only definer
-- functions and triggers use it; RLS uses is_blocked_with() below.
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- Whether the current user and `other` are blocked in either direction.
create or replace function public.is_blocked_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_blocked_between(auth.uid(), other);
$$;
revoke all on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Follows
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
grant select (follower_id, followee_id, created_at) on public.follows to authenticated;
-- No direct INSERT: following goes through follow_user() below.
grant delete on public.follows to authenticated;

-- Any signed-in user can read follows, minus rows involving someone they're blocked with.
drop policy if exists "follows readable by signed-in users" on public.follows;
create policy "follows readable by signed-in users"
  on public.follows for select to authenticated
  using (
    not public.is_blocked_with(follower_id)
    and not public.is_blocked_with(followee_id)
  );

-- No insert policy: clients can't insert follows directly.
drop policy if exists "users follow as themselves" on public.follows;

drop policy if exists "users unfollow own follows" on public.follows;
create policy "users unfollow own follows"
  on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- Append-only log of follow actions, so unfollow/refollow can't dodge the cap.
-- Server-only: no client grants or policies.
create table if not exists public.follow_events (
  id bigint generated always as identity primary key,
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists follow_events_follower_idx on public.follow_events (follower_id, created_at);
alter table public.follow_events enable row level security;
revoke all on public.follow_events from anon, authenticated;

-- Rate cap: about 200 follow actions per account per 24h, counted from follow_events. Error
-- code HFOL1 lets the app show a friendly message.
create or replace function public.cap_follow_rate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    select count(*) from public.follow_events
     where follower_id = new.follower_id
       and created_at > now() - interval '24 hours'
  ) >= 200 then
    raise exception 'HEARTH_FOLLOW_LIMIT' using errcode = 'HFOL1';
  end if;
  insert into public.follow_events (follower_id, followee_id) values (new.follower_id, new.followee_id);
  return new;
end;
$$;

drop trigger if exists cap_follow_rate on public.follows;
create trigger cap_follow_rate
  before insert on public.follows
  for each row execute function public.cap_follow_rate();

-- The only way to follow someone. Missing account, self, or a block in either direction all
-- raise the same error (HFOL2), so a follow attempt can't reveal a block. Already following is
-- a no-op. The insert fires cap_follow_rate, which enforces the daily cap and logs the event.
create or replace function public.follow_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if target is null
     or target = me
     or not exists (select 1 from public.profiles p where p.id = target)
     or public.is_blocked_between(me, target) then
    raise exception 'HEARTH_FOLLOW_FAILED' using errcode = 'HFOL2';
  end if;
  if exists (select 1 from public.follows f where f.follower_id = me and f.followee_id = target) then
    return;
  end if;
  insert into public.follows (follower_id, followee_id) values (me, target);
end;
$$;
revoke all on function public.follow_user(uuid) from public, anon;
grant execute on function public.follow_user(uuid) to authenticated;

-- Blocking removes follows in both directions.
create or replace function public.unfollow_on_block()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and followee_id = new.blocked_id)
      or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists unfollow_on_block on public.blocks;
create trigger unfollow_on_block
  after insert on public.blocks
  for each row execute function public.unfollow_on_block();

-- ---------------------------------------------------------------------------
-- Reads exclude people on either side of a block.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated
  using (not public.is_blocked_with(id));

drop policy if exists "moments readable when public or own" on public.moments;
create policy "moments readable when public or own"
  on public.moments for select to authenticated
  using (
    deleted_at is null
    and (
      auth.uid() = author_id
      or (
        visibility = 'public'
        and not hidden_pending_review
        and not public.is_blocked_with(author_id)
      )
    )
  );
-- TODO(friends): the friends clause MUST keep excluding hidden_pending_review, deleted_at
-- and is_blocked_between for everyone but the author, like the public clause above.
-- TODO(#26 comments): comments read rules must use is_blocked_with too.

-- ---------------------------------------------------------------------------
-- Reports: a blocked person's report is still saved (they can no longer see the Moment, so
-- the insert check ignores blocks), but it doesn't count toward auto-hide.
-- ---------------------------------------------------------------------------
create or replace function public.can_report_moment(target uuid)
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
       and (m.author_id = auth.uid() or (m.visibility = 'public' and not m.hidden_pending_review))
  );
$$;
revoke all on function public.can_report_moment(uuid) from public;
grant execute on function public.can_report_moment(uuid) to authenticated;

drop policy if exists "users file their own reports" on public.reports;
create policy "users file their own reports"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.can_report_moment(moment_id));

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
      -- Re-flagging reopens and refreshes the reason (0005 also bumps last_flagged_at).
      set status = 'open',
          reason = excluded.reason;
  end if;

  -- Qualifying reporters: account at least 3 days old and not blocked with the author
  -- (either direction).
  if (
    select count(distinct r.reporter_id)
      from public.reports r
      join auth.users u on u.id = r.reporter_id
     where r.moment_id = new.moment_id
       and r.status = 'open'
       and u.created_at <= now() - interval '3 days'
       and not public.is_blocked_between(r.reporter_id, author)
  ) >= 3 then
    update public.moments set hidden_pending_review = true where id = new.moment_id;
  end if;
  return new;
end;
$$;
