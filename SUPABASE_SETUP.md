# Turning on real accounts (Supabase, free tier)

Until these steps are done, Hearth keeps using the demo cookie login, so the live site keeps working as it does today.

## 1. Create a free Supabase project
1. Go to https://supabase.com and sign in (GitHub sign-in is fine).
2. Click **New project**. Name it `hearth`, choose the **Free** plan, set a database password (save it somewhere safe), and pick the region closest to you.
3. Wait about a minute for it to finish setting up.

## 2. Run the migration
1. In the project, open **SQL Editor** → **New query**.
2. Paste in everything from `supabase/migrations/0001_profiles.sql` and click **Run**.
3. You should see "Success. No rows returned." This creates the `profiles` table, its privacy rules, and the trigger that adds a profile for each new signup.

## 3. Auth settings
1. **Authentication → URL Configuration**: set **Site URL** to `https://hearthsocial.grok.me`. Under **Redirect URLs**, add `https://hearthsocial.grok.me/**` and `http://localhost:3000/**`.
2. **Authentication → Providers → Email**: leave it on. "Confirm email" is optional. With it on, new people get a confirmation link before they can sign in. With it off, they go straight to `/welcome`.

## 4. Add the two keys to Vercel
1. In Supabase, open **Project Settings → API** (or **Connect**) and copy the **Project URL** and the **anon / publishable** key. Never use the `service_role` key here.
2. In Vercel, open the hearth project → **Settings → Environment Variables** and add both for Production, Preview and Development:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
3. **Redeploy** the latest Production deployment. These keys are read at build time, so a redeploy is required.

## 5. Check it
- Sign up with a new email at `/signup`, finish `/welcome`, refresh, then sign in on another device. You should still be there.
- `ember@hearth.demo` / `hearth123` still works as a shared, read-only demo. Its changes stay on that device only.

Local dev: put the same two lines in `.env.local`.
