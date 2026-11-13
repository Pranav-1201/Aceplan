# Deployment

The plan: a static frontend on Cloudflare Pages, and a Supabase project for everything else.
Nothing here has been done yet: it needs the owner's accounts. Facts are marked **checked**
(read from the vendor's own documentation on 2026-09-29) or **not checked** (from general
knowledge; confirm before relying on them).

## Why this shape
The app is a static single-page frontend that talks to Supabase (database, sign-in, files, edge
functions). No part of it needs a server of its own, a persistent disk, or long-running jobs on
the host, so a static host is enough. A VPS or container host would add patching and backups for
nothing. Long AI responses are streamed by the Supabase edge functions, not by the host.

## Before you deploy
1. Create the Supabase project and finish `docs/SUPABASE_SETUP.md` (migrations applied, Google
   sign-in configured, `GROQ_API_KEY` set).
2. Set the function secrets that the AI functions read: `ALLOWED_ORIGINS` (your production origin,
   plus `http://localhost:8080` for local work, comma-separated), and optionally `AI_DAILY_LIMIT`
   (default 50) and `GROQ_TEXT_MODEL` / `GROQ_VISION_MODEL`.
3. Regenerate `src/integrations/supabase/types.ts` from the project.
4. Push the repository (the owner decides when; it is public) and let CI run: the `checks`,
   `lint` and `db` jobs. `lint` is known to fail until the `any` types are removed (D3).

## Frontend: Cloudflare Pages
1. Connect the GitHub repository in the Cloudflare dashboard (Workers and Pages, create, Pages).
2. Build command `npm run build`; build output directory `dist` (**not checked**: confirm on the
   setup screen; Vite is a standard preset).
3. Environment variables (production): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   `VITE_SUPABASE_PROJECT_ID`. Also set `NODE_VERSION` to `24` to match `.nvmrc` (**not checked**
   whether the host reads `.nvmrc` itself).
4. Single-page routing: **checked**. Cloudflare Pages treats a site with no top-level `404.html`
   as a single-page app and sends unknown paths to the root, so deep links such as `/dashboard`
   work with no extra file. Do not add a `_redirects` rule for this (see `docs/DECISIONS.md` D11).
5. HTTPS is provided by the host on its default address (**not checked**); confirm the padlock in
   the browser and note the address.

## After the first deploy
1. In Supabase, Authentication, URL configuration: set the Site URL to the production address and
   add it to the redirect URLs.
2. Update the `ALLOWED_ORIGINS` secret to include the production address.
3. Run the live checks in `docs/TEST_CHECKLIST.md` ("Not covered by any automated check yet"):
   an AI function called with only the public key returns 401; a signed-in call works; the 51st
   call in a day returns 429; Google sign-in returns to `/dashboard`; a deep link opens.
4. Only after those pass, share the address.

## Monitoring and alerts
There is no paid monitoring. A workable minimum:
- An external uptime monitor pinging the site address (any free monitor; not chosen).
- Weekly look at the Supabase dashboard: edge function logs and errors, database size, storage.
- Weekly look at the Groq usage page. The per-user daily limit protects the budget; the shared
  Groq key still has its own account limits (**not checked**).
Real alerting (an email or message on failure) is not set up; add it once there are users.

## Backups
**Checked:** the Supabase Free plan has no automatic backups and no point-in-time recovery; the
documentation tells Free projects to export regularly with the CLI's `db dump` command and keep
copies off-site. Until the project moves to a paid plan:
1. Weekly: `npx supabase db dump -f backup-YYYY-MM-DD.sql` against the linked project (needs the
   database password). Keep the file somewhere other than the project.
2. Files uploaded to storage (materials, avatars, certificates) are separate from a database dump
   (**not checked**); export them separately if they matter.
3. Once, before launch: restore a dump into a scratch project to prove it works.

## Rollback
- Frontend: Cloudflare Pages keeps earlier deployments; roll back by promoting a previous one in
  the dashboard (**not checked**: confirm the exact control). The rollback has NOT been drilled.
  Do one drill before launch and record the date, who and the result in `docs/ROLLBACK.md`.
- Database: migrations only move forward; undo with a new migration or a restore (see Backups).
- Functions: redeploy the previous commit's function code.

## Cost
| Item | Cost | Status |
|---|---|---|
| Supabase Free | 0 | **checked**: 2 projects, 500 MB database, 1 GB storage, 50,000 monthly active users, 500,000 function invocations a month. Free projects can be paused for inactivity; the threshold was not stated (**not checked**) |
| Cloudflare Pages | 0 expected | **not checked**: confirm current free limits |
| Groq | 0 expected on the free tier | **not checked**: confirm rate limits and terms |
| Domain name | roughly 10 to 15 USD a year, optional | **not checked**; only needed for a custom address or a custom email sender |

Alternatives if Cloudflare Pages does not suit: Netlify (needs `public/_redirects` with
`/* /index.html 200`; not checked) or Vercel. Their free-plan terms were not checked.
