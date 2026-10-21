-- Hearth #23: Moments (posts). Run after 0002_age_gate.sql. Safe to re-run.

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  visibility text not null default 'friends' check (visibility in ('friends', 'public')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists moments_created_at_idx on public.moments (created_at desc) where deleted_at is null;
create index if not exists moments_author_idx on public.moments (author_id);

alter table public.moments enable row level security;

-- Reads: public Moments, or your own. Soft-deleted rows are hidden from everyone but the author.
-- TODO(friends): also allow visibility = 'friends' when the reader is a friend of the author,
-- once the friends table lands.
drop policy if exists "moments readable when public or own" on public.moments;
create policy "moments readable when public or own"
  on public.moments for select
  to authenticated
  using (
    auth.uid() = author_id
    or (visibility = 'public' and deleted_at is null)
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
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "authors delete own moments" on public.moments;
create policy "authors delete own moments"
  on public.moments for delete
  to authenticated
  using (auth.uid() = author_id);
