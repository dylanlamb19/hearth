-- 0014: server-side invite links (Glow invite-share-card v2). Run after 0013. Safe to re-run.
-- Rules (Ember/Kindling):
--   * A link never makes anyone friends. The invitee chooses "Let in" in Settle in step 2.
--   * Links last 14 days. "Reset link" revokes the old code at once (rate limited).
--   * Public lookups return the inviter's display name only: no photo, handle, Moments or friends.
--   * Blocked pairs never see each other through an invite (resolve returns "expired").
--   * Deleting an account cascades away its links.

create table if not exists public.invite_links (
  code text primary key check (code ~ '^[a-z0-9]{12}$'),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  revoked_at timestamptz
);
create index if not exists invite_links_inviter_idx on public.invite_links (inviter_id, created_at desc);

alter table public.invite_links enable row level security;

-- Clients may only read their own links. All writes go through the definer functions below.
revoke all on public.invite_links from public, anon, authenticated;
grant select on public.invite_links to authenticated;
drop policy if exists invite_links_select_own on public.invite_links;
create policy invite_links_select_own on public.invite_links
  for select to authenticated using (inviter_id = auth.uid());

create or replace function public.new_invite_code()
returns text language sql volatile set search_path = public, pg_temp as $$
  select substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 12);
$$;
revoke all on function public.new_invite_code() from public, anon, authenticated;

-- The caller's active link, minting one if none is live.
create or replace function public.my_invite_link()
returns table (code text, expires_at timestamptz)
language plpgsql volatile security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  return query
    select l.code, l.expires_at from public.invite_links l
    where l.inviter_id = uid and l.revoked_at is null and l.expires_at > now()
    order by l.created_at desc limit 1;
  if found then return; end if;
  return query
    insert into public.invite_links (code, inviter_id) values (public.new_invite_code(), uid)
    returning invite_links.code, invite_links.expires_at;
end $$;
revoke all on function public.my_invite_link() from public, anon;
grant execute on function public.my_invite_link() to authenticated;

-- "Reset link": revoke every live link and mint a new one. At most 5 resets per 24 hours.
create or replace function public.reset_invite_link()
returns table (code text, expires_at timestamptz)
language plpgsql volatile security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.invite_links l
      where l.inviter_id = uid and l.created_at > now() - interval '24 hours') >= 6 then
    raise exception 'invite_reset_rate_limited' using errcode = 'P0001';
  end if;
  update public.invite_links set revoked_at = now()
    where inviter_id = uid and revoked_at is null;
  return query
    insert into public.invite_links (code, inviter_id) values (public.new_invite_code(), uid)
    returning invite_links.code, invite_links.expires_at;
end $$;
revoke all on function public.reset_invite_link() from public, anon;
grant execute on function public.reset_invite_link() to authenticated;

-- Public lookup for /invite/{code} and its link preview.
-- status: 'ok' | 'expired' (expired, reset, unknown, deleted or blocked: all look the same).
-- inviter_id is only returned to a signed-in, unblocked viewer (for the Settle in "Let in" row).
create or replace function public.resolve_invite(invite_code text)
returns table (status text, display_name text, inviter_id uuid)
language plpgsql stable security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare l public.invite_links; n text;
begin
  select * into l from public.invite_links where code = lower(invite_code);
  if l.code is null or l.revoked_at is not null or l.expires_at <= now()
     or (auth.uid() is not null and public.is_blocked_between(auth.uid(), l.inviter_id)) then
    return query select 'expired'::text, null::text, null::uuid; return;
  end if;
  select coalesce(nullif(trim(p.name), ''), 'A friend') into n from public.profiles p where p.id = l.inviter_id;
  if n is null then
    return query select 'expired'::text, null::text, null::uuid; return;
  end if;
  return query select 'ok'::text, left(n, 60),
    case when auth.uid() is not null and auth.uid() <> l.inviter_id then l.inviter_id else null end;
end $$;
revoke all on function public.resolve_invite(text) from public;
grant execute on function public.resolve_invite(text) to anon, authenticated;
