-- 0011: fix Share failing with "new row violates row-level security policy for table moments".
-- INSERT ... RETURNING must pass the SELECT policy. 0010's policy only called can_see_moment(id),
-- a stable security-definer function that re-queries public.moments; its snapshot can't see the
-- row being inserted, so it returned false for the author's own new Moment. Check authorship
-- inline first (no lookup needed), then fall back to the audience helper. Safe to re-run.
drop policy if exists "moments readable by their audience" on public.moments;
create policy "moments readable by their audience"
  on public.moments for select to authenticated
  using (
    (author_id = auth.uid() and deleted_at is null)
    or public.can_see_moment(id)
  );
