# Handover

Where things stand right now. Rewrite this at the end of every session.
Last updated: 2026-09-29, model claude-sonnet-5-5.

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
| 4 Harden the five AI functions | Code written, NOT yet committed or verified. Each function now: requires a real signed-in user, size-checks input, applies a daily quota, returns generic errors, uses a CORS allowlist. Edge functions cannot be run on this machine (no Deno, no project), so this is checked by reading and by the helper tests only |
| 4b Client sends the user token | Code written (`src/lib/functionsAuth.ts` + test, four call sites), NOT yet committed or verified |
| 5 Daily AI quota | Migration and behaviour test done and verified in PGlite (3 broken variants caught). Its commit was interrupted by a tool failure: check `git status` |
| 6 Sanitized Markdown | Code written (`src/lib/safeHtml.ts` + test, three call sites), NOT yet verified: needs `npm i dompurify` first (the shell was unavailable) |
| 7 Retire the OTP functions | Not started: delete `send-otp` and `verify-otp`, their config entries, and add a migration dropping `email_otps` |

Function settings to set on the new project (all optional except the key): `GROQ_API_KEY`,
`ALLOWED_ORIGINS` (comma-separated site origins), `AI_DAILY_LIMIT` (default 50),
`GROQ_TEXT_MODEL`, `GROQ_VISION_MODEL`. Check Groq's current model list: the vision default is a
best guess and was not verified.

## Blocked on the owner
1. New Supabase project (needs their account), then Google OAuth client (needs Google Cloud).
2. Choice for D3 (lint): disable the config-protection hook once, or fix the 101 `any` usages.
3. Permission to push a branch so CI can run.
4. `.env.example`: permission settings deny `.env*`, so none was created (D6).

## Next
Finish Phase B: `npm i dompurify`, run typecheck, tests and lint, commit Tasks 4 to 6, then Task 7.
Then Phase C (correctness). The detailed audit roadmap and the plans are kept privately, outside
this repo.

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
