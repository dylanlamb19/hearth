-- 0010: the feed (#29). Audience (friends | everyone), one visibility helper, get_feed,
-- and private seen tracking. Run after 0009. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Audience. moments.visibility (from 0003) becomes 'friends' | 'everyone', default 'friends'.
-- Older Moments become 'friends' (including old 'public' ones): the safer default, since
-- 'everyone' now reaches followers who aren't friends. Authors can widen them again.
-- ---------------------------------------------------------------------------
alter table public.moments drop constraint if exists moments_visibility_check;
update public.moments set visibility = 'friends' where visibility not in ('friends', 'everyone');
alter table public.moments alter column visibility set default 'friends';
alter table public.moments
  add constraint moments_visibility_check check (visibility in ('friends', 'everyone'));

-- Internal: are a and b friends? Not callable by clients.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.friendships f where f.user_a = least(a, b) and f.user_b = greatest(a, b)
  );
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- The one audience check. Every read and write path goes through it: the moments policy,
-- get_feed, list_comments, comment and reaction policies, toggle_comment_love and media
-- signing. Reports use can_see_moment_ignoring_blocks (below), which only skips the block test.
-- You can see a Moment if it isn't removed and either it's yours, or it isn't hidden pending
-- review, there's no block either way, and you're a friend (friends or everyone) or a
-- follower (everyone only). Missing and not-visible look the same: false.
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
         or (
           not m.hidden_pending_review
           and not public.is_blocked_between(auth.uid(), m.author_id)
           and (
             public.are_friends(auth.uid(), m.author_id)
             or (m.visibility = 'everyone'
                 and exists (select 1 from public.follows f
                              where f.follower_id = auth.uid() and f.followee_id = m.author_id))
           )
         )
       )
  );
$$;
revoke all on function public.can_see_moment(uuid) from public, anon;
grant execute on function public.can_see_moment(uuid) to authenticated;

-- Internal, for reports only: the same audience check minus the block test. A report filed
-- across a block is still saved (marked reporter_blocked when the author blocked the reporter,
-- see 0009), and someone who blocked an author can still flag them as under 13. The reporter
-- gets the same response either way. No client grants.
create or replace function public.can_see_moment_ignoring_blocks(target uuid)
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
         or (
           not m.hidden_pending_review
           and (
             public.are_friends(auth.uid(), m.author_id)
             or (m.visibility = 'everyone'
                 and exists (select 1 from public.follows f
                              where f.follower_id = auth.uid() and f.followee_id = m.author_id))
           )
         )
       )
  );
$$;
revoke all on function public.can_see_moment_ignoring_blocks(uuid) from public, anon, authenticated;

drop policy if exists "moments readable when public or own" on public.moments;
drop policy if exists "moments readable by their audience" on public.moments;
create policy "moments readable by their audience"
  on public.moments for select to authenticated
  using (public.can_see_moment(id));

-- Reports: you can report what your audience allows, ignoring blocks (supersedes 0006).
create or replace function public.can_report_moment(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.can_see_moment_ignoring_blocks(target);
$$;
revoke all on function public.can_report_moment(uuid) from public, anon;
grant execute on function public.can_report_moment(uuid) to authenticated;

-- Comments: the comment must be live (not hidden unless yours) on a Moment your audience
-- allows, ignoring blocks (supersedes 0007). Used by comment reports. The reply check also
-- calls it, but it tests blocks separately with is_blocked_between, so replies still stop
-- at a block.
create or replace function public.can_report_comment(target uuid, parent uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.can_see_moment_ignoring_blocks(parent) and exists (
    select 1 from public.comments c
     where c.id = target
       and c.moment_id = parent
       and c.deleted_at is null
       and (not c.hidden_pending_review or c.author_id = auth.uid())
  );
$$;
revoke all on function public.can_report_comment(uuid, uuid) from public, anon;
grant execute on function public.can_report_comment(uuid, uuid) to authenticated;

-- Reactions and comments: reads and writes re-check the audience, so lowering a Moment from
-- everyone to friends stops non-friends reacting or replying (policies restated from 0007).
drop policy if exists "reactions readable with their moment" on public.reactions;
create policy "reactions readable with their moment"
  on public.reactions for select to authenticated
  using (public.can_see_moment(moment_id) and not public.is_blocked_with(user_id));
drop policy if exists "users react as themselves" on public.reactions;
create policy "users react as themselves"
  on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_moment(moment_id));
drop policy if exists "users comment as themselves" on public.comments;
create policy "users comment as themselves"
  on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_moment(moment_id));

-- Media: sign only files of a Moment you can see.
create or replace function public.can_see_media(path text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.moments m where m.media_path = path and public.can_see_moment(m.id)
  );
$$;
revoke all on function public.can_see_media(text) from public, anon;
grant execute on function public.can_see_media(text) to authenticated;

drop policy if exists "moment media readable with its moment" on storage.objects;
create policy "moment media readable with its moment"
  on storage.objects for select to authenticated
  using (bucket_id = 'moment-media' and public.can_see_media(storage.objects.name));

-- ---------------------------------------------------------------------------
-- Seen tracking. Private and server-only: no client reads, no "seen by" anywhere. Only your
-- own rows are ever used (for "From your people").
-- ---------------------------------------------------------------------------
create table if not exists public.moment_views (
  user_id uuid not null references public.profiles (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, moment_id)
);
alter table public.moment_views enable row level security;
revoke all on public.moment_views from anon, authenticated;

create table if not exists public.moment_view_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists moment_view_events_user_idx on public.moment_view_events (user_id, created_at);
alter table public.moment_view_events enable row level security;
revoke all on public.moment_view_events from anon, authenticated;

-- Batched: up to 50 ids per call, 30 calls per minute. Ids you can't see are skipped quietly.
create or replace function public.mark_moments_seen(ids uuid[])
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
  if ids is null or cardinality(ids) = 0 then
    return;
  end if;
  if cardinality(ids) > 50 then
    raise exception 'HEARTH_SEEN_FAILED' using errcode = 'HSEN1';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('seen:' || me::text, 0));
  if (select count(*) from public.moment_view_events e
       where e.user_id = me and e.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'HEARTH_SEEN_FAILED' using errcode = 'HSEN1';
  end if;
  insert into public.moment_view_events (user_id) values (me);
  delete from public.moment_view_events where user_id = me and created_at < now() - interval '1 hour';
  insert into public.moment_views (user_id, moment_id)
  select me, t.id from (select distinct unnest(ids) as id) t
   where public.can_see_moment(t.id)
  on conflict do nothing;
end;
$$;
revoke all on function public.mark_moments_seen(uuid[]) from public, anon;
grant execute on function public.mark_moments_seen(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- get_feed(tab, cursor). Sources: your own Moments, friends' and follows'.
--   tab 'all' = all three, 'friends' = yours + friends', 'following' = people you follow.
-- Newest first, keyset on (created_at, id), 20 per page. On the first page only, up to 5
-- unseen friend Moments from the last 24h come first with from_your_people = true (they may
-- also appear again in the list; the client keeps the first). No other ranking.
-- Counts only include activity you could see yourself (no blocks), so nothing about a
-- friends-only Moment reaches anyone outside its audience.
-- ---------------------------------------------------------------------------
create index if not exists moments_author_feed_idx
  on public.moments (author_id, created_at desc, id desc) where deleted_at is null;
create index if not exists moments_feed_idx
  on public.moments (created_at desc, id desc) where deleted_at is null;
create index if not exists reactions_moment_idx on public.reactions (moment_id);
create index if not exists follows_follower_idx on public.follows (follower_id);
create index if not exists friendships_a_idx on public.friendships (user_a);

create or replace function public.get_feed(
  tab text default 'all',
  cursor_at timestamptz default null,
  cursor_id uuid default null
)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_handle text,
  body text,
  visibility text,
  created_at timestamptz,
  media_path text,
  media_type text,
  reaction_count integer,
  comment_count integer,
  my_reaction text,
  from_your_people boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if tab is null or tab not in ('all', 'friends', 'following') then
    tab := 'all';
  end if;
  if (cursor_at is null) <> (cursor_id is null) then
    raise exception 'Bad cursor' using errcode = '22023';
  end if;

  return query
  with friend_ids as (
    select case when f.user_a = me then f.user_b else f.user_a end as uid
      from public.friendships f where me in (f.user_a, f.user_b)
  ),
  follow_ids as (
    select f.followee_id as uid from public.follows f where f.follower_id = me
  ),
  sources as (
    select me as uid where tab in ('all', 'friends')
    union select uid from friend_ids where tab in ('all', 'friends')
    union select uid from follow_ids where tab in ('all', 'following')
  ),
  pinned as (
    select m.id, true as pin
      from public.moments m
     where cursor_at is null
       and m.author_id in (select uid from friend_ids)
       and m.author_id in (select uid from sources)
       and m.deleted_at is null
       and not m.is_demo
       and m.created_at > now() - interval '24 hours'
       and not exists (select 1 from public.moment_views v where v.user_id = me and v.moment_id = m.id)
       and public.can_see_moment(m.id)
     order by m.created_at desc, m.id desc
     limit 5
  ),
  page as (
    select m.id, false as pin
      from public.moments m
     where m.author_id in (select uid from sources)
       and m.deleted_at is null
       and not m.is_demo
       and (cursor_at is null or (m.created_at, m.id) < (cursor_at, cursor_id))
       and public.can_see_moment(m.id)
     order by m.created_at desc, m.id desc
     limit 20
  ),
  picked as (
    select * from pinned
    union all
    select * from page
  )
  select m.id, m.author_id, p.name, p.handle, m.body, m.visibility, m.created_at,
         m.media_path, m.media_type,
         (select count(*)::integer from public.reactions r
           where r.moment_id = m.id and not public.is_blocked_between(me, r.user_id)),
         (select count(*)::integer from public.comments c
           where c.moment_id = m.id and c.deleted_at is null
             and (not c.hidden_pending_review or c.author_id = me)
             and not public.is_blocked_between(me, c.author_id)),
         (select r.kind from public.reactions r where r.moment_id = m.id and r.user_id = me),
         k.pin
    from picked k
    join public.moments m on m.id = k.id
    left join public.profiles p on p.id = m.author_id
   order by k.pin desc, m.created_at desc, m.id desc;
end;
$$;
revoke all on function public.get_feed(text, timestamptz, uuid) from public, anon;
grant execute on function public.get_feed(text, timestamptz, uuid) to authenticated;
