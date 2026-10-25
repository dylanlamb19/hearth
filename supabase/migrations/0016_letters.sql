-- 0016: Letters, private one-to-one messages. Run after 0015. Safe to re-run.
-- Spec: handoffs/reviews/letters.md. Clients never write these tables directly; every write
-- goes through a security definer RPC that checks membership, blocks, age and rate limits.
-- Realtime is not used (the page polls through list_letters), so there is no channel to
-- leak to blocked or removed members.

-- ---------------------------------------------------------------------------
-- Who may start a Letter with you. 'friends' (default) or 'friends_of_friends' (requests).
-- Strangers can never start one.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists letters_from text not null default 'friends';
alter table public.profiles drop constraint if exists profiles_letters_from_check;
alter table public.profiles
  add constraint profiles_letters_from_check check (letters_from in ('friends', 'friends_of_friends'));
grant select (letters_from), update (letters_from) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  started_by uuid not null references public.profiles (id) on delete cascade,
  -- 'request' until the other person accepts (friends-of-friends only); friends start 'active'.
  status text not null default 'active' check (status in ('active', 'request')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_ordered check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- "Delete for me": messages at or before this time are hidden for this member only.
  hidden_before timestamptz,
  muted boolean not null default false,
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  -- Link or phone number heuristics: listed in /admin/reports for a look.
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_review_idx on public.messages (needs_review) where needs_review;

-- Reports keep a snapshot of the text so it survives unsend and account delete.
-- People are "set null" on account delete; snapshots are purged by purge_message_reports().
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  snapshot jsonb not null default '[]'::jsonb,
  reason text not null check (char_length(reason) between 1 and 80),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists message_reports_open_idx on public.message_reports (status, created_at);

-- Server-only log for rate limits.
create table if not exists public.letter_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('message', 'conversation')),
  created_at timestamptz not null default now()
);
create index if not exists letter_events_user_idx on public.letter_events (user_id, kind, created_at);

-- ---------------------------------------------------------------------------
-- RLS: members only, nothing for anon, no direct writes.
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;
alter table public.letter_events enable row level security;
revoke all on public.conversations, public.conversation_members, public.messages,
  public.message_reports, public.letter_events from anon, authenticated;
grant select on public.conversations, public.conversation_members, public.messages to authenticated;

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations" on public.conversations for select to authenticated
  using (auth.uid() in (user_a, user_b) and not public.is_blocked_between(user_a, user_b));

drop policy if exists "members read own membership" on public.conversation_members;
create policy "members read own membership" on public.conversation_members for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
      join public.conversation_members m on m.conversation_id = c.id and m.user_id = auth.uid()
     where c.id = messages.conversation_id
       and not public.is_blocked_between(c.user_a, c.user_b)
       and (m.hidden_before is null or messages.created_at > m.hidden_before)
  ));

-- ---------------------------------------------------------------------------
-- Helpers (internal)
-- ---------------------------------------------------------------------------
-- Might be under 18. We only keep the birth year, so the borderline year counts as a minor.
create or replace function public.letters_maybe_minor(u uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select extract(year from now())::int - p.birth_year < 19 from public.profiles p where p.id = u), true);
$$;
revoke all on function public.letters_maybe_minor(uuid) from public, anon, authenticated;

create or replace function public.letters_friends_of_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.friendships f1, public.friendships f2
     where a in (f1.user_a, f1.user_b) and b in (f2.user_a, f2.user_b)
       and (case when f1.user_a = a then f1.user_b else f1.user_a end)
         = (case when f2.user_a = b then f2.user_b else f2.user_a end)
  );
$$;
revoke all on function public.letters_friends_of_friends(uuid, uuid) from public, anon, authenticated;

-- Raises HLTR2 when over the limit. New accounts (under 7 days) get a lower cap.
create or replace function public.letters_rate_check(me uuid, what text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  is_new boolean;
  n int;
begin
  select p.created_at > now() - interval '7 days' into is_new from public.profiles p where p.id = me;
  if what = 'message' then
    select count(*) into n from public.letter_events
     where user_id = me and kind = 'message' and created_at > now() - interval '1 minute';
    if n >= (case when coalesce(is_new, true) then 10 else 30 end) then
      raise exception 'Slow down a little' using errcode = 'HLTR2';
    end if;
  else
    select count(*) into n from public.letter_events
     where user_id = me and kind = 'conversation' and created_at > now() - interval '1 day';
    if n >= (case when coalesce(is_new, true) then 5 else 20 end) then
      raise exception 'That is a lot of new Letters for one day' using errcode = 'HLTR2';
    end if;
  end if;
  insert into public.letter_events (user_id, kind) values (me, what);
end;
$$;
revoke all on function public.letters_rate_check(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs. HLTR1 is deliberately generic: it never says whether a block, a setting or an age
-- rule was the reason.
-- ---------------------------------------------------------------------------
create or replace function public.start_letter(target uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  a uuid; b uuid;
  conv uuid;
  st text;
  pref text;
begin
  if me is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if target is null or target = me then raise exception 'Can''t send that Letter' using errcode = 'HLTR1'; end if;
  if public.is_blocked_between(me, target) then raise exception 'Can''t send that Letter' using errcode = 'HLTR1'; end if;
  a := least(me, target); b := greatest(me, target);
  select id into conv from public.conversations where user_a = a and user_b = b;
  if conv is not null then
    insert into public.conversation_members (conversation_id, user_id) values (conv, me) on conflict do nothing;
    return conv;
  end if;
  if public.are_friends(me, target) then
    st := 'active';
  else
    select letters_from into pref from public.profiles where id = target;
    -- Requests: friends of friends only, only if the other person allows it, and never
    -- between anyone who might be under 18 and someone they aren't friends with.
    if pref is distinct from 'friends_of_friends'
       or not public.letters_friends_of_friends(me, target)
       or public.letters_maybe_minor(me) or public.letters_maybe_minor(target) then
      raise exception 'Can''t send that Letter' using errcode = 'HLTR1';
    end if;
    st := 'request';
  end if;
  perform public.letters_rate_check(me, 'conversation');
  insert into public.conversations (user_a, user_b, started_by, status) values (a, b, me, st) returning id into conv;
  insert into public.conversation_members (conversation_id, user_id) values (conv, me), (conv, target);
  return conv;
end;
$$;

create or replace function public.send_letter(conv uuid, body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  c public.conversations;
  other uuid;
  clean text := btrim(coalesce(body, ''));
  flag boolean;
  mid uuid;
begin
  if me is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into c from public.conversations where id = conv;
  if c.id is null or me not in (c.user_a, c.user_b) then raise exception 'Can''t send that Letter' using errcode = 'HLTR1'; end if;
  other := case when c.user_a = me then c.user_b else c.user_a end;
  if public.is_blocked_between(me, other) then raise exception 'Can''t send that Letter' using errcode = 'HLTR1'; end if;
  if char_length(clean) = 0 or char_length(clean) > 2000 then raise exception 'Letters are 1 to 2000 characters' using errcode = '22023'; end if;
  -- A pending request allows one opening message from the starter; the reply accepts it.
  if c.status = 'request' then
    if me = c.started_by then
      if exists (select 1 from public.messages where conversation_id = conv) then
        raise exception 'Can''t send that Letter' using errcode = 'HLTR1';
      end if;
    else
      update public.conversations set status = 'active' where id = conv;
    end if;
  end if;
  perform public.letters_rate_check(me, 'message');
  flag := clean ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|io|ly|me|co|app|xyz)\M)'
       or regexp_replace(clean, '[^0-9]', '', 'g') ~ '[0-9]{7,}' and clean ~ '[0-9][0-9 ().-]{6,}[0-9]';
  insert into public.messages (conversation_id, sender_id, body, needs_review) values (conv, me, clean, flag) returning id into mid;
  update public.conversations set last_message_at = now() where id = conv;
  -- Sending again un-hides the thread for both people (from now on).
  insert into public.conversation_members (conversation_id, user_id) values (conv, me), (conv, other) on conflict do nothing;
  return mid;
end;
$$;

-- Inbox: active threads, plus requests in their own tray (is_request). No read receipts.
create or replace function public.list_conversations()
returns table (id uuid, peer_id uuid, peer_name text, peer_handle text, peer_photo text,
               is_request boolean, started_by_me boolean, last_body text, last_at timestamptz, muted boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, p.id, p.name, p.handle, p.photo_url,
         c.status = 'request', c.started_by = auth.uid(),
         lm.body, coalesce(lm.created_at, c.created_at), m.muted
    from public.conversations c
    join public.conversation_members m on m.conversation_id = c.id and m.user_id = auth.uid()
    join public.profiles p on p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
    left join lateral (
      select x.body, x.created_at from public.messages x
       where x.conversation_id = c.id and (m.hidden_before is null or x.created_at > m.hidden_before)
       order by x.created_at desc limit 1
    ) lm on true
   where auth.uid() is not null
     and not public.is_blocked_between(c.user_a, c.user_b)
     and (lm.created_at is not null or c.started_by = auth.uid() and m.hidden_before is null)
   order by coalesce(lm.created_at, c.created_at) desc
   limit 200;
$$;

create or replace function public.list_letters(conv uuid, before timestamptz default null)
returns table (id uuid, sender_id uuid, mine boolean, body text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select x.id, x.sender_id, x.sender_id = auth.uid(), x.body, x.created_at
    from public.messages x
    join public.conversations c on c.id = x.conversation_id
    join public.conversation_members m on m.conversation_id = c.id and m.user_id = auth.uid()
   where x.conversation_id = conv
     and not public.is_blocked_between(c.user_a, c.user_b)
     and (m.hidden_before is null or x.created_at > m.hidden_before)
     and (before is null or x.created_at < before)
   order by x.created_at desc
   limit 100;
$$;

-- Unsend: deletes your own message for both people. Only report snapshots keep the text.
create or replace function public.unsend_letter(message uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  delete from public.messages where id = message and sender_id = auth.uid();
end;
$$;

-- Delete for me: hides everything so far, for you only. Declining a request does the same.
create or replace function public.hide_conversation(conv uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  update public.conversation_members set hidden_before = now()
   where conversation_id = conv and user_id = auth.uid();
end;
$$;

create or replace function public.mute_conversation(conv uuid, on_off boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.conversation_members set muted = coalesce(on_off, false)
   where conversation_id = conv and user_id = auth.uid();
end;
$$;

-- Report one message (message set) or the whole thread (message null). Snapshots the text:
-- the one message, or the latest 50 visible to the reporter. "Someone under 13" also flags
-- the account like report_user does.
create or replace function public.report_letter(conv uuid, message uuid, reason text, note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  c public.conversations;
  other uuid;
  hb timestamptz;
  snap jsonb;
begin
  if me is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into c from public.conversations where id = conv;
  if c.id is null or me not in (c.user_a, c.user_b) then raise exception 'Report failed' using errcode = 'HRPT1'; end if;
  if (select count(*) from public.message_reports where reporter_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Too many reports' using errcode = 'HRPT2';
  end if;
  other := case when c.user_a = me then c.user_b else c.user_a end;
  select hidden_before into hb from public.conversation_members where conversation_id = conv and user_id = me;
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'sender_id', s.sender_id, 'body', s.body, 'at', s.created_at) order by s.created_at), '[]'::jsonb)
    into snap
    from (
      select x.* from public.messages x
       where x.conversation_id = conv
         and (message is null or x.id = message)
         and (hb is null or x.created_at > hb)
       order by x.created_at desc limit 50
    ) s;
  if message is not null and jsonb_array_length(snap) = 0 then raise exception 'Report failed' using errcode = 'HRPT1'; end if;
  insert into public.message_reports (reporter_id, reported_user_id, conversation_id, message_id, snapshot, reason, note)
  values (me, other, conv, message, snap,
          left(coalesce(nullif(btrim(reason), ''), 'Other'), 80), nullif(left(btrim(coalesce(note, '')), 1000), ''));
  if reason = 'Someone under 13'
     and not exists (select 1 from public.blocks b where b.blocker_id = other and b.blocked_id = me) then
    insert into public.flagged_accounts (user_id, reason) values (other, reason)
      on conflict (user_id) do update set status = 'open', reason = excluded.reason;
  end if;
end;
$$;

revoke all on function public.start_letter(uuid), public.send_letter(uuid, text), public.list_conversations(),
  public.list_letters(uuid, timestamptz), public.unsend_letter(uuid), public.hide_conversation(uuid),
  public.mute_conversation(uuid, boolean), public.report_letter(uuid, uuid, text, text) from public, anon;
grant execute on function public.start_letter(uuid), public.send_letter(uuid, text), public.list_conversations(),
  public.list_letters(uuid, timestamptz), public.unsend_letter(uuid), public.hide_conversation(uuid),
  public.mute_conversation(uuid, boolean), public.report_letter(uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Retention: resolved message-report snapshots are dropped after 180 days. Server-only;
-- call from the existing cron with the service role.
-- ---------------------------------------------------------------------------
create or replace function public.purge_message_reports(days int default 180)
returns int language sql security definer set search_path = public, pg_temp as $$
  with d as (
    delete from public.message_reports
     where status = 'resolved' and created_at < now() - make_interval(days => days)
    returning 1
  ) select count(*)::int from d;
$$;
revoke all on function public.purge_message_reports(int) from public, anon, authenticated;

-- Admin actions on Letters are logged too.
alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log
  add constraint admin_audit_log_action_check
  check (action in ('restore', 'remove', 'resolve_flag', 'restore_comment', 'remove_comment', 'resolve_user_report',
                    'remove_letter', 'resolve_letter_report', 'clear_letter_review', 'suspend_user'));
