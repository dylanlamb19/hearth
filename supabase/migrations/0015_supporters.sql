-- 0015: Hearth Supporter (optional, cosmetic thank-you perks only; nothing core is gated on this).
-- Only the service role writes these tables (Stripe webhook + /api/supporter). An owner can read
-- their own row. Everyone else only sees the cosmetic result through supporter_perks().

create table if not exists public.supporters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'past_due', 'canceled')),
  plan text check (plan is null or plan in ('monthly', 'yearly')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_until timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  frame text check (frame is null or frame in ('ember', 'hearthstone', 'sage-leaf', 'candle')),
  tint text not null default 'amber' check (tint in ('amber', 'terracotta', 'sage', 'plum')),
  show_dot boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.supporters enable row level security;

drop policy if exists "supporters: owner reads own row" on public.supporters;
create policy "supporters: owner reads own row" on public.supporters
  for select to authenticated using (user_id = auth.uid());
-- No insert/update/delete policies: only the service role (which bypasses RLS) writes.

-- Webhook idempotency: each Stripe event id is processed once. Service role only.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- Active, or within the 7-day grace window after a failed payment.
create or replace function public.is_supporter(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.supporters s
    where s.user_id = uid
      and (
        (s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()))
        or (s.status = 'past_due' and s.grace_until is not null and s.grace_until > now())
      )
  );
$$;

-- Cosmetic perks only (no status, plan, dates or Stripe ids). Empty for non-supporters.
create or replace function public.supporter_perks(uid uuid)
returns table (frame text, tint text, show_dot boolean)
language sql stable security definer set search_path = public
as $$
  select s.frame, s.tint, s.show_dot
  from public.supporters s
  where s.user_id = uid and public.is_supporter(uid);
$$;

revoke all on function public.is_supporter(uuid) from public;
revoke all on function public.supporter_perks(uuid) from public;
grant execute on function public.is_supporter(uuid) to authenticated, service_role;
grant execute on function public.supporter_perks(uuid) to authenticated, service_role;
