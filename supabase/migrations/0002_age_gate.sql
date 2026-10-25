-- Hearth #22: server-side age gate. Run after 0001_profiles.sql. Safe to re-run.
-- We keep only the birth year. Anyone born in or after (current year - 13) is refused,
-- matching src/lib/age.ts (the borderline year is blocked because we only know the year).
--
-- Heads-up: this runs for EVERY new auth user, including ones created from the Supabase
-- dashboard or via OAuth. Those have no birth_year in their metadata, so they are refused too.
-- To add one by hand, include {"birth_year": 1990, "terms_accepted": true} as user metadata.

-- 1) Refuse the signup itself, before the auth user row is written, so no account is created.
--    Custom SQLSTATE HAGE1 + message HEARTH_AGE_BLOCKED let the app tell this apart from other errors.
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
    raise exception 'HEARTH_AGE_BLOCKED' using errcode = 'HAGE1';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_age on auth.users;
create trigger enforce_signup_age
  before insert on auth.users
  for each row execute function public.enforce_signup_age();

-- 2) Store the year and the Terms acceptance on the profile created at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, birth_year, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'birth_year', '')::int,
    case when (new.raw_user_meta_data ->> 'terms_accepted') = 'true' then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Clean up the trigger from an earlier draft of this file (column grants in 0001 replace it).
drop trigger if exists lock_birth_year on public.profiles;
drop function if exists public.lock_birth_year();
