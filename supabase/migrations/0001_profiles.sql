-- Hearth PR #22: profiles for real accounts.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  handle text,
  bio text,
  photo_url text,
  interests text[] not null default '{}',
  onboarding_completed_at timestamptz,
  -- Private: only the year, only for the 13+ check. Never readable through the API (see grants below).
  birth_year int check (birth_year is null or birth_year between 1900 and 2100),
  -- Private: when the person agreed to the Terms at signup.
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  -- Handles are stored lowercase, so exact matches are case-insensitive.
  constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9_]{3,24}$')
);

alter table public.profiles add column if not exists birth_year int;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

create unique index if not exists profiles_handle_unique on public.profiles (lower(handle));

alter table public.profiles enable row level security;

-- Column grants: the API can read and write only the public profile columns.
-- birth_year and terms_accepted_at are set by the signup trigger (security definer) and stay private.
revoke all on public.profiles from anon, authenticated;
grant select (id, name, handle, bio, photo_url, interests, onboarding_completed_at, created_at)
  on public.profiles to authenticated;
grant insert (id, name, handle, bio, photo_url, interests, onboarding_completed_at)
  on public.profiles to authenticated;
grant update (name, handle, bio, photo_url, interests, onboarding_completed_at)
  on public.profiles to authenticated;

drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Create a profile row on signup. Handle is left null; /welcome picks it.
-- 0002_age_gate.sql replaces this to also store birth_year and terms_accepted_at.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
