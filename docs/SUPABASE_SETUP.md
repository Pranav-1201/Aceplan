# Supabase setup (new project)

The project referenced in older commits (`project_id` in `supabase/config.toml`) no longer
resolves, so a fresh Supabase project is needed. The free plan is enough to start. Dashboard
wording changes over time; if a step does not match what you see, follow Supabase's current docs.

## 1. Create the project and connect the app
1. Create a project at supabase.com (free plan). Note the project ref (the part before
   `.supabase.co` in the project URL).
2. In Project Settings, API: copy the project URL and the anon (publishable) key.
3. Create `.env` in the repo root (see README) with `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID`. Never commit `.env`.
4. Set `project_id` in `supabase/config.toml` to the new ref.
5. Check the host resolves: `nslookup <ref>.supabase.co` should return an address.

## 2. Apply the database migrations
Migrations are in `supabase/migrations/`, applied in filename order. First prove they replay on
an empty database (CI does this; locally: `bash supabase/ci/replay.sh` against any empty
Postgres with the `PG*` environment variables set).

Either use the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```
or paste each file into the dashboard SQL editor, oldest first.

Then regenerate the TypeScript types (never hand-edit that file):
```bash
npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
```
Run `npm test` afterwards: the badge test checks the code and the database enum still agree.

## 3. Authentication: Google plus email and password
Decision: `docs/DECISIONS.md` D2. The sign-in screen is rewritten in a later phase; this step
prepares the project side.
1. Authentication, Providers: keep Email enabled.
2. Email confirmation: Supabase's default sender only reaches project team members and is
   capped at 2 messages an hour, so turn confirmation OFF until a custom email sender exists.
3. Google provider: in Google Cloud Console create an OAuth client of type "Web application".
   Add the redirect URI `https://<ref>.supabase.co/auth/v1/callback`. Paste the client ID and
   secret into Authentication, Providers, Google.
4. Authentication, URL configuration: set the Site URL to the production origin once you have
   one, and add `http://localhost:8080` to the redirect URLs for local development.

## 4. Edge functions and secrets
```bash
npx supabase secrets set GROQ_API_KEY=<your Groq key>
npx supabase functions deploy
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions by Supabase. Do not
put secrets in the repo. Before sharing the app publicly, complete the security phase of the
project roadmap.

## 5. Storage
The `study-materials` bucket is created by the migrations.
