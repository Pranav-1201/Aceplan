# Phase A: foundation (CI, tests, reproducible setup)

- Type: feature
- Status: in progress
- Owner and model: project owner / claude-sonnet-5-5
- Started: 2026-09-29

## Found or scoped
The audit found no tests, no CI, no env documentation and a backend project that no longer
exists. Phase A makes later phases self-verifying. Decisions: `DECISIONS.md` D1 to D6.

## Plan
1. Repo hygiene and docs. 2. Lint gate. 3. Typecheck script and unit tests. 4. Migration replay
harness. 5. CI workflow. 6. Supabase setup runbook.

## Tried
- Lint: 3 of 104 errors fixed in code (a `require`, two empty interfaces). The other 101 are
  `no-explicit-any`. Downgrading that rule in `eslint.config.js` was refused by the
  config-protection hook; not worked around (D3).
- Tests: `npm i -D vitest` (latest, 5.0.2) failed with a peer conflict (needs Vite 6.4 or
  newer; the project is on Vite 5.4.21). `vitest@^3` installed cleanly (3.2.7) and works.
- `.env.example`: refused by the owner's permission settings for `.env*` files (D6).
- Shell tools failed repeatedly with a transient classifier error partway through Task 4;
  editor-only tasks continued.

## Verification
- `npm test`: 2 files, 7 tests passed (vitest 3.2.7), about 2 minutes on this machine.
- Planted bugs in `src/lib/badgeUtils.ts`, one per run, 4 of 4 caught (a missing badge entry, the
  duplicate guard removed, the announcement removed, insert errors ignored); file restored and
  `git diff` empty.
- `npm run typecheck`: no diagnostics printed.
- `npx eslint .` after the 3 fixes: 115 problems, 101 errors (all `no-explicit-any`), 14 warnings.
- Migration replay in a throwaway PGlite 0.5.8: stubs plus 13 migrations applied on an empty
  database, `public_tables: 14`, names identical to the 14 in `types.ts`, assert passed.
  Planted a migration with a syntax error (aborted, named the file) and a table without row
  level security (assert failed naming the table).
- The CI workflow has NOT run anywhere: it needs a push or pull request, which is not approved.

## Files touched
`.gitignore`, `.nvmrc`, `README.md`, `AcePlan_Project_Documentation.md`, `tailwind.config.ts`,
`src/components/ui/command.tsx`, `src/components/ui/textarea.tsx`, `package.json`,
`package-lock.json`, `vitest.config.ts`, `src/test/setup.ts`, `src/lib/*.test.ts`,
`supabase/ci/*`, `.github/workflows/ci.yml`, `docs/*`, `CLAUDE.md`.

## Open items
Owner decisions listed in HANDOVER.md; first real CI run after a push.
