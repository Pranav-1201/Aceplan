# Handover

Where things stand right now. Rewrite this at the end of every session.
Last updated: 2026-09-30, model claude-sonnet-5-5.

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
`phase-b/security`, branched from `phase-a/foundation`. PUSHED on 2026-09-30 and open as pull
request #1 into `main` (NOT merged; the repo is public). `main` is untouched at 0bb5a65. The
owner's rule: do not merge until the edge functions have been tried against a live Supabase project.

First real CI run (2026-09-30, run 36630859816): `checks` PASS (typecheck, tests, build on Linux,
Node 24), `db` PASS (the real `supabase/ci/replay.sh` on Postgres 15: all migrations applied, the
quota test printed `quota checks passed`, 14 tables), `lint` FAIL as expected: 103 problems, 89
errors (all `@typescript-eslint/no-explicit-any`), 14 warnings. Measured the same locally.

## Phase A (foundation): status
| Task | State |
|---|---|
| 1 Repo hygiene and docs | Done, committed |
| 2 Lint gate | Partly done: 3 of 104 errors fixed early; the rest are `no-explicit-any` (101 then, 89 now after code was removed and rewritten). The rule relaxation was refused by the config-protection hook (D3). Owner decided 2026-09-30 (D12): FIX them in source, last, after a live project exists |
| 3 Typecheck script and unit tests | Done, committed. 7 tests in 2 files pass; 4 planted bugs were all caught |
| 4 Migration replay harness | Done. Verified locally in a throwaway PGlite and then for real in CI on 2026-09-30: `replay.sh` on Postgres 15 passed |
| 5 CI workflow | Done and run: pull request #1 gave `checks` pass, `db` pass, `lint` fail (known, see above) |
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
- Public storage (avatars, resumes and certificates share one public bucket): the owner decided on
  2026-09-30 to split it NOW (avatars public; resumes and certificates private, opened by
  short-lived links). NOT done yet; it is the next code task (D12).
- Live checks once a project exists: anon-key request to an AI function gets 401, signed-in works,
  the 51st call in a day gets 429, Google sign-in returns to `/dashboard`.

## Phase C (correctness): status
Most planned Phase C items were already fixed inside Phase B: the broken model ids, the signup
that could not finish (the flow was removed), the quiz-grader crashes and the `NaN` percentage, and
the "AI gateway" error wording.

| Item | State |
|---|---|
| Notes uploader read PDF/Word as text | Fixed and committed: plain-text files only, binary refused with a message (`src/lib/fileText.ts`, 9 tests, 8 planted bugs caught after one gap was closed). The owner decided on 2026-09-30 to add real PDF and Word support (D12); NOT done yet, it is a code task after the storage split |
| Grader trusts the quiz key sent by the browser | Deliberately NOT done. The only person it can help is the student cheating their own practice score, so a server-side quiz store is not worth its cost now. Revisit if scores are ever shared or ranked |
| JSON mode for quiz and grading replies | NOT done. A malformed reply now returns a clear retry message instead of crashing; Groq's JSON mode would not fit the grader's array reply and was not verified |

## Phase D (frontend and UX): status
Trace: `docs/work/phase-d-frontend.md`.

| Item | State |
|---|---|
| Bundle split by route | Done, committed. Main entry chunk 1,821.88 kB to 487.74 kB (524.30 to 146.88 kB gzip); heavy pieces load only on their pages |
| One protected-route wrapper | Done, committed (`ProtectedRoute`, 5 tests, 6 planted bugs caught). `AINotes` and `Quiz` are now covered too |
| Dead share-image tags | Removed (D11). The `@aceplan` Twitter handle was removed on the owner's instruction (2026-09-30) |
| Split `Exams.tsx`, remove the 89 remaining `any` types, TanStack Query, accessibility pass | NOT done: need the running app to verify safely; see the trace file. The `any` fixes are the owner's chosen lint route (D12) and come last |
| Hosting fallback file | Not added (D11): only needed if the host is Netlify |

Function settings to set on the new project (all optional except the key): `GROQ_API_KEY`,
`ALLOWED_ORIGINS` (comma-separated site origins), `AI_DAILY_LIMIT` (default 50),
`GROQ_TEXT_MODEL`, `GROQ_VISION_MODEL`. Check Groq's current model list: the vision default is a
best guess and was not verified.

## Blocked on the owner
1. New Supabase project (needs their account), then Google OAuth client (needs Google Cloud), a
   Groq API key, and setting the function secrets. Step-by-step: the Word guide in the project
   folder, and `docs/SUPABASE_SETUP.md`.
2. Trying the app for real, and the three live security checks (`docs/TEST_CHECKLIST.md`).
3. Reviewing and merging pull request #1 after that.
4. Cloudflare Pages account and deploy; weekly backups; one restore drill and one rollback drill.
5. `.env.example`: permission settings deny `.env*`, so none was created (D6). Optional.

Decided by the owner on 2026-09-30 (D12) and NOT blocking: lint route, push, storage split, PDF and
Word support, host, Twitter handle, where docs live.

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
Code work the owner has approved, in this order (D12): 1) the private-storage split, 2) PDF and Word
reading for AI notes (two new dependencies; record their names in DECISIONS.md), 3) the `any` fixes,
last and only once a live project exists so they can be tried. Everything else waits on the owner's
accounts (see "Blocked on the owner"). The detailed audit roadmap and the plans are kept privately
in the project folder, outside this repo.

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
