-- 0006: follows and blocks (#25). Run after 0004. (Numbered 0006 so it can sit after
-- 0005_media_followups; it doesn't depend on it. hide_after_reports below is a superset of
-- the 0005 version, so running 0006 last keeps both changes.)

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
revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

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
grant insert (followee_id) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- Any signed-in user can read follows, minus rows involving someone they're blocked with.
drop policy if exists "follows readable by signed-in users" on public.follows;
create policy "follows readable by signed-in users"
  on public.follows for select to authenticated
  using (
    not public.is_blocked_between(auth.uid(), follower_id)
    and not public.is_blocked_between(auth.uid(), followee_id)
  );

-- Neither side of a block can follow the other.
drop policy if exists "users follow as themselves" on public.follows;
create policy "users follow as themselves"
  on public.follows for insert to authenticated
  with check (
    follower_id = auth.uid()
    and not public.is_blocked_between(follower_id, followee_id)
  );

drop policy if exists "users unfollow own follows" on public.follows;
create policy "users unfollow own follows"
  on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- Rate cap: about 200 new follows per account per 24h. Error code HFOL1 lets the app show a
-- friendly message.
create or replace function public.cap_follow_rate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    select count(*) from public.follows
     where follower_id = new.follower_id
       and created_at > now() - interval '24 hours'
  ) >= 200 then
    raise exception 'HEARTH_FOLLOW_LIMIT' using errcode = 'HFOL1';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_follow_rate on public.follows;
create trigger cap_follow_rate
  before insert on public.follows
  for each row execute function public.cap_follow_rate();

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
  using (not public.is_blocked_between(auth.uid(), id));

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
        and not public.is_blocked_between(auth.uid(), author_id)
      )
    )
  );
-- TODO(friends): the friends clause MUST keep excluding hidden_pending_review, deleted_at
-- and is_blocked_between for everyone but the author, like the public clause above.
-- TODO(#26 comments): comments read rules must use is_blocked_between too.

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
      set status = 'open',
          reason = excluded.reason,
          first_flagged_at = now();
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
