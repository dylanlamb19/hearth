-- 0008: friend requests ("Knocking at the door") and friendships. Run after 0007.
-- All writes go through security-definer RPCs; clients have no insert/update/delete grants.

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  recipient_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_sender_fkey foreign key (sender_id) references public.profiles (id) on delete cascade,
  constraint friend_requests_recipient_fkey foreign key (recipient_id) references public.profiles (id) on delete cascade,
  constraint friend_requests_no_self check (sender_id <> recipient_id),
  constraint friend_requests_one_per_pair unique (sender_id, recipient_id)
);
create index if not exists friend_requests_recipient_idx on public.friend_requests (recipient_id, status);

alter table public.friend_requests enable row level security;
revoke all on public.friend_requests from anon, authenticated;
-- status is not readable: a declined knock looks the same as a pending one to its sender.
grant select (id, sender_id, recipient_id, created_at) on public.friend_requests to authenticated;

drop policy if exists "senders see their knocks" on public.friend_requests;
create policy "senders see their knocks"
  on public.friend_requests for select to authenticated
  using (sender_id = auth.uid());

drop policy if exists "recipients see pending knocks" on public.friend_requests;
create policy "recipients see pending knocks"
  on public.friend_requests for select to authenticated
  using (recipient_id = auth.uid() and status = 'pending' and not public.is_blocked_with(sender_id));

-- Friendships: one row per pair, stored with user_a < user_b.
create table if not exists public.friendships (
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint friendships_ordered check (user_a < user_b)
);
create index if not exists friendships_b_idx on public.friendships (user_b);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select (user_a, user_b, created_at) on public.friendships to authenticated;

drop policy if exists "people see their own friendships" on public.friendships;
create policy "people see their own friendships"
  on public.friendships for select to authenticated
  using (auth.uid() in (user_a, user_b));

-- Append-only log for the daily knock cap. Server-only.
create table if not exists public.knock_events (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists knock_events_sender_idx on public.knock_events (sender_id, created_at);
alter table public.knock_events enable row level security;
revoke all on public.knock_events from anon, authenticated;

create or replace function public.make_friends(a uuid, b uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.friendships (user_a, user_b)
  values (least(a, b), greatest(a, b))
  on conflict do nothing;
  delete from public.friend_requests
   where (sender_id = a and recipient_id = b) or (sender_id = b and recipient_id = a);
$$;
revoke all on function public.make_friends(uuid, uuid) from public, anon, authenticated;

-- Knock on someone's door. A missing account, yourself, or a block in either direction all raise
-- the same error (HKNK1). About 50 knocks a day (HKNK2). Already friends, already knocked, or
-- previously declined: quietly does nothing. If they already knocked on yours, you're friends.
create or replace function public.send_knock(target uuid)
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
    raise exception 'HEARTH_KNOCK_FAILED' using errcode = 'HKNK1';
  end if;
  if exists (select 1 from public.friendships f where f.user_a = least(me, target) and f.user_b = greatest(me, target)) then
    return;
  end if;
  if exists (select 1 from public.friend_requests r where r.sender_id = target and r.recipient_id = me and r.status = 'pending') then
    perform public.make_friends(me, target);
    return;
  end if;
  if exists (select 1 from public.friend_requests r where r.sender_id = me and r.recipient_id = target) then
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('knock:' || me::text, 0));
  if (select count(*) from public.knock_events e where e.sender_id = me and e.created_at > now() - interval '24 hours') >= 50 then
    raise exception 'HEARTH_KNOCK_LIMIT' using errcode = 'HKNK2';
  end if;
  insert into public.knock_events (sender_id) values (me);
  insert into public.friend_requests (sender_id, recipient_id) values (me, target) on conflict do nothing;
end;
$$;

-- Answer a knock you received: accept ("Let in") makes you friends; decline ("Not now") is
-- quiet: the sender isn't told and their knock just stays as it was on their side.
create or replace function public.respond_knock(knock_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  req record;
begin
  select r.sender_id, r.recipient_id into req
    from public.friend_requests r
   where r.id = knock_id and r.recipient_id = me and r.status = 'pending'
   for update;
  if not found then
    raise exception 'HEARTH_KNOCK_FAILED' using errcode = 'HKNK1';
  end if;
  if accept then
    if public.is_blocked_between(me, req.sender_id) then
      raise exception 'HEARTH_KNOCK_FAILED' using errcode = 'HKNK1';
    end if;
    perform public.make_friends(me, req.sender_id);
  else
    update public.friend_requests set status = 'declined', responded_at = now() where id = knock_id;
  end if;
end;
$$;

-- Take back a knock you sent.
create or replace function public.cancel_knock(knock_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.friend_requests where id = knock_id and sender_id = auth.uid();
  if not found then
    raise exception 'HEARTH_KNOCK_FAILED' using errcode = 'HKNK1';
  end if;
end;
$$;

-- Unfriend: removes the friendship for both people.
create or replace function public.unfriend(other uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.friendships
   where user_a = least(auth.uid(), other) and user_b = greatest(auth.uid(), other);
$$;

revoke all on function public.send_knock(uuid) from public, anon;
revoke all on function public.respond_knock(uuid, boolean) from public, anon;
revoke all on function public.cancel_knock(uuid) from public, anon;
revoke all on function public.unfriend(uuid) from public, anon;
grant execute on function public.send_knock(uuid) to authenticated;
grant execute on function public.respond_knock(uuid, boolean) to authenticated;
grant execute on function public.cancel_knock(uuid) to authenticated;
grant execute on function public.unfriend(uuid) to authenticated;

-- Blocking removes knocks in both directions and the friendship.
create or replace function public.unfriend_on_block()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.friend_requests
   where (sender_id = new.blocker_id and recipient_id = new.blocked_id)
      or (sender_id = new.blocked_id and recipient_id = new.blocker_id);
  delete from public.friendships
   where user_a = least(new.blocker_id, new.blocked_id) and user_b = greatest(new.blocker_id, new.blocked_id);
  return new;
end;
$$;

drop trigger if exists unfriend_on_block on public.blocks;
create trigger unfriend_on_block
  after insert on public.blocks
  for each row execute function public.unfriend_on_block();
-- TODO(friends visibility): the moments friends clause can now use public.friendships.
