# Turning on real accounts (Supabase, free tier)

Until these steps are done, Hearth runs in demo mode: only `ember@hearth.demo` can sign in (any password, unless `NEXT_PUBLIC_DEMO_PASSWORD` is set), and new signups are closed. Once the keys are set, demo mode and its cookie are switched off entirely: every account is a real Supabase account.

## 1. Create a free Supabase project
1. Go to https://supabase.com and sign in (GitHub sign-in is fine).
2. Click **New project**. Name it `hearth`, choose the **Free** plan, set a database password (save it somewhere safe), and pick the region closest to you.
3. Wait about a minute for it to finish setting up.

## 2. Run the migration
1. In the project, open **SQL Editor** → **New query**.
2. Paste in everything from `supabase/migrations/0001_profiles.sql` and click **Run**. Its column grants keep `birth_year` and `terms_accepted_at` private: the app can't read them through the API.
3. You should see "Success. No rows returned." This creates the `profiles` table, its privacy rules, and the trigger that adds a profile for each new signup.
4. Open another **New query**, paste everything from `supabase/migrations/0002_age_gate.sql`, and click **Run**. This adds `birth_year` to profiles and refuses any signup from someone under 13 (the server-side half of the signup age gate).
5. Run `supabase/migrations/0003_moments.sql` (Moments), then `0004_media.sql`. The second creates the private `moment-media` bucket (photos only: JPEG, 4 MB cap) and its policies. Video uploads are off for real accounts for now (the composer shows "Video · Coming soon"), because video metadata such as location can't be stripped server-side on the free tier yet. It also adds the `reports` table: people can file reports but nobody can read them through the app. Each person can report a Moment once. When 3 or more different people whose accounts are at least 3 days old report it, it's hidden for everyone except its author until reviewed. (Blocks are still saved only on each device; once they're stored in the database, reports from people the author has blocked won't count either.) "Someone under 13" also flags the author's account in `flagged_accounts`, which only admins can see. Open reports are listed at `/admin/reports` (see step 4) with "Someone under 13" (`needs_account_review`) first; use **Restore** (un-hide and resolve its reports) or **Remove** (delete the Moment and its photo, resolve its reports), and **Mark reviewed** for flagged accounts.
6. Run `supabase/migrations/0005_media_followups.sql`. It tracks uploads in `media_uploads` (so photos never attached to a Moment can be cleaned up), keeps an `admin_audit_log` of who restored, removed or reviewed what, renames `flagged_accounts.first_flagged_at` to `last_flagged_at` (refreshed on every re-flag), and makes reports cascade when a Moment row is deleted.
7. Then run `supabase/migrations/0006_follows_blocks.sql`. It adds `follows` (anyone signed in can read; you follow only through the `follow_user()` function, which gives the same error for a missing account or a block, and unfollow only your own; about 200 follow actions a day per account, counted from an append-only `follow_events` log so unfollowing and refollowing doesn't reset it) and `blocks` (only you can see your blocks; the other person is never told). Blocks work both ways: neither person sees the other's profile or Moments, neither can follow the other, and blocking removes follows in both directions. A blocked person's report is still saved but doesn't count toward auto-hide. Blocks saved on a device before this are copied into the table once, the first time that person signs in.

## 3. Auth settings
1. **Authentication → URL Configuration**: set **Site URL** to `https://hearthsocial.grok.me`. Under **Redirect URLs**, add `https://hearthsocial.grok.me/**` and `http://localhost:3000/**`.
2. Under **Redirect URLs** the app uses `/auth/callback` for confirmation and password-reset links (covered by the `/**` entries above).
3. **Authentication → Providers → Email**: leave it on. "Confirm email" is optional. With it on, new people get a confirmation link before they can sign in. With it off, they go straight to `/welcome`.

## 4. Add the two keys to Vercel
1. In Supabase, open **Project Settings → API** (or **Connect**) and copy the **Project URL** and the **anon / publishable** key. Never use the `service_role` key here.
2. In Vercel, open the hearth project → **Settings → Environment Variables** and add both for Production, Preview and Development:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
3. For photo and video uploads, also add `SUPABASE_SERVICE_ROLE_KEY` (the **service_role** key) — **without** the `NEXT_PUBLIC_` prefix, so it stays on the server. It's used only on the server: `/api/media` writes photos to the private bucket, and `/api/moments/delete` removes a deleted Moment's photo. Never put it in a `NEXT_PUBLIC_` variable.
   Also add `ADMIN_USER_IDS` (server-only): your Supabase user id from **Authentication → Users**, comma-separated for more admins. Only these accounts can open `/admin/reports`; everyone else gets a 404.
4. **Redeploy** the latest Production deployment. These keys are read at build time, so a redeploy is required.

## 5. Check it
- Sign up with a new email at `/signup`, finish `/welcome`, refresh, then sign in on another device. You should still be there.
- Try signing up with a birth year of this year minus 13 or later: you should see the calm "Hearth is for people 13 and older." screen, and no user appears under **Authentication → Users**.
- Use **Forgot password** on `/login`: the email link should open `/reset-password`, and saving signs you in.
- The demo account no longer works once keys are set; that's expected.

## Good to know: the age trigger
`0002_age_gate.sql` refuses **every** new auth user without a `birth_year` of 13+ in their metadata. That includes users you add from the Supabase dashboard and any future OAuth (Google/X) signups. To add someone by hand, set user metadata `{"birth_year": 1990, "terms_accepted": true}`. OAuth will need its own birth-year step before it's turned on.

Supabase usually reports trigger failures as a generic "Database error saving new user". The app shows that as a normal error, not the under-13 screen; the client-side age check is what shows the block screen.

Local dev: copy `.env.example` to `.env.local` and fill in the two keys.

## Daily orphan cleanup

Photos uploaded but never posted (for example, a composer closed before sharing) are deleted once a day if they're older than 24 hours. The route claims those uploads first (their tracking rows are deleted and returned) and removes only those files, so a photo can't be attached mid-cleanup; a Moment can only attach an upload that is tracked and less than 24 hours old. Deleting a Moment marks its upload unattached, so a failed file removal is retried. Each run also sweeps up to 200 older files that aren't tracked and aren't used by a live Moment (files from before tracking existed). The secret is compared in constant time. `vercel.json` schedules `GET /api/cron/media-cleanup` at 09:00 UTC (free Hobby cron). Set a long random `CRON_SECRET` in Vercel → Settings → Environment Variables; Vercel sends it as `Authorization: Bearer <CRON_SECRET>` and the route refuses anything else. It needs `SUPABASE_SERVICE_ROLE_KEY` too.

## Account deletion

`POST /api/account/delete` (signed in) deletes the caller's account. The body must include their current password (re-checked on the server with a throwaway sign-in) and `confirm: "delete"`. Password checks are limited to about 5 per 15 minutes per person (checked and logged atomically by `claim_account_delete_attempt()`, which only the service role can call; if logging fails the request is refused). The auth user is deleted first, which cascades to their profile, Moments and other rows, so the account is gone even if a later step fails. Then every file under their `<user id>/` folder in `moment-media` is removed; any file that fails is left for the daily cleanup sweep (it's untracked and unattached by then). There's no button yet; until it ships, handle emailed requests server-side with `deleteAccount(admin, userId)` from `src/lib/supabase/deleteAccount.ts`. Needs `SUPABASE_SERVICE_ROLE_KEY`.
