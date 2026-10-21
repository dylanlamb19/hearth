-- 0007: reactions and comments (#26). Run after 0006.

-- Whether the current user can see a Moment (same rules as the moments read policy).
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
         or (m.visibility = 'public' and not m.hidden_pending_review
             and not public.is_blocked_between(auth.uid(), m.author_id))
       )
  );
$$;
revoke all on function public.can_see_moment(uuid) from public, anon;
grant execute on function public.can_see_moment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reactions: one per person per Moment, one of Glow's six kinds.
-- ---------------------------------------------------------------------------
create table if not exists public.reactions (
  moment_id uuid not null references public.moments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null default 'love',
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id)
);
alter table public.reactions drop constraint if exists reactions_kind_check;
alter table public.reactions
  add constraint reactions_kind_check check (kind in ('love', 'warm', 'haha', 'hug', 'wow', 'sad'));

alter table public.reactions enable row level security;
revoke all on public.reactions from anon, authenticated;
grant select (moment_id, user_id, kind, created_at) on public.reactions to authenticated;
grant insert (moment_id, kind) on public.reactions to authenticated;
grant delete on public.reactions to authenticated;

drop policy if exists "reactions readable with their moment" on public.reactions;
create policy "reactions readable with their moment"
  on public.reactions for select to authenticated
  using (public.can_see_moment(moment_id) and not public.is_blocked_with(user_id));

drop policy if exists "users react as themselves" on public.reactions;
create policy "users react as themselves"
  on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_moment(moment_id));

drop policy if exists "users remove own reactions" on public.reactions;
create policy "users remove own reactions"
  on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Comments: one level of replies, soft delete through delete_comment(), blocks hide comments
-- both ways, 30 per 10 minutes per person.
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  hidden_pending_review boolean not null default false
);
alter table public.comments add column if not exists parent_id uuid references public.comments (id) on delete cascade;
create index if not exists comments_moment_idx on public.comments (moment_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);
create index if not exists comments_author_idx on public.comments (author_id, created_at);

alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select (id, moment_id, parent_id, author_id, body, created_at) on public.comments to authenticated;
grant insert (moment_id, parent_id, body) on public.comments to authenticated;
-- No update or delete grants: comments aren't editable, and deletion goes through the RPC.

drop policy if exists "comments readable with their moment" on public.comments;
create policy "comments readable with their moment"
  on public.comments for select to authenticated
  using (
    deleted_at is null
    and public.can_see_moment(moment_id)
    and not public.is_blocked_with(author_id)
    and (not hidden_pending_review or author_id = auth.uid())
  );

drop policy if exists "users comment as themselves" on public.comments;
create policy "users comment as themselves"
  on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_moment(moment_id));

-- Replies: the parent must be a live top-level comment on the same Moment. Rate limit: 30
-- comments per 10 minutes per person (deleted ones still count). Error code HCOM1.
create or replace function public.check_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent record;
begin
  if new.parent_id is not null then
    select c.moment_id, c.parent_id, c.deleted_at into parent
      from public.comments c where c.id = new.parent_id;
    if not found or parent.moment_id <> new.moment_id then
      raise exception 'Reply must be on the same Moment' using errcode = '23514';
    end if;
    if parent.parent_id is not null then
      raise exception 'Replies are one level only' using errcode = '23514';
    end if;
    if parent.deleted_at is not null then
      raise exception 'That comment was removed' using errcode = '23514';
    end if;
  end if;
  if (
    select count(*) from public.comments
     where author_id = new.author_id and created_at > now() - interval '10 minutes'
  ) >= 30 then
    raise exception 'HEARTH_COMMENT_LIMIT' using errcode = 'HCOM1';
  end if;
  return new;
end;
$$;

drop trigger if exists check_new_comment on public.comments;
create trigger check_new_comment
  before insert on public.comments
  for each row execute function public.check_new_comment();

-- The comment's author or the Moment's author can delete (soft) a comment.
create or replace function public.delete_comment(comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.comments c
     set deleted_at = now()
    from public.moments m
   where c.id = comment_id
     and m.id = c.moment_id
     and c.deleted_at is null
     and (c.author_id = auth.uid() or m.author_id = auth.uid());
  if not found then
    raise exception 'comment not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.delete_comment(uuid) from public, anon;
grant execute on function public.delete_comment(uuid) to authenticated;

-- Reading a thread. Same visibility as the table policy, plus: a removed (deleted or hidden)
-- top-level comment that still has visible replies comes back as a placeholder (body and
-- author null, deleted = true) so the replies keep their place. Without replies it's left out.
create or replace function public.list_comments(target uuid)
returns table (
  id uuid,
  parent_id uuid,
  author_id uuid,
  author_name text,
  body text,
  deleted boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with visible as (
    select c.*
      from public.comments c
     where c.moment_id = target
       and public.can_see_moment(target)
       and not public.is_blocked_between(auth.uid(), c.author_id)
  ),
  live as (
    select v.* from visible v
     where v.deleted_at is null
       and (not v.hidden_pending_review or v.author_id = auth.uid())
  )
  select l.id, l.parent_id, l.author_id, p.name, l.body, false, l.created_at
    from live l
    left join public.profiles p on p.id = l.author_id
   where l.parent_id is null
      or exists (select 1 from live top where top.id = l.parent_id)
      or exists (select 1 from visible top where top.id = l.parent_id)
  union all
  select v.id, null::uuid, null::uuid, null::text, null::text, true, v.created_at
    from visible v
   where v.parent_id is null
     and not exists (select 1 from live l where l.id = v.id)
     and exists (select 1 from live r where r.parent_id = v.id)
  order by 7
  limit 400;
$$;
revoke all on function public.list_comments(uuid) from public, anon;
grant execute on function public.list_comments(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reporting comments: reports gains an optional comment_id (moment_id stays required and
-- must be the comment's Moment). One report per person per Moment, and per comment.
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists comment_id uuid references public.comments (id) on delete cascade;
alter table public.reports drop constraint if exists reports_one_per_reporter;
create unique index if not exists reports_one_per_reporter_moment
  on public.reports (reporter_id, moment_id) where comment_id is null;
create unique index if not exists reports_one_per_reporter_comment
  on public.reports (reporter_id, comment_id) where comment_id is not null;
grant insert (comment_id) on public.reports to authenticated;

-- The reporter must be able to see the comment right now (live, not hidden unless their own,
-- Moment visible). Blocks are ignored here on purpose: a blocked person's report is still
-- saved, it just doesn't count toward auto-hide (see hide_after_reports).
create or replace function public.can_report_comment(target uuid, parent uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.comments c
      join public.moments m on m.id = c.moment_id
     where c.id = target
       and c.moment_id = parent
       and c.deleted_at is null
       and (not c.hidden_pending_review or c.author_id = auth.uid())
       and m.deleted_at is null
       and (m.author_id = auth.uid() or (m.visibility = 'public' and not m.hidden_pending_review))
  );
$$;
revoke all on function public.can_report_comment(uuid, uuid) from public, anon;
grant execute on function public.can_report_comment(uuid, uuid) to authenticated;

drop policy if exists "users file their own reports" on public.reports;
create policy "users file their own reports"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and (
      (comment_id is null and public.can_report_moment(moment_id))
      or (comment_id is not null and public.can_report_comment(comment_id, moment_id))
    )
  );

-- Final version (supersedes 0004/0005/0006). After each report:
--  * "Someone under 13" flags the reported content's author (re-flag reopens it and refreshes
--    the reason; 0005's trigger bumps last_flagged_at).
--  * 3 or more qualifying reporters hide the reported Moment, or just the reported comment,
--    for everyone but its author until reviewed. A reporter qualifies if their account is at
--    least 3 days old and they aren't blocked with the author in either direction.
create or replace function public.hide_after_reports()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_author uuid;
begin
  if new.comment_id is not null then
    select c.author_id into target_author from public.comments c where c.id = new.comment_id;
  else
    select m.author_id into target_author from public.moments m where m.id = new.moment_id;
  end if;

  if new.needs_account_review and target_author is not null then
    insert into public.flagged_accounts (user_id, reason)
    values (target_author, new.reason)
    on conflict (user_id) do update
      set status = 'open',
          reason = excluded.reason;
  end if;

  if (
    select count(distinct r.reporter_id)
      from public.reports r
      join auth.users u on u.id = r.reporter_id
     where r.moment_id = new.moment_id
       and r.comment_id is not distinct from new.comment_id
       and r.status = 'open'
       and u.created_at <= now() - interval '3 days'
       and not public.is_blocked_between(r.reporter_id, target_author)
  ) >= 3 then
    if new.comment_id is not null then
      update public.comments set hidden_pending_review = true where id = new.comment_id;
    else
      update public.moments set hidden_pending_review = true where id = new.moment_id;
    end if;
  end if;
  return new;
end;
$$;

-- Admin audit log: comment actions too.
alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log
  add constraint admin_audit_log_action_check
  check (action in ('restore', 'remove', 'resolve_flag', 'restore_comment', 'remove_comment'));
