# RankPilot AI (Next.js + Supabase)

Status: code written but NOT yet installed, built or tested. Follow the steps below and fix any errors that appear.

1. Install Node.js 20+ (nodejs.org, LTS).
2. In this folder run: `npm install`
3. Create a Supabase project, then run `supabase/migrations/0001_init.sql` in the SQL Editor.
4. Copy `.env.example` to `.env.local` and fill in your Supabase values.
5. Run: `npm run dev` and open http://localhost:3000
6. Make yourself admin (SQL Editor):
   `update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL');`
7. Check types: `npm run typecheck`. Production build: `npm run build`.

Deploy: push to GitHub, import in Vercel, add the same environment variables, and set NEXT_PUBLIC_SITE_URL to your live URL.
In Supabase > Authentication > URL Configuration, add your site URL and `<site>/auth/callback` to Redirect URLs.

Not built yet: keyword tool, content planner and meta tools UI (tables exist), PageSpeed, Search Console, AI, billing, plan quotas, broken-link checks, automated tests.
