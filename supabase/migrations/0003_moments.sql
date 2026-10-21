-- Hearth #23: Moments (posts). Run after 0002_age_gate.sql. Safe to re-run.

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  visibility text not null default 'friends' check (visibility in ('friends', 'public')),
  -- Sample content. The app hides demo rows once someone has real Moments to see.
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.moments add column if not exists is_demo boolean not null default false;

create index if not exists moments_created_at_idx on public.moments (created_at desc) where deleted_at is null;
create index if not exists moments_author_idx on public.moments (author_id);

alter table public.moments enable row level security;

-- Column grants: authors write only body and visibility. id, created_at, is_demo and
-- deleted_at can't be set or changed through the API (no backdating, no un-deleting).
revoke all on public.moments from anon, authenticated;
grant select (id, author_id, body, visibility, is_demo, created_at) on public.moments to authenticated;
grant insert (author_id, body, visibility) on public.moments to authenticated;
grant update (body, visibility) on public.moments to authenticated;

-- Reads: public Moments, or your own, and never deleted ones (not even for the author).
-- TODO(friends): also allow visibility = 'friends' when the reader is a friend of the author,
-- once the friends table lands.
drop policy if exists "moments readable when public or own" on public.moments;
create policy "moments readable when public or own"
  on public.moments for select
  to authenticated
  using (
    deleted_at is null
    and (visibility = 'public' or auth.uid() = author_id)
  );

drop policy if exists "authors insert own moments" on public.moments;
create policy "authors insert own moments"
  on public.moments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "authors update own moments" on public.moments;
create policy "authors update own moments"
  on public.moments for update
  to authenticated
  using (auth.uid() = author_id and deleted_at is null)
  with check (auth.uid() = author_id);

-- Soft delete only: no delete policy, so rows can't be hard-deleted through the API.
drop policy if exists "authors delete own moments" on public.moments;

-- Deleting goes through this function: it only ever sets deleted_at to now(), once, for the author.
create or replace function public.delete_moment(moment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.moments
     set deleted_at = now()
   where id = moment_id
     and author_id = auth.uid()
     and deleted_at is null;
  if not found then
    raise exception 'Moment not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_moment(uuid) from public, anon;
grant execute on function public.delete_moment(uuid) to authenticated;
