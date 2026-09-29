# Test checklist: proof, not claims

A change is not "done" until these have been run in the same session and the output read.
Numbers below were measured on 2026-09-29 (Node 24.19.0, npm 11.17.0); update them when they
legitimately change and say why in `docs/DECISIONS.md`.

| Check | Command | Expected today |
|---|---|---|
| Types | `npm run typecheck` | No diagnostics, exit 0. Compiles all 104+ files under `src/` (`tsc -p tsconfig.app.json --listFilesOnly` lists them; the root tsconfig alone compiles nothing) |
| Unit tests | `npm test` | `Test Files 7 passed (7)`, `Tests 49 passed (49)` (auth 13, function helpers 14, file text 9, badges 5, sanitizer 4, token helper 2, utils 2). Zero collected tests is a failure (`passWithNoTests: false`). The first run on the dev machine can take about 2 minutes (cold cache); later runs take seconds |
| Build | `npm run build` | Exit 0. Vite warns that one chunk is over 500 kB (1,821.88 kB, gzip 524.30 kB) until code splitting lands |
| Lint | `npm run lint` | KNOWN RED: 115 problems, 101 errors (all `@typescript-eslint/no-explicit-any`), 14 warnings. See `docs/DECISIONS.md` D3. Any error of another kind is a regression |
| Migrations | `bash supabase/ci/replay.sh` with `PGHOST PGUSER PGPASSWORD PGDATABASE` set to an EMPTY Postgres | 16 migrations apply; the quota behaviour test prints `quota checks passed`; the checks print `public_tables` = 14 and list ai_notes, ai_usage, certificates, exam_subjects, exams, folders, profiles, quiz_attempts, semester_gpas, study_materials, study_sessions, subjects, timetable_periods, user_badges; exit 0. (Measured with the throwaway PGlite runner; `replay.sh` itself first runs in CI.) |
| Working tree | `git status --short` | Empty after a commit (no stray files) |

## How the checks were proven able to fail
- Tests: four planted bugs in `src/lib/badgeUtils.ts`, one per run (missing badge entry, no
  duplicate guard, no announcement, insert errors ignored). All four failed the suite.
- Migrations: a migration with a syntax error aborted the replay and named its file; a table
  created without row level security failed the check with
  `row level security is off for: <table>`; the four allow-everything policies on the old OTP
  table failed the "no allow-everything policy" check until they were dropped.
- Quota: three broken variants of the function (no limit clause, no sign-in check, wrong first
  count) each failed the behaviour test.
- Auth wrappers (9 planted bugs) and function helpers (10 planted bugs): every one failed a test.

## Before merging a change
1. Run the checks above and read the counts, not just the exit codes.
2. Read the whole diff (`git diff`), not a summary of it.
3. Confirm the change matches one logical task and update `docs/HANDOVER.md`.
4. If the schema changed: replay the migrations on an empty database and regenerate
   `src/integrations/supabase/types.ts`.

## Not covered by any automated check yet
Signing in with a real account, timetable, exams, the study timer, AI notes and quizzes, file
uploads, and the five AI edge functions themselves (no Deno and no project on the dev machine, so
only their shared helpers are tested). These are exercised only by hand once a Supabase project
exists. When it does, check by hand: a request to an AI function with only the public key gets
401; a signed-in request works; the 51st call in a day gets 429.
