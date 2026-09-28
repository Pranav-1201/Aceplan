# Handover

Where things stand right now. Rewrite this at the end of every session.
Last updated: 2026-09-29, model claude-sonnet-5-5.

## Direction (settled, see DECISIONS.md)
Semester planner for students; AI notes and quizzes are opt-in. Authentication moves to
Supabase built-in Auth with Google sign-in plus email and password (D1, D2).

## Current branch
`phase-a/foundation` (local only, NOT pushed; the GitHub repo is public and pushing needs the
owner's go-ahead). `main` is untouched at 0bb5a65.

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

## Blocked on the owner
1. New Supabase project (needs their account), then Google OAuth client (needs Google Cloud).
2. Choice for D3 (lint): disable the config-protection hook once, or fix the 101 `any` usages.
3. Permission to push a branch so CI can run.
4. `.env.example`: permission settings deny `.env*`, so none was created (D6).

## Next
Phase B (security hardening and the auth rewrite to Google plus email and password). The detailed audit roadmap and the Phase A
plan are kept privately, outside this repo.

## Watch out for
- A first-touch gate hook denies the first write of every new file until facts are stated; state
  them after the denial, then retry. Batches: the denied call fails while siblings apply.
- A config-protection hook blocks edits to lint configs.
- Vitest starts slowly on this machine (about 2 minutes for a 7-test run).
- `npm i vitest` picks a version needing Vite 6; `vitest@^3` is what works with Vite 5.
- `tsc -b` leaves `*.tsbuildinfo` files; they are now git-ignored.
- Shell tools sometimes fail with a transient classifier error; retry once, then work on
  editor-only tasks.
- Local Node 24.19.0, npm 11.17.0. CI uses `.nvmrc` (24).
