-- Hearth #22: server-side age gate. Run after 0001_profiles.sql. Safe to re-run.
-- We keep only the birth year. Anyone born in or after (current year - 13) is refused,
-- matching src/lib/age.ts (the borderline year is blocked because we only know the year).

alter table public.profiles add column if not exists birth_year int;

alter table public.profiles drop constraint if exists profiles_birth_year_range;
alter table public.profiles add constraint profiles_birth_year_range
  check (birth_year is null or (birth_year between 1900 and 2100));

-- 1) Refuse the signup itself: runs before the auth user row is written, so no account is created.
create or replace function public.enforce_signup_age()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y int;
begin
  begin
    y := (new.raw_user_meta_data ->> 'birth_year')::int;
  exception when others then
    y := null;
  end;
  if y is null or y >= extract(year from now())::int - 13 then
    raise exception 'hearth_age_blocked' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_age on auth.users;
create trigger enforce_signup_age
  before insert on auth.users
  for each row execute function public.enforce_signup_age();

-- 2) Store the year on the profile created at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, birth_year)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'birth_year', '')::int
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3) Users can't set or change birth_year themselves through the API.
create or replace function public.lock_birth_year()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.birth_year := null;
    else
      new.birth_year := old.birth_year;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lock_birth_year on public.profiles;
create trigger lock_birth_year
  before insert or update on public.profiles
  for each row execute function public.lock_birth_year();
