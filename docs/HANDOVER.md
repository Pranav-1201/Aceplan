# Handover

Where things stand right now. Rewrite this at the end of every session.
Last updated: 2026-09-29, model claude-sonnet-5-5.

## Where the private files are
The owner's hard rule: everything made for this project that is not code lives in
`D:\Projects and Research papers\PBL Project - Aceplan`. There you will find the private audit
roadmap, the Phase A and B plans, and the Word guide `AcePlan-Unblock-Guide-2026-09-30.docx`
(step-by-step instructions for everything that is waiting on the owner). Never save them on the
Desktop.

## Direction (settled, see DECISIONS.md)
Semester planner for students; AI notes and quizzes are opt-in. Authentication moves to
Supabase built-in Auth with Google sign-in plus email and password (D1, D2).

## Current branch
`phase-b/security`, branched from `phase-a/foundation` (both local only, NOT pushed; the GitHub
repo is public and pushing needs the owner's go-ahead). `main` is untouched at 0bb5a65.

## Phase A (foundation): status
| Task | State |
|---|---|
| 1 Repo hygiene and docs | Done, committed |
| 2 Lint gate | Partly done: 3 of 104 errors fixed and committed; the other 101 are `no-explicit-any`. The relaxation was refused by the config-protection hook, see D3. OWNER DECISION NEEDED |
| 3 Typecheck script and unit tests | Done, committed. 7 tests in 2 files pass; 4 planted bugs were all caught |
| 4 Migration replay harness | Done and verified in a throwaway PGlite (no Docker or Postgres on this machine): 13 migrations apply on an empty database, 14 public tables, matching `types.ts`. Two planted failures were caught. The real `psql` script (`replay.sh`) has not run yet, only its PGlite equivalent; CI will be its first run |
| 5 CI workflow | Written (`.github/workflows/ci.yml`), NOT yet run anywhere. It only runs after a push or pull request, which the owner has not approved |
| 6 Supabase setup runbook | Written (`docs/SUPABASE_SETUP.md`). Creating the new project and the Google OAuth client is blocked on the owner's accounts |

All of the above is committed on the branch except whatever `git status --short` shows.

## Phase B (security and auth): status
| Task | State |
|---|---|
| 1 Restrict the OTP table | Done, committed. Replay assertion "no allow-everything policy" failed before the migration and passes after |
| 2 Auth rewrite | Done, committed. Sign-in uses only Supabase built-in email/password and Google (`src/lib/auth.ts`, 13 tests, 9 planted bugs caught). The custom OTP screens are gone from `Auth.tsx`; signup now saves the full name |
| 3 Shared function helpers | Done, committed (`supabase/functions/_shared/`, 12 tests, 10 planted bugs caught) |
| 4 Harden the five AI functions | Done, committed. Each function requires a real signed-in user, size-checks input, applies a daily quota, returns generic errors, uses a CORS allowlist. The functions themselves have NOT been run (no Deno, no project on this machine): they are verified by reading, by typecheck of the client, and by the helper tests only |
| 4b Client sends the user token | Done, committed (`src/lib/functionsAuth.ts` + 2 tests, four call sites) |
| 5 Daily AI quota | Done, committed. Migration plus behaviour test verified in PGlite; 3 broken variants caught |
| 6 Sanitized Markdown | Done, committed (`src/lib/safeHtml.ts` + 4 tests, three call sites, new dependency `dompurify`, D8) |
| 7 Retire the OTP functions | Done: `send-otp` and `verify-otp` deleted, config entries removed, migration `20260929000200_drop_email_otps.sql` added. Replay: 16 migrations, 14 tables, no `email_otps` |

Follow-ups Phase B leaves open:
- `src/integrations/supabase/types.ts` still lists `email_otps` and lacks `ai_usage`. It must be
  REGENERATED from the new project (never hand-edited); see `docs/SUPABASE_SETUP.md`.
- `src/components/ui/input-otp.tsx` and the `input-otp` package are now unused; removing them is a
  separate cleanup.
- The public-storage question (avatars, resumes and certificates share one public bucket) is not
  done; it needs a decision because it changes stored file paths.
- Live checks once a project exists: anon-key request to an AI function gets 401, signed-in works,
  the 51st call in a day gets 429, Google sign-in returns to `/dashboard`.

## Phase C (correctness): status
Most planned Phase C items were already fixed inside Phase B: the broken model ids, the signup
that could not finish (the flow was removed), the quiz-grader crashes and the `NaN` percentage, and
the "AI gateway" error wording.

| Item | State |
|---|---|
| Notes uploader read PDF/Word as text | Fixed and committed: plain-text files only, binary refused with a message (`src/lib/fileText.ts`, 9 tests, 8 planted bugs caught after one gap was closed). Real PDF/Word support is an owner decision (D10) |
| Grader trusts the quiz key sent by the browser | Deliberately NOT done. The only person it can help is the student cheating their own practice score, so a server-side quiz store is not worth its cost now. Revisit if scores are ever shared or ranked |
| JSON mode for quiz and grading replies | NOT done. A malformed reply now returns a clear retry message instead of crashing; Groq's JSON mode would not fit the grader's array reply and was not verified |

## Phase D (frontend and UX): status
Trace: `docs/work/phase-d-frontend.md`.

| Item | State |
|---|---|
| Bundle split by route | Done, committed. Main entry chunk 1,821.88 kB to 487.74 kB (524.30 to 146.88 kB gzip); heavy pieces load only on their pages |
| One protected-route wrapper | Done, committed (`ProtectedRoute`, 5 tests, 6 planted bugs caught). `AINotes` and `Quiz` are now covered too |
| Dead share-image tags | Removed (D11). `@aceplan` Twitter handle left as is: confirm it is yours |
| Split `Exams.tsx`, remove the 101 `any` types, TanStack Query, accessibility pass | NOT done: need the running app to verify safely; see the trace file |
| Hosting fallback file | Not added (D11): only needed if the host is Netlify |

Function settings to set on the new project (all optional except the key): `GROQ_API_KEY`,
`ALLOWED_ORIGINS` (comma-separated site origins), `AI_DAILY_LIMIT` (default 50),
`GROQ_TEXT_MODEL`, `GROQ_VISION_MODEL`. Check Groq's current model list: the vision default is a
best guess and was not verified.

## Blocked on the owner
1. New Supabase project (needs their account), then Google OAuth client (needs Google Cloud).
2. Choice for D3 (lint): disable the config-protection hook once, or fix the 101 `any` usages.
3. Permission to push a branch so CI can run.
4. `.env.example`: permission settings deny `.env*`, so none was created (D6).

## Phase E (deploy and operations): status
Only the documentation could be done without the owner's accounts: `docs/DEPLOYMENT.md` (host
setup, post-deploy settings, monitoring, backups, rollback, cost) with each vendor fact marked
checked or not checked. Vendor facts checked on 2026-09-29: Cloudflare Pages serves unknown paths
as a single-page app when there is no `404.html`; the Supabase Free plan has no automatic backups
and no point-in-time recovery; its limits are 2 projects, 500 MB database, 1 GB storage, 50,000
monthly active users and 500,000 function invocations a month. NOT checked: Cloudflare Pages and
Groq free limits, the Supabase inactivity-pause threshold, host build settings. Nothing is
deployed, no rollback or restore drill has been done, and no alerting exists.

## Next
Phase E needs the owner. Almost all of it: create the new Supabase project
and the Google sign-in client (`docs/SUPABASE_SETUP.md`), choose a host, decide on pushing so CI
can run, then do the live checks listed under Phase B and drill one rollback. After the project
exists, come back for the Phase D items that need a running app. The detailed audit roadmap and
the plans are kept privately, outside this repo.

## Watch out for
- A first-touch gate hook denies the first write of every new file until facts are stated; state
  them after the denial, then retry. Batches: the denied call fails while siblings apply.
- A config-protection hook blocks edits to lint configs.
- The first Vitest run on this machine can take about 2 minutes (cold cache); later runs take a
  few seconds.
- `npm i vitest` picks a version needing Vite 6; `vitest@^3` is what works with Vite 5.
- `tsc -b` leaves `*.tsbuildinfo` files; they are now git-ignored.
- Shell tools sometimes fail with a transient classifier error; retry once, then work on
  editor-only tasks.
- Local Node 24.19.0, npm 11.17.0. CI uses `.nvmrc` (24).
